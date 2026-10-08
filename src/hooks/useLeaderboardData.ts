import { useState, useEffect } from 'react';
import { calculateParticipantPoints, calculateDeltaPoints, type VerseRecord, type VisitorRecord, type ScoringContext } from '@/lib/calculatePoints';
import type { GamesData } from '@/hooks/useGamesData';
import type { BonusData } from '@/hooks/useBonusData';
import type { LessonsData } from '@/hooks/useLessonsData';

export interface Rule {
  id: number;
  description: string;
  points: number;
  icon?: string;
  explanation?: string;
  display?: string;       // Badge text instead of "+points" (e.g. "2×", "até 50")
  activityType?: string;  // Maps to attendance record types (e.g., "embaixada", "igreja", "quarto", "cozinha")
}

// Activity tracking types - generic to support any activity type
export interface AttendanceRecord {
  date: string;        // ISO date
  type: string;        // Activity type (e.g., "embaixada", "igreja", "quarto", "cozinha", "banheiro", "fora")
}

// Written exam of a Manual do Candidato lesson (a retake is just another record)
export interface ExamRecord {
  lesson: number;
  grade: number;   // 0-10
  date: string;
  addedAt?: string;
}

// Completed non-verse item of a lesson (e.g. "tema-compromisso-hino")
export interface LessonItemRecord {
  lesson: number;
  item: string;
  date: string;
  addedAt?: string;
}

export interface DisciplineRecord {
  date: string;
  points: number;  // -10, -7, or -5 depending on member type
  reason?: string;
  addedAt?: string;
}

export interface SermonNoteRecord {
  date: string;
  points: number;  // 0-30, proportional to quality/age
  description?: string;
  addedAt?: string;
}

// Verses data structure (from verses.json)
export interface VerseInfo {
  reference: string;
  text: string;
  wordCount: number;
  youversionUrl: string;
}

export interface VersesData {
  generatedAt: string;
  defaultVersion: string;
  versions: Record<string, { id: number; name: string; fullTitle: string }>;
  verses: Record<string, Record<string, VerseInfo>>;
}

export interface Participant {
  id: number;
  name: string;
  startPoints?: number;  // Baseline points from before tracking system
  points?: number;       // Legacy field - ignored when computing
  memorizedVerses?: VerseRecord[];
  visitors?: VisitorRecord[];
  attendance?: AttendanceRecord[];
  exams?: ExamRecord[];
  lessonItems?: LessonItemRecord[];
  disciplines?: DisciplineRecord[];
  sermonNotes?: SermonNoteRecord[];
  previousPoints?: number;      // Points at last snapshot
  previousPointsAt?: string;    // ISO date of when snapshot was taken
}

// Participant with computed points for display
export interface ParticipantWithPoints extends Omit<Participant, 'points'> {
  points: number;
  pointsDelta?: number;  // Computed: points - previousPoints
}

interface RawLeaderboardData {
  season: string;
  updatedAt: string;
  pointsAsOf?: string;  // Date for delta calculation
  participants: Participant[];
}

interface RulesData {
  rules: Rule[];
}

export interface LeaderboardData {
  season: string;
  updatedAt: string;
  pointsAsOf?: string;  // Date for delta calculation
  rules: Rule[];
  participants: Participant[];
  versesData?: VersesData;
  gamesData?: GamesData;
  bonusData?: BonusData;
  lessonsData?: LessonsData;
}

export function useLeaderboardData() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leaderboardResponse, rulesResponse, versesResponse, gamesResponse, bonusResponse, lessonsResponse] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/leaderboard.json`),
          fetch(`${import.meta.env.BASE_URL}data/rules.json`),
          fetch(`${import.meta.env.BASE_URL}data/verses.json`),
          fetch(`${import.meta.env.BASE_URL}data/games.json`),
          fetch(`${import.meta.env.BASE_URL}data/bonus.json`),
          fetch(`${import.meta.env.BASE_URL}data/lessons.json`)
        ]);

        if (!leaderboardResponse.ok || !rulesResponse.ok) {
          throw new Error('Falha ao carregar dados');
        }

        const [leaderboardData, rulesData]: [RawLeaderboardData, RulesData] = await Promise.all([
          leaderboardResponse.json(),
          rulesResponse.json()
        ]);

        // Verses data is optional - app should work without it
        let versesData: VersesData | undefined;
        if (versesResponse.ok) {
          versesData = await versesResponse.json();
        }

        // Games data is optional - app should work without it
        let gamesData: GamesData | undefined;
        if (gamesResponse.ok) {
          gamesData = await gamesResponse.json();
        }

        // Bonus data is optional - app should work without it
        let bonusData: BonusData | undefined;
        if (bonusResponse.ok) {
          bonusData = await bonusResponse.json();
        }

        // Lessons data is optional - app should work without it
        let lessonsData: LessonsData | undefined;
        if (lessonsResponse.ok) {
          lessonsData = await lessonsResponse.json();
        }

        setData({
          ...leaderboardData,
          rules: rulesData.rules,
          versesData,
          gamesData,
          bonusData,
          lessonsData
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Compute points for each participant from their activity records
  const scoringContext: ScoringContext = {
    rules: data?.rules ?? [],
    versesData: data?.versesData,
    lessonsData: data?.lessonsData,
    gamesData: data?.gamesData,
    bonusData: data?.bonusData,
  };

  const sortedParticipants: ParticipantWithPoints[] = (data?.participants ?? [])
    .map(participant => {
      const currentPoints = calculateParticipantPoints(participant, scoringContext);
      // Calculate delta based on pointsAsOf date (if set)
      // Falls back to previousPoints comparison for backwards compatibility
      let pointsDelta: number | undefined;
      if (data?.pointsAsOf) {
        pointsDelta = calculateDeltaPoints(participant, scoringContext, data.pointsAsOf);
        // Only show delta if > 0
        if (pointsDelta === 0) pointsDelta = undefined;
      } else if (participant.previousPoints !== undefined) {
        pointsDelta = currentPoints - participant.previousPoints;
      }
      return {
        ...participant,
        points: currentPoints,
        pointsDelta
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.name.localeCompare(b.name);
    });

  return { data, loading, error, sortedParticipants, scoringContext };
}
