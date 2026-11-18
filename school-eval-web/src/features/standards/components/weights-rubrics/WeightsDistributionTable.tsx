/**
 * Component: WeightsDistributionTable
 * جدول هرمي ثلاثي المستويات لمعايرة أوزان المعايير الرئيسية والمعايير الفرعية والمؤشرات
 * 1. المعيار الرئيسي (إلزامي المجموع 100%)
 * 2. المعيار الفرعي (إلزامي مجموعه = وزن المعيار الرئيسي)
 * 3. المؤشرات (توزيع مبدئي متساوٍ افتراضي مع إمكانية التعديل)
 */

import React, { useState } from 'react';
import {
  RotateCcw,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  Folder,
  FileCheck2,
  Lock,
} from 'lucide-react';
import type { StandardWeightItem } from '../../api/standardsTypes';

interface WeightsDistributionTableProps {
  weights: StandardWeightItem[];
  totalWeight: number;
  isBalanced: boolean;
  isDraft?: boolean;
  subStandardsBalanceMap?: Record<number, { isBalanced: boolean; currentSum: number; expected: number }>;
  onWeightChange: (standardId: number, newWeight: number) => void;
  onSubStandardWeightChange?: (standardId: number, subStandardId: number, newWeight: number) => void;
  onIndicatorWeightChange?: (standardId: number, subStandardId: number, indicatorId: number, newWeight: number) => void;
  onResetEqual: () => void;
}

