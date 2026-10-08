import type { Rule, Participant, VersesData, AttendanceRecord } from '@/hooks/useLeaderboardData';
import type { GamesData } from '@/hooks/useGamesData';
import type { BonusData } from '@/hooks/useBonusData';
import type { LessonsData, Lesson } from '@/hooks/useLessonsData';
import { expandVerseRange, calculateVersePoints } from '@/lib/verseUtils';

// Type for verse that can be string (legacy) or object with metadata
export type VerseRecord = string | {
  ref: string;
  version?: string;          // Bible version the boy recited (e.g. "ARA", "NAA", "NVI", "Manual")
  versionPending?: boolean;  // true = version not confirmed yet, review with the boy
  addedAt?: string;
  suspended?: boolean;
  suspendedAt?: string;
};

// Type for visitor that can be string or object with addedAt
export type VisitorRecord = string | { name: string; addedAt?: string };

// Extended attendance record with optional addedAt
export interface AttendanceRecordWithTimestamp extends AttendanceRecord {
  addedAt?: string;
}

/** Everything needed to score a participant, besides the participant itself */
export interface ScoringContext {
  rules: Rule[];
  versesData?: VersesData;
  lessonsData?: LessonsData;
  gamesData?: GamesData;
  bonusData?: BonusData;
}

/**
 * Check if an activity should be counted based on pointsAsOf date
 */
function isAfterDate(addedAt: string | undefined, pointsAsOf: string | undefined): boolean {
  if (!pointsAsOf) return true; // No cutoff, count everything
  if (!addedAt) return false;   // No timestamp, don't count for delta
  return new Date(addedAt) >= new Date(pointsAsOf);
}

/**
 * Get the ref from a verse record (string or object)
 */
export function getVerseRef(verse: VerseRecord): string {
  return typeof verse === 'string' ? verse : verse.ref;
}

/**
 * Get the addedAt from a verse record
 */
export function getVerseAddedAt(verse: VerseRecord): string | undefined {
  return typeof verse === 'string' ? undefined : verse.addedAt;
}

/**
 * Get the Bible version a verse was recited in (falls back to the site default)
 */
export function getVerseVersion(verse: VerseRecord, versesData?: VersesData): string {
  return (typeof verse !== 'string' && verse.version) || versesData?.defaultVersion || 'NVI';
}

/**
 * Check if the version of a verse still needs to be confirmed
 */
export function isVerseVersionPending(verse: VerseRecord): boolean {
  return typeof verse !== 'string' && verse.versionPending === true;
}

/**
 * Check if a verse is suspended (temporarily removed from scoring)
 */
export function isVerseSuspended(verse: VerseRecord): boolean {
  return typeof verse !== 'string' && verse.suspended === true;
}

/**
 * Get the name from a visitor record (string or object)
 */
export function getVisitorName(visitor: VisitorRecord): string {
  return typeof visitor === 'string' ? visitor : visitor.name;
}

/**
 * Get the addedAt from a visitor record
 */
export function getVisitorAddedAt(visitor: VisitorRecord): string | undefined {
  return typeof visitor === 'string' ? undefined : visitor.addedAt;
}

/**
 * Get point value for a rule by activityType
 */
function getRulePointsByActivityType(rules: Rule[], activityType: string): number {
  return rules.find(r => r.activityType === activityType)?.points ?? 0;
}

/**
 * Get point value for a rule by matching description pattern (fallback)
 */
function getRulePointsByPattern(rules: Rule[], pattern: string): number {
  return rules.find(r => r.description.toLowerCase().includes(pattern.toLowerCase()))?.points ?? 0;
}

export type VerseKind = 'free' | 'lesson' | 'challenge';

/** Where a single verse sits in the Manual do Candidato (if anywhere) */
export interface ManualVerseInfo {
  kind: Exclude<VerseKind, 'free'>;
  lessonId: number;
  multiplier: number;
}

/**
 * Find whether a single verse ref is a required ("lesson") or challenge verse of some lesson.
 */
