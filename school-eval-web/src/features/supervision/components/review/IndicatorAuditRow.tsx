/**
 * Component: IndicatorAuditRow
 * صف فحص وتدقيق مؤشر مع الشواهد المرفقة، معايير التقدير (Rubric)، وأدوات التحقق
 * يدعم رصد وحفظ النواقص وفق الفئات الأربع المعتمدة (FR-SUP-04, FR-SUP-07, BR-MIN-02)
 */

import React, { useState } from 'react';
import {
  FileText,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  BookmarkCheck,
  Save,
  X,
  Edit3,
  Trash2,
  Wrench,
} from 'lucide-react';
import {
  DEFICIENCY_CATEGORIES,
  type IndicatorAuditItem,
} from '../../api/supervisionTypes';

interface IndicatorAuditRowProps {
  indicator: IndicatorAuditItem;
  isDefective: boolean;
  onSaveDeficiency?: (
    category: string,
    defectReason: string,
    directives: string
  ) => Promise<void> | void;
  onDeleteDeficiency?: () => Promise<void> | void;
  onToggleDefect?: () => void;
  isReadOnly?: boolean;
}

export const IndicatorAuditRow: React.FC<IndicatorAuditRowProps> = ({
  indicator,
  isDefective,
  onSaveDeficiency,
  onDeleteDeficiency,
  onToggleDefect,
  isReadOnly = false,
}) => {
  // تفاصيل المؤشر والشواهد مطوية افتراضياً وفق المتطلب FR-SUP-07
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  // حالة نموذج رصد النقص الميداني
  const [isEditingDefect, setIsEditingDefect] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    indicator.defectCategory || DEFICIENCY_CATEGORIES[1]
  );
  const [defectReason, setDefectReason] = useState<string>(
    indicator.defectReason || ''
  );
  const [directives, setDirectives] = useState<string>(
    indicator.directives || ''
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // شارة التقدير الرقمي والوصفي
  const getScoreBadge = (score: number, levelName: string) => {
    const config =
      score === 3
        ? { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }
        : score === 2
        ? { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' }
        : score === 1
        ? { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' }
        : { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' };

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '6px',
          backgroundColor: config.bg,
          color: config.text,
          border: `1px solid ${config.border}`,
          fontSize: '11px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        <span>{score}/3</span>
        <span>•</span>
        <span>{levelName}</span>
      </span>
    );
  };

  const handleOpenForm = () => {
    setSelectedCategory(indicator.defectCategory || DEFICIENCY_CATEGORIES[1]);
    setDefectReason(
      indicator.defectReason ||
        (indicator.schoolScore > 0 && indicator.evidences.length === 0
          ? 'تم منح تقدير دون إرفاق أي شاهد رسمي يثبت الاستيفاء'
          : 'نقص وثيقة الشاهد الميداني ومحضر المعالجة الفصلية')
    );
    setDirectives(
      indicator.directives ||
        'يرجى استيفاء الشاهد المعتمد وفق أداة التحقق المحددة وإعادة الرفع.'
    );
    setIsEditingDefect(true);
  };

  const handleSave = async () => {
    if (!defectReason.trim()) return;

    if (onSaveDeficiency) {
      setIsSaving(true);
      try {
        await onSaveDeficiency(selectedCategory, defectReason, directives);
        setIsEditingDefect(false);
      } finally {
        setIsSaving(false);
      }
    } else if (onToggleDefect) {
      onToggleDefect();
      setIsEditingDefect(false);
    }
  };

  const handleDelete = async () => {
    if (onDeleteDeficiency) {
      setIsSaving(true);
      try {
        await onDeleteDeficiency();
        setIsEditingDefect(false);
      } finally {
        setIsSaving(false);
      }
    } else if (onToggleDefect) {
      onToggleDefect();
    }
  };

  const hasNoEvidenceWithScore = indicator.schoolScore > 0 && indicator.evidences.length === 0;

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '10px',
        backgroundColor: isDefective ? '#FFFBEB' : '#FFFFFF',
        border: isDefective ? '1px solid #FCD34D' : '1px solid #E2E8F0',
        marginBottom: '12px',
        transition: 'all 0.15s ease',
      }}
    >
      {/* 1. السطر العلوي: الرمز والمعيار والعنوان وأزرار التحكم */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '8px',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                padding: '2px 7px',
                borderRadius: '4px',
              }}
            >
              {indicator.code}
            </span>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
              {indicator.standardName} {indicator.subStandardName ? `• ${indicator.subStandardName}` : ''}
            </span>

            {hasNoEvidenceWithScore && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  border: '1px solid #FECACA',
                }}
              >
                تنبيه: تقدير إيجابي دون شواهد!
              </span>
            )}
          </div>

          <h3
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#0F172A',
              margin: '0 0 6px 0',
              lineHeight: 1.4,
            }}
          >
            {indicator.title}
          </h3>

          {indicator.scoreDescription && (
            <p
              style={{
                fontSize: '12px',
                color: '#475569',
                margin: '0 0 8px 0',
                backgroundColor: '#F8FAFC',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #F1F5F9',
              }}
            >
              <strong>مبرر المدرسة:</strong> {indicator.scoreDescription}
            </p>
          )}
        </div>

        {/* التقدير وشارة النقص */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          {getScoreBadge(indicator.schoolScore, indicator.scoreLevelName)}

          {!isReadOnly && !isEditingDefect && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isDefective ? (
                <>
                  <button
                    type="button"
                    onClick={handleOpenForm}
                    title="تعديل تفاصيل رصد النقص"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid #FCD34D',
                      backgroundColor: '#FEF3C7',
                      color: '#92400E',
                    }}
                  >
                    <Edit3 size={12} />
                    <span>تعديل النقص</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSaving}
                    title="إلغاء رصد النقص"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: isSaving ? 'wait' : 'pointer',
                      border: '1px solid #FECACA',
                      backgroundColor: '#FEF2F2',
                      color: '#991B1B',
                    }}
                  >
                    <Trash2 size={12} />
                    <span>إلغاء</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenForm}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#64748B',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#D97706';
                    e.currentTarget.style.color = '#D97706';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.color = '#64748B';
                  }}
                >
                  <AlertTriangle size={13} color="#D97706" />
                  <span>رصد نقص في الشاهد</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. بانر تنبيه النقص المرصود (عندما لا نكون في وضع التعديل) */}
      {isDefective && !isEditingDefect && (
        <div
          style={{
            marginTop: '8px',
            marginBottom: '10px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#FEF3C7',
            border: '1px solid #FDE68A',
            fontSize: '12px',
            color: '#92400E',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
            <AlertTriangle size={15} color="#D97706" />
            <span
              style={{
                backgroundColor: '#F59E0B',
                color: '#FFFFFF',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '10px',
              }}
            >
              {indicator.defectCategory || 'نقص الشواهد الإلزامية المطلوبة في أداة التحقق'}
            </span>
            <span>بند محدد للاستكمال الميداني</span>
          </div>
          <div>
            <strong>سبب النقص:</strong> {indicator.defectReason || 'نقص وثيقة الشاهد الميداني ومحضر المعالجة.'}
          </div>
          {indicator.directives && (
            <div>
              <strong>توجيه المشرف:</strong> {indicator.directives}
            </div>
          )}
        </div>
      )}

      {/* 3. نموذج رصد النقص الميداني المضمن (FR-SUP-04, BR-MIN-02) */}
      {isEditingDefect && (
        <div
          style={{
            marginTop: '10px',
            marginBottom: '12px',
            padding: '14px',
            borderRadius: '8px',
            backgroundColor: '#FFFBEB',
            border: '1.5px solid #F59E0B',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} color="#D97706" />
              تحديد تفاصيل رصد النقص للمؤشر ({indicator.code})
            </span>
            <button
              type="button"
              onClick={() => setIsEditingDefect(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400E' }}
            >
              <X size={16} />
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#78350F', marginBottom: '4px' }}>
              فئة النقص النظامية (وفق وثيقة التخرج):
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #FCD34D',
                backgroundColor: '#FFFFFF',
                fontSize: '12px',
                color: '#0F172A',
                outline: 'none',
              }}
            >
              {DEFICIENCY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#78350F', marginBottom: '4px' }}>
              بيان سبب النقص والملاحظة الإشرافية:
            </label>
            <textarea
              rows={2}
              value={defectReason}
              onChange={(e) => setDefectReason(e.target.value)}
              placeholder="بيان سبب النقص (مثال: محضر الاجتماع المرفق غير مختوم، أو الشاهد لا يغطي مؤشرات الإنجاز)..."
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #FCD34D',
                backgroundColor: '#FFFFFF',
                fontSize: '12px',
                color: '#0F172A',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#78350F', marginBottom: '4px' }}>
              توجيهات معالجة النقص للمدرسة (Directives):
            </label>
            <input
              type="text"
              value={directives}
              onChange={(e) => setDirectives(e.target.value)}
              placeholder="مثال: يرجى إرفاق خطة التطوير المعتمدة ومحضر الإقرار الفصلي..."
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #FCD34D',
                backgroundColor: '#FFFFFF',
                fontSize: '12px',
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => setIsEditingDefect(false)}
              disabled={isSaving}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '12px',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !defectReason.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                cursor: isSaving || !defectReason.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              <Save size={13} />
              <span>{isSaving ? 'جاري الحفظ...' : 'حفظ رصد النقص'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. شريط زر طي / فتح التفاصيل وفق FR-SUP-07 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '8px',
          borderTop: '1px solid #F1F5F9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
            الشواهد ({indicator.evidences.length})
          </span>
          {indicator.evidences.length === 0 ? (
            <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600 }}>
              • لا يوجد شاهد مرفوع
            </span>
          ) : (
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
              • متوفرة للمعاينة
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            fontSize: '11px',
            fontWeight: 700,
            color: '#2563EB',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: '4px',
          }}
        >
          <span>{isDetailsOpen ? 'إخفاء التفاصيل والشواهد' : 'عرض الشواهد والتحقق والمستويات'}</span>
          {isDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* 5. قسم التفاصيل والشواهد (مطوي افتراضياً FR-SUP-07) */}
      {isDetailsOpen && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px dashed #CBD5E1',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* أ. ملفات الشواهد المرفقة */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} color="#2563EB" />
              <span>ملفات الشواهد المرفقة من المدرسة:</span>
            </div>

            {indicator.evidences.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {indicator.evidences.map((ev) => (
                  <a
                    key={ev.id}
                    href={ev.fileUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      color: '#2563EB',
                      fontSize: '11px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#EFF6FF';
                      e.currentTarget.style.borderColor = '#93C5FD';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }}
                  >
                    <FileText size={13} />
                    <span>{ev.fileName}</span>
                    <span style={{ color: '#64748B', fontSize: '10px' }}>({ev.fileSizeFormatted})</span>
                    <ExternalLink size={11} color="#64748B" />
                  </a>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  fontSize: '11px',
                  color: '#991B1B',
                  fontWeight: 600,
                }}
              >
                لم تُرفق المدرسة أي وثيقة شاهد رسمي لهذا المؤشر في هذا التسليم.
              </div>
            )}
          </div>

          {/* ب. أدوات التحقق الإلزامية للمؤشر */}
          {indicator.verificationTools && indicator.verificationTools.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wrench size={14} color="#059669" />
                <span>أدوات التحقق الميدانية المطلوبة:</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {indicator.verificationTools.map((tool, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#065F46',
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ج. واصفات مستويات التقييم (Rubric Descriptors) مع تمييز المستوى المختار */}
          {indicator.descriptors && indicator.descriptors.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookmarkCheck size={14} color="#7C3AED" />
                <span>واصفات مستويات الأداء المعيارية (سلم التقدير 0 - 3):</span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '8px',
                }}
              >
                {indicator.descriptors.map((desc) => {
                  const isSelected = desc.score === indicator.schoolScore;
                  return (
                    <div
                      key={desc.score}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                        backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          fontWeight: 800,
                          color: isSelected ? '#1D4ED8' : '#475569',
                        }}
                      >
                        <span>مستوى {desc.score}</span>
                        {isSelected && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              fontSize: '10px',
                              color: '#059669',
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={12} />
                            اختيار المدرسة
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: '11px',
                          color: isSelected ? '#1E293B' : '#64748B',
                          margin: 0,
                          lineHeight: 1.4,
                        }}
                      >
                        {desc.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
