import React from 'react';
import { FileCheck2 } from 'lucide-react';

export interface RubricVerificationMethodItem {
  id: number;
  name: string;
  required?: boolean;
  toolType?: string;
  description?: string;
  guidance?: string;
}

interface RubricVerificationToolsCardProps {
  officialMethods: RubricVerificationMethodItem[];
  selectedVerificationMethods: number[];
  isLocked: boolean;
  isPrincipal: boolean;
  onToggleVerificationMethod: (toolId: number) => void;
}

/**
 * بطاقة اختيار أساليب وأدوات التحقق الميدانية المعتمدة للمؤشر في صفحة الرصد.
 */
export const RubricVerificationToolsCard: React.FC<RubricVerificationToolsCardProps> = ({
  officialMethods,
  selectedVerificationMethods,
  isLocked,
  isPrincipal,
  onToggleVerificationMethod,
}) => {
  return (
    <div
      data-testid="verification-tools-section"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        padding: '24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck2 size={18} color="#2563EB" />
            أساليب وأدوات التحقق الميدانية المعتمدة للمؤشر (FR-SCH-03 / FR-SCH-13)
          </h3>
          <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
            حدد أدوات التحقق الميدانية التي تم تطبيقها فعلياً لإثبات نتيجة المؤشر (تُحفظ تلقائياً مع التقدير).
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE',
            }}
          >
            {selectedVerificationMethods.length} من {officialMethods.length} مطبقة
          </span>
        </div>
      </div>

      {officialMethods.length === 0 ? (
        <div style={{ marginTop: '14px', padding: '16px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
          لا توجد أساليب أو أدوات تحقق مخصصة لهذا المؤشر في دليل المعايير.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginTop: '16px' }}>
          {officialMethods.map((method) => {
            const isChecked = selectedVerificationMethods.includes(method.id);
            const isMandatory = method.required !== false;

            return (
              <div
                key={method.id}
                onClick={() => onToggleVerificationMethod(method.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: isChecked ? '2px solid #2563EB' : '1px solid #E2E8F0',
                  backgroundColor: isChecked ? '#EFF6FF' : '#F8FAFC',
                  cursor: isLocked || isPrincipal ? 'default' : 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isChecked ? '0 2px 6px rgba(37, 99, 235, 0.1)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleVerificationMethod(method.id)}
                      disabled={isLocked || isPrincipal}
                      style={{ width: '16px', height: '16px', accentColor: '#2563EB', cursor: isLocked || isPrincipal ? 'default' : 'pointer' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: isChecked ? '#1E3A8A' : '#1E293B' }}>
                      {method.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: isMandatory ? '#FEF2F2' : '#F1F5F9',
                        color: isMandatory ? '#DC2626' : '#64748B',
                        border: `1px solid ${isMandatory ? '#FECACA' : '#CBD5E1'}`,
                      }}
                    >
                      {isMandatory ? 'إلزامية' : 'استرشادية'}
                    </span>
                    {method.toolType && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: '#EEF2FF',
                          color: '#4F46E5',
                          border: '1px solid #C7D2FE',
                        }}
                      >
                        {method.toolType}
                      </span>
                    )}
                  </div>
                </div>

                {method.description && (
                  <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                    {method.description}
                  </p>
                )}

                {method.guidance && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#059669',
                      backgroundColor: '#ECFDF5',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #A7F3D0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title={method.guidance}
                  >
                    <span>💡 إرشادات الاستخدام: {method.guidance}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
