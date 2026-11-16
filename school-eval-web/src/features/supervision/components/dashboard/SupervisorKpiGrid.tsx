/**
 * Component: SupervisorKpiGrid
 * بطاقات المؤشرات الرئيسية الأربعة للوحة المشرف الوزاري
 * متوافقة مع الألوان المعتمدة: أزرق ملكي، عنبري، زمردي، رمادي داكن
 */

import React from 'react';
import { School, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { SupervisionKpis } from '../../api/supervisionTypes';

interface SupervisorKpiGridProps {
  kpis?: SupervisionKpis;
  isLoading?: boolean;
}

export const SupervisorKpiGrid: React.FC<SupervisorKpiGridProps> = ({
  kpis = {
    totalSchools: 48,
    pendingReviewCount: 12,
    openCompletionRequestsCount: 5,
    completedReviewCount: 18,
  },
  isLoading = false,
}) => {
  const cards = [
    {
      title: 'إجمالي المدارس بالنطاق',
      value: kpis.totalSchools,
      suffix: 'مدرسة',
      icon: School,
      color: '#2563EB',
      bgColor: '#EFF6FF',
      borderColor: '#DBEAFE',
      note: 'نطاق الإشراف: أمانة العاصمة',
    },
    {
      title: 'مخرجات مرفوعة قيد المراجعة',
      value: kpis.pendingReviewCount,
      suffix: 'مخرجاً',
      icon: Clock,
      color: '#2563EB',
      bgColor: '#EFF6FF',
      borderColor: '#BFDBFE',
      note: 'تتطلب تدقيق الشواهد والتقديرات',
    },
    {
      title: 'طلبات استكمال مفتوحة',
      value: kpis.openCompletionRequestsCount,
      suffix: 'طلبات',
      icon: AlertTriangle,
      color: '#D97706',
      bgColor: '#FEF3C7',
      borderColor: '#FDE68A',
      note: 'بانتظار استيفاء المدارس للنواقص',
    },
    {
      title: 'مخرجات مكتملة المراجعة',
      value: kpis.completedReviewCount,
      suffix: 'مدرسة',
      icon: CheckCircle2,
      color: '#059669',
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0',
      note: 'تم استيفاء الشواهد واعتماد المخرج',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* مؤشر لوني جانبي */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '4px',
                height: '100%',
                backgroundColor: card.color,
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#64748B',
                }}
              >
                {card.title}
              </span>

              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: card.bgColor,
                  border: `1px solid ${card.borderColor}`,
                  color: card.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={19} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#0F172A',
                  letterSpacing: '-0.5px',
                }}
              >
                {isLoading ? '...' : card.value}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#64748B',
                }}
              >
                {card.suffix}
              </span>
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{card.note}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
