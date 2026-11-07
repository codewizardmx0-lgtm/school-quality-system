/**
 * Component: WeightsBalanceBanner
 * شريط التحقق الرياضي الحي لاتزان أوزان المعايير السبعة (100.0% تماماً)
 */

import React from 'react';
import { CheckCircle2, AlertTriangle, Scale, ShieldAlert } from 'lucide-react';

interface WeightsBalanceBannerProps {
  totalWeight: number;
  isBalanced: boolean;
}

export const WeightsBalanceBanner: React.FC<WeightsBalanceBannerProps> = ({
  totalWeight,
  isBalanced,
}) => {
  if (isBalanced) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex items-center justify-between text-emerald-900 shadow-sm animate-fade-in">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold flex items-center gap-2">
              <span>مجموع الأوزان الموزعة على المعايير السبعة = {totalWeight}%</span>
              <span className="text-xs bg-emerald-200/80 text-emerald-950 px-2 py-0.5 rounded-full font-bold">
                متزن ومطابق 100% ✓
              </span>
            </h4>
            <p className="text-xs text-emerald-800/90 mt-0.5">
              تم استيفاء الشرط الحاكم الأول للاعتماد الوزاري، وتوزيع الأوزان مطابق للنموذج القياسي المعتمد.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-bold bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200">
          <Scale className="w-4 h-4 text-emerald-600" />
          <span>100.0% / 100.0%</span>
        </div>
      </div>
    );
  }

  const diff = Math.round((100 - totalWeight) * 10) / 10;
  const isOver = totalWeight > 100;

  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 flex items-center justify-between text-amber-950 shadow-sm animate-fade-in">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-400 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
          <AlertTriangle className="w-6 h-6 text-amber-700" />
        </div>
        <div>
          <h4 className="text-sm font-extrabold flex items-center gap-2">
            <span>مجموع الأوزان الحالي = {totalWeight}%</span>
            <span className="text-xs bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
              غير متزن ({isOver ? `فائض +${Math.abs(diff)}%` : `عجز -${Math.abs(diff)}%`}) ⚠
            </span>
          </h4>
          <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
            يجب أن يكون مجموع الأوزان الموزعة على المعايير السبعة مساوياً لـ 100.0% تماماً لإتاحة حفظ التوزيع والاعتماد.
          </p>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-bold bg-white/90 text-amber-900 px-3 py-1.5 rounded-xl border border-amber-300">
        <ShieldAlert className="w-4 h-4 text-amber-700" />
        <span>المطلوب: 100.0%</span>
      </div>
    </div>
  );
};
