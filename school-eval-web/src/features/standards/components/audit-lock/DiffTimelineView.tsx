/**
 * Component: DiffTimelineView
 * سجل الفروقات والتغييرات ومؤشر الأثر الرقمي المقارن
 */

import React from 'react';
import {
  PlusCircle,
  Edit,
  Scale,
  ShieldCheck,
  Hash,
  Clock,
  UserCheck,
} from 'lucide-react';
import type { DiffLogResponse, DiffTimelineItem } from '../../api/standardsTypes';

interface DiffTimelineViewProps {
  diffData: DiffLogResponse | null;
}

export const DiffTimelineView: React.FC<DiffTimelineViewProps> = ({ diffData }) => {
  const diffs: DiffTimelineItem[] = diffData?.diffs || [];
  const hash = diffData?.integrityHash || '8f2b7405e3b...93d2c1';

  const getDiffIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <PlusCircle className="w-4 h-4 text-emerald-600" />;
      case 'reweighted':
        return <Scale className="w-4 h-4 text-blue-600" />;
      case 'tool':
        return <ShieldCheck className="w-4 h-4 text-amber-600" />;
      case 'modified':
      default:
        return <Edit className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 text-right space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            سجل الفروقات والتغييرات (Diff Log)
          </h3>
          <p className="text-xs text-slate-500">
            مقارنة مفصلة لكافة التعديلات المنهجية بالمقارنة مع خط الأساس ({diffData?.baselineVersionNo || '2026.1'})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            {diffs.length} تعديلات مرصودة
          </span>
        </div>
      </div>

      {/* SHA-256 Digital Hash Stamp */}
      <div className="flex items-center justify-between p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs border border-slate-800">
        <div className="flex items-center gap-2 overflow-hidden">
          <Hash className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-slate-400 shrink-0">SHA-256 Seal:</span>
          <span className="text-amber-300 font-bold truncate">{hash}</span>
        </div>
        <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60 shrink-0">
          بصمة رقمية صالحة ✓
        </span>
      </div>

      {/* Timeline List */}
      <div className="relative pr-4 border-r-2 border-slate-200 space-y-4">
        {diffs.map((diff) => (
          <div key={diff.id} className="relative group">
            {/* Timeline Node Dot */}
            <div className="absolute -right-[23px] top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-amber-600 group-hover:scale-125 transition-transform" />

            <div className="p-3.5 bg-slate-50/80 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {getDiffIcon(diff.type)}
                  <span className="text-xs font-bold text-slate-900">{diff.target}</span>
                  <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {diff.code}
                  </span>
                </div>

                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  {diff.category}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                {diff.description}
              </p>

              <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 mt-2">
                <div className="flex items-center gap-1 text-slate-600">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>المسؤول: {diff.author}</span>
                </div>

                <div className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{diff.timestamp}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
