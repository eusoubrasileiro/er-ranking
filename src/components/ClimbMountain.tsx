import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Participant } from '@/hooks/useLeaderboardData';
import type { LessonsData } from '@/hooks/useLessonsData';
import { climbProgress, isLessonApproved, lessonFraction } from '@/lib/manualProgress';
import { markerColor } from '@/lib/climbColors';

type Point = [number, number];

/** Trail geometry: base camp, one station per lesson, summit. Two layouts so phones get a tall mountain. */
const LAYOUTS = {
  landscape: {
    width: 1000,
    height: 520,
    base: [56, 472] as Point,
    stations: [
      [124, 437], [192, 408], [260, 371], [328, 342], [396, 305],
      [464, 276], [532, 239], [600, 210], [668, 173], [736, 144],
    ] as Point[],
    summit: [820, 62] as Point,
    mountain: '0,520 0,420 150,360 300,300 420,220 560,160 700,110 820,56 900,120 1000,200 1000,520',
    backRange: '260,520 520,240 640,320 770,190 1000,320 1000,520',
    snow: '700,110 820,56 900,120 862,112 826,128 790,110 752,124',
  },
  portrait: {
    width: 400,
    height: 760,
    base: [70, 725] as Point,
    stations: [
      [170, 690], [300, 650], [190, 602], [80, 556], [210, 508],
      [320, 462], [210, 414], [100, 370], [210, 322], [270, 270],
    ] as Point[],
    summit: [200, 136] as Point,
    mountain: '0,760 0,500 50,400 110,300 165,215 200,134 240,200 300,250 360,300 400,330 400,760',
    backRange: '0,760 0,600 120,470 260,560 400,420 400,760',
    snow: '168,210 200,134 238,197 222,192 208,210 192,194 180,212',
  },
};

/** Trail as a polyline measured by arc length: progress n sits on trail vertex n (0 = base camp) */
function measureTrail(trail: Point[]) {
  const cum = [0];
  for (let i = 1; i < trail.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(trail[i][0] - trail[i - 1][0], trail[i][1] - trail[i - 1][1]));
  }
  const distanceAt = (progress: number) => {
    const clamped = Math.max(0, Math.min(progress, trail.length - 1));
    const i = Math.min(Math.floor(clamped), trail.length - 2);
    return cum[i] + (clamped - i) * (cum[i + 1] - cum[i]);
  };
  /** Point and unit direction at a distance along the trail (extrapolated past either end) */
  const pointAt = (distance: number): { point: Point; dir: Point } => {
    let i = 0;
    while (i < trail.length - 2 && distance > cum[i + 1]) i++;
    const [x1, y1] = trail[i];
    const [x2, y2] = trail[i + 1];
    const len = cum[i + 1] - cum[i] || 1;
    const dir: Point = [(x2 - x1) / len, (y2 - y1) / len];
    const d = distance - cum[i];
    return { point: [x1 + dir[0] * d, y1 + dir[1] * d], dir };
  };
  return { distanceAt, pointAt };
}

/** 1D packing: keep markers at least `gap` apart along the trail, each crowd centred on its members' true spots (never behind base camp) */
function spreadAlong(desired: number[], gap: number): number[] {
  let blocks = desired.map((d, i) => ({ members: [i], start: d }));
  let merged = true;
  while (merged) {
    merged = false;
    for (let k = 1; k < blocks.length; k++) {
      const prev = blocks[k - 1];
      if (blocks[k].start < prev.start + prev.members.length * gap) {
        const members = [...prev.members, ...blocks[k].members];
        const mean = members.reduce((sum, m) => sum + desired[m], 0) / members.length;
        blocks = [...blocks.slice(0, k - 1), { members, start: Math.max(0, mean - ((members.length - 1) / 2) * gap) }, ...blocks.slice(k + 1)];
        merged = true;
        break;
      }
    }
  }
  const out: number[] = [];
  blocks.forEach(b => b.members.forEach((m, j) => { out[m] = b.start + j * gap; }));
  return out;
}

interface ClimbMountainProps {
  participants: Participant[];
  lessonsData: LessonsData;
  variant?: 'compact' | 'full';
  selectedId?: number;
}

