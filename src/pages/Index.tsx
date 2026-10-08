import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { RulesSection } from '@/components/RulesSection';
import { Podium } from '@/components/Podium';
import { Leaderboard } from '@/components/Leaderboard';
import { ClimbSection } from '@/components/ClimbSection';
import { Footer } from '@/components/Footer';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { useLeaderboardData } from '@/hooks/useLeaderboardData';

const Index = () => {
  const { data, loading, error, sortedParticipants } = useLeaderboardData();

  if (loading) {
    return <LoadingState message="Carregando ranking..." />;
  }

  if (error || !data) {
    return <ErrorState message={error || 'Não foi possível carregar os dados do ranking.'} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero 
          season={data.season} 
          updatedAt={data.updatedAt} 
          totalParticipants={data.participants.length}
        />
        <RulesSection rules={data.rules} />
        <Podium participants={sortedParticipants} />
        {data.lessonsData && (
          <ClimbSection participants={data.participants} lessonsData={data.lessonsData} />
        )}
        <Leaderboard participants={sortedParticipants} />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
