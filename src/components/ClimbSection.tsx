import { Link } from 'react-router-dom';
import { Mountain, ChevronRight } from 'lucide-react';
import { ClimbMountain } from '@/components/ClimbMountain';
import { markerColor } from '@/lib/climbColors';
import type { Participant } from '@/hooks/useLeaderboardData';
import type { LessonsData } from '@/hooks/useLessonsData';
import { climbProgress } from '@/lib/manualProgress';
import { cn } from '@/lib/utils';

interface ClimbLegendProps {
  participants: Participant[];
  lessonsData: LessonsData;
  selectedId?: number;
  onSelect?: (id: number | undefined) => void;
}

/**
 * Name chips with each boy's marker colour and climb progress. Clickable when onSelect is given.
 */
export function ClimbLegend({ participants, lessonsData, selectedId, onSelect }: ClimbLegendProps) {
  const total = lessonsData.lessons.length;
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {participants.map((participant, index) => {
        const progress = climbProgress(participant, lessonsData);
        const active = selectedId === participant.id;
        const content = (
          <>
            <span
              className={cn('w-3 h-3 rounded-full flex-shrink-0', active && 'ring-2 ring-card')}
              style={{ background: markerColor(index) }}
            />
            <span className="font-medium">{participant.name}</span>
            <span className="tabular-nums text-xs opacity-80">
              {progress.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/{total}
            </span>
          </>
        );
        const className = cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors',
          active
            ? 'bg-accent text-accent-foreground border-accent'
            : 'bg-accent/10 text-foreground border-accent/30'
        );
        return onSelect ? (
          <button
            key={participant.id}
            type="button"
            onClick={() => onSelect(active ? undefined : participant.id)}
            className={cn(className, !active && 'hover:bg-accent/20')}
            aria-pressed={active}
          >
            {content}
          </button>
        ) : (
          <span key={participant.id} className={className}>{content}</span>
        );
      })}
    </div>
  );
}

interface ClimbSectionProps {
  participants: Participant[];
  lessonsData: LessonsData;
}

/**
 * "A Escalada" on the Ranking page: compact mountain + legend, links to the Manual page.
 */
export function ClimbSection({ participants, lessonsData }: ClimbSectionProps) {
  const ordered = [...participants].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <section className="py-12 px-4">
      <div className="container">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Mountain className="w-4 h-4" />
            <span className="text-sm font-medium">Manual do Candidato</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            A Escalada
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Cordada rumo à {lessonsData.graduation?.label ?? 'promoção'}: todos no topo!
          </p>
        </div>

        <Link to="/manual" className="block max-w-3xl mx-auto card-royal p-3 sm:p-4 group">
          <ClimbMountain participants={ordered} lessonsData={lessonsData} variant="compact" />
          <div className="mt-4 space-y-3">
            <ClimbLegend participants={ordered} lessonsData={lessonsData} />
            <p className="text-center text-sm font-medium text-accent inline-flex items-center justify-center gap-1 w-full group-hover:underline">
              Ver tarefas de cada embaixador
              <ChevronRight className="w-4 h-4" />
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
}
