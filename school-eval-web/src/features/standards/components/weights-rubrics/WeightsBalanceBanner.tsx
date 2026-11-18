/**
 * Component: WeightsBalanceBanner
 * شريط التحقق الرياضي الحي لاتزان أوزان المعايير السبعة (100.0% تماماً)
 */

import React from 'react';
import { CheckCircle2, AlertTriangle, Scale, ShieldAlert } from 'lucide-react';

interface WeightsBalanceBannerProps {
  totalWeight: number;
  isBalanced: boolean;
  isMainBalanced?: boolean;
  isAllSubStandardsBalanced?: boolean;
}

export const WeightsBalanceBanner: React.FC<WeightsBalanceBannerProps> = ({
  totalWeight,
  isBalanced,
  isMainBalanced,
  isAllSubStandardsBalanced,
}) => {
  if (isBalanced) {
    return (
      <div className="sticky top-0 z-20 bg-emerald-50/95 backdrop-blur-md border-2 border-emerald-300 rounded-2xl p-4 flex items-center justify-between text-emerald-900 shadow-md animate-fade-in">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold flex items-center gap-2">
              <span>مجموع الأوزان الموزعة على المعايير السبعة = {totalWeight}%</span>
              <span className="text-xs bg-emerald-200/80 text-emerald-950 px-2 py-0.5 rounded-full font-bold">
                متزن ومطابق 100% لكافة المستويات ✓
              </span>
            </h4>
            <p className="text-xs text-emerald-800/90 mt-0.5">
              تم استيفاء شرط التوازن الثلاثي (معايير رئيسية 100%، وتطابق المعايير الفرعية والمؤشرات)، وتوزيع الأوزان مطابق للنموذج الوطني.
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

  // إذا كانت المعايير الرئيسية متزنة 100%، ولكن الخلل يكمن في فروع المعايير الفرعية
  const mainIsActually100 = isMainBalanced !== undefined ? isMainBalanced : Math.abs(totalWeight - 100) < 0.05;
  if (mainIsActually100 && isAllSubStandardsBalanced === false) {
    return (
      <div className="sticky top-0 z-20 bg-amber-50/95 backdrop-blur-md border-2 border-amber-400 rounded-2xl p-4 flex items-center justify-between text-amber-950 shadow-md animate-fade-in">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-400 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
            <AlertTriangle className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold flex items-center gap-2">
              <span>مجموع المعايير الرئيسية = {totalWeight}% (متزن)</span>
              <span className="text-xs bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
                توزيع المعايير الفرعية غير متطابق ⚠
              </span>
            </h4>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              أوزان المعايير الرئيسية السبعة متطابقة بنسبة 100.0% تماماً، ولكن يوجد عدم تطابق بين أوزان بعض المعايير الفرعية والوزن المقرر لمعيارها الرئيسي. يرجى مراجعة وتعديل أوزان المعايير الفرعية في الجدول أدناه للوصول للتطابق التام.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-bold bg-white/90 text-amber-900 px-3 py-1.5 rounded-xl border border-amber-300">
          <ShieldAlert className="w-4 h-4 text-amber-700" />
          <span>معايرة الفروع مطلوبة</span>
        </div>
      </div>
    );
  }

  const diff = Math.round((100 - totalWeight) * 10) / 10;
  const isOver = totalWeight > 100;

  return (
    <div className="sticky top-0 z-20 bg-amber-50/95 backdrop-blur-md border-2 border-amber-400 rounded-2xl p-4 flex items-center justify-between text-amber-950 shadow-md animate-fade-in">
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
