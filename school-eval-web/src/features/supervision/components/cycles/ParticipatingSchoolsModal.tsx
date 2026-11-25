import React from 'react';
import { Check, FileSpreadsheet, Loader2, Plus, Search, X } from 'lucide-react';
import { exportCycleParticipatingSchoolsToExcel } from '../../utils/supervisionExportUtils';
import type { EvaluationCycleItem, ParticipatingSchoolItem } from '../../api/supervisionTypes';

const formatEnrolledDate = (dateStr?: string): string => {
  if (!dateStr) return 'غير محدد';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'غير محدد';
  return d.toLocaleDateString('ar-YE', { year: 'numeric', month: 'short', day: 'numeric' });
};

interface ParticipatingSchoolsModalProps {
  cycle: EvaluationCycleItem | null;
  modalSearchTerm: string;
  onModalSearchChange: (value: string) => void;
  filteredModalSchools: ParticipatingSchoolItem[];
  isEnrollingOpen: boolean;
  isLoadingAvailableSchools: boolean;
  availableSchools: ParticipatingSchoolItem[];
  selectedSchoolIdsToEnroll: number[];
  onToggleEnrollSchoolId: (schoolId: number) => void;
  isSubmittingEnrollment: boolean;
  enrollSuccessMessage: string | null;
  enrollErrorMessage: string | null;
  onClose: () => void;
  onToggleEnrollSection: () => void;
  onConfirmEnrollment: () => void;
}

/**
 * نافذة استعراض وإلحاق المدارس المشاركة في الدورة التقييمية وتصدير كشفها.
 */
