import { cn } from '@/lib/utils';
import type { VerseKind } from '@/lib/calculatePoints';

interface VersionBadgeProps {
  version: string;
  pending?: boolean;
  className?: string;
}

/**
 * Bible version the boy recited (e.g. "ARA"). Pending versions are dashed + "?".
 */
export function VersionBadge({ version, pending, className }: VersionBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none border',
        pending
          ? 'border-dashed border-muted-foreground/60 text-muted-foreground'
          : 'border-primary/30 bg-primary/10 text-primary',
        className
      )}
      title={pending ? `Versão a confirmar (${version} provisória)` : `Versão ${version}`}
    >
      {version}{pending && '?'}
    </span>
  );
}

interface KindBadgeProps {
  kind: VerseKind;
  multiplier: number;
  lessonId?: number;
  className?: string;
}

/**
 * "T2 ×2" for a Manual verse, "T2 ×3" for a challenge verse. Nothing for free verses.
 */
export function KindBadge({ kind, multiplier, lessonId, className }: KindBadgeProps) {
  if (kind === 'free') return null;
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold leading-none',
        kind === 'challenge' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground',
        className
      )}
      title={kind === 'challenge' ? `Desafio da Tarefa ${lessonId}` : `Versículo da Tarefa ${lessonId}`}
    >
      T{lessonId} ×{multiplier}
    </span>
  );
}
