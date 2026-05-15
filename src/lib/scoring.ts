import type { UomType } from '@/types';

export function computeScore(
  uom: UomType,
  target: number | null,
  actual: number | null,
  targetDate: Date | null,
  actualDate: Date | null
): number | null {
  if (actual === null) return null;

  switch (uom) {
    case 'min':
      if (!target || target === 0) return null;
      return Math.min((actual / target) * 100, 150);

    case 'max':
      if (!actual || actual === 0) return null;
      return Math.min((target! / actual) * 100, 150);

    case 'timeline':
      if (!targetDate || !actualDate) return null;
      const diffDays = (actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 0 ? 100 : Math.max(0, 100 - diffDays * 2);

    case 'zero':
      return actual === 0 ? 100 : 0;

    default:
      return null;
  }
}

export function getScoreColor(score: number | null): string {
  if (score === null) return 'bg-gray-200 text-gray-500';
  if (score < 50) return 'bg-red-100 text-red-700';
  if (score < 80) return 'bg-amber-100 text-amber-700';
  if (score < 100) return 'bg-blue-100 text-blue-700';
  return 'bg-green-100 text-green-700';
}

export function getScoreLabel(score: number | null): string {
  if (score === null) return '—';
  return `${Math.round(score)}%`;
}