export const ParticipatingSchoolsModal: React.FC<ParticipatingSchoolsModalProps> = ({
  cycle,
  modalSearchTerm,
  onModalSearchChange,
  filteredModalSchools,
  isEnrollingOpen,
  isLoadingAvailableSchools,
  availableSchools,
  selectedSchoolIdsToEnroll,
  onToggleEnrollSchoolId,
  isSubmittingEnrollment,
  enrollSuccessMessage,
  enrollErrorMessage,
  onClose,
  onToggleEnrollSection,
  onConfirmEnrollment,
}) => {
  if (!cycle) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* ترويسة النافذة */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              المدارس المشاركة في: {cycle.name}
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>
              العام الدراسي: {cycle.academicYear} • الحالة: {cycle.status === 'Active' ? 'نشطة جارية' : 'مؤرشفة'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* رسائل التنبيهات في المودال */}
        {enrollSuccessMessage && (
          <div style={{ margin: '12px 24px 0', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ECFDF5', color: '#065F46', fontSize: '12.5px', fontWeight: 700 }}>
            {enrollSuccessMessage}
          </div>
        )}
        {enrollErrorMessage && (
          <div style={{ margin: '12px 24px 0', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#991B1B', fontSize: '12.5px', fontWeight: 700 }}>
            {enrollErrorMessage}
          </div>
        )}

        {/* شريط الأدوات في المودال */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px', maxWidth: '320px', backgroundColor: '#FFFFFF', padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              placeholder="ابحث باسم المدرسة أو الكود..."
              value={modalSearchTerm}
              onChange={(e) => onModalSearchChange(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '12px', width: '100%', color: '#0F172A' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* زر تصدير كشف المدارس Excel */}
            <button
              type="button"
              onClick={() =>
                exportCycleParticipatingSchoolsToExcel(
                  cycle.name,
                  cycle.academicYear,
                  filteredModalSchools
                )
              }
              disabled={filteredModalSchools.length === 0}
              title="تصدير كشف المدارس المشاركة في الدورة إلى جدول Excel (.xlsx)"
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: filteredModalSchools.length === 0 ? 'not-allowed' : 'pointer',
                backgroundColor: '#FFFFFF',
                color: filteredModalSchools.length === 0 ? '#94A3B8' : '#059669',
                border: filteredModalSchools.length === 0 ? '1px solid #E2E8F0' : '1px solid #A7F3D0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (filteredModalSchools.length > 0) {
                  e.currentTarget.style.backgroundColor = '#ECFDF5';
                  e.currentTarget.style.borderColor = '#059669';
                }
              }}
              onMouseLeave={(e) => {
                if (filteredModalSchools.length > 0) {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#A7F3D0';
                }
              }}
            >
              <FileSpreadsheet size={15} />
              <span>تصدير كشف المدارس (Excel)</span>
            </button>

            {/* زر إلحاق مدارس إضافية للدورة النشطة */}
            {cycle.status === 'Active' && (
              <button
                type="button"
                onClick={onToggleEnrollSection}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: isEnrollingOpen ? '#F1F5F9' : '#2563EB',
                  color: isEnrollingOpen ? '#475569' : '#FFFFFF',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={14} />
                <span>{isEnrollingOpen ? 'إلغاء الإلحاق' : 'إلحاق مدارس إضافية بالدورة'}</span>
              </button>
            )}
          </div>
        </div>

        {/* قسم إلحاق المدارس المفتوح */}
        {isEnrollingOpen && (
          <div style={{ padding: '16px 24px', backgroundColor: '#EFF6FF', borderBottom: '1px solid #BFDBFE' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E40AF' }}>
                اختر المدارس المتاحة للتسجيل في الدورة:
              </span>
              <button
                type="button"
                onClick={onConfirmEnrollment}
                disabled={selectedSchoolIdsToEnroll.length === 0 || isSubmittingEnrollment}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: selectedSchoolIdsToEnroll.length === 0 ? '#94A3B8' : '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: selectedSchoolIdsToEnroll.length === 0 || isSubmittingEnrollment ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isSubmittingEnrollment ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                <span>تسجيل المدارس المحددة ({selectedSchoolIdsToEnroll.length})</span>
              </button>
            </div>

            {isLoadingAvailableSchools ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
                <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto 6px' }} />
                جاري تحميل المدارس المتاحة...
              </div>
            ) : availableSchools.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#64748B', padding: '10px 0' }}>
                كافة المدارس النشطة مسجلة بالفعل في هذه الدورة.
              </div>
            ) : (
              <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {availableSchools.map((s) => {
                  const isChecked = selectedSchoolIdsToEnroll.includes(s.schoolId);
                  return (
                    <label
                      key={s.schoolId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 10px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '6px',
                        border: isChecked ? '1px solid #2563EB' : '1px solid #E2E8F0',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleEnrollSchoolId(s.schoolId)}
                      />
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{s.schoolName}</span>
                      <span style={{ color: '#64748B' }}>({s.schoolCode})</span>
                      <span style={{ marginRight: 'auto', color: '#64748B', fontSize: '11px' }}>
                        {s.governorate} • {s.stage}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* جدول المدارس المشاركة */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {filteredModalSchools.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              {modalSearchTerm ? 'لا توجد مدارس مطابقة للبحث داخل الدورة.' : 'لا توجد مدارس ملحقة بهذه الدورة بعد.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 800 }}>#</th>
                  <th style={{ padding: '8px 12px', fontWeight: 800 }}>رمز المدرسة</th>
                  <th style={{ padding: '8px 12px', fontWeight: 800 }}>اسم المدرسة</th>
                  <th style={{ padding: '8px 12px', fontWeight: 800 }}>المحافظة / المديرية</th>
                  <th style={{ padding: '8px 12px', fontWeight: 800 }}>المرحلة</th>
                  <th style={{ padding: '8px 12px', fontWeight: 800 }}>تاريخ الإلحاق</th>
                </tr>
              </thead>
              <tbody>
                {filteredModalSchools.map((s: ParticipatingSchoolItem, idx: number) => (
                  <tr key={s.schoolId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 12px', color: '#64748B' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1E293B', fontFamily: 'monospace' }}>
                      {s.schoolCode}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0F172A' }}>{s.schoolName}</td>
                    <td style={{ padding: '10px 12px', color: '#64748B' }}>
                      {s.governorate} {s.district ? `• ${s.district}` : ''}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748B' }}>{s.stage || 'أساسي/ثانوي'}</td>
                    <td style={{ padding: '10px 12px', color: '#64748B' }}>{formatEnrolledDate(s.enrolledAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* تذييل المودال */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            إجمالي المدارس: <strong>{cycle.participatingSchools?.length || 0}</strong> مدرسة
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 18px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#475569',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
