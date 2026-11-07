/**
 * Component: CreateDraftModal
 * نافذة "+ إنشاء مسودة إصدار جديد"
 * متوافقة مع UI_STANDARDS (§5 و §6):
 * - تصفير حقول النموذج والأخطاء عند الإغلاق
 * - تعطيل زر الحفظ مع مؤشر تحميل أثناء الإرسال (disabled={isSubmitting})
 */

import React, { useState } from 'react';
import { X, Loader2, Copy, AlertCircle, FilePlus2 } from 'lucide-react';
import type { StandardVersionSummary, CreateDraftPayload } from '../../api/standardsTypes';

interface CreateDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeVersions: StandardVersionSummary[];
  onSubmit: (payload: CreateDraftPayload) => Promise<any>;
}

export const CreateDraftModal: React.FC<CreateDraftModalProps> = ({
  isOpen,
  onClose,
  activeVersions,
  onSubmit,
}) => {
  const [versionNo, setVersionNo] = useState('');
  const [sourceNumber, setSourceNumber] = useState('');
  const [sourceDescription, setSourceDescription] = useState('');
  const [cloneFromId, setCloneFromId] = useState<number | undefined>(
    activeVersions[0]?.versionId
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    // تصفير النموذج والأخطاء عند الإغلاق (§5)
    setVersionNo('');
    setSourceNumber('');
    setSourceDescription('');
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionNo.trim()) {
      setError('يرجى إدخال رقم أو كود الإصدار الجديد.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        version_no: versionNo.trim(),
        source_number: sourceNumber.trim() || undefined,
        source_description: sourceDescription.trim() || undefined,
        clone_from_version_id: cloneFromId,
      });
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'تعذر إنشاء المسودة، يرجى المحاولة لاحقاً.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-right">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-700">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">إنشاء مسودة إصدار جديد</h3>
              <p className="text-xs text-slate-500">
                تطوير إطار معايير التقييم والاعتماد المدرسي ضمن بيئة تجريبية معزولة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Option: Clone from existing */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              استنساخ الشجرة الهرمية والأوزان من إصدار معتمد:
            </label>
            <select
              value={cloneFromId || ''}
              onChange={(e) => setCloneFromId(Number(e.target.value) || undefined)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
            >
              <option value="">بدء مسودة جديدة فارغة</option>
              {activeVersions.map((v) => (
                <option key={v.versionId} value={v.versionId}>
                  استنساخ من: {v.versionNo} ({v.status === 'Active' ? 'الإصدار المعتمد الحاكم' : v.status})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              يُستحسن استنساخ الإصدار الحاكم الحالي (2026) لضمان استمرارية المعايير الـ 7 والمؤشرات الـ 109.
            </p>
          </div>

          {/* Version Code / Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              كود / رقم الإصدار الجديد <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثال: 2027.1 أو STD-NAT-2027-V1"
              value={versionNo}
              onChange={(e) => setVersionNo(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Source Ministerial Decree */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              رقم وتاريخ قرار التطوير الوزاري (إن وجد)
            </label>
            <input
              type="text"
              placeholder="مثال: قرار وزاري رقم (42) لسنة 2026م بشأن تحديث المعايير"
              value={sourceNumber}
              onChange={(e) => setSourceNumber(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Source Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              وصف أهداف المسودة ونطاق التحديث
            </label>
            <textarea
              rows={3}
              placeholder="تحديد الدوافع المنهجية أو إضافة مؤشرات التحول الرقمي والحوكمة..."
              value={sourceDescription}
              onChange={(e) => setSourceDescription(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-sm shadow-amber-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إنشاء المسودة...</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>تأكيد إنشاء المسودة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
