import type { Participant } from '@/hooks/useLeaderboardData';
import type { Lesson, LessonsData, LessonVerse } from '@/hooks/useLessonsData';
import { expandVerseRange } from '@/lib/verseUtils';
import { getVerseRef, isVerseSuspended, getBestExamGrade, isLessonItemDone } from '@/lib/calculatePoints';

/** Single verses of a lesson verse list (ranges expanded), keeping the notebook version */
export function expandLessonVerses(verses: LessonVerse[] | undefined) {
  return (verses ?? []).flatMap(v => expandVerseRange(v.ref).map(ref => ({ ref, version: v.version })));
}

/** Single verse refs a participant has recited (not suspended) */
export function recitedRefs(participant: Participant): Set<string> {
  return new Set(
    (participant.memorizedVerses ?? [])
      .filter(v => !isVerseSuspended(v))
      .flatMap(v => expandVerseRange(getVerseRef(v)))
  );
}

/** One requirement for approving a lesson */
export interface LessonPart {
  label: string;
  done: boolean;
}

/**
 * Requirements for approving a lesson: required verses, items and the exam (grade >= passGrade).
 * Challenge verses earn points but are optional, so they are not parts.
 */
export function lessonParts(participant: Participant, lesson: Lesson, lessonsData: LessonsData): LessonPart[] {
  const recited = recitedRefs(participant);
  const grade = getBestExamGrade(participant, lesson.id);
  return [
    ...expandLessonVerses(lesson.verses).map(v => ({ label: v.ref, done: recited.has(v.ref) })),
    ...(lesson.items ?? []).map(item => ({ label: item.label, done: isLessonItemDone(participant, lesson.id, item.id) })),
    ...(lesson.exam
      ? [{ label: 'Prova', done: grade !== undefined && grade >= lessonsData.exam.passGrade }]
      : []),
  ];
}

/** A lesson is approved when every part is done */
export function isLessonApproved(participant: Participant, lesson: Lesson, lessonsData: LessonsData): boolean {
  const parts = lessonParts(participant, lesson, lessonsData);
  return parts.length > 0 && parts.every(p => p.done);
}

/** Fraction (0-1) of a lesson's parts that are done */
export function lessonFraction(participant: Participant, lesson: Lesson, lessonsData: LessonsData): number {
  const parts = lessonParts(participant, lesson, lessonsData);
  if (parts.length === 0) return 0;
  return parts.filter(p => p.done).length / parts.length;
}

/**
 * Position on the climb, from 0 (base camp) to the number of lessons (summit).
 * Sum of each lesson's done fraction, so every verse or exam moves the marker a bit.
 */
export function climbProgress(participant: Participant, lessonsData: LessonsData): number {
  return lessonsData.lessons.reduce((sum, lesson) => sum + lessonFraction(participant, lesson, lessonsData), 0);
}

/**
 * The lesson the participant should focus on next: the first one (in Manual order) not yet approved.
 */
export function currentLesson(participant: Participant, lessonsData: LessonsData): Lesson | undefined {
  return lessonsData.lessons.find(lesson => !isLessonApproved(participant, lesson, lessonsData));
}