export function findManualVerse(singleRef: string, lessonsData?: LessonsData): ManualVerseInfo | undefined {
  if (!lessonsData) return undefined;
  for (const lesson of lessonsData.lessons) {
    if (lesson.verses?.some(v => expandVerseRange(v.ref).includes(singleRef))) {
      return { kind: 'lesson', lessonId: lesson.id, multiplier: lessonsData.multipliers.lesson };
    }
    if (lesson.challenge?.some(v => expandVerseRange(v.ref).includes(singleRef))) {
      return { kind: 'challenge', lessonId: lesson.id, multiplier: lessonsData.multipliers.challenge };
    }
  }
  return undefined;
}

/** Points breakdown for one individual verse of a verse record */
export interface VersePart {
  ref: string;
  version: string;
  wordCount?: number;      // undefined = text not available in that version
  basePoints: number;      // 25 or 35
  kind: VerseKind;
  lessonId?: number;
  multiplier: number;
  points: number;          // basePoints * multiplier
}

type VerseScoringContext = Pick<ScoringContext, 'rules' | 'versesData' | 'lessonsData'>;

/**
 * Score a verse record, verse by verse (ranges are expanded).
 * Word count comes from the version the boy recited, never from the viewer's toggle.
 * If that version's text is missing, falls back to the default version's word count.
 */
export function scoreVerseRecord(verse: VerseRecord, ctx: VerseScoringContext): VersePart[] {
  const smallVersePts = getRulePointsByPattern(ctx.rules, '<20') || 25;
  const largeVersePts = getRulePointsByPattern(ctx.rules, '>=20') || 35;
  const version = getVerseVersion(verse, ctx.versesData);
  const defaultVersion = ctx.versesData?.defaultVersion ?? 'NVI';

  return expandVerseRange(getVerseRef(verse)).map(singleRef => {
    const byVersion = ctx.versesData?.verses[singleRef];
    const wordCount = byVersion?.[version]?.wordCount ?? byVersion?.[defaultVersion]?.wordCount;
    const basePoints = wordCount !== undefined
      ? calculateVersePoints(wordCount, smallVersePts, largeVersePts)
      : smallVersePts;
    const manual = findManualVerse(singleRef, ctx.lessonsData);
    const multiplier = manual?.multiplier ?? 1;
    return {
      ref: singleRef,
      version,
      wordCount: byVersion?.[version]?.wordCount,
      basePoints,
      kind: manual?.kind ?? 'free',
      lessonId: manual?.lessonId,
      multiplier,
      points: basePoints * multiplier,
    };
  });
}

/**
 * Total points of a verse record (0 if suspended)
 */
export function getVerseRecordPoints(verse: VerseRecord, ctx: VerseScoringContext): number {
  if (isVerseSuspended(verse)) return 0;
  return scoreVerseRecord(verse, ctx).reduce((sum, part) => sum + part.points, 0);
}

/**
 * Best exam grade for a lesson (a retake only counts if it is better)
 */
export function getBestExamGrade(participant: Participant, lessonId: number): number | undefined {
  const grades = (participant.exams ?? []).filter(e => e.lesson === lessonId).map(e => e.grade);
  return grades.length > 0 ? Math.max(...grades) : undefined;
}

/**
 * Exam points for one lesson: best grade * pointsPerGrade (grade capped at maxGrade)
 */
export function getExamPoints(participant: Participant, lesson: Lesson, lessonsData: LessonsData): number {
  if (!lesson.exam) return 0;
  const best = getBestExamGrade(participant, lesson.id);
  if (best === undefined) return 0;
  const { pointsPerGrade, maxGrade } = lessonsData.exam;
  return Math.round(Math.min(best, maxGrade) * pointsPerGrade);
}

/**
 * Check if a lesson item (e.g. "Tema, Compromisso e Hino") was completed
 */
export function isLessonItemDone(participant: Participant, lessonId: number, itemId: string): boolean {
  return (participant.lessonItems ?? []).some(i => i.lesson === lessonId && i.item === itemId);
}

/**
 * Points for completed lesson items
 */
function getLessonItemPoints(participant: Participant, lessonsData?: LessonsData): number {
  return (participant.lessonItems ?? []).reduce((sum, done) => {
    const lesson = lessonsData?.lessons.find(l => l.id === done.lesson);
    return sum + (lesson?.items?.find(i => i.id === done.item)?.points ?? 0);
  }, 0);
}

