import React from 'react';

interface PlanExplanationsCardProps {
  visible: boolean;
}

/**
 * بطاقة الإيضاحات المؤسسية لأنواع الخطط المدرسية الثلاثة.
 */
export const PlanExplanationsCard: React.FC<PlanExplanationsCardProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div
      style={{
        padding: '18px 20px',
        backgroundColor: '#F8FAFC',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        fontSize: '12.5px',
        lineHeight: 1.6,
      }}
    >
      <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <h4 style={{ margin: '0 0 6px 0', color: '#1D4ED8', fontSize: '13.5px', fontWeight: 800 }}>
          📘 خطة تحسين الجودة المدرسية الشاملة
        </h4>
        <p style={{ margin: 0, color: '#475569' }}>
          تُعنى بمعالجة فجوات نتائج التقييم الذاتي في مجالات التعليم والتعلم، نواتج التحصيل الدراسي، القيادة المدرسية، والشراكة المجتمعية المؤسسية.
        </p>
      </div>
      <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <h4 style={{ margin: '0 0 6px 0', color: '#7C3AED', fontSize: '13.5px', fontWeight: 800 }}>
          🧑‍🏫 خطة التطوير المهني والتربوي للكوادر
        </h4>
        <p style={{ margin: 0, color: '#475569' }}>
          مخصصة لمؤشرات المعيار الثاني، وتشمل برامج التدريب التخصصي للمعلمين والإداريين، مجتمعات الممارسة المهنية، وتطوير أساليب التدريس والتقويم.
        </p>
      </div>
      <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <h4 style={{ margin: '0 0 6px 0', color: '#059669', fontSize: '13.5px', fontWeight: 800 }}>
          📋 الخطة التشغيلية السنوية
        </h4>
        <p style={{ margin: 0, color: '#475569' }}>
          تحدد البرامج والمشاريع الميدانية والميزانيات التقديرية والجداول الزمنية السنوية لإدارة المرافق والتجهيزات والعمليات المدرسية الدورية.
        </p>
      </div>
    </div>
  );
};
