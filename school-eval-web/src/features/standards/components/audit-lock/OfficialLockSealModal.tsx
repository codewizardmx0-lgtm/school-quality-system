/**
 * Component: OfficialLockSealModal
 * نافذة الختم الرقمي والاعتماد الوزاري النهائي
 * متوافقة مع UI_STANDARDS (§1):
 * استخدام SYSTEM_FULL_NAME «منصة ارتقاء للتقييم الذاتي والتحسين المدرسي»
 */

import React from 'react';
import { Award, ShieldCheck, FileDown, X } from 'lucide-react';

interface OfficialLockSealModalProps {
  isOpen: boolean;
  onClose: () => void;
  versionNo: string;
  approvalCode: string;
  hash: string;
  onDownloadReport: () => void;
}

export const OfficialLockSealModal: React.FC<OfficialLockSealModalProps> = ({
  isOpen,
  onClose,
  versionNo,
  approvalCode,
  hash,
  onDownloadReport,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in text-slate-800">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-emerald-500/40 overflow-hidden text-right">
        {/* Seal Badge Decoration Header */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 text-white p-8 text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 text-white/70 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-20 h-20 mx-auto rounded-full bg-white/15 border-2 border-white/40 flex items-center justify-center shadow-lg mb-4">
            <Award className="w-10 h-10 text-amber-300" />
          </div>

          <span className="text-[11px] font-bold tracking-wider uppercase bg-emerald-900/60 text-emerald-200 px-3 py-1 rounded-full border border-emerald-500/30">
            أمانة المعايير والاعتماد الأكاديمي
          </span>

          <h3 className="text-xl font-black mt-2">
            تم قفل واعتماد وثيقة المعايير رسمياً
          </h3>
          <p className="text-xs text-emerald-100/90 mt-1 max-w-sm mx-auto">
            منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">كود الإصدار المعتمد:</span>
              <span className="font-mono font-bold text-slate-900">{versionNo}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">رقم قرار الاعتماد الوزاري:</span>
              <span className="font-mono font-bold text-emerald-700">{approvalCode}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">حالة المناعة المنهجية:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>مقفل ومجمد للتعديل (Immutable)</span>
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-500 block mb-1">بصمة النزاهة الرقمية (SHA-256):</span>
              <span className="font-mono text-[11px] text-slate-800 break-all bg-white p-2 rounded-lg border border-slate-300 block">
                {hash}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onDownloadReport}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-emerald-600" />
              <span>تحميل التقرير الوزاري المعتمد (PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              إغلاق ومتابعة السجل
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
