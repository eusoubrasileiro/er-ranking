import { Trophy, Plus, Church, Crown, UserPlus, BookOpen, BadgeCheck, GraduationCap, Medal, PenLine, HelpCircle, AlertTriangle, FileText, Bed, UtensilsCrossed, Bath, Trees, Star, Heart } from 'lucide-react';
import type { Rule } from '@/hooks/useLeaderboardData';
import type { LucideIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface RulesSectionProps {
  rules: Rule[];
}

export function RulesSection({ rules }: RulesSectionProps) {
  // Icon mapping for dynamic icon rendering
  const iconMap: Record<string, LucideIcon> = {
    // Royal Ambassadors icons
    Church,
    Crown,
    UserPlus,
    BookOpen,
    BadgeCheck,
    GraduationCap,
    Medal,
    PenLine,
    AlertTriangle,
    FileText,
    // Family chores icons
    Bed,
    UtensilsCrossed,
    Bath,
    Trees,
    Star,
    Heart,
    Plus, // fallback
  };

  return (
    <section className="py-12 px-4">
      <div className="container">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-4">
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-medium">Como ganhar pontos</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Regras da Gincana
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {rules.map((rule, index) => {
              const IconComponent = rule.icon && iconMap[rule.icon] ? iconMap[rule.icon] : Plus;
              return (
                <div
                  key={rule.id}
                  className="card-royal p-5 flex items-center gap-4 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 border border-accent/20">
                    <IconComponent className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <p className="font-medium text-foreground">{rule.description}</p>
                    {rule.explanation && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                            <HelpCircle className="w-4 h-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="max-w-xs">
                          <p className="text-sm">{rule.explanation}</p>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  <div className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-bold text-sm ${
                    rule.points < 0
                      ? 'bg-destructive/20 text-destructive'
                      : 'bg-accent text-accent-foreground'
                  }`}>
                    {rule.display ?? (rule.points < 0 ? rule.points : `+${rule.points}`)}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}
