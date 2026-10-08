import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { ViewModeToggle } from '@/components/ViewModeToggle';
import { VersionBadge, KindBadge } from '@/components/VerseBadges';
import { useLeaderboardData } from '@/hooks/useLeaderboardData';
import { isVerseRange, expandVerseRange, calculateVersePoints } from '@/lib/verseUtils';
import {
  getVerseRef,
  isVerseSuspended,
  isVerseVersionPending,
  scoreVerseRecord,
  getVerseRecordPoints,
  findManualVerse,
  type VerseRecord,
} from '@/lib/calculatePoints';
import { BookOpen, Search, ExternalLink, Eye, List, Shield, Crown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Versiculos = () => {
  const { data: leaderboardData, loading, error, scoringContext } = useLeaderboardData();
  const versesData = leaderboardData?.versesData;
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'compact' | 'expanded' | 'allVerses'>('compact');
  const [selectedVersion, setSelectedVersion] = useState<string>('');

  // Points always follow the version the boy recited (the toggle only changes the "Todos Versículos" text)
  const calculateTotalVersePoints = (verses: VerseRecord[]): number => {
    return verses.reduce((total, v) => total + getVerseRecordPoints(v, scoringContext), 0);
  };

  // Text of a single verse in the recited version, falling back to the default version
  const getVerseText = (singleRef: string, version: string) => {
    const byVersion = versesData?.verses[singleRef];
    const exact = byVersion?.[version];
    if (exact) return { data: exact, fallback: false };
    const fallback = byVersion?.[versesData?.defaultVersion ?? 'NVI'];
    return { data: fallback, fallback: !!fallback };
  };

  // Helper function to count total individual verses (expanding ranges, excluding suspended)
  const countTotalVerses = (verses: VerseRecord[]): number => {
    return verses
      .filter(v => !isVerseSuspended(v))
      .reduce((count, v) => count + expandVerseRange(getVerseRef(v)).length, 0);
  };

  // Initialize selected version from localStorage or default
  useEffect(() => {
    if (versesData) {
      const savedVersion = localStorage.getItem('bibleVersion');
      const defaultVersion = versesData.defaultVersion;
      const availableVersions = Object.keys(versesData.versions);

      if (savedVersion && availableVersions.includes(savedVersion)) {
        setSelectedVersion(savedVersion);
      } else if (availableVersions.includes(defaultVersion)) {
        setSelectedVersion(defaultVersion);
      } else if (availableVersions.length > 0) {
        setSelectedVersion(availableVersions[0]);
      }
    }
  }, [versesData]);

  // Save selected version to localStorage
  const handleVersionChange = (version: string) => {
    setSelectedVersion(version);
    localStorage.setItem('bibleVersion', version);
  };

  // Filter participants who have memorized verses
  const participantsWithVerses = leaderboardData?.participants
    .filter(p => p.memorizedVerses && p.memorizedVerses.length > 0)
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aCount = a.memorizedVerses?.length || 0;
      const bCount = b.memorizedVerses?.length || 0;
      if (bCount !== aCount) return bCount - aCount;
      return a.name.localeCompare(b.name);
    }) || [];

  // Get all unique verses for "all verses" view (expanding ranges, excluding suspended)
  const allUniqueVerses = Array.from(
    new Set(
      leaderboardData?.participants
        .flatMap(p => (p.memorizedVerses || []) as VerseRecord[])
        .filter(v => !isVerseSuspended(v))
        .flatMap(v => expandVerseRange(getVerseRef(v)))
    )
  ).sort();

  if (loading) {
    return <LoadingState message="Carregando versículos..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const availableVersions = Object.keys(versesData?.versions || {});

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
                <span className="text-sm font-medium text-accent">Tesouro do Coração</span>
                <Crown className="w-4 h-4 text-accent" />
              </div>

              <h1 className="text-4xl sm:text-5xl font-display font-bold text-primary-foreground mb-4">
                Versículos Memorizados
              </h1>

              <p className="text-lg text-primary-foreground/90 mb-4 flex items-center justify-center gap-3">
                <Shield className="w-5 h-5 text-accent" />
                <span>Proteção para hoje, preparação para a eternidade</span>
                <Crown className="w-5 h-5 text-accent" />
              </p>

              <div className="max-w-2xl mx-auto space-y-2 text-sm text-primary-foreground/80 italic mb-4">
                <p className="flex items-center justify-center gap-1">
                  <Shield className="w-4 h-4 text-accent flex-shrink-0" />
                  <span>"O Senhor te guardará de todo mal; guardará a tua alma." - Sl 121:7-8</span>
                </p>
                <p className="flex items-center justify-center gap-1">
                  <Crown className="w-4 h-4 text-accent flex-shrink-0" />
                  <span>"E a vida eterna é esta: que te conheçam a ti..." - Jo 17:3</span>
                </p>
              </div>

              <p className="text-sm text-primary-foreground/60">
                Texto exato, com referência, na versão de cada embaixador • Atualizado em {versesData?.generatedAt ? new Date(versesData.generatedAt).toLocaleDateString('pt-BR') : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Controls Section */}
        <section className="py-8 border-b bg-muted/30">
          <div className="container px-4">
            <div className="flex flex-col gap-4 max-w-4xl mx-auto">
              {/* Row 1: Search and View Mode */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ViewModeToggle
                  value={viewMode}
                  onChange={setViewMode}
                  options={[
                    { value: 'compact', label: 'Compacto', icon: List },
                    { value: 'expanded', label: 'Expandido', icon: Eye },
                    { value: 'allVerses', label: 'Todos Versículos', icon: BookOpen },
                  ]}
                />
              </div>

              {/* Row 2: Version Toggle */}
              {viewMode === 'allVerses' && availableVersions.length > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground mr-2">Versão:</span>
                  {availableVersions.map((version) => (
                    <Button
                      key={version}
                      variant={selectedVersion === version ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleVersionChange(version)}
                      className={selectedVersion === version ? 'bg-accent text-accent-foreground' : 'border-accent/40 text-accent hover:bg-accent/10'}
                    >
                      {version}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Participants Section */}
        <section className="py-12">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              {viewMode === 'allVerses' ? (
                /* All Verses View - Show all unique verses expanded */
                allUniqueVerses.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Nenhum versículo decorado ainda
                    </h3>
                    <p className="text-muted-foreground">
                      Os versículos decorados aparecerão aqui
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allUniqueVerses.map((ref, idx) => {
                      const verseData = versesData?.verses[ref]?.[selectedVersion];
                      const manual = findManualVerse(ref, scoringContext.lessonsData);
                      const points = verseData?.wordCount
                        ? calculateVersePoints(verseData.wordCount) * (manual?.multiplier ?? 1)
                        : null;
                      return (
                        <div
                          key={idx}
                          className="card-royal p-6 animate-fade-in"
                        >
                          <h3 className="text-lg font-semibold text-accent mb-3 flex items-center gap-2">
                            {verseData?.reference || ref}
                            {manual && <KindBadge kind={manual.kind} multiplier={manual.multiplier} lessonId={manual.lessonId} />}
                          </h3>
                          {verseData ? (
                            <div className="space-y-3">
                              <p className="text-foreground leading-relaxed italic text-base">
                                "{verseData.text}"
                              </p>
                              <div className="flex items-center justify-between pt-2 border-t">
                                <span className="text-sm text-muted-foreground">
                                  {verseData.wordCount} palavras • <span className="text-accent font-semibold">+{points} pts</span>
                                </span>
                                <a
                                  href={verseData.youversionUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                                >
                                  Ver no YouVersion
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm">
                              Texto do versículo não disponível nesta versão
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* By Participant View - Compact or Expanded */
                participantsWithVerses.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhum versículo decorado ainda'}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? 'Tente outro termo de busca' : 'Os versículos decorados aparecerão aqui'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {participantsWithVerses.map((participant) => (
                      <div
                        key={participant.id}
                        className="card-royal p-6 animate-fade-in"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-primary">
                            {participant.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">
                              {countTotalVerses(participant.memorizedVerses || [])} versículo(s)
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-semibold text-accent">
                              +{calculateTotalVersePoints(participant.memorizedVerses || [])} pts
                            </span>
                          </div>
                        </div>

                        {viewMode === 'compact' ? (
                          <div className="flex flex-wrap gap-2">
                            {(participant.memorizedVerses as VerseRecord[] | undefined)?.map((verse, idx) => {
                              const ref = getVerseRef(verse);
                              const suspended = isVerseSuspended(verse);
                              const range = isVerseRange(ref);
                              const parts = scoreVerseRecord(verse, scoringContext);
                              const points = getVerseRecordPoints(verse, scoringContext);
                              const expanded = expandVerseRange(ref);
                              const firstVerseData = getVerseText(expanded[0], parts[0].version).data;

                              if (suspended) {
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-muted-foreground opacity-60 text-sm font-medium line-through"
                                    title="Versículo suspenso"
                                  >
                                    <span>{ref}</span>
                                    <span className="text-xs no-underline">suspenso</span>
                                  </span>
                                );
                              }

                              return (
                                <a
                                  key={idx}
                                  href={firstVerseData?.youversionUrl || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
                                  title={range ? `${expanded.length} versículos` : undefined}
                                >
                                  <span>{ref}</span>
                                  <VersionBadge version={parts[0].version} pending={isVerseVersionPending(verse)} />
                                  <KindBadge kind={parts[0].kind} multiplier={parts[0].multiplier} lessonId={parts[0].lessonId} />
                                  {points > 0 && (
                                    <span className="text-xs opacity-80">+{points}</span>
                                  )}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              );
                            })}
                          </div>
                        ) : (
                          <Accordion type="multiple" className="space-y-2">
                            {(participant.memorizedVerses as VerseRecord[] | undefined)?.map((verse, idx) => {
                              const ref = getVerseRef(verse);
                              const suspended = isVerseSuspended(verse);
                              const range = isVerseRange(ref);
                              const expanded = expandVerseRange(ref);
                              const parts = scoreVerseRecord(verse, scoringContext);
                              const totalPoints = getVerseRecordPoints(verse, scoringContext);
                              const badges = (
                                <>
                                  <VersionBadge version={parts[0].version} pending={isVerseVersionPending(verse)} />
                                  <KindBadge kind={parts[0].kind} multiplier={parts[0].multiplier} lessonId={parts[0].lessonId} />
                                </>
                              );

                              if (range) {
                                // Render verse range with breakdown
                                return (
                                  <AccordionItem key={idx} value={`verse-${idx}`} className={`border border-border rounded-lg overflow-hidden ${suspended ? 'opacity-60' : ''}`}>
                                    <AccordionTrigger className="px-4 hover:bg-muted/50">
                                      <div className="flex items-center gap-2 w-full">
                                        <span className={`font-medium ${suspended ? 'text-muted-foreground line-through' : 'text-accent'}`}>{ref}</span>
                                        <span className="text-xs text-muted-foreground">({expanded.length} versículos)</span>
                                        {badges}
                                        {suspended ? (
                                          <span className="text-xs text-muted-foreground">suspenso</span>
                                        ) : (
                                          <span className="text-xs text-accent/70">+{totalPoints} pts</span>
                                        )}
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 bg-muted/20">
                                      <div className="space-y-4">
                                        {expanded.map((singleRef, vIdx) => {
                                          const { data: verseData, fallback } = getVerseText(singleRef, parts[vIdx].version);
                                          const points = suspended ? null : parts[vIdx].points;
                                          return (
                                            <div key={vIdx} className={vIdx > 0 ? "pt-3 border-t border-border/50" : ""}>
                                              <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-accent/80">
                                                  {verseData?.reference || singleRef}
                                                </span>
                                                {points && (
                                                  <span className="text-xs text-accent/70">+{points} pts</span>
                                                )}
                                              </div>
                                              {verseData ? (
                                                <div className="space-y-2">
                                                  <p className="text-foreground leading-relaxed italic text-sm">
                                                    "{verseData.text}"
                                                  </p>
                                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>{fallback ? `Texto ${parts[vIdx].version} ainda não cadastrado (mostrando ${versesData?.defaultVersion})` : `${verseData.wordCount} palavras`}</span>
                                                    <a
                                                      href={verseData.youversionUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="inline-flex items-center gap-1 text-accent hover:underline"
                                                    >
                                                      YouVersion
                                                      <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                  </div>
                                                </div>
                                              ) : (
                                                <p className="text-muted-foreground text-sm">
                                                  Texto não disponível
                                                </p>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                );
                              }

                              // Render single verse
                              const { data: verseData, fallback } = getVerseText(ref, parts[0].version);
                              const points = suspended ? null : totalPoints;
                              return (
                                <AccordionItem key={idx} value={`verse-${idx}`} className={`border border-border rounded-lg overflow-hidden ${suspended ? 'opacity-60' : ''}`}>
                                  <AccordionTrigger className="px-4 hover:bg-muted/50">
                                    <div className="flex items-center gap-2 w-full">
                                      <span className={`font-medium ${suspended ? 'text-muted-foreground line-through' : 'text-accent'}`}>{verseData?.reference || ref}</span>
                                      {badges}
                                      {suspended ? (
                                        <span className="text-xs text-muted-foreground">suspenso</span>
                                      ) : points && (
                                        <span className="text-xs text-accent/70">+{points} pts</span>
                                      )}
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-4 bg-muted/20">
                                    {verseData ? (
                                      <div className="space-y-3">
                                        <p className="text-foreground leading-relaxed italic">
                                          "{verseData.text}"
                                        </p>
                                        <div className="flex items-center justify-between pt-2 border-t">
                                          <span className="text-sm text-muted-foreground">
                                            {fallback
                                              ? `Texto ${parts[0].version} ainda não cadastrado (mostrando ${versesData?.defaultVersion})`
                                              : `${verseData.wordCount} palavras`} • <span className="text-accent font-semibold">+{points} pts</span>
                                          </span>
                                          <a
                                            href={verseData.youversionUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                                          >
                                            Ver no YouVersion
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-muted-foreground text-sm">
                                        Texto do versículo não disponível nesta versão
                                      </p>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Versiculos;
