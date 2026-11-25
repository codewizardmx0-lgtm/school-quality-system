import React from 'react';
import { AlertTriangle, ArrowLeft, School as SchoolIcon, UserCheck } from 'lucide-react';
import type { School } from '../../types/admin.types';

interface AdminUrgentSchoolsWidgetProps {
  schoolsCount: number;
  loading: boolean;
  incompleteSchoolsCount: number;
  filteredUrgentSchools: School[];
  urgentSearch: string;
  onUrgentSearchChange: (value: string) => void;
  hasPrincipal: (school: School) => boolean;
  hasEvaluator: (school: School) => boolean;
  onOpenPrincipalModal: (school: School) => void;
  onOpenLinkModal: (school: School) => void;
  onNavigateSchools: () => void;
}

/**
 * بطاقة المدارس التي تتطلب إجراءات ربط فورية (إسناد مدير أو مقيّم) في لوحة مسؤول النظام.
 */
export const AdminUrgentSchoolsWidget: React.FC<AdminUrgentSchoolsWidgetProps> = ({
  schoolsCount,
  loading,
  incompleteSchoolsCount,
  filteredUrgentSchools,
  urgentSearch,
  onUrgentSearchChange,
  hasPrincipal,
  hasEvaluator,
  onOpenPrincipalModal,
  onOpenLinkModal,
  onNavigateSchools,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '14px',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0B0F19', margin: 0 }}>
              المدارس التي تتطلب إجراءات ربط فورية
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
              مدارس مسجلة بدون منسق جودة وتقييم رسمي
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#D97706',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            padding: '3px 10px',
            borderRadius: '9999px',
          }}
        >
          {incompleteSchoolsCount} مدارس بانتظار الإجراءات
        </span>
      </div>

      {/* Urgent Schools Search Filter */}
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="ابحث في المدارس العاجلة بالاسم أو الكود..."
          value={urgentSearch}
          onChange={(e) => onUrgentSearchChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            fontSize: '0.8rem',
            outline: 'none',
            boxSizing: 'border-box',
            backgroundColor: '#F8FAFC',
          }}
        />
      </div>

      {/* List of incomplete schools with max-height and scroll */}
      <div style={{ flex: 1, maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', paddingRight: '2px' }}>
        {filteredUrgentSchools.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: '#059669',
              backgroundColor: '#ECFDF5',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {urgentSearch.trim() ? 'لا توجد مدارس مطابقة لبحثك' : '✓ جميع المدارس المسجلة مكتملة ولها مدير ومقيّم رسمي بنجاح'}
          </div>
        ) : (
          filteredUrgentSchools.map((school: School) => {
            const missingPrincipal = !hasPrincipal(school);
            const missingEvaluator = !hasEvaluator(school);

            return (
              <div
                key={school.schoolId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  transition: 'all 0.15s ease',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569',
                    }}
                  >
                    <SchoolIcon size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0B0F19' }}>
                      {school.schoolName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span>{school.directorate}</span>
                      <span>•</span>
                      <span>{school.educationalStage}</span>
                      <span>•</span>
                      {missingPrincipal && missingEvaluator ? (
                        <span style={{ color: '#DC2626', backgroundColor: '#FEF2F2', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          بدون مدير ومقيّم
                        </span>
                      ) : missingPrincipal ? (
                        <span style={{ color: '#D97706', backgroundColor: '#FFFBEB', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          بدون مدير
                        </span>
                      ) : (
                        <span style={{ color: '#2563EB', backgroundColor: '#EFF6FF', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          بدون مقيّم
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {missingPrincipal && (
                    <button
                      onClick={() => onOpenPrincipalModal(school)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#059669',
                        border: 'none',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#047857')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                    >
                      <UserCheck size={13} />
                      <span>إسناد مدير</span>
                    </button>
                  )}
                  {missingEvaluator && (
                    <button
                      onClick={() => onOpenLinkModal(school)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#4F46E5',
                        border: 'none',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4338CA')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4F46E5')}
                    >
                      <UserCheck size={13} />
                      <span>إسناد مقيّم</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Directory Link */}
      <button
        onClick={onNavigateSchools}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '11px',
          borderRadius: '10px',
          backgroundColor: '#fff',
          border: '1px solid #CBD5E1',
          color: '#4F46E5',
          fontSize: '0.85rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#EEF2FF';
          e.currentTarget.style.borderColor = '#A5B4FC';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#fff';
          e.currentTarget.style.borderColor = '#CBD5E1';
        }}
      >
        <span>عرض كافة المدارس والمديريات ({loading ? '...' : schoolsCount})</span>
        <ArrowLeft size={16} />
      </button>
    </div>
  );
};
