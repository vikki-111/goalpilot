import { cn } from '@/lib/utils';
import { getScoreColor, getScoreLabel } from '@/lib/scoring';

interface ScoreBadgeProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  if (score === null) {
    return null;
  }

  return (
    <span className={cn('inline-flex items-center font-semibold rounded-full', getScoreColor(score), sizeClasses[size])}>
      {getScoreLabel(score)}
    </span>
  );
}
