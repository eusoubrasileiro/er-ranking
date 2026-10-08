import { Shield, BookOpen, Home, UserPlus, Gamepad2, Star, CalendarDays, Database, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { useAppConfig } from '@/ConfigProvider';

// Icon mapping for dynamic icons from config
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  BookOpen,
  Home,
  UserPlus,
  Gamepad2,
  Star,
  CalendarDays,
  Database,
};

export function Header() {
  const location = useLocation();
  const config = useAppConfig();

  // Fallback values while config loads
  const name = config?.name ?? 'Ranking';
  const organization = config?.organization ?? '';
  const routes = config?.routes;
  const features = config?.features;
  const headerIcon = config ? iconMap[config.logo?.src ? 'Shield' : 'Star'] : Shield;
  const HeaderIcon = headerIcon;

  const navItems = [
    { path: '/', route: routes?.home, icon: Home, fallbackLabel: 'Ranking' },
    { path: '/versiculos', route: routes?.verses, icon: BookOpen, fallbackLabel: 'Versiculos', feature: 'bibleVerses' },
    { path: '/manual', route: routes?.manual, icon: GraduationCap, fallbackLabel: 'Manual', feature: 'candidatoProgress' },
    { path: '/visitantes', route: routes?.visitors, icon: UserPlus, fallbackLabel: 'Visitantes', feature: 'visitorTracking' },
    { path: '/jogos', route: routes?.games, icon: Gamepad2, fallbackLabel: 'Jogos', feature: 'games' },
    { path: '/presenca', route: routes?.attendance, icon: CalendarDays, fallbackLabel: 'Presenca', feature: 'attendanceCalendar' },
    { path: '/bonus', route: routes?.bonus, icon: Star, fallbackLabel: 'Bonus', feature: 'bonusPoints' },
    { path: '/dados', route: routes?.data, icon: Database, fallbackLabel: 'Dados', feature: 'dataViewer' },
  ].filter(item => {
    // Always show home
    if (item.path === '/') return true;
    // Check if feature is enabled
    if (item.feature && features) {
      return features[item.feature as keyof typeof features];
    }
    // Check if route is enabled
    return item.route?.enabled !== false;
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 royal-gradient border-b border-gold/20">
      <div className="container flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/20 border border-accent/40">
            <HeaderIcon className="w-5 h-5 text-accent" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-display font-semibold text-primary-foreground leading-tight">
              {name}
            </h1>
            {organization && (
              <p className="text-xs text-primary-foreground/70">
                {organization}
              </p>
            )}
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide -mr-4 pr-4">
          {navItems.map(item => {
            const Icon = item.icon;
            const label = item.route?.label ?? item.fallbackLabel;
            const isActive = location.pathname === item.path;

            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-accent/40 ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">{label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
