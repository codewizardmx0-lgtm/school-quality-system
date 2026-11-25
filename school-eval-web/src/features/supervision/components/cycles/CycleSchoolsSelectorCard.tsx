import React from 'react';
import { Loader2, Search, X } from 'lucide-react';
import type { FormMode } from './CycleFormTab';

export interface CycleAvailableSchool {
  schoolId?: number;
  school_id?: number;
  schoolName?: string;
  school_name?: string;
  schoolCode?: string;
  identification_data?: string;
  identificationData?: string;
  governorate?: string;
  educationalDistrict?: string;
  educational_district?: string;
}

interface CycleSchoolsSelectorCardProps {
  mode: FormMode;
  targetGovernorate: string;
  enrollAllSchools: boolean;
  onEnrollAllChange: (enrollAll: boolean) => void;
  availableSchools: CycleAvailableSchool[];
  filteredAvailableSchools: CycleAvailableSchool[];
  selectedSchoolIds: number[];
  onSelectedSchoolIdsChange: React.Dispatch<React.SetStateAction<number[]>>;
  schoolSearchQuery: string;
  onSchoolSearchChange: (q: string) => void;
  isLoadingSchools: boolean;
  validationError?: string;
}

export const CycleSchoolsSelectorCard: React.FC<CycleSchoolsSelectorCardProps> = ({
  mode,
  targetGovernorate,
  enrollAllSchools,
  onEnrollAllChange,
  availableSchools,
  filteredAvailableSchools,
  selectedSchoolIds,
  onSelectedSchoolIdsChange,
  schoolSearchQuery,
  onSchoolSearchChange,
  isLoadingSchools,
  validationError,
}) => {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
        تسجيل المدارس المستهدفة بالدورة
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '8px',
            border: enrollAllSchools ? '2px solid #2563EB' : '1px solid #CBD5E1',
            backgroundColor: enrollAllSchools ? '#EFF6FF' : '#FFFFFF',
            cursor: mode === 'edit' ? 'default' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <input
            type="radio"
            name="school_enrollment_type"
            checked={enrollAllSchools}
            disabled={mode === 'edit'}
            onChange={() => onEnrollAllChange(true)}
            style={{ marginTop: '2px', accentColor: '#2563EB' }}
          />
          <div>
            <span style={{ fontSize: '13px', fontWeight: 800, color: enrollAllSchools ? '#1E40AF' : '#0F172A' }}>
              كافة المدارس الفعّالة ضمن النطاق الجغرافي المختار
            </span>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>
              تسجيل تلقائي لجميع المدارس الفعالة في ({targetGovernorate}) البالغ عددها ({availableSchools.length} مدرسة).
            </p>
          </div>
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '8px',
            border: !enrollAllSchools ? '2px solid #2563EB' : '1px solid #CBD5E1',
            backgroundColor: !enrollAllSchools ? '#EFF6FF' : '#FFFFFF',
            cursor: mode === 'edit' ? 'default' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <input
            type="radio"
            name="school_enrollment_type"
            checked={!enrollAllSchools}
            disabled={mode === 'edit'}
            onChange={() => onEnrollAllChange(false)}
            style={{ marginTop: '2px', accentColor: '#2563EB' }}
          />
          <div>
            <span style={{ fontSize: '13px', fontWeight: 800, color: !enrollAllSchools ? '#1E40AF' : '#0F172A' }}>
              تحديد يدوي لمدارس معينة
            </span>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>
              اختيار مدارس محددة يدوياً من قائمة المدارس المتاحة للمشاركة في الدورة.
            </p>
          </div>
        </label>
      </div>

      {!enrollAllSchools && (
        <div
          style={{
            marginTop: '12px',
            padding: '16px',
            borderRadius: '10px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '6px 10px',
                flex: 1,
                minWidth: '200px',
              }}
            >
              <Search size={14} color="#94A3B8" />
              <input
                type="text"
                placeholder="ابحث باسم المدرسة أو الكود الوزاري..."
                value={schoolSearchQuery}
                onChange={(e) => onSchoolSearchChange(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '12px', width: '100%', color: '#0F172A' }}
              />
              {schoolSearchQuery && (
                <button
                  type="button"
                  onClick={() => onSchoolSearchChange('')}
                  style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', padding: 0 }}
                >
                  <X size={12} color="#94A3B8" />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  const allFilteredIds = filteredAvailableSchools.map((s) => Number(s.schoolId || s.school_id || 0));
                  onSelectedSchoolIdsChange((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#2563EB',
                  cursor: 'pointer',
                }}
              >
                تحديد الكل
              </button>
              <button
                type="button"
                onClick={() => {
                  const filteredIds = new Set(filteredAvailableSchools.map((s) => Number(s.schoolId || s.school_id || 0)));
                  onSelectedSchoolIdsChange((prev) => prev.filter((id) => !filteredIds.has(id)));
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#64748B',
                  cursor: 'pointer',
                }}
              >
                إلغاء التحديد
              </button>

              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: selectedSchoolIds.length > 0 ? '#1E40AF' : '#94A3B8',
                  backgroundColor: selectedSchoolIds.length > 0 ? '#EFF6FF' : '#F1F5F9',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                تم تحديد {selectedSchoolIds.length} من أصل {availableSchools.length} مدرسة
              </span>
            </div>
          </div>

          {isLoadingSchools ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
              <Loader2 size={18} className="animate-spin" style={{ margin: '0 auto 6px', color: '#2563EB' }} />
              جاري تحميل قائمة المدارس الفعّالة...
            </div>
          ) : filteredAvailableSchools.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '12.5px' }}>
              {schoolSearchQuery ? 'لا توجد مدارس مطابقة للبحث.' : 'لا توجد مدارس فعالة مسجلة ضمن هذا النطاق.'}
            </div>
          ) : (
            <div
              style={{
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                paddingRight: '4px',
              }}
            >
              {filteredAvailableSchools.map((school) => {
                const sId = Number(school.schoolId || school.school_id || 0);
                const isChecked = selectedSchoolIds.includes(sId);
                return (
                  <label
                    key={sId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: isChecked ? '1px solid #2563EB' : '1px solid #E2E8F0',
                      backgroundColor: isChecked ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      transition: 'all 0.1s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        onSelectedSchoolIdsChange((prev) =>
                          prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]
                        );
                      }}
                      style={{ accentColor: '#2563EB' }}
                    />
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>
                      {school.schoolName || school.school_name}
                    </span>
                    <span style={{ color: '#64748B', fontSize: '11.5px' }}>
                      ({school.schoolCode || school.identification_data || school.identificationData})
                    </span>
                    <span style={{ marginRight: 'auto', color: '#64748B', fontSize: '11px' }}>
                      {school.governorate} • {school.educationalDistrict || school.educational_district}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {validationError && (
            <span style={{ fontSize: '11px', color: '#EF4444', display: 'block', marginTop: '6px' }}>
              {validationError}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
