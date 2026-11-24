/**
 * Component: IndicatorEditorPanel (Full Width Stacked Design)
 * لوحة تحرير وتفصيل المؤشر المختار في الشجرة الهرمية
 * مدمج بها إدارة متطلبات الشواهد الـ 278 ومودال واصفات سلم التقدير اللفظي (القرارات 2، 3، و 6)
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  Plus,
  Sparkles,
  Lock,
  Edit2,
  Check,
  X,
  FileCheck,
} from 'lucide-react';
import type {
  IndicatorNode,
  UpdateIndicatorPayload,
  SaveEvidenceRequirementPayload,
  UpdateScoreDescriptorItem,
  EvidenceRequirement,
} from '../../api/standardsTypes';
import { EditScoreDescriptorsModal } from './EditScoreDescriptorsModal';
import { standardsApi } from '../../api/standardsApi';

interface IndicatorEditorPanelProps {
  indicator: IndicatorNode | null;
  standardName?: string;
  subStandardName?: string;
  isDraft?: boolean;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onSave: (id: number, payload: UpdateIndicatorPayload) => Promise<any>;
  onDelete: (id: number) => Promise<any>;
  onAddEvidenceRequirement?: (indicatorId: number, payload: SaveEvidenceRequirementPayload) => Promise<any>;
  onUpdateEvidenceRequirement?: (indicatorId: number, reqId: number, payload: SaveEvidenceRequirementPayload) => Promise<any>;
  onDeleteEvidenceRequirement?: (indicatorId: number, reqId: number) => Promise<any>;
  onUpdateScoreDescriptors?: (indicatorId: number, descriptors: UpdateScoreDescriptorItem[]) => Promise<any>;
}

const availableTools = [
  { id: 'docs', label: 'فحص وثائق وسجلات رسمية', desc: 'تقارير، محاضر اجتماعات، قرارات إدارية' },
  { id: 'observation', label: 'بطاقة ملاحظة صفية وبيئية', desc: 'ملاحظة التدريس والمرافق المدرسية' },
  { id: 'interview', label: 'مقابلة مقننة مع المعنيين', desc: 'المدير، المعلمون، أولياء الأمور، الطلاب' },
  { id: 'survey', label: 'استبانة قياس رضا الفئات المعنية', desc: 'استطلاع رأي موثق ومقاس رقمياً' },
];

export const IndicatorEditorPanel: React.FC<IndicatorEditorPanelProps> = ({
  indicator,
  standardName,
  subStandardName,
  isDraft = true,
  isSaving,
  saveStatus,
  onSave,
  onDelete,
  onAddEvidenceRequirement,
  onUpdateEvidenceRequirement,
  onDeleteEvidenceRequirement,
  onUpdateScoreDescriptors,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [rubricNotes, setRubricNotes] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // حالة مودال الواصفات
  const [isDescriptorsModalOpen, setIsDescriptorsModalOpen] = useState(false);

  // قائمة أدوات التحقق الديناميكية
  const [toolsList, setToolsList] = useState<Array<{ id: string | number; label: string; desc?: string }>>(availableTools);

  useEffect(() => {
    standardsApi.getVerificationTools().then((res) => {
      if (res.tools && res.tools.length > 0) {
        setToolsList(
          res.tools.map((t) => ({
            id: t.toolId,
            label: t.name,
            desc: t.description || t.toolType || '',
          }))
        );
      }
    }).catch(() => {});
  }, []);

  // حالة إضافة وتعديل متطلب شاهد
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqRequired, setNewReqRequired] = useState(true);
  const [isAddingReq, setIsAddingReq] = useState(false);
  const [editingReqId, setEditingReqId] = useState<number | null>(null);
  const [editingReqTitle, setEditingReqTitle] = useState('');
  const [editingReqRequired, setEditingReqRequired] = useState(true);

  useEffect(() => {
    if (indicator) {
      setCode(indicator.code || '');
      setName(indicator.name || '');
      setRubricNotes(indicator.rubricNotes || indicator.description || '');

      const tools = indicator.verificationTools || [];
      if (tools.length === 0 && indicator.verificationMethod) {
        setSelectedTools([indicator.verificationMethod]);
      } else {
        setSelectedTools(tools.length > 0 ? tools : ['فحص وثائق وسجلات رسمية']);
      }
      setShowDeleteConfirm(false);
      setNewReqTitle('');
      setEditingReqId(null);
    }
  }, [indicator]);

  if (!indicator) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '48px 24px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#F1F5F9',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}
        >
          <FileText size={24} />
        </div>
        <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', margin: '0 0 6px' }}>
          لم يتم تحديد مؤشر للتحرير
        </h4>
        <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
          يرجى النقر فوق أي مؤشر من قائمة الشجرة في الأعلى لفتح نموذج تحريره بالكامل.
        </p>
      </div>
    );
  }

  const toggleTool = (toolLabel: string) => {
    if (!isDraft) return;
    setSelectedTools((prev) =>
      prev.includes(toolLabel)
        ? prev.filter((t) => t !== toolLabel)
        : [...prev, toolLabel]
    );
  };

  const handleSave = async () => {
    if (!isDraft || !name.trim()) return;
    await onSave(indicator.indicatorId, {
      code: code.trim(),
      name: name.trim(),
      rubric_notes: rubricNotes.trim(),
      verification_method: selectedTools.join(' • '),
      verification_tools: selectedTools,
    });
  };

  const handleDelete = async () => {
    if (!isDraft) return;
    await onDelete(indicator.indicatorId);
    setShowDeleteConfirm(false);
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
    await onUpdateEvidenceRequirement(indicator.indicatorId, reqId, {
      title: editingReqTitle.trim(),
      required: editingReqRequired,
    });
    setEditingReqId(null);
  };

  const handleDeleteReq = async (reqId: number) => {
    if (!isDraft || !onDeleteEvidenceRequirement) return;
    await onDeleteEvidenceRequirement(indicator.indicatorId, reqId);
  };

  const evidenceReqs = indicator.evidenceRequirements || [];

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Immutability Banner if not Draft */}
      {!isDraft && (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            borderBottom: '1px solid #FDE68A',
            padding: '12px 24px',
            color: '#92400E',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Lock size={16} color="#B45309" />
          <span>هذا الإصدار مُقرّ ونافذ — وضع القراءة والاطلاع فقط (التعديل متاح للمسودات قيد الإعداد فقط).</span>
        </div>
      )}

      {/* 1. Header Toolbar of the Editor Panel */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#B45309',
                backgroundColor: '#FFFBEB',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #FDE68A',
              }}
            >
              محرر بيانات المؤشر
            </span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
              {code || 'كود المؤشر'}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0' }}>
            {standardName} &gt; {subStandardName}
          </p>
        </div>

        {/* Live Auto-save Status & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {saveStatus === 'saving' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#B45309', backgroundColor: '#FFFBEB', padding: '4px 10px', borderRadius: '9999px', border: '1px solid #FDE68A' }}>
              <Loader2 size={13} className="animate-spin" />
              <span>جاري الحفظ...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#047857', backgroundColor: '#ECFDF5', padding: '4px 10px', borderRadius: '9999px', border: '1px solid #A7F3D0' }}>
              <CheckCircle2 size={13} />
              <span>تم حفظ التعديلات ✓</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#B91C1C', backgroundColor: '#FEF2F2', padding: '4px 10px', borderRadius: '9999px', border: '1px solid #FECACA' }}>
              <AlertCircle size={13} />
              <span>فشل الحفظ</span>
            </div>
          )}

          {isDraft && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="std-btn-primary"
              style={{
                opacity: isSaving || !name.trim() ? 0.6 : 1,
                cursor: isSaving || !name.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              <Save size={14} />
              <span>حفظ تعديلات المؤشر</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Editor Content in Full Width Two Columns */}
      <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '24px' }}>
        {/* Right Column: Code + Text + Notes + Evidence Requirements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Code Input */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              الكود البرمجي الفريد للمؤشر {isDraft && <span style={{ color: '#EF4444' }}>*</span>}
            </label>
            <input
              type="text"
              value={code}
              disabled={!isDraft}
              onChange={(e) => setCode(e.target.value)}
              placeholder="مثال: STD-1-SUB-2-IND-4"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                fontFamily: 'monospace',
                backgroundColor: isDraft ? '#FFFFFF' : '#F8FAFC',
                outline: 'none',
              }}
            />
          </div>

          {/* Official Arabic Text */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              النص الرسمي المعتمد للمؤشر {isDraft && <span style={{ color: '#EF4444' }}>*</span>}
            </label>
            <textarea
              rows={3}
              value={name}
              disabled={!isDraft}
              onChange={(e) => setName(e.target.value)}
              placeholder="نص المؤشر بدقة لغوية واضحة تحدد الأداء المطلوب من المدرسة..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                backgroundColor: isDraft ? '#FFFFFF' : '#F8FAFC',
                outline: 'none',
                lineHeight: 1.6,
                resize: 'vertical',
              }}
            />
          </div>

          {/* Rubric Guidance Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              إرشادات التحكيم وملاحظات سلم التقدير اللفظي:
            </label>
            <textarea
              rows={2}
              value={rubricNotes}
              disabled={!isDraft}
              onChange={(e) => setRubricNotes(e.target.value)}
              placeholder="ملاحظات توجيهية للمقيمين حول كيفية فحص الأدلة وتطبيق سلم التقدير..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                backgroundColor: isDraft ? '#FFFFFF' : '#F8FAFC',
                outline: 'none',
                lineHeight: 1.5,
                resize: 'vertical',
              }}
            />
          </div>

          {/* ======================================================== */}
          {/* قسم متطلبات الشواهد الـ 278 (القرار 2: دمج الإدارة داخل اللوحة) */}
          {/* ======================================================== */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCheck size={18} color="#D97706" />
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  متطلبات الشواهد والأدلة المعتمدة للمؤشر ({evidenceReqs.length})
                </h4>
              </div>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                الوحدة المعيارية الأساسية لجرد واحتساب تغطية الشواهد
              </span>
            </div>

            {/* List of Requirements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {evidenceReqs.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px dashed #CBD5E1', color: '#94A3B8', fontSize: '12px' }}>
                  لا توجد متطلبات شواهد مسجلة لهذا المؤشر حتى الآن.
                </div>
              ) : (
                evidenceReqs.map((req, idx) => {
                  const isEditing = editingReqId === req.requirementId;

                  if (isEditing) {
                    return (
                      <div
                        key={req.requirementId}
                        style={{
                          padding: '10px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '8px',
                          border: '1px solid #FCD34D',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <input
                          type="text"
                          value={editingReqTitle}
                          onChange={(e) => setEditingReqTitle(e.target.value)}
                          placeholder="نص متطلب الشاهد..."
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={editingReqRequired}
                              onChange={(e) => setEditingReqRequired(e.target.checked)}
                            />
                            <span>شاهد إلزامي</span>
                          </label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleSaveEditReq(req.requirementId)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#059669',
                                color: '#FFFFFF',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Check size={12} />
                              <span>حفظ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingReqId(null)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #CBD5E1',
                                color: '#475569',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={req.requirementId}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', fontFamily: 'monospace' }}>
                          #{idx + 1}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>
                          {req.title}
                        </span>
                        {req.required ? (
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#991B1B', backgroundColor: '#FEF2F2', padding: '2px 6px', borderRadius: '4px', border: '1px solid #FECACA' }}>
                            إلزامي
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#475569', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                            استرشادي
                          </span>
                        )}
                      </div>

                      {isDraft && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleStartEditReq(req)}
                            title="تعديل الشاهد"
                            style={{
                              padding: '4px 6px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#F1F5F9',
                              color: '#475569',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReq(req.requirementId)}
                            title="حذف الشاهد"
                            style={{
                              padding: '4px 6px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Add Requirement Form in Draft Mode */}
            {isDraft && onAddEvidenceRequirement && (
              <form onSubmit={handleAddRequirement} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={newReqTitle}
                  onChange={(e) => setNewReqTitle(e.target.value)}
                  placeholder="+ كتابة متطلب شاهد إضافي للمؤشر..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={newReqRequired}
                    onChange={(e) => setNewReqRequired(e.target.checked)}
                  />
                  <span>إلزامي</span>
                </label>
                <button
                  type="submit"
                  disabled={isAddingReq || !newReqTitle.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 14px',
                    backgroundColor: '#D97706',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: isAddingReq || !newReqTitle.trim() ? 'not-allowed' : 'pointer',
                    opacity: isAddingReq || !newReqTitle.trim() ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Plus size={13} />
                  <span>إضافة متطلب</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Left Column: Verification Tools + Rubric Descriptors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Verification Tools (Checkboxes) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                أدوات التحقق والشواهد المقررة:
              </label>
              <span style={{ fontSize: '11px', color: '#B45309', fontWeight: 600 }}>
                شرط حتمي للاعتماد (أداة واحدة على الأقل)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              {toolsList.map((tool) => {
                const isChecked = selectedTools.includes(tool.label);
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => toggleTool(tool.label)}
                    disabled={!isDraft}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: isChecked ? '1px solid #FCD34D' : '1px solid #E2E8F0',
                      backgroundColor: isChecked ? '#FFFBEB' : '#FFFFFF',
                      cursor: isDraft ? 'pointer' : 'default',
                      textAlign: 'right',
                    }}
                  >
                    <div style={{ marginTop: '2px', flexShrink: 0 }}>
                      {isChecked ? (
                        <CheckSquare size={16} color="#D97706" />
                      ) : (
                        <Square size={16} color="#94A3B8" />
                      )}
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: isChecked ? '#92400E' : '#1E293B', display: 'block' }}>
                        {tool.label}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        {tool.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* واصفات سلم التقدير اللفظي (0 - 3) وزر المودال (القرار 3) */}
          {/* ======================================================== */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                واصفات سلم التقدير اللفظي (0 - 3):
              </label>

              {isDraft && onUpdateScoreDescriptors && (
                <button
                  type="button"
                  onClick={() => setIsDescriptorsModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    color: '#92400E',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={12} />
                  <span>تعديل الواصفات ✎</span>
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {indicator.scoreDescriptors && indicator.scoreDescriptors.length > 0 ? (
                indicator.scoreDescriptors.map((desc) => (
                  <div
                    key={desc.descriptorId}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      fontSize: '11px',
                    }}
                  >
                    <span style={{ fontWeight: 800, color: '#D97706', display: 'block', marginBottom: '2px' }}>
                      المستوى {desc.scoreValue ?? desc.scoreLevelId}: {desc.label}
                    </span>
                    <p style={{ color: '#475569', margin: 0, lineHeight: 1.4 }}>
                      {desc.description}
                    </p>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: 'span 2', padding: '16px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', color: '#94A3B8', fontSize: '12px' }}>
                  لم يتم تخصيص واصفات تفصيلية بعد (تعتمد الواصفات الافتراضية للوثيقة).
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Footer Bar with Delete & Save */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          backgroundColor: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
        }}
      >
        <div>
          {isDraft && (
            showDeleteConfirm ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#B91C1C', fontWeight: 700 }}>
                  هل أنت متأكد من حذف هذا المؤشر؟
                </span>
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  تأكيد الحذف
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#475569',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  color: '#DC2626',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={13} />
                <span>حذف المؤشر</span>
              </button>
            )
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isDraft ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="std-btn-primary"
              style={{
                opacity: isSaving || !name.trim() ? 0.6 : 1,
                cursor: isSaving || !name.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              <Save size={14} />
              <span>حفظ التعديلات</span>
            </button>
          ) : (
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              (وضع الاطلاع والقراءة فقط)
            </span>
          )}
        </div>
      </div>

      {/* مودال تعديل واصفات سلم التقدير */}
      {isDraft && onUpdateScoreDescriptors && (
        <EditScoreDescriptorsModal
          isOpen={isDescriptorsModalOpen}
          onClose={() => setIsDescriptorsModalOpen(false)}
          indicatorCode={code}
          indicatorName={name}
          descriptors={indicator.scoreDescriptors}
          onSave={(descs) => onUpdateScoreDescriptors(indicator.indicatorId, descs)}
        />
      )}
    </div>
  );
};
