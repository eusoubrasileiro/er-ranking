import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { ViewModeToggle } from '@/components/ViewModeToggle';
import { useLeaderboardData } from '@/hooks/useLeaderboardData';
import { getVisitorName } from '@/lib/calculatePoints';
import { UserPlus, Search, Eye, List, Users, Shield, Crown } from 'lucide-react';
import { Input } from '@/components/ui/input';

const POINTS_PER_VISITOR = 25;

const Visitantes = () => {
  const { data, loading, error } = useLeaderboardData();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'compact' | 'expanded' | 'allVisitors'>('compact');

  // Filter participants who have brought visitors
  const participantsWithVisitors = data?.participants
    .filter(p => p.visitors && p.visitors.length > 0)
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aCount = a.visitors?.length || 0;
      const bCount = b.visitors?.length || 0;
      if (bCount !== aCount) return bCount - aCount;
      return a.name.localeCompare(b.name);
    }) || [];

  // Get all unique visitors with their inviters for "all visitors" view
  const allVisitorsWithInviters = (() => {
    const visitorMap = new Map<string, string[]>();
    data?.participants.forEach(p => {
      p.visitors?.forEach(record => {
        const visitor = getVisitorName(record);
        const existing = visitorMap.get(visitor) || [];
        existing.push(p.name);
        visitorMap.set(visitor, existing);
      });
    });
    return Array.from(visitorMap.entries())
      .map(([visitor, inviters]) => ({ visitor, inviters }))
      .sort((a, b) => a.visitor.localeCompare(b.visitor));
  })();

  const totalVisitors = allVisitorsWithInviters.length;

  if (loading) {
    return <LoadingState message="Carregando visitantes..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

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
                <span className="text-sm font-medium text-accent">Evangelismo</span>
                <Crown className="w-4 h-4 text-accent" />
              </div>

              <h1 className="text-4xl sm:text-5xl font-display font-bold text-primary-foreground mb-4">
                Visitantes Convidados
              </h1>

              <p className="text-lg text-primary-foreground/90 mb-4 flex items-center justify-center gap-3">
                <UserPlus className="w-5 h-5 text-accent" />
                <span>Cada visitante vale +{POINTS_PER_VISITOR} pontos</span>
              </p>

              <p className="text-sm text-primary-foreground/60">
                Total de {totalVisitors} visitante{totalVisitors !== 1 ? 's' : ''} convidado{totalVisitors !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </section>

        {/* Controls Section */}
        <section className="py-8 border-b bg-muted/30">
          <div className="container px-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between max-w-4xl mx-auto">
              {/* Search Input */}
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

              {/* View Mode Toggle */}
              <ViewModeToggle
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { value: 'compact', label: 'Compacto', icon: List },
                  { value: 'expanded', label: 'Expandido', icon: Eye },
                  { value: 'allVisitors', label: 'Todos Visitantes', icon: Users },
                ]}
              />
            </div>
          </div>
        </section>

        {/* Visitors Section */}
        <section className="py-12">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              {viewMode === 'allVisitors' ? (
                /* All Visitors View */
                allVisitorsWithInviters.length === 0 ? (
                  <div className="text-center py-12">
                    <UserPlus className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Nenhum visitante ainda
                    </h3>
                    <p className="text-muted-foreground">
                      Os visitantes convidados aparecerão aqui
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allVisitorsWithInviters.map(({ visitor, inviters }, idx) => (
                      <div
                        key={idx}
                        className="card-royal p-6 animate-fade-in"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <UserPlus className="w-5 h-5 text-accent" />
                          <h3 className="text-lg font-semibold text-accent">{visitor}</h3>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          Convidado por: {inviters.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* By Participant View - Compact or Expanded */
                participantsWithVisitors.length === 0 ? (
                  <div className="text-center py-12">
                    <UserPlus className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhum visitante ainda'}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? 'Tente outro termo de busca' : 'Os visitantes convidados aparecerão aqui'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {participantsWithVisitors.map((participant) => {
                      const visitorCount = participant.visitors?.length || 0;
                      const totalPoints = visitorCount * POINTS_PER_VISITOR;
                      return (
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
                                {visitorCount} visitante{visitorCount !== 1 ? 's' : ''}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="font-semibold text-accent">
                                +{totalPoints} pts
                              </span>
                            </div>
                          </div>

                          {viewMode === 'compact' ? (
                            <div className="flex flex-wrap gap-2">
                              {participant.visitors?.map((visitor, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-medium"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>{getVisitorName(visitor)}</span>
                                  <span className="text-xs opacity-80">+{POINTS_PER_VISITOR}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {participant.visitors?.map((visitor, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                                >
                                  <div className="flex items-center gap-2">
                                    <UserPlus className="w-4 h-4 text-accent" />
                                    <span className="font-medium">{getVisitorName(visitor)}</span>
                                  </div>
                                  <span className="text-sm text-accent font-semibold">+{POINTS_PER_VISITOR} pts</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
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

export default Visitantes;
