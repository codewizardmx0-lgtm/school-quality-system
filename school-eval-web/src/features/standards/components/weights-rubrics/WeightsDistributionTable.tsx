/**
 * Component: WeightsDistributionTable
 * جدول معايرة الأوزان النسبية الهرمي الثلاثي الشامل:
 * 1. المعيار الرئيسي (إلزامي المجموع = 100.0%)
 * 2. المعيار الفرعي (إلزامي المجموع = وزن المعيار الرئيسي التابع له)
 * 3. المؤشرات (إلزامي مجموع أوزان مؤشرات كل معيار فرعي = وزن المعيار الفرعي التابع له)
 * 
 * متوافق مع متطلبات الحوكمة BR-GEN-04 و BR-GEN-05 و BR-MIN-03 (صفر اعتماد - قفل الإصدارات غير المسودة)
 */

import React, { useState } from 'react';
import {
  Check,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  Folder,
  Layers,
  Lock,
  FileText,
} from 'lucide-react';
import type { StandardWeightItem } from '../../api/standardsTypes';

interface WeightsDistributionTableProps {
  weights: StandardWeightItem[];
  totalWeight: number;
  isBalanced: boolean;
  isDraft?: boolean;
  subStandardsBalanceMap?: Record<number, { isBalanced: boolean; currentSum: number; expected: number }>;
  indicatorsBalanceMap?: Record<
    number,
    { isBalanced: boolean; currentSum: number; expected: number; diff: number; indicatorsCount: number }
  >;
  onWeightChange: (standardId: number, newWeight: number) => void;
  onSubStandardWeightChange?: (standardId: number, subStandardId: number, newWeight: number) => void;
  onIndicatorWeightChange?: (
    standardId: number,
    subStandardId: number,
    indicatorId: number,
    newWeight: number
  ) => void;
  onResetEqual?: () => void;
}

