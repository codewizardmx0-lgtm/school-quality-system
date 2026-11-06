import React from 'react';
import type { PendingIndicatorItem } from '../../api/evaluationTypes';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface PendingIndicatorsTableProps {
  indicators: PendingIndicatorItem[];
  onOpenIndicator: (indicatorId: number) => void;
}

export const PendingIndicatorsTable: React.FC<PendingIndicatorsTableProps> = ({
  indicators,
  onOpenIndicator,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        padding: '24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
            }}
          >
            <AlertCircle size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              عناصر تقييم بحاجة لاستكمال التوثيق والشواهد
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              المؤشرات التي تتطلب استيفاء التقديرات أو ربط الأدلة والمبررات قبل الرفع النهائي
            </p>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #F1F5F9', backgroundColor: '#F8FAFC' }}>
              <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                رمز المؤشر
              </th>
              <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                عنوان المؤشر المعياري
              </th>
              <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                المعيار الوطني
              </th>
              <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                الحالة والنقص
              </th>
              <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>
                الإجراء السريع
              </th>
            </tr>
          </thead>
          <tbody>
            {indicators.map((item) => (
              <tr
                key={item.indicatorId}
                style={{
                  borderBottom: '1px solid #F1F5F9',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <td style={{ padding: '12px 14px' }}>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                      border: '1px solid #A7F3D0',
                    }}
                  >
                    {item.code}
                  </span>
                </td>
                <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: '#1E293B', maxWidth: '300px' }}>
                  {item.name}
                </td>
                <td style={{ padding: '12px 14px', fontSize: '12.5px', color: '#64748B' }}>
                  {item.standardName}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      display: 'inline-block',
                    }}
                  >
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <button
                    onClick={() => onOpenIndicator(item.indicatorId)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#059669',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#047857')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                  >
                    <span>استكمال</span>
                    <ArrowLeft size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
