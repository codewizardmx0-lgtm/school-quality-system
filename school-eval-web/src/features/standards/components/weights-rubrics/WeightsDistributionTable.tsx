/**
 * Component: WeightsDistributionTable
 * جدول معايرة أوزان المعايير السبعة مع الاحتساب التلقائي لوزن المؤشر
 */

import React from 'react';
import { RotateCcw, Check, AlertCircle } from 'lucide-react';
import type { StandardWeightItem } from '../../api/standardsTypes';

interface WeightsDistributionTableProps {
  weights: StandardWeightItem[];
  totalWeight: number;
  isBalanced: boolean;
  onWeightChange: (standardId: number, newWeight: number) => void;
  onResetEqual: () => void;
}

export const WeightsDistributionTable: React.FC<WeightsDistributionTableProps> = ({
  weights,
  totalWeight,
  isBalanced,
  onWeightChange,
  onResetEqual,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden text-right">
      {/* Table Header Controls */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            جدول توزيع الأوزان على المعايير السبعة
          </h3>
          <p className="text-xs text-slate-500">
            تحديد النسبة المئوية لكل معيار وطني وتوزيعها على المؤشرات التابعة
          </p>
        </div>

        <button
          type="button"
          onClick={onResetEqual}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer"
          title="إعادة توزيع الأوزان رياضياً بالتساوي على المعايير السبعة"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>إعادة توزيع متساوٍ ⟲</span>
        </button>
      </div>

      {/* Contained Data Table (§4 UI_STANDARDS) */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
        <table className="w-full text-right text-sm border-collapse" style={{ minWidth: '640px' }}>
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">المعيار الرئيسي</th>
              <th className="py-3 px-4 text-center">عدد المؤشرات</th>
              <th className="py-3 px-4 text-center w-36">الوزن النسبي (%)</th>
              <th className="py-3 px-4 text-center">متوسط وزن المؤشر</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-slate-800">
            {weights.map((std, index) => {
              const indicatorCount = std.indicatorsCount || 1;
              const subWeight = std.subWeightPerIndicator || Math.round((std.weight / indicatorCount) * 100) / 100;

              return (
                <tr key={std.standardId} className="hover:bg-slate-50/70 transition-colors">
                  {/* Number */}
                  <td className="py-3 px-4 text-center text-xs font-bold text-slate-400">
                    {index + 1}
                  </td>

                  {/* Standard Name */}
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {std.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {std.code} • {std.subStandardsCount || 3} مجالات فرعية
                      </span>
                    </div>
                  </td>

                  {/* Indicators Count */}
                  <td className="py-3 px-4 text-center text-xs font-semibold text-slate-600">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      {std.indicatorsCount || 0} مؤشرات
                    </span>
                  </td>

                  {/* Weight Input */}
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="0.5"
                        value={std.weight}
                        onChange={(e) => onWeightChange(std.standardId, Number(e.target.value))}
                        className="w-20 px-2 py-1.5 text-center text-sm font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-900"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                  </td>

                  {/* Sub Weight per indicator */}
                  <td className="py-3 px-4 text-center text-xs font-mono font-bold text-slate-600">
                    {subWeight}%
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Table Footer with Summary */}
          <tfoot>
            <tr className={`border-t-2 font-bold ${isBalanced ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' : 'bg-amber-50/70 border-amber-300 text-amber-950'}`}>
              <td colSpan={3} className="py-3 px-4 text-left font-bold text-xs sm:text-sm">
                مجموع الأوزان الكلي:
              </td>
              <td className="py-3 px-4 text-center text-base font-black font-mono">
                {totalWeight}%
              </td>
              <td className="py-3 px-4 text-center text-xs">
                {isBalanced ? (
                  <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>متزن 100%</span>
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