export const WeightsDistributionTable: React.FC<WeightsDistributionTableProps> = ({
  weights,
  totalWeight,
  isBalanced,
  isDraft = true,
  subStandardsBalanceMap = {},
  indicatorsBalanceMap = {},
  onWeightChange,
  onSubStandardWeightChange,
  onIndicatorWeightChange,
}) => {
  // تتبع المعايير الرئيسية المفتوحة (مفتوحة افتراضياً)
  const [expandedStandards, setExpandedStandards] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    weights.forEach((std) => {
      initial[std.standardId] = true;
    });
    return initial;
  });

  // تتبع المعايير الفرعية المفتوحة لعرض مؤشراتها التابعة
  const [expandedSubStandards, setExpandedSubStandards] = useState<Record<number, boolean>>({});

  const toggleStandard = (stdId: number) => {
    setExpandedStandards((prev) => ({ ...prev, [stdId]: !prev[stdId] }));
  };

  const toggleSubStandard = (subId: number) => {
    setExpandedSubStandards((prev) => ({ ...prev, [subId]: !prev[subId] }));
  };

  const expandAllEverything = () => {
    const stds: Record<number, boolean> = {};
    const subs: Record<number, boolean> = {};
    weights.forEach((std) => {
      stds[std.standardId] = true;
      (std.subStandards || []).forEach((sub) => {
        subs[sub.subStandardId] = true;
      });
    });
    setExpandedStandards(stds);
    setExpandedSubStandards(subs);
  };

  const expandAllStandardsOnly = () => {
    const stds: Record<number, boolean> = {};
    weights.forEach((std) => {
      stds[std.standardId] = true;
    });
    setExpandedStandards(stds);
    setExpandedSubStandards({});
  };

  const collapseAll = () => {
    setExpandedStandards({});
    setExpandedSubStandards({});
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden text-right">
      {/* Table Header Controls */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            جدول معايرة الأوزان الهرمي الثلاثي (المعايير الرئيسية ← الفرعية ← المؤشرات)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة الميزان النسبي الكامل في شاشة واحدة مع التحقق الصارم من تطابق أوزان المؤشرات مع معيارها الفرعي
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={expandAllEverything}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer"
            title="توسيع كافة المستويات الثلاثة وعرض كامل المؤشرات"
          >
            <Layers className="w-3.5 h-3.5 text-amber-700" />
            <span>توسيع الكل (المؤشرات والفروع)</span>
          </button>

          <button
            type="button"
            onClick={expandAllStandardsOnly}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="عرض المعايير الفرعية فقط وطي المؤشرات"
          >
            طي المؤشرات
          </button>

          <button
            type="button"
            onClick={collapseAll}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="طي المعايير الفرعية وعرض المعايير السبعة فقط"
          >
            طي الفروع
          </button>

          {!isDraft && (
            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 rounded-lg">
              <Lock className="w-3 h-3 text-amber-700" />
              <span>إصدار مُقرّ (للقراءة فقط)</span>
            </span>
          )}
        </div>
      </div>

      {/* Contained Data Table */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
        <table className="w-full text-right text-sm border-collapse" style={{ minWidth: '820px' }}>
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">المعيار الرئيسي / المعيار الفرعي / المؤشر</th>
              <th className="py-3 px-4 text-center">التفصيل الهرمي</th>
              <th className="py-3 px-4 text-center w-44">الوزن النسبي (%)</th>
              <th className="py-3 px-4 text-center">حالة الاتزان والميزان الحي</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-slate-800">
            {weights.map((std, index) => {
              const isExpanded = !!expandedStandards[std.standardId];
              const subStandards = std.subStandards || [];
              const balanceInfo = subStandardsBalanceMap[std.standardId] || {
                isBalanced: true,
                currentSum: std.weight,
                expected: std.weight,
              };

              return (
                <React.Fragment key={std.standardId}>
                  {/* Level 1: Main Standard Row */}
                  <tr className="hover:bg-amber-50/40 transition-colors bg-white font-semibold">
                    <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-400">
                      {index + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleStandard(std.standardId)}
                          className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
                          title={isExpanded ? 'طي المعايير الفرعية' : 'عرض المعايير الفرعية'}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
                        </button>

                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                              {std.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {std.code}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            {subStandards.length} معايير فرعية • {std.indicatorsCount || 0} مؤشرات معتمدة
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center text-xs font-semibold text-slate-600">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 font-bold">
                        {std.indicatorsCount || 0} مؤشرات
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          disabled={!isDraft}
                          value={std.weight}
                          onChange={(e) => onWeightChange(std.standardId, Number(e.target.value))}
                          className="w-20 px-2 py-1.5 text-center text-sm font-extrabold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center text-xs">
                      {subStandards.length === 0 ? (
                        <span className="text-slate-400 font-medium">لا توجد فروع</span>
                      ) : balanceInfo.isBalanced ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-bold">
                          <Check size={12} />
                          <span>متزن مع الفروع ({balanceInfo.currentSum}%)</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 font-bold"
                          title={`مجموع المعايير الفرعية (${balanceInfo.currentSum}%) لا يطابق وزن المعيار (${balanceInfo.expected}%)`}
                        >
                          <AlertCircle size={12} />
                          <span>اختلال فروع ({balanceInfo.currentSum}% من {balanceInfo.expected}%)</span>
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Level 2: Sub-Standards Rows (when expanded) */}
                  {isExpanded &&
                    subStandards.map((sub, subIdx) => {
                      const indicators = sub.indicators || [];
                      const indCount = indicators.length;
                      const isSubExpanded = !!expandedSubStandards[sub.subStandardId];
                      const indBalance = indicatorsBalanceMap[sub.subStandardId] || {
                        isBalanced: true,
                        currentSum: sub.weight,
                        expected: sub.weight,
                        diff: 0,
                        indicatorsCount: indCount,
                      };

                      const isSubUnbalanced = !indBalance.isBalanced;

                      return (
                        <React.Fragment key={sub.subStandardId}>
                          <tr
                            className={`transition-colors border-t border-dashed ${
                              isSubUnbalanced
                                ? 'bg-rose-50/60 hover:bg-rose-50 border-rose-300'
                                : 'bg-slate-50/80 hover:bg-slate-100/70 border-slate-200'
                            }`}
                          >
                            <td className="py-2.5 px-4 text-center text-[11px] font-mono text-slate-400 pr-6">
                              {index + 1}.{subIdx + 1}
                            </td>

                            <td className="py-2.5 px-4 pr-10">
                              <div className="flex items-center gap-2">
                                {indCount > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleSubStandard(sub.subStandardId)}
                                    className="w-5 h-5 rounded flex items-center justify-center bg-white hover:bg-slate-200 text-slate-500 border border-slate-200 cursor-pointer transition-colors"
                                    title={isSubExpanded ? 'طي المؤشرات' : 'عرض مؤشرات المعيار الفرعي'}
                                  >
                                    {isSubExpanded ? <ChevronDown size={13} /> : <ChevronLeft size={13} />}
                                  </button>
                                ) : (
                                  <div className="w-5 h-5" />
                                )}

                                <Folder size={14} className={isSubUnbalanced ? 'text-rose-600 shrink-0' : 'text-amber-600 shrink-0'} />
                                <span className={`font-bold text-xs ${isSubUnbalanced ? 'text-rose-950 font-black' : 'text-slate-800'}`}>
                                  {sub.name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                  {sub.code}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 text-center text-xs">
                              <button
                                type="button"
                                onClick={() => toggleSubStandard(sub.subStandardId)}
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-all ${
                                  isSubExpanded
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                                title="انقر لطي/توسيع مؤشرات هذا المعيار الفرعي"
                              >
                                {indCount} مؤشرات {isSubExpanded ? '▲' : '▼'}
                              </button>
                            </td>

                            <td className="py-2.5 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  disabled={!isDraft}
                                  value={sub.weight}
                                  onChange={(e) =>
                                    onSubStandardWeightChange?.(
                                      std.standardId,
                                      sub.subStandardId,
                                      Number(e.target.value)
                                    )
                                  }
                                  className={`w-18 px-2 py-1 text-center text-xs font-bold rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500 ${
                                    isSubUnbalanced
                                      ? 'bg-white border-2 border-rose-400 text-rose-950'
                                      : 'bg-white border border-slate-300 text-slate-800'
                                  }`}
                                />
                                <span className="text-[11px] font-bold text-slate-500">%</span>
                              </div>
                            </td>

                            {/* Live Weight Balance Badge للمعيار الفرعي ومؤشراته */}
                            <td className="py-2.5 px-4 text-center text-[11px]">
                              {indCount === 0 ? (
                                <span className="text-slate-400 font-medium">لا توجد مؤشرات</span>
                              ) : indBalance.isBalanced ? (
                                <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                                  <Check size={11} />
                                  <span>متزن مع المؤشرات ({indBalance.currentSum}%)</span>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-rose-900 bg-rose-100/90 px-2.5 py-0.5 rounded-full border border-rose-300 font-black animate-pulse"
                                  title={`مجموع أوزان المؤشرات (${indBalance.currentSum}%) لا يطابق وزن المعيار الفرعي (${indBalance.expected}%). الفارق: ${indBalance.diff}%`}
                                >
                                  <AlertCircle size={12} color="#DC2626" />
                                  <span>
                                    مجموع المؤشرات: {indBalance.currentSum}% من {indBalance.expected}% (
                                    {indBalance.diff > 0 ? `فائض +${indBalance.diff}%` : `عجز ${indBalance.diff}%`})
                                  </span>
                                </span>
                              )}
                            </td>
                          </tr>

                          {/* Level 3: Indicators Rows (when sub-standard is expanded) */}
                          {isSubExpanded &&
                            indicators.map((ind, indIdx) => {
                              const indRatio =
                                sub.weight > 0 ? Math.round(((ind.weight / sub.weight) * 100) * 10) / 10 : 0;

                              return (
                                <tr
                                  key={ind.indicatorId}
                                  className={`border-t border-dotted transition-colors ${
                                    isSubUnbalanced
                                      ? 'bg-rose-50/30 hover:bg-rose-50/50 border-rose-200'
                                      : 'bg-white hover:bg-slate-50/90 border-slate-100'
                                  }`}
                                >
                                  <td className="py-2 px-4 text-center text-[10.5px] font-mono text-slate-400 pr-8">
                                    {index + 1}.{subIdx + 1}.{indIdx + 1}
                                  </td>

                                  <td className="py-2 px-4 pr-16">
                                    <div className="flex items-center gap-2">
                                      <FileText size={12} className="text-slate-400 shrink-0" />
                                      <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                                        {ind.code}
                                      </span>
                                      <span className="text-[12px] font-medium text-slate-700 leading-snug">
                                        {ind.name}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="py-2 px-4 text-center text-[11px] text-slate-500">
                                    <span className="text-[10.5px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                      {indRatio}% من المعيار الفرعي
                                    </span>
                                  </td>

                                  <td className="py-2 px-4 text-center">
                                    <div className="inline-flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        disabled={!isDraft}
                                        value={ind.weight}
                                        onChange={(e) =>
                                          onIndicatorWeightChange?.(
                                            std.standardId,
                                            sub.subStandardId,
                                            ind.indicatorId,
                                            Number(e.target.value)
                                          )
                                        }
                                        className="w-16 px-1.5 py-0.5 text-center text-xs font-bold bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
                                      />
                                      <span className="text-[10px] font-bold text-slate-400">%</span>
                                    </div>
                                  </td>

                                  <td className="py-2 px-4 text-center text-[11px]">
                                    <span className="text-[10.5px] text-slate-400 font-normal">
                                      مؤشر تقييمي معتمد
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </tbody>

          {/* Table Footer with Summary */}
          <tfoot>
            <tr
              className={`border-t-2 font-bold ${
                isBalanced
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50/70 border-amber-300 text-amber-950'
              }`}
            >
              <td colSpan={3} className="py-3 px-4 text-left font-bold text-xs sm:text-sm">
                مجموع أوزان المعايير الرئيسية (المستوى الأول):
              </td>
              <td className="py-3 px-4 text-center text-base font-black font-mono">
                {totalWeight}%
              </td>
              <td className="py-3 px-4 text-center text-xs font-bold">
                {isBalanced ? (
                  <span className="inline-flex items-center gap-1 text-emerald-800">
                    <Check size={14} />
                    <span>الميزان الثلاثي متزن 100.0% ومستوفٍ لشرط الإقرار الرسمي ✓</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-800">
                    <AlertCircle size={14} />
                    <span>يتطلب استيفاء التوازن التام (100% ورئيسي وفرعي ومؤشرات) للحفظ</span>
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
