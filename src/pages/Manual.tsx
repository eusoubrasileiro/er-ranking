import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { KindBadge, VersionBadge } from '@/components/VerseBadges';
import { useLeaderboardData, type Participant } from '@/hooks/useLeaderboardData';
import type { Lesson, LessonVerse } from '@/hooks/useLessonsData';
import { expandVerseRange } from '@/lib/verseUtils';
import {
  getVerseRef,
  isVerseSuspended,
  scoreVerseRecord,
  getBestExamGrade,
  getExamPoints,
  isLessonItemDone,
  type ScoringContext,
} from '@/lib/calculatePoints';
import { GraduationCap, Shield, Crown, Check, Minus, ExternalLink, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Single verses of a lesson verse list (ranges expanded), keeping the notebook version */
function expandLessonVerses(verses: LessonVerse[] | undefined) {
  return (verses ?? []).flatMap(v => expandVerseRange(v.ref).map(ref => ({ ref, version: v.version })));
}

/** Single verse refs a participant has recited (not suspended) */
function recitedRefs(participant: Participant): Set<string> {
  return new Set(
    (participant.memorizedVerses ?? [])
      .filter(v => !isVerseSuspended(v))
      .flatMap(v => expandVerseRange(getVerseRef(v)))
  );
}

/** Points a participant earned inside one lesson: its verses, items and exam */
function lessonPoints(participant: Participant, lesson: Lesson, ctx: ScoringContext): number {
  const versePts = (participant.memorizedVerses ?? [])
    .filter(v => !isVerseSuspended(v))
    .flatMap(v => scoreVerseRecord(v, ctx))
    .filter(part => part.lessonId === lesson.id)
    .reduce((sum, part) => sum + part.points, 0);
  const itemPts = (lesson.items ?? [])
    .filter(item => isLessonItemDone(participant, lesson.id, item.id))
    .reduce((sum, item) => sum + item.points, 0);
  const examPts = ctx.lessonsData ? getExamPoints(participant, lesson, ctx.lessonsData) : 0;
  return versePts + itemPts + examPts;
}

function DoneCell({ done }: { done: boolean }) {
  return done
    ? <Check className="w-4 h-4 text-green-600 mx-auto" aria-label="feito" />
    : <Minus className="w-4 h-4 text-muted-foreground/50 mx-auto" aria-label="falta" />;
}

const Manual = () => {
  const { data, loading, error, scoringContext } = useLeaderboardData();

  if (loading) {
    return <LoadingState message="Carregando Manual do Candidato..." />;
  }

  if (error || !data) {
    return <ErrorState message={error || 'Não foi possível carregar os dados.'} />;
  }

  const lessonsData = data.lessonsData;
  const versesData = data.versesData;
  const participants = [...data.participants].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden royal-gradient py-16 sm:py-20">
          <div className="container px-4 relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/40 mb-6">
                <Shield className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-accent">Rumo à promoção</span>
                <Crown className="w-4 h-4 text-accent" />
              </div>

              <h1 className="text-4xl sm:text-5xl font-display font-bold text-primary-foreground mb-4">
                Manual do Candidato
              </h1>

              {lessonsData && (
                <p className="text-sm sm:text-base text-primary-foreground/80">
                  Versículo da tarefa vale ×{lessonsData.multipliers.lesson} • Desafio vale ×{lessonsData.multipliers.challenge} •
                  Prova: nota × {lessonsData.exam.pointsPerGrade}, aprovado com {lessonsData.exam.passGrade}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto space-y-8">
              {!lessonsData || lessonsData.lessons.length === 0 ? (
                <EmptyState
                  icon={GraduationCap}
                  title="Nenhuma tarefa cadastrada"
                  description="As tarefas do Manual aparecerão aqui"
                />
              ) : lessonsData.lessons.map(lesson => {
                const required = expandLessonVerses(lesson.verses);
                const challenge = expandLessonVerses(lesson.challenge);
                const verseColumns = [
                  ...required.map(v => ({ ...v, kind: 'lesson' as const })),
                  ...challenge.map(v => ({ ...v, kind: 'challenge' as const })),
                ];

                return (
                  <div key={lesson.id} className="card-royal p-4 sm:p-6 animate-fade-in">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex-shrink-0">
                        <GraduationCap className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Tarefa {lesson.id}</p>
                        <h2 className="text-lg font-semibold text-primary">{lesson.title}</h2>
                      </div>
                    </div>

                    {/* What to memorize, in the notebook version */}
                    {verseColumns.length > 0 && (
                      <div className="space-y-3 mb-5">
                        {verseColumns.map(col => {
                          const byVersion = versesData?.verses[col.ref];
                          const verse = (col.version && byVersion?.[col.version]) || byVersion?.[versesData?.defaultVersion ?? 'NVI'];
                          const multiplier = col.kind === 'challenge'
                            ? lessonsData.multipliers.challenge
                            : lessonsData.multipliers.lesson;
                          return (
                            <div key={col.ref} className="rounded-lg bg-muted/30 border border-border p-3">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-medium text-accent">{verse?.reference ?? col.ref}</span>
                                {col.version && <VersionBadge version={col.version} />}
                                <KindBadge kind={col.kind} multiplier={multiplier} lessonId={lesson.id} />
                                {col.kind === 'challenge' && (
                                  <span className="text-xs text-muted-foreground">opcional</span>
                                )}
                                {verse?.youversionUrl && (
                                  <a
                                    href={verse.youversionUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-auto inline-flex items-center gap-1 text-xs text-accent hover:underline"
                                  >
                                    Bíblia
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              {verse && (
                                <p className="text-sm text-foreground italic leading-relaxed">"{verse.text}"</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {lesson.note && (
                      <p className="text-sm text-muted-foreground italic mb-5">{lesson.note}</p>
                    )}

                    {/* Progress grid: scrolls inside the card on small screens */}
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <table className="w-full text-sm min-w-max">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="text-left font-medium py-2 px-4 sm:px-2 sticky left-0 bg-card">Embaixador</th>
                            {verseColumns.map(col => (
                              <th key={col.ref} className="font-medium py-2 px-2 whitespace-nowrap">
                                {col.ref}{col.kind === 'challenge' && ' ★'}
                              </th>
                            ))}
                            {(lesson.items ?? []).map(item => (
                              <th key={item.id} className="font-medium py-2 px-2 max-w-[7rem]">{item.label}</th>
                            ))}
                            {lesson.exam && <th className="font-medium py-2 px-2">Prova</th>}
                            <th className="font-medium py-2 px-2 text-right">Pontos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {participants.map(participant => {
                            const recited = recitedRefs(participant);
                            const grade = getBestExamGrade(participant, lesson.id);
                            const attempts = (participant.exams ?? []).filter(e => e.lesson === lesson.id).length;
                            const passed = grade !== undefined && grade >= lessonsData.exam.passGrade;
                            const approved =
                              required.every(v => recited.has(v.ref)) &&
                              (lesson.items ?? []).every(item => isLessonItemDone(participant, lesson.id, item.id)) &&
                              (!lesson.exam || passed);
                            return (
                              <tr key={participant.id} className="border-b last:border-0">
                                <td className="py-2 px-4 sm:px-2 font-medium text-foreground sticky left-0 bg-card">
                                  <span className="inline-flex items-center gap-1">
                                    {participant.name}
                                    {approved && (
                                      <BadgeCheck className="w-4 h-4 text-accent" aria-label="Tarefa aprovada" />
                                    )}
                                  </span>
                                </td>
                                {verseColumns.map(col => (
                                  <td key={col.ref} className="py-2 px-2 text-center">
                                    <DoneCell done={recited.has(col.ref)} />
                                  </td>
                                ))}
                                {(lesson.items ?? []).map(item => (
                                  <td key={item.id} className="py-2 px-2 text-center">
                                    <DoneCell done={isLessonItemDone(participant, lesson.id, item.id)} />
                                  </td>
                                ))}
                                {lesson.exam && (
                                  <td className="py-2 px-2 text-center">
                                    {grade === undefined ? (
                                      <Minus className="w-4 h-4 text-muted-foreground/50 mx-auto" aria-label="sem prova" />
                                    ) : (
                                      <span
                                        className={cn('font-semibold', passed ? 'text-green-600' : 'text-destructive')}
                                        title={attempts > 1 ? 'Maior nota entre prova e recuperação' : undefined}
                                      >
                                        {grade.toLocaleString('pt-BR')}{attempts > 1 && 'ʳ'}
                                      </span>
                                    )}
                                  </td>
                                )}
                                <td className="py-2 px-2 text-right font-semibold text-accent">
                                  {lessonPoints(participant, lesson, scoringContext)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              <p className="text-xs text-muted-foreground text-center">
                <BadgeCheck className="w-3 h-3 inline text-accent" /> tarefa aprovada (versículos obrigatórios, itens e prova ≥ {lessonsData?.exam.passGrade ?? 7})
                • ★ desafio opcional • ʳ nota da recuperação
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Manual;
