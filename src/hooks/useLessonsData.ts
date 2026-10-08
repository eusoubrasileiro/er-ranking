import { useFetchJson } from "./useFetchJson";

/** A verse of the Manual do Candidato, in the version printed in the notebook */
export interface LessonVerse {
  ref: string;        // e.g. "Rm 3:23" or "Mt 10:32-33"
  version?: string;   // notebook version (e.g. "ARC", "Manual")
}

/** A non-verse requirement of a lesson (e.g. "Tema, Compromisso e Hino") */
export interface LessonItem {
  id: string;
  label: string;
  points: number;
}

export interface Lesson {
  id: number;
  title: string;
  verses?: LessonVerse[];     // required verses - multiplier "lesson"
  challenge?: LessonVerse[];  // optional challenge verses - multiplier "challenge"
  items?: LessonItem[];
  exam?: boolean;             // lesson has a written exam
  note?: string;
}

export interface LessonsData {
  multipliers: { lesson: number; challenge: number };
  exam: { pointsPerGrade: number; maxGrade: number; passGrade: number; retakes: number };
  lessons: Lesson[];
}

/**
 * Hook to fetch the Manual do Candidato lessons (lessons.json)
 */
export const useLessonsData = () => useFetchJson<LessonsData>("lessons", "lessons.json");
