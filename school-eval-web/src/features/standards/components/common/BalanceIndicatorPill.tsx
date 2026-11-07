/**
 * Component: BalanceIndicatorPill
 * شارة حية توضح حالة اتزان مجموع الأوزان (متزن 100% vs غير متزن)
 */

import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface BalanceIndicatorPillProps {
  totalWeight: number;
  isBalanced: boolean;
  className?: string;
}

export const BalanceIndicatorPill: React.FC<BalanceIndicatorPillProps> = ({
  totalWeight,
  isBalanced,
  className = '',
}) => {
  if (isBalanced) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
        title="مجموع الأوزان متزن تماماً 100.0%"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>متزن 100.0% ✓</span>
      </div>
    );
  }

  const deviation = Math.round((totalWeight - 100) * 10) / 10;
  const deviationText = deviation > 0 ? `+${deviation}%` : `${deviation}%`;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 ${className}`}
      title="مجموع الأوزان يجب أن يساوي 100.0% تماماً"
    >
      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
      <span>غير متزن ({totalWeight}% • فارق {deviationText})</span>
    </div>
  );
};
