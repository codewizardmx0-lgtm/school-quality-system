/**
 * Component: SharedDeficiencyFormFields
 * مكون موحد مشترك لرصد وتعديل تفاصيل النواقص وبنود الاستكمال
 * يُستخدم في الشاشة 4 (لوحة رصد النقص) والشاشة 5 (بطاقة كل بند في طلب الاستكمال)
 * منصة ارتقاء للتقييم والتحسين المدرسي
 */

import React from 'react';
import { KeyRound } from 'lucide-react';

export interface UnlockPermissionOption {
  key: string;
  label: string;
  description: string;
}

export const UNLOCK_PERMISSION_OPTIONS: UnlockPermissionOption[] = [
  {
    key: 'upload_replace_evidence',
    label: 'رفع / استبدال وثائق الشواهد الميدانية',
    description: 'تمكين مقيم المدرسة من رفع ملفات جديدة أو استبدال الشواهد السابقة لهذا المؤشر.',
  },
  {
    key: 'edit_justification',
    label: 'تعديل المبرر التوثيقي للمقيم',
    description: 'فتح حقل كتابة مبرر التقدير للمقيم لتوضيح أو إعادة صياغة الحجج التوثيقية.',
  },
  {
    key: 'review_score',
    label: 'مراجعة وتصويب درجة تقييم المؤشر',
    description: 'إلغاء قفل مقياس الروبك الرباعي للمؤشر للسماح بتعديل الدرجة المرصودة.',
  },
  {
    key: 'link_improvement_plan',
    label: 'ربط المؤشر بأولوية وإجراء في خطة التحسين',
    description: 'إلزام وتوجيه المدرسة لإدراج هذا المؤشر المنخفض كفجوة معيارية في خطة التحسين.',
  },
];

export const DEFICIENCY_CATEGORIES: string[] = [
  'شاهد غير كافٍ أو مفقود',
  'مبرر التقدير غير مقنع أو سطحي',
  'شاهد غير مطابق للأداة المقررة',
  'تناقض بين التقدير والواقع التوثيقي',
  'عدم استيفاء المحضر والمصادقة الميدانية',
  'أسباب وملاحظات فنية أخرى',
];

interface SharedDeficiencyFormFieldsProps {
  // التصنيفات المتعددة للنقص
  categories: string[];
  onChangeCategories: (categories: string[]) => void;

  // الملاحظة الإشرافية / سبب الخلل
  note: string;
  onChangeNote: (note: string) => void;
  noteLabel?: string;
  notePlaceholder?: string;

  // التوجيهات الإلزامية للمدرسة
  directives: string;
  onChangeDirectives: (directives: string) => void;
  directivesLabel?: string;
  directivesPlaceholder?: string;

  // الصلاحيات المتعددة للفك الجزئي للمؤشر (Multi-Select)
  allowedActions: string[];
  onChangeAllowedActions: (actions: string[]) => void;

  isReadOnly?: boolean;
}