export function ClimbMountain({ participants, lessonsData, variant = 'full', selectedId }: ClimbMountainProps) {
  const isMobile = useIsMobile();
  const layout = isMobile ? LAYOUTS.portrait : LAYOUTS.landscape;
  const lessons = lessonsData.lessons.slice(0, layout.stations.length);
  const stations = layout.stations.slice(0, lessons.length);
  const trail: Point[] = [layout.base, ...stations, layout.summit];
  const trailPath = `M ${trail.map(p => p.join(' ')).join(' L ')}`;
  const selected = participants.find(p => p.id === selectedId);
  const compact = variant === 'compact';
  const top = isMobile ? 36 : 0;  // portrait sky above the summit label is empty

  // The landscape drawing shrinks on tablets: scale symbols and labels back up to a readable pixel size
  const figureRef = useRef<HTMLElement>(null);
  const [renderedWidth, setRenderedWidth] = useState(0);
  useEffect(() => {
    const el = figureRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setRenderedWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const k = !isMobile && renderedWidth > 0 ? Math.min(Math.max(860 / renderedWidth, 1), 1.35) : 1;

  // Markers: beside the trail (uphill side, clear of the stations), fanned along it when close together
  const markerR = (compact ? 12 : 15) * k;
  const climbers = participants
    .map((participant, index) => ({
      participant,
      color: markerColor(index),
      progress: climbProgress(participant, lessonsData),
    }))
    .sort((a, b) => a.progress - b.progress);
  // All tarefas approved = ready for the summit
  const { distanceAt, pointAt } = measureTrail(trail);
  const spots = spreadAlong(
    climbers.map(c => distanceAt(c.progress >= lessons.length ? trail.length - 1 : c.progress)),
    2 * markerR + 3
  );
  const placed = climbers.map((climber, i) => {
    const { point: [px, py], dir: [dx, dy] } = pointAt(spots[i]);
    let [nx, ny] = [dy, -dx];
    if (ny > 0) [nx, ny] = [-nx, -ny];
    const offset = markerR + (compact ? 17 : 20) * k;
    return { ...climber, x: px + nx * offset, y: py + ny * offset };
  });

  // Station state: for the selected boy, his own state; otherwise how many of the group are approved
  const stationInfo = lessons.map(lesson => {
    if (selected) {
      const fraction = lessonFraction(selected, lesson, lessonsData);
      return { approved: fraction >= 1 && isLessonApproved(selected, lesson, lessonsData), fraction, count: 0 };
    }
    const count = participants.filter(p => isLessonApproved(p, lesson, lessonsData)).length;
    return { approved: participants.length > 0 && count === participants.length, fraction: 0, count };
  });
  const nextStation = stationInfo.findIndex(s => !s.approved);

  const graduation = lessonsData.graduation;
  const summitLabel = graduation?.label ?? 'Promoção';
  const summitDate = graduation?.date
    ? new Date(`${graduation.date}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')
    : undefined;

  return (
    <figure ref={figureRef} className="relative">
      <svg
        viewBox={`0 ${top} ${layout.width} ${layout.height - top}`}
        className="w-full h-auto rounded-xl"
        role="img"
        aria-label={`Escalada do Manual do Candidato: ${lessons.length} tarefas até a ${summitLabel}`}
      >
        <defs>
          <linearGradient id="climb-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--royal-blue-light))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--card))" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="climb-mountain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--royal-blue-light))" />
            <stop offset="100%" stopColor="hsl(var(--royal-blue-dark))" />
          </linearGradient>
          <filter id="climb-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="hsl(var(--royal-blue-dark))" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Scenery */}
        <rect y={top} width={layout.width} height={layout.height - top} fill="url(#climb-sky)" />
        <polygon points={layout.backRange} fill="hsl(var(--royal-blue-light))" opacity="0.28" />
        <polygon points={layout.mountain} fill="url(#climb-mountain)" />
        <polygon points={layout.snow} fill="hsl(var(--primary-foreground))" opacity="0.9" />

        {/* Trail */}
        <path
          d={trailPath}
          fill="none"
          stroke="hsl(var(--gold-light))"
          strokeWidth={(compact ? 3 : 4) * k}
          strokeDasharray="2 10"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />

        {/* Base camp */}
        <g transform={`translate(${layout.base[0]} ${layout.base[1]})`}>
          <polygon points="-16,10 0,-14 16,10" fill="hsl(var(--gold))" stroke="hsl(var(--gold-dark))" strokeWidth="2" />
          <polygon points="-5,10 0,0 5,10" fill="hsl(var(--royal-blue-dark))" />
          {!compact && (
            <text y="30" textAnchor="middle" fontSize="13" fontWeight="600" fill="hsl(var(--primary-foreground))">
              Base
            </text>
          )}
        </g>

        {/* Summit flag */}
        <g transform={`translate(${layout.summit[0]} ${layout.summit[1]})`}>
          <line x1="0" y1="0" x2="0" y2="-44" stroke="hsl(var(--gold-dark))" strokeWidth="3" strokeLinecap="round" />
          <polygon points="0,-44 34,-34 0,-24" fill="hsl(var(--gold))" filter="url(#climb-shadow)" />
          <text
            x={isMobile ? 0 : -22}
            y={isMobile ? -78 : -26}
            textAnchor={isMobile ? 'middle' : 'end'}
            fontSize={(isMobile ? 15 : 17) * k}
            fontWeight="700"
            fill="hsl(var(--primary))"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {summitLabel}
            {summitDate && (
              <tspan x={isMobile ? 0 : -22} dy={18 * k} fontSize={13 * k} fontWeight="500" fill="hsl(var(--muted-foreground))" style={{ fontFamily: 'Inter, sans-serif' }}>
                {summitDate}
              </tspan>
            )}
          </text>
        </g>

        {/* Stations */}
        {stations.map(([x, y], i) => {
          const lesson = lessons[i];
          const info = stationInfo[i];
          const isNext = i === nextStation;
          const labelRight = isMobile ? x < layout.width / 2 : true;
          const r = (compact ? 13 : 15) * k;
          return (
            <g key={lesson.id}>
              {isNext && (
                <circle cx={x} cy={y} r={r + 8 * k} fill="hsl(var(--gold))" opacity="0.35" className="animate-pulse" />
              )}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={info.approved ? 'hsl(var(--gold))' : 'hsl(var(--royal-blue-dark))'}
                stroke="hsl(var(--gold))"
                strokeWidth="2.5"
                filter="url(#climb-shadow)"
              />
              {/* Partial progress ring for the selected boy */}
              {selected && !info.approved && info.fraction > 0 && (
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill="none"
                  stroke="hsl(var(--gold-light))"
                  strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * r * info.fraction} ${2 * Math.PI * r}`}
                  transform={`rotate(-90 ${x} ${y})`}
                />
              )}
              <text
                x={x}
                y={y + 4.5 * k}
                textAnchor="middle"
                fontSize={(compact ? 11 : 12) * k}
                fontWeight="700"
                fill={info.approved ? 'hsl(var(--accent-foreground))' : 'hsl(var(--gold-light))'}
              >
                {info.approved ? '✓' : `T${lesson.id}`}
              </text>
              {!compact && (
                <text
                  x={x + (labelRight ? r + 8 : -(r + 8))}
                  y={y + 4.5 * k}
                  textAnchor={labelRight ? 'start' : 'end'}
                  fontSize={(isMobile ? 12 : 13) * k}
                  fontWeight="500"
                  fill="hsl(var(--primary-foreground))"
                  opacity="0.92"
                >
                  {lesson.short ?? lesson.title}
                  {!selected && info.count > 0 && !info.approved && (
                    <tspan fill="hsl(var(--gold-light))" fontWeight="700">{` ${info.count}/${participants.length}`}</tspan>
                  )}
                </text>
              )}
            </g>
          );
        })}

        {/* Climbers */}
        {placed.map(({ participant, color, x, y }) => {
          const dimmed = selected && selected.id !== participant.id;
          const r = markerR;
          return (
            <g key={participant.id} opacity={dimmed ? 0.3 : 1} filter="url(#climb-shadow)">
              <circle cx={x} cy={y} r={r} fill={color} stroke="hsl(var(--card))" strokeWidth="3" />
              <text
                x={x}
                y={y + 5 * k}
                textAnchor="middle"
                fontSize={(compact ? 13 : 15) * k}
                fontWeight="700"
                fill="hsl(var(--card))"
              >
                {participant.name.charAt(0)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Text alternative */}
      <figcaption className="sr-only">
        {placed.map(c => `${c.participant.name}: ${c.progress.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de ${lessons.length} tarefas`).join('; ')}
      </figcaption>
    </figure>
  );
}
