/**
 * Component: IndicatorEditorPanel (Full Width Stacked Design)
 * لوحة تحرير وتفصيل المؤشر المختار في الشجرة الهرمية
 * مصممة بكامل العرض بمساحة رحبة ومريحة جداً للعين
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
} from 'lucide-react';
import type { IndicatorNode, UpdateIndicatorPayload } from '../../api/standardsTypes';

interface IndicatorEditorPanelProps {
  indicator: IndicatorNode | null;
  standardName?: string;
  subStandardName?: string;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onSave: (id: number, payload: UpdateIndicatorPayload) => Promise<any>;
  onDelete: (id: number) => Promise<any>;
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
  isSaving,
  saveStatus,
  onSave,
  onDelete,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [rubricNotes, setRubricNotes] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (indicator) {
      setCode(indicator.code || '');
      setName(indicator.name || '');
      setRubricNotes(indicator.rubricNotes || indicator.description || '');

      // استخراج أدوات التحقق الحالية
      const tools = indicator.verificationTools || [];
      if (tools.length === 0 && indicator.verificationMethod) {
        setSelectedTools([indicator.verificationMethod]);
      } else {
        setSelectedTools(tools.length > 0 ? tools : ['فحص وثائق وسجلات رسمية']);
      }
      setShowDeleteConfirm(false);
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
    setSelectedTools((prev) =>
      prev.includes(toolLabel)
        ? prev.filter((t) => t !== toolLabel)
        : [...prev, toolLabel]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave(indicator.indicatorId, {
      code: code.trim(),
      name: name.trim(),
      rubric_notes: rubricNotes.trim(),
      verification_method: selectedTools.join(' • '),
      verification_tools: selectedTools,
    });
  };

  const handleDelete = async () => {
    await onDelete(indicator.indicatorId);
    setShowDeleteConfirm(false);
  };

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

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: isSaving || !name.trim() ? 'not-allowed' : 'pointer',
              opacity: isSaving || !name.trim() ? 0.6 : 1,
            }}
          >
            <Save size={14} />
            <span>حفظ تعديلات المؤشر</span>
          </button>
        </div>
      </div>

      {/* 2. Editor Content in Full Width Two Columns */}
      <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '24px' }}>
        {/* Right Column: Code + Official Arabic Text + Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Code Input */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              الكود البرمجي الفريد للمؤشر <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="مثال: STD-1-SUB-2-IND-4"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                fontFamily: 'monospace',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            />
          </div>

          {/* Official Arabic Text */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              النص الرسمي المعتمد للمؤشر <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              rows={4}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="نص المؤشر بدقة لغوية واضحة تحدد الأداء المطلوب من المدرسة..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                backgroundColor: '#FFFFFF',
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
              rows={3}
              value={rubricNotes}
              onChange={(e) => setRubricNotes(e.target.value)}
              placeholder="ملاحظات توجيهية للمقيمين حول كيفية فحص الأدلة وتطبيق سلم التقدير..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                lineHeight: 1.6,
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        {/* Left Column: Verification Tools + Rubric Descriptors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Verification Tools (Checkboxes) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                أدوات التحقق والشواهد الملزمة:
              </label>
              <span style={{ fontSize: '11px', color: '#B45309', fontWeight: 600 }}>
                شرط حتمي للاعتماد (أداة واحدة على الأقل)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              {availableTools.map((tool) => {
                const isChecked = selectedTools.includes(tool.label);
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => toggleTool(tool.label)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: isChecked ? '1px solid #FCD34D' : '1px solid #E2E8F0',
                      backgroundColor: isChecked ? '#FFFBEB' : '#FFFFFF',
                      cursor: 'pointer',
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

          {/* Score Descriptors Preview (0-3) */}
          {indicator.scoreDescriptors && indicator.scoreDescriptors.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                واصفات سلم التقدير اللفظي المعتمدة للمؤشر (0 - 3):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {indicator.scoreDescriptors.map((desc) => (
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
                      المستوى {desc.scoreValue}: {desc.label}
                    </span>
                    <p style={{ color: '#475569', margin: 0, lineHeight: 1.4 }}>
                      {desc.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          {showDeleteConfirm ? (
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
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: isSaving || !name.trim() ? 'not-allowed' : 'pointer',
              opacity: isSaving || !name.trim() ? 0.6 : 1,
            }}
          >
            <Save size={14} />
            <span>حفظ التعديلات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