export const SharedDeficiencyFormFields: React.FC<SharedDeficiencyFormFieldsProps> = ({
  categories,
  onChangeCategories,
  note,
  onChangeNote,
  noteLabel = 'الملاحظة الإشرافية الدقيقة (المبرر الفني لرصد النقص):',
  notePlaceholder = 'اكتب ملاحظتك التقييمية التوثيقية حول سبب اعتبار هذا المؤشر ناقصاً...',
  directives,
  onChangeDirectives,
  directivesLabel = 'التوجيهات والإجراءات الإلزامية المطلوب استيفاؤها من المدرسة:',
  directivesPlaceholder = 'حدد للمدرسة بالضبط ما الوثيقة أو الإجراء المطلوب استكماله...',
  allowedActions,
  onChangeAllowedActions,
  isReadOnly = false,
}) => {
  const currentCategories = categories && categories.length > 0 ? categories : [];
  const currentActions = allowedActions && allowedActions.length > 0
    ? allowedActions
    : ['upload_replace_evidence'];

  const toggleCategory = (cat: string) => {
    if (isReadOnly) return;
    const next = currentCategories.includes(cat)
      ? currentCategories.filter((c) => c !== cat)
      : [...currentCategories, cat];
    onChangeCategories(next);
  };

  const toggleAction = (actionKey: string) => {
    if (isReadOnly) return;
    const next = currentActions.includes(actionKey)
      ? currentActions.filter((k) => k !== actionKey)
      : [...currentActions, actionKey];
    // ضمان بقاء خيار واحد على الأقل محدد
    if (next.length === 0) {
      onChangeAllowedActions(['upload_replace_evidence']);
    } else {
      onChangeAllowedActions(next);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* 1. تصنيف أسباب النقص (خانات اختيار متعددة) */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 800,
            color: '#7C2D12',
            marginBottom: '6px',
          }}
        >
          تصنيف أسباب النقص / الاستكمال (يمكن اختيار أكثر من سبب):
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#FFFFFF',
          }}
        >
          {DEFICIENCY_CATEGORIES.map((cat) => {
            const isChecked = currentCategories.includes(cat);
            return (
              <label
                key={cat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11.5px',
                  color: isChecked ? '#991B1B' : '#334155',
                  fontWeight: isChecked ? 800 : 500,
                  cursor: isReadOnly ? 'not-allowed' : 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={isChecked}
                  onChange={() => toggleCategory(cat)}
                  style={{ accentColor: '#DC2626', cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                />
                <span>{cat}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 2. الملاحظة الإشرافية وسبب الخلل الدقيق */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 800,
            color: '#7C2D12',
            marginBottom: '6px',
          }}
        >
          {noteLabel} <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <textarea
          disabled={isReadOnly}
          rows={2}
          value={note}
          onChange={(e) => onChangeNote(e.target.value)}
          placeholder={notePlaceholder}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            fontSize: '12.5px',
            color: '#0F172A',
            outline: 'none',
            resize: 'vertical',
            lineHeight: 1.5,
            boxSizing: 'border-box',
            backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF',
          }}
        />
      </div>

      {/* 3. التوجيهات والإجراءات الإلزامية للمدرسة */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 800,
            color: '#7C2D12',
            marginBottom: '6px',
          }}
        >
          {directivesLabel}
        </label>
        <textarea
          disabled={isReadOnly}
          rows={2}
          value={directives}
          onChange={(e) => onChangeDirectives(e.target.value)}
          placeholder={directivesPlaceholder}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            fontSize: '12.5px',
            color: '#0F172A',
            outline: 'none',
            resize: 'vertical',
            lineHeight: 1.5,
            boxSizing: 'border-box',
            backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF',
          }}
        />
      </div>

      {/* 4. صلاحيات الفك الجزئي الممنوحة للمدرسة (Multi-Select Checkboxes) */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: '#FFFBEB',
          border: '1px solid #FDE68A',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <KeyRound size={16} color="#D97706" />
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#92400E' }}>
            صلاحيات الفك الجزئي الممنوحة لمسؤول التقييم بالمدرسة (Multi-Select):
          </span>
        </div>
        <p style={{ fontSize: '11px', color: '#B45309', margin: '0 0 10px 0', lineHeight: 1.5 }}>
          حدد الإجراءات المسموح للمدرسة تنفيذها حصرياً عند معالجة هذا المؤشر في بوابة التقييم الذاتي:
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '8px',
          }}
        >
          {UNLOCK_PERMISSION_OPTIONS.map((opt) => {
            const isSelected = currentActions.includes(opt.key);
            return (
              <label
                key={opt.key}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: isSelected ? '1px solid #F59E0B' : '1px solid #E2E8F0',
                  backgroundColor: isSelected ? '#FEF3C7' : '#FFFFFF',
                  cursor: isReadOnly ? 'not-allowed' : 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={isSelected}
                  onChange={() => toggleAction(opt.key)}
                  style={{
                    accentColor: '#D97706',
                    cursor: isReadOnly ? 'not-allowed' : 'pointer',
                    marginTop: '2px',
                  }}
                />
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '11.5px',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? '#92400E' : '#334155',
                    }}
                  >
                    {opt.label}
                  </span>
                  <span style={{ display: 'block', fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                    {opt.description}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
