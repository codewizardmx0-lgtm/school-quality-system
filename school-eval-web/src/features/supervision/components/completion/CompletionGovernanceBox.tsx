/**
 * Component: CompletionGovernanceBox
 * صندوق حاكمية طلبات الاستكمال والفك الجزئي للمؤشرات
 */

import React from 'react';
import { Lock, Unlock, ShieldAlert, Clock } from 'lucide-react';

interface CompletionGovernanceBoxProps {
  unlockedCount: number;
  lockedCount: number;
  deadlineDays: number;
}

export const CompletionGovernanceBox: React.FC<CompletionGovernanceBoxProps> = ({
  unlockedCount = 2,
  lockedCount = 54,
  deadlineDays = 14,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFBEB',
        borderRadius: '12px',
        border: '1px solid #FCD34D',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <ShieldAlert size={20} color="#D97706" />
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#92400E', margin: 0 }}>
          حاكمية الفك الجزئي وقواعد الالتزام (Partial Unlock)
        </h3>
      </div>

      <p style={{ fontSize: '13px', color: '#B45309', margin: '0 0 16px 0', lineHeight: 1.6 }}>
        وفقاً للسياسة الحوكمية لمنصة ارتقاء، يقتصر الفك وإعادة تمكين التعديل حصراً على البنود المعيبة
        المحددة، بينما تظل بقية مؤشرات التقييم مقفلة بصيغة القراءة فقط حمايةً لموثوقية البيانات.
      </p>

      {/* مؤشرات الحالة للبنود المفتوحة والمقفلة */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            padding: '12px',
            backgroundColor: '#FEF3C7',
            borderRadius: '8px',
            border: '1px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Unlock size={20} color="#D97706" />
          <div>
            <span style={{ fontSize: '11px', color: '#92400E', fontWeight: 600, display: 'block' }}>
              البنود المتاحة للتعديل
            </span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#92400E' }}>
              {unlockedCount} مؤشرات مفتوحة
            </span>
          </div>
        </div>

        <div
          style={{
            padding: '12px',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Lock size={20} color="#64748B" />
          <div>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'block' }}>
              المؤشرات المقفلة المحمية
            </span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
              {lockedCount} مؤشراً مقفلاً
            </span>
          </div>
        </div>
      </div>

      {/* العداد التنازلي للمهلة */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #FDE68A',
          fontSize: '12px',
          color: '#92400E',
          fontWeight: 700,
        }}
      >
        <Clock size={16} color="#D97706" />
        <span>مهلة الاستجابة النظامية: {deadlineDays} يوماً تبدأ فور اعتماد وإرسال هذا الطلب للمدرسة.</span>
      </div>
    </div>
  );
};