/**
 * Calculate total points for a participant based on their activity records.
 * Points are derived from rules.json and lessons.json values, making them configurable.
 */
export function calculateParticipantPoints(participant: Participant, ctx: ScoringContext): number {
  const { rules, lessonsData } = ctx;

  // Start with baseline points (frozen from before tracking system)
  let total = participant.startPoints ?? 0;

  // Attendance points - use activityType from rules
  participant.attendance?.forEach(a => {
    // First try to get points by activityType match
    const pointsByType = getRulePointsByActivityType(rules, a.type);
    if (pointsByType !== 0) {
      total += pointsByType;
    } else {
      // Fallback to pattern matching for backward compatibility
      if (a.type === 'embaixada') {
        total += getRulePointsByPattern(rules, 'embaixada');
      } else if (a.type === 'igreja') {
        total += getRulePointsByPattern(rules, 'compromissos');
      } else {
        // Generic activity type - try to match by type name
        total += getRulePointsByPattern(rules, a.type);
      }
    }
  });

  // Visitor points
  const visitorPts = getRulePointsByPattern(rules, 'visitante');
  total += (participant.visitors?.length ?? 0) * visitorPts;

  // Verse points - word count of the recited version, times the Manual multiplier
  participant.memorizedVerses?.forEach(verse => {
    total += getVerseRecordPoints(verse, ctx);
  });

  // Manual do Candidato: lesson items and written exams
  total += getLessonItemPoints(participant, lessonsData);
  lessonsData?.lessons.forEach(lesson => {
    total += getExamPoints(participant, lesson, lessonsData);
  });

  // Discipline penalties (stored per record with specific point values)
  participant.disciplines?.forEach(d => {
    total += d.points;  // negative values
  });

  // Sermon notes points (0-30 per note, assigned by leader)
  participant.sermonNotes?.forEach(n => {
    total += n.points;
  });

  // Game points - sum all results for this participant
  ctx.gamesData?.games?.forEach(game => {
    game.results
      .filter(r => r.participantId === participant.id)
      .forEach(r => {
        total += r.points;
      });
  });

  // Bonus points - from challenges in bonus.json
  ctx.bonusData?.challenges?.forEach(challenge => {
    challenge.results
      .filter(r => r.participantId === participant.id)
      .forEach(r => {
        total += r.points;
      });
  });

  return total;
}

/**
 * Calculate delta points - only activities added after pointsAsOf.
 * This is used to show "points gained since X date".
 *
 * Computed as total(now) - total(only records from before pointsAsOf), so it follows
 * exactly the same scoring rules (including "best exam grade counts").
 */
export function calculateDeltaPoints(participant: Participant, ctx: ScoringContext, pointsAsOf: string): number {
  const before = <T,>(items: T[] | undefined, getAddedAt: (item: T) => string | undefined) =>
    items?.filter(item => !isAfterDate(getAddedAt(item), pointsAsOf));

  const participantBefore: Participant = {
    ...participant,
    attendance: before(participant.attendance, a => (a as AttendanceRecordWithTimestamp).addedAt),
    visitors: before(participant.visitors, v => getVisitorAddedAt(v)),
    memorizedVerses: before(participant.memorizedVerses, v => getVerseAddedAt(v)),
    exams: before(participant.exams, e => e.addedAt),
    lessonItems: before(participant.lessonItems, i => i.addedAt),
    disciplines: before(participant.disciplines, d => d.addedAt),
    sermonNotes: before(participant.sermonNotes, n => n.addedAt),
  };

  const ctxBefore: ScoringContext = {
    ...ctx,
    gamesData: ctx.gamesData && {
      ...ctx.gamesData,
      games: before(ctx.gamesData.games, g => g.date) ?? [],
    },
    bonusData: ctx.bonusData && {
      ...ctx.bonusData,
      challenges: before(ctx.bonusData.challenges, c => c.date) ?? [],
    },
  };

  return calculateParticipantPoints(participant, ctx) - calculateParticipantPoints(participantBefore, ctxBefore);
}
