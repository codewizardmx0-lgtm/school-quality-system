/**
 * Component: AddIndicatorModal
 * نافذة "+ إضافة مؤشر رسمي"
 */

import React, { useState } from 'react';
import { X, Loader2, PlusCircle, AlertCircle } from 'lucide-react';
import type { CreateIndicatorPayload } from '../../api/standardsTypes';

interface AddIndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  subStandardName: string;
  subStandardId: number;
  onSubmit: (subId: number, payload: CreateIndicatorPayload) => Promise<any>;
}

export const AddIndicatorModal: React.FC<AddIndicatorModalProps> = ({
  isOpen,
  onClose,
  subStandardName,
  subStandardId,
  onSubmit,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [weight, setWeight] = useState<number>(1);
  const [verificationMethod, setVerificationMethod] = useState('فحص وثائق وسجلات');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setCode('');
    setName('');
    setWeight(1);
    setVerificationMethod('فحص وثائق وسجلات');
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError('يرجى إدخال كود ونص المؤشر.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(subStandardId, {
        code: code.trim(),
        name: name.trim(),
        weight: Number(weight) || 1,
        verification_method: verificationMethod,
      });
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'فشل إضافة المؤشر.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-700">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">إضافة مؤشر رسمي جديد</h3>
              <p className="text-xs text-slate-500 truncate max-w-[280px]">
                يتبع المجال: {subStandardName}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                كود المؤشر <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="STD-1-SUB-2-IND-4"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الوزن التقديري
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                disabled={isSubmitting}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              نص المؤشر الرسمي المعتمد <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="نص المؤشر بدقة لغوية واضحة تحدد الأداء المطلوب من المدرسة..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              أداة التحقق الرئيسية
            </label>
            <select
              value={verificationMethod}
              onChange={(e) => setVerificationMethod(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
            >
              <option value="فحص وثائق وسجلات">فحص وثائق وسجلات رسمية</option>
              <option value="بطاقة ملاحظة صفية وبيئية">بطاقة ملاحظة صفية وبيئية</option>
              <option value="مقابلة مقننة">مقابلة مقننة (فردية أو جماعية)</option>
              <option value="استبانة قياس رضا">استبانة قياس رضا الفئات المعنية</option>
            </select>
          </div>

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
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إضافة المؤشر...</span>
                </>
              ) : (
                <span>إضافة المؤشر للشجرة</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
