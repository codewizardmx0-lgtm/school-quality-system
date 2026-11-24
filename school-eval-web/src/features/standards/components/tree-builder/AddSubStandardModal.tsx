/**
 * Component: AddSubStandardModal
 * نافذة "+ إضافة معيار فرعي / مجال"
 */

import React, { useState } from 'react';
import { X, Loader2, FolderPlus, AlertCircle } from 'lucide-react';
import type { CreateSubStandardPayload } from '../../api/standardsTypes';

interface AddSubStandardModalProps {
  isOpen: boolean;
  onClose: () => void;
  standardName: string;
  standardId: number;
  onSubmit: (stdId: number, payload: CreateSubStandardPayload) => Promise<any>;
}

export const AddSubStandardModal: React.FC<AddSubStandardModalProps> = ({
  isOpen,
  onClose,
  standardName,
  standardId,
  onSubmit,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setCode('');
    setName('');
    setDescription('');
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError('يرجى إدخال كود واسم المجال الفرعي.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(standardId, {
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
      });
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'فشل إضافة المعيار الفرعي.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-700">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">إضافة معيار فرعي (مجال)</h3>
              <p className="text-xs text-slate-500 truncate max-w-[260px]">
                يتبع: {standardName}
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

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              كود المجال الفرعي <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثال: STD-1-SUB-3"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم المجال الفرعي <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثال: التخطيط الاستراتيجي والتطوير المدرسي"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              الوصف والهدف العام للمجال
            </label>
            <textarea
              rows={2}
              placeholder="شرح موجز لأهداف المجال..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
            />
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
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <span>إضافة المجال الفرعي</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