export const WeightsDistributionTable: React.FC<WeightsDistributionTableProps> = ({
  weights,
  totalWeight,
  isBalanced,
  isDraft = true,
  subStandardsBalanceMap = {},
  onWeightChange,
  onSubStandardWeightChange,
  onIndicatorWeightChange,
  onResetEqual,
}) => {
  // تتبع المعايير المفتوحة للتفصيل
  const [expandedStandards, setExpandedStandards] = useState<Record<number, boolean>>({});
  // تتبع المعايير الفرعية المفتوحة للتفصيل
  const [expandedSubStandards, setExpandedSubStandards] = useState<Record<number, boolean>>({});

  const toggleStandard = (stdId: number) => {
    setExpandedStandards((prev) => ({ ...prev, [stdId]: !prev[stdId] }));
  };

  const toggleSubStandard = (subId: number) => {
    setExpandedSubStandards((prev) => ({ ...prev, [subId]: !prev[subId] }));
  };

  const expandAll = () => {
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
            جدول المعايرة الهرمية للأوزان النسبية (معايير رئيسية • معايير فرعية • مؤشرات)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            توزيع النسب المئوية على المستويات الثلاثة وضمان اتزان كل مستوى مع مستواه الأعلى
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={expandAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer"
            title="توسيع كافة المستويات الثلاثة وإظهار جميع المؤشرات (109)"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-amber-700" />
            <span>إظهار كافة المؤشرات (المستويات الثلاثة)</span>
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="طي كافة الفروع وعرض المعايير الرئيسية السبعة فقط"
          >
            طي المؤشرات
          </button>

          {isDraft && (
            <button
              type="button"
              onClick={onResetEqual}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              title="إعادة توزيع الأوزان رياضياً بالتساوي على المعايير السبعة وفروعها ومؤشراتها"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة توزيع متساوٍ ⟲</span>
            </button>
          )}

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
        <table className="w-full text-right text-sm border-collapse" style={{ minWidth: '760px' }}>
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">المعيار الرئيسي / المعيار الفرعي / المؤشر</th>
              <th className="py-3 px-4 text-center">عدد المؤشرات</th>
              <th className="py-3 px-4 text-center w-40">الوزن النسبي (%)</th>
              <th className="py-3 px-4 text-center">حالة الاتزان الداخلي</th>
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
                    <td className="py-3 px-4 text-center text-xs font-bold text-slate-400">
                      {index + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleStandard(std.standardId)}
                          className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
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

                    <td className="py-3 px-4 text-center text-xs font-semibold text-slate-600">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                        {std.indicatorsCount || 0} مؤشرات
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
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

                    <td className="py-3 px-4 text-center text-xs">
                      {subStandards.length === 0 ? (
                        <span className="text-slate-400 font-medium">لا توجد فروع</span>
                      ) : balanceInfo.isBalanced ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                          <Check size={12} />
                          <span>متزن ({balanceInfo.currentSum}%)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 font-bold" title={`مجموع المعايير الفرعية (${balanceInfo.currentSum}%) لا يطابق وزن المعيار (${balanceInfo.expected}%)`}>
                          <AlertCircle size={12} />
                          <span>غير متزن ({balanceInfo.currentSum}% / {balanceInfo.expected}%)</span>
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Level 2: Sub-Standards Rows (when expanded) */}
                  {isExpanded &&
                    subStandards.map((sub, subIdx) => {
                      const isSubExpanded = !!expandedSubStandards[sub.subStandardId];
                      const indicators = sub.indicators || [];

                      return (
                        <React.Fragment key={sub.subStandardId}>
                          <tr className="bg-slate-50/80 hover:bg-slate-100/70 transition-colors border-t border-dashed border-slate-200">
                            <td className="py-2.5 px-4 text-center text-[11px] font-mono text-slate-400 pr-6">
                              {index + 1}.{subIdx + 1}
                            </td>

                            <td className="py-2.5 px-4 pr-8">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleSubStandard(sub.subStandardId)}
                                  className="w-5 h-5 rounded flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 cursor-pointer"
                                  title={isSubExpanded ? 'طي المؤشرات' : 'عرض المؤشرات'}
                                >
                                  {isSubExpanded ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
                                </button>
                                <Folder size={14} className="text-amber-600 shrink-0" />
                                <span className="font-bold text-slate-800 text-xs">
                                  {sub.name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                  {sub.code}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 text-center text-xs text-slate-600">
                              <span className="text-[11px] text-slate-500">
                                {indicators.length} مؤشرات
                              </span>
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
                                  className="w-16 px-1.5 py-1 text-center text-xs font-bold bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                                />
                                <span className="text-[11px] font-bold text-slate-500">%</span>
                              </div>
                            </td>

                            <td className="py-2.5 px-4 text-center text-[11px] text-slate-600">
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                                <span>موزع على {indicators.length} مؤشرات</span>
                                {indicators.length > 0 && (
                                  <span className="font-mono text-[10px] text-slate-500">
                                    (~{(Math.round((sub.weight / indicators.length) * 100) / 100)}% لكل مؤشر)
                                  </span>
                                )}
                              </span>
                            </td>
                          </tr>

                          {/* Level 3: Indicators Rows (when expanded) */}
                          {isSubExpanded &&
                            indicators.map((ind) => (
                              <tr
                                key={ind.indicatorId}
                                className="bg-amber-50/20 hover:bg-amber-50/50 transition-colors border-t border-slate-100"
                              >
                                <td className="py-2 px-4 text-center text-[10px] font-mono text-slate-300 pr-10">
                                  •
                                </td>

                                <td className="py-2 px-4 pr-16">
                                  <div className="flex items-center gap-2">
                                    <FileCheck2 size={13} className="text-emerald-600 shrink-0" />
                                    <span className="text-xs text-slate-700">
                                      {ind.name}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-500 bg-white px-1 rounded border border-slate-200">
                                      {ind.code}
                                    </span>
                                  </div>
                                </td>

                                <td className="py-2 px-4 text-center text-[10px] text-slate-400">
                                  مؤشر أداء
                                </td>

                                <td className="py-2 px-4 text-center">
                                  <div className="inline-flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.25"
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
                                      className="w-14 px-1 py-0.5 text-center text-[11px] font-mono font-semibold bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                    <span className="text-[10px] text-slate-400">%</span>
                                  </div>
                                </td>

                                <td className="py-2 px-4 text-center text-[10px] text-emerald-700">
                                  <span>توزيع تفصيلي</span>
                                </td>
                              </tr>
                            ))}
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
                مجموع أوزان المعايير الرئيسية:
              </td>
              <td className="py-3 px-4 text-center text-base font-black font-mono">
                {totalWeight}%
              </td>
              <td className="py-3 px-4 text-center text-xs">
                {isBalanced ? (
                  <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>متزن 100% لكافة المستويات</span>
                  </span>
                ) : (
                  <span className="text-amber-800 font-bold flex items-center justify-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>غير متزن</span>
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
