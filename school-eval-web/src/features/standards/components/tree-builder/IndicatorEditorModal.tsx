/**
 * Component: IndicatorEditorModal
 * نافذة أمامية منبثقة (Front Modal / Workspace Drawer) لتحرير وتفصيل المؤشر
 * - حفظ صريح فقط عند الضغط على زر "حفظ التعديلات" (لا حفظ تلقائي عند التنقل)
 * - مرونة كاملة في أدوات التحقق (1-4 أدوات بدون إجبار)
 * - إدارة متطلبات الشواهد (إضافة، تعديل، حذف، إلزامي/اختياري)
 * - استدعاء نافذة واصفات سلم التقدير
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Trash2,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  Plus,
  Sparkles,
  Lock,
  Edit2,
  Check,
  FileCheck,
  Layers,
} from 'lucide-react';
import type {
  IndicatorNode,
  UpdateIndicatorPayload,
  SaveEvidenceRequirementPayload,
  UpdateScoreDescriptorItem,
  EvidenceRequirement,
} from '../../api/standardsTypes';
import { EditScoreDescriptorsModal } from './EditScoreDescriptorsModal';

interface IndicatorEditorModalProps {
  isOpen: boolean;
  indicator: IndicatorNode | null;
  standardName?: string;
  subStandardName?: string;
  isDraft?: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (id: number, payload: UpdateIndicatorPayload) => Promise<any>;
  onDelete?: (id: number) => Promise<any>;
  onAddEvidenceRequirement?: (indicatorId: number, payload: SaveEvidenceRequirementPayload) => Promise<any>;
  onUpdateEvidenceRequirement?: (indicatorId: number, reqId: number, payload: SaveEvidenceRequirementPayload) => Promise<any>;
  onDeleteEvidenceRequirement?: (indicatorId: number, reqId: number) => Promise<any>;
  onUpdateScoreDescriptors?: (indicatorId: number, descriptors: UpdateScoreDescriptorItem[]) => Promise<any>;
}

const availableTools = [
  { id: 'docs', label: 'فحص وثائق وسجلات رسمية', desc: 'تقارير، محاضر اجتماعات، خطط مدرسية' },
  { id: 'observation', label: 'بطاقة ملاحظة صفية وبيئية', desc: 'ملاحظة التدريس الصفي والمرافق المدرسية' },
  { id: 'interview', label: 'مقابلة مقننة مع المعنيين', desc: 'المدير، المعلمون، أولياء الأمور، الطلاب' },
  { id: 'survey', label: 'استبانة قياس رضا الفئات المعنية', desc: 'استطلاع رأي موثق ومقاس رقمياً' },
];

export const IndicatorEditorModal: React.FC<IndicatorEditorModalProps> = ({
  isOpen,
  indicator,
  standardName,
  subStandardName,
  isDraft = true,
  isSaving,
  onClose,
  onSave,
  onDelete,
  onAddEvidenceRequirement,
  onUpdateEvidenceRequirement,
  onDeleteEvidenceRequirement,
  onUpdateScoreDescriptors,
}) => {
  // Local state for explicit editing without auto-save
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [weight, setWeight] = useState<number | ''>('');
  const [rubricNotes, setRubricNotes] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'tools' | 'descriptors' | 'evidence'>('details');

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Score descriptors modal state
  const [isDescriptorsModalOpen, setIsDescriptorsModalOpen] = useState(false);

  // Evidence requirements state
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqRequired, setNewReqRequired] = useState(true);
  const [isAddingReq, setIsAddingReq] = useState(false);
  const [editingReqId, setEditingReqId] = useState<number | null>(null);
  const [editingReqTitle, setEditingReqTitle] = useState('');
  const [editingReqRequired, setEditingReqRequired] = useState(true);

  // Initialize form when indicator changes or modal opens
  useEffect(() => {
    if (indicator && isOpen) {
      setCode(indicator.code || '');
      setName(indicator.name || '');
      setWeight(indicator.weight !== undefined && indicator.weight !== null ? indicator.weight : '');
      setRubricNotes(indicator.rubricNotes || indicator.description || '');

      const tools = indicator.verificationTools || [];
      if (tools.length === 0 && indicator.verificationMethod) {
        setSelectedTools([indicator.verificationMethod]);
      } else {
        setSelectedTools(tools);
      }

      setError(null);
      setSuccessMessage(null);
      setShowDeleteConfirm(false);
      setNewReqTitle('');
      setEditingReqId(null);
    }
  }, [indicator, isOpen]);

  if (!isOpen || !indicator) return null;

  // Toggle tool checkbox (Flexible 1-4 tools)
  const toggleTool = (toolLabel: string) => {
    if (!isDraft) return;
    setSelectedTools((prev) =>
      prev.includes(toolLabel)
        ? prev.filter((t) => t !== toolLabel)
        : [...prev, toolLabel]
    );
  };

  // Explicit Save handler
  const handleSave = async () => {
    if (!isDraft) return;
    if (!name.trim()) {
      setError('يرجى إدخال نص المؤشر المعياري.');
      setActiveTab('details');
      return;
    }

    setError(null);
    try {
      await onSave(indicator.indicatorId, {
        code: code.trim() || undefined,
        name: name.trim(),
        weight: weight !== '' ? Number(weight) : undefined,
        rubric_notes: rubricNotes.trim() || undefined,
        verification_method: selectedTools.join(' • '),
        verification_tools: selectedTools,
      });
      setSuccessMessage('تم حفظ تعديلات المؤشر بنجاح.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'فشل حفظ تعديلات المؤشر.');
    }
  };

  const handleDelete = async () => {
    if (!isDraft || !onDelete) return;
    try {
      await onDelete(indicator.indicatorId);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذر حذف المؤشر.');
    }
  };

  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDraft || !newReqTitle.trim() || !onAddEvidenceRequirement) return;
    setIsAddingReq(true);
    try {
      await onAddEvidenceRequirement(indicator.indicatorId, {
        title: newReqTitle.trim(),
        required: newReqRequired,
      });
      setNewReqTitle('');
      setNewReqRequired(true);
    } catch (err: any) {
      setError(err?.message || 'تعذر إضافة متطلب الشاهد.');
    } finally {
      setIsAddingReq(false);
    }
  };

  const handleStartEditReq = (req: EvidenceRequirement) => {
    if (!isDraft) return;
    setEditingReqId(req.requirementId);
    setEditingReqTitle(req.title);
    setEditingReqRequired(req.required);
  };

  const handleSaveEditReq = async (reqId: number) => {
    if (!isDraft || !editingReqTitle.trim() || !onUpdateEvidenceRequirement) return;
    try {
      await onUpdateEvidenceRequirement(indicator.indicatorId, reqId, {
        title: editingReqTitle.trim(),
        required: editingReqRequired,
      });
      setEditingReqId(null);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحديث متطلب الشاهد.');
    }
  };

  const handleDeleteReq = async (reqId: number) => {
    if (!isDraft || !onDeleteEvidenceRequirement) return;
    try {
      await onDeleteEvidenceRequirement(indicator.indicatorId, reqId);
    } catch (err: any) {
      setError(err?.message || 'تعذر حذف متطلب الشاهد.');
    }
  };

  const evidenceReqs = indicator.evidenceRequirements || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-slate-800">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col text-right">
        
        {/* Immutability Banner if not Draft */}
        {!isDraft && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs font-bold text-amber-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>هذا الإصدار مُقرّ ونافذ — وضع القراءة والاطلاع فقط (التعديل متاح للمسودات قيد الإعداد فقط).</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 font-mono font-extrabold text-sm shadow-sm">
              {indicator.code}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  لوحة تحرير وتفصيل المؤشر المعياري
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                  {indicator.code}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {standardName ? `${standardName}` : ''}
                {subStandardName ? ` > ${subStandardName}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-white border-b border-slate-200 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'details'
                ? 'border-amber-600 text-amber-800 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>بيانات المؤشر والوزن</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'tools'
                ? 'border-amber-600 text-amber-800 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>أدوات التحقق المعتمدة ({selectedTools.length}/4)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('descriptors')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'descriptors'
                ? 'border-amber-600 text-amber-800 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>واصفات سلم التقدير (0 - 3)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evidence')}
            className={`pb-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'evidence'
                ? 'border-amber-600 text-amber-800 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>متطلبات الشواهد ({evidenceReqs.length})</span>
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رمز المؤشر المعياري <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={!isDraft}
                    placeholder="مثال: IND-1-1-1"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-left font-mono disabled:opacity-60"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الوزن النسبي للمؤشر (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    disabled={!isDraft}
                    placeholder="افتراضي: يوزع بالتساوي"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-left font-mono disabled:opacity-60"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    (اختياري — إذا ترك فارغاً يُوزع بالتساوي داخل المعيار الفرعي)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    حالة المؤشر
                  </label>
                  <div className="px-3.5 py-2 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-semibold">
                    {indicator.status || 'معتمد في الوثيقة'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نص المؤشر المعياري الكامل <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isDraft}
                  placeholder="نص المؤشر الإجرائي القابل للملاحظة والقياس..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  إرشادات وتوجيهات المقيم (Rubric Notes)
                </label>
                <textarea
                  rows={4}
                  value={rubricNotes}
                  onChange={(e) => setRubricNotes(e.target.value)}
                  disabled={!isDraft}
                  placeholder="ملاحظات وتوجيهات للمقيمين حول كيفية تطبيق سلم التقدير والتثبت من الشواهد..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none disabled:opacity-60"
                />
              </div>
            </div>
          )}

          {/* TAB 2: VERIFICATION TOOLS (FLEXIBLE 1-4) */}
          {activeTab === 'tools' && (
            <div className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-amber-900 mb-1">
                  مرونة اختيار أدوات التحقق (Verification Tools)
                </h4>
                <p className="text-xs text-amber-800/80 leading-relaxed">
                  يمكن تحديد أي عدد من الأدوات (أداة واحدة، اثنتان، ثلاث، أو الأربع أدوات كاملة) حسب طبيعة المؤشر. يتم حفظ الأدوات المختارة صراحة مع المؤشر.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableTools.map((tool) => {
                  const isChecked = selectedTools.includes(tool.label);
                  return (
                    <div
                      key={tool.id}
                      onClick={() => toggleTool(tool.label)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                        isChecked
                          ? 'border-amber-600 bg-amber-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      } ${!isDraft ? 'cursor-not-allowed opacity-75' : ''}`}
                    >
                      <div className="mt-0.5 text-amber-600">
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 fill-amber-100" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-extrabold text-slate-900 mb-0.5">
                          {tool.label}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {tool.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>الأدوات المحددة حالياً: <strong>{selectedTools.length}</strong> من أصل 4</span>
                <span className="font-mono text-xs text-amber-700 font-bold">
                  {selectedTools.length > 0 ? selectedTools.join(' • ') : 'لم يتم اختيار أي أداة بعد'}
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: SCORE DESCRIPTORS */}
          {activeTab === 'descriptors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">
                    واصفات سلم التقدير اللفظي (Rubric Descriptors)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    الواصفات الأربعة المعتمدة (0: غير متحقق، 1: متحقق جزئياً، 2: متحقق، 3: متميز)
                  </p>
                </div>

                {isDraft && onUpdateScoreDescriptors && (
                  <button
                    type="button"
                    onClick={() => setIsDescriptorsModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل نصوص الواصفات</span>
                  </button>
                )}
              </div>

              {/* Readonly preview of descriptors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { level: 3, label: 'متميز (3)', color: 'emerald', border: 'border-emerald-200', bg: 'bg-emerald-50/50' },
                  { level: 2, label: 'متحقق (2)', color: 'blue', border: 'border-blue-200', bg: 'bg-blue-50/50' },
                  { level: 1, label: 'متحقق جزئياً (1)', color: 'amber', border: 'border-amber-200', bg: 'bg-amber-50/50' },
                  { level: 0, label: 'غير متحقق (0)', color: 'rose', border: 'border-rose-200', bg: 'bg-rose-50/50' },
                ].map((item) => {
                  const desc = indicator.scoreDescriptors?.find(
                    (d) => (d.scoreValue ?? d.scoreLevelId) === item.level
                  );
                  return (
                    <div
                      key={item.level}
                      className={`p-3.5 rounded-xl border ${item.border} ${item.bg} flex flex-col gap-1.5`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="font-extrabold">{item.label}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-600 font-mono">
                          مستوى {item.level}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {desc?.description || 'لا يوجد واصف مدخل لهذا المستوى بعد.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: EVIDENCE REQUIREMENTS (278) */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">
                    متطلبات الشواهد والأدلة المقننة
                  </h4>
                  <p className="text-xs text-slate-500">
                    إدارة قائمة الأدلة المحددة في الوثيقة الوطنية لهذا المؤشر
                  </p>
                </div>
              </div>

              {/* Add Evidence Form */}
              {isDraft && onAddEvidenceRequirement && (
                <form
                  onSubmit={handleAddRequirement}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newReqTitle}
                      onChange={(e) => setNewReqTitle(e.target.value)}
                      placeholder="عنوان متطلب الشاهد الجديد (مثال: محضر اجتماع لجنة التوجيه الطلابي)..."
                      className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />

                    <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newReqRequired}
                        onChange={(e) => setNewReqRequired(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>شاهد إلزامي</span>
                    </label>

                    <button
                      type="submit"
                      disabled={isAddingReq || !newReqTitle.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isAddingReq ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>إضافة</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Requirements List */}
              <div className="space-y-2">
                {evidenceReqs.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    لا توجد متطلبات شواهد مسجلة لهذا المؤشر بعد.
                  </div>
                ) : (
                  evidenceReqs.map((req, index) => {
                    const isEditingThis = editingReqId === req.requirementId;

                    return (
                      <div
                        key={req.requirementId}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        {isEditingThis ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingReqTitle}
                              onChange={(e) => setEditingReqTitle(e.target.value)}
                              className="flex-1 px-2.5 py-1 text-xs border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                              <input
                                type="checkbox"
                                checked={editingReqRequired}
                                onChange={(e) => setEditingReqRequired(e.target.checked)}
                              />
                              <span>إلزامي</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleSaveEditReq(req.requirementId)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="حفظ"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingReqId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                              title="إلغاء"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                                {index + 1}
                              </span>
                              <span className="font-semibold text-slate-800 truncate">
                                {req.title}
                              </span>
                              {req.required ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                  إلزامي
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  اختياري
                                </span>
                              )}
                            </div>

                            {isDraft && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditReq(req)}
                                  className="p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded"
                                  title="تعديل"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReq(req.requirementId)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (Explicit Save & Cancel) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div>
            {isDraft && onDelete && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-700 font-bold">تأكيد حذف المؤشر نهائياً؟</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                    >
                      نعم، حذف
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف المؤشر</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء والتراجع
            </button>

            {isDraft && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-xl shadow-md shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ التعديلات</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Edit Score Descriptors Modal */}
      {isDescriptorsModalOpen && onUpdateScoreDescriptors && (
        <EditScoreDescriptorsModal
          isOpen={isDescriptorsModalOpen}
          indicatorCode={indicator.code}
          indicatorName={indicator.name}
          descriptors={indicator.scoreDescriptors}
          onClose={() => setIsDescriptorsModalOpen(false)}
          onSave={async (descriptors: UpdateScoreDescriptorItem[]) => {
            await onUpdateScoreDescriptors(indicator.indicatorId, descriptors);
          }}
        />
      )}
    </div>
  );
};
