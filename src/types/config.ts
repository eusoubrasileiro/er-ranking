// App Configuration Types

export interface RouteConfig {
  enabled: boolean;
  label: string;
  icon?: string;  // lucide-react icon name
}

export interface AppConfig {
  id: string;
  name: string;
  shortName: string;
  description: string;
  organization: string;
  logo: {
    src: string;
    alt: string;
  };
  basePath: string;
  routes: {
    home: RouteConfig;
    verses?: RouteConfig;
    manual?: RouteConfig;
    visitors?: RouteConfig;
    games?: RouteConfig;
    attendance?: RouteConfig;
    bonus?: RouteConfig;
    data?: RouteConfig;
  };
  features: {
    bibleVerses: boolean;
    visitorTracking: boolean;
    games: boolean;
    candidatoProgress?: boolean;
    attendanceCalendar?: boolean;
    bonusPoints?: boolean;
    dataViewer?: boolean;
  };
  activityTypes: string[];  // e.g., ["embaixada", "igreja"] or ["quarto", "cozinha", "banheiro", "fora"]
  terminology: {
    participant: string;
    participants: string;
    attendance: string;
    season: string;
  };
}

export interface ThemeConfig {
  colors: {
    primary: string;      // HSL values like "220 82% 24%"
    accent: string;
    background?: string;
    foreground?: string;
  };
  fonts: {
    sans?: string[];
    display?: string[];
  };
  logo?: {
    headerIcon?: string;  // lucide-react icon or "custom"
  };
}

export interface FullConfig {
  app: AppConfig;
  theme: ThemeConfig;
}
