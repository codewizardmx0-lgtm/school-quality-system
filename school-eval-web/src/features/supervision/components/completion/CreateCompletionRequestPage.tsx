/**
 * Component: CreateCompletionRequestPage
 * الشاشة 4: صياغة وإصدار طلب الاستكمال الموجه للمدرسة (Partial Unlock)
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 */

import React from 'react';
import {
  ArrowRight,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { useCompletionManagement } from '../../hooks/useCompletionManagement';
import { CompletionGovernanceBox } from './CompletionGovernanceBox';
import { CompletionItemsSelector } from './CompletionItemsSelector';
import type { SupervisionScreenKey, PreloadedCompletionItem } from '../../api/supervisionTypes';

interface CreateCompletionRequestPageProps {
  submissionId?: number;
  schoolId?: number;
  preloadedItems?: PreloadedCompletionItem[];
  onNavigate: (screen: SupervisionScreenKey, params?: { submissionId?: number; schoolId?: number }) => void;
}

export const CreateCompletionRequestPage: React.FC<CreateCompletionRequestPageProps> = ({
  submissionId = 101,
  schoolId = 104,
  preloadedItems,
  onNavigate,
}) => {
  const {
    items,
    itemsCount,
    notes,
    setNotes,
    deadlineDays,
    deadlineDate,
    addItem,
    removeItem,
    updateItem,
    handleSendRequest,
    isSubmitting,
    errorMessage,
    successMessage,
  } = useCompletionManagement(submissionId, preloadedItems, () => {
    // نجاح الإرسال والتحويل
    setTimeout(() => {
      onNavigate('dashboard');
    }, 1500);
  });

  const handleAddNewItem = () => {
    addItem({
      indicatorId: Date.now(),
      code: '3-1-2',
      title: 'توثيق قنوات التواصل المستمرة مع أولياء الأمور والمجتمع',
      defectReason: 'نقص محضر استبيان رضا أولياء الأمور عن خدمات المدرسة',
      grantedPermission: 'تحديث مرفق الشاهد',
      directives: 'إرفاق استبيان الرضا الفصلي المعتمد ومحضر مناقشة النتائج.',
    });
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* 1. الترويسة وسياق المدرسة والمهلة */}
      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => onNavigate('submissions', { submissionId, schoolId })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748B',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '8px',
          }}
        >
          <ArrowRight size={16} />
          <span>العودة إلى مراجعة المخرج</span>
        </button>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '16px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#D97706',
                  backgroundColor: '#FEF3C7',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                طلب استكمال رسمي موجه
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                المحاولة الإرسالية الأولى • SCH-104
              </span>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              مدرسة بلقيس النموذجية للبنات — إصدار طلب استكمال نواقص التقييم
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', margin: 0 }}>
              سيتم فك الحظر الجزئي عن {itemsCount} مؤشرات معينة فقط وإعطاء مهلة نظامية قدرها 14 يوماً
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              padding: '10px 16px',
              borderRadius: '8px',
            }}
          >
            <Calendar size={18} color="#D97706" />
            <div>
              <span style={{ fontSize: '11px', color: '#92400E', fontWeight: 600, display: 'block' }}>
                مهلة الالتزام المحددة
              </span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#B45309' }}>
                {deadlineDays} يوماً (تاريخ الانتهاء: {deadlineDate})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* رسالة نجاح الإرسال */}
      {successMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '10px',
            color: '#065F46',
            marginBottom: '20px',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={20} color="#059669" />
          <span>{successMessage} جاري تحويلك...</span>
        </div>
      )}

      {/* رسالة الخطأ */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            color: '#991B1B',
            marginBottom: '20px',
            fontSize: '13px',
          }}
        >
          <AlertTriangle size={20} color="#DC2626" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. صندوق حاكمية الفك الجزئي والمهلة */}
      <div style={{ marginBottom: '24px' }}>
        <CompletionGovernanceBox
          unlockedCount={itemsCount}
          lockedCount={56 - itemsCount}
          deadlineDays={deadlineDays}
        />
      </div>

      {/* 3. محرر ومحدد بنود الاستكمال المستهدفة */}
      <div style={{ marginBottom: '24px' }}>
        <CompletionItemsSelector
          items={items}
          onAddItem={handleAddNewItem}
          onRemoveItem={removeItem}
          onUpdateItem={updateItem}
        />
      </div>

      {/* 4. التعليمات العامة وملاحظات التوجيه النهائي */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
          توجيهات ختامية لإدارة المدرسة ولجنة التقييم الذاتي
        </h2>
        <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>
          هذه التوجيهات ستظهر بشكل بارز في أعلى بوابة التقييم الذاتي لحساب المدرسة فور إرسال الطلب
        </p>

        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            fontSize: '13px',
            color: '#0F172A',
            outline: 'none',
            lineHeight: 1.6,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 5. تذييل الأزرار والإجراءات */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '20px',
          borderTop: '1px solid #E2E8F0',
        }}
      >
        <button
          type="button"
          onClick={() => onNavigate('submissions', { submissionId, schoolId })}
          disabled={isSubmitting}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748B',
            backgroundColor: '#F1F5F9',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          إلغاء والعودة للمراجعة
        </button>

        <button
          type="button"
          onClick={() => alert('تم حفظ مسودة طلب الاستكمال بنجاح.')}
          disabled={isSubmitting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#334155',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            cursor: 'pointer',
          }}
        >
          <Save size={15} />
          <span>حفظ مسودة</span>
        </button>

        <button
          type="button"
          onClick={handleSendRequest}
          disabled={isSubmitting || !!successMessage}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 28px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 800,
            color: '#FFFFFF',
            backgroundColor: isSubmitting ? '#FCD34D' : '#D97706',
            border: 'none',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) e.currentTarget.style.backgroundColor = '#B45309';
          }}
          onMouseLeave={(e) => {
            if (!isSubmitting) e.currentTarget.style.backgroundColor = '#D97706';
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>جاري إرسال الطلب للمدرسة...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>إرسال طلب الاستكمال للمدرسة رسمياً</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
