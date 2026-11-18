/**
 * Component: VerificationToolsManagerModal
 * إدارة وتخصيص أدوات ووسائل التحقق المعتمدة في التقويم المدرسي (المرونة الكاملة)
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  FileCheck,
  AlertCircle,
  Loader2,
  CheckCircle,
  Info,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { standardsApi } from '../../api/standardsApi';
import type { VerificationTool } from '../../api/standardsTypes';

interface VerificationToolsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToolsUpdated?: () => void;
}

export const VerificationToolsManagerModal: React.FC<VerificationToolsManagerModalProps> = ({
  isOpen,
  onClose,
  onToolsUpdated,
}) => {
  const [tools, setTools] = useState<VerificationTool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for adding new tool
  const [name, setName] = useState('');
  const [toolType, setToolType] = useState('وثائق وسجلات');
  const [description, setDescription] = useState('');

  // Delete confirm state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTools = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await standardsApi.getVerificationTools();
      setTools(data.tools || []);
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل أدوات التحقق.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTools();
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى كتابة اسم أداة التحقق.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await standardsApi.createVerificationTool({
        name: name.trim(),
        tool_type: toolType.trim() || undefined,
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
      setSuccess('تمت إضافة أداة التحقق بنجاح واعتمادها.');
      await fetchTools();
      if (onToolsUpdated) onToolsUpdated();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل إضافة أداة التحقق.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTool = async (toolId: number) => {
    setIsDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      await standardsApi.deleteVerificationTool(toolId);
      setDeletingId(null);
      setSuccess('تم حذف أداة التحقق بنجاح.');
      await fetchTools();
      if (onToolsUpdated) onToolsUpdated();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'تعذر حذف أداة التحقق.');
      setDeletingId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-amber-800 to-amber-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-700/60 flex items-center justify-center border border-amber-500/30">
              <FileCheck className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">إدارة أدوات ووسائل التحقق المعتمدة</h3>
              <p className="text-xs text-amber-200 mt-0.5">
                تخصيص وإضافة أدوات جمع الأدلة والشواهد وربطها بالمؤشرات المعيارية بمرونة كاملة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Add New Tool Form */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <Plus className="w-4 h-4 text-amber-700" />
              <span>إضافة أداة تحقق جديدة</span>
            </div>

            <form onSubmit={handleAddTool} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    اسم أداة التحقق <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: فحص السجلات الأكاديمية والوثائق"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    التصنيف / النوع الميداني
                  </label>
                  <select
                    value={toolType}
                    onChange={(e) => setToolType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  >
                    <option value="وثائق وسجلات">وثائق وسجلات</option>
                    <option value="ميداني">ميداني / ملاحظة</option>
                    <option value="شخصي">مقابلات شخصية</option>
                    <option value="استبانة">استبانات ومسوح</option>
                    <option value="تحليلي">تحليل مضمون</option>
                    <option value="رقمي">أداة تقنية ورقمية</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الوصف وإرشادات التطبيق (اختياري)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="إرشادات مختصرة لكيفية تطبيق الأداة من قبل المقيم..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>اعتماد وإضافة الأداة</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Existing Tools List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>قائمة الأدوات المعتمدة حالياً ({tools.length})</span>
              </div>
              <span className="text-xs text-slate-500">
                الأدوات المرتبطة بمؤشرات محمية من الحذف لسلامة التقييم
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
                <span>جاري تحميل أدوات التحقق...</span>
              </div>
            ) : tools.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm">
                لا توجد أدوات تحقق مسجلة حالياً.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {tools.map((tool) => {
                  const isLinked = (tool.indicatorsCount || 0) > 0;
                  const isConfirmingDelete = deletingId === tool.toolId;

                  return (
                    <div
                      key={tool.toolId}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-amber-300 transition-all shadow-xs flex items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-100/70 border border-amber-200 flex items-center justify-center flex-shrink-0 text-amber-800">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">{tool.name}</span>
                            {tool.toolType && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {tool.toolType}
                              </span>
                            )}
                            {isLinked ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                مرتبطة بـ {tool.indicatorsCount} مؤشر
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
                                غير مستخدمة
                              </span>
                            )}
                          </div>
                          {tool.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {tool.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex-shrink-0">
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1.5 rounded-lg">
                            <span className="text-[11px] text-rose-800 font-bold px-1">تأكيد؟</span>
                            <button
                              onClick={() => handleDeleteTool(tool.toolId)}
                              disabled={isDeleting}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold"
                            >
                              {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'نعم'}
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              disabled={isDeleting}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px]"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (!isLinked) {
                                setDeletingId(tool.toolId);
                              }
                            }}
                            disabled={isLinked}
                            className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                              isLinked
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                            }`}
                            title={isLinked ? 'لا يمكن حذف أداة مرتبطة بمؤشرات' : 'حذف أداة التحقق'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-amber-700" />
            <span>تظهر هذه الأدوات تلقائياً في نافذة تحرير المؤشرات لاختيار ما يناسب كل مؤشر.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
