import React, { useState, useEffect } from 'react';
import { X, Building2, Save } from 'lucide-react';
import { theme } from '../../theme';
import { schoolsApi } from '../../api/schoolsApi';
import type { School, Directorate, SchoolType, SchoolStatus } from '../../types/admin.types';

interface EditSchoolModalProps {
  isOpen: boolean;
  school: School | null;
  directorates: Directorate[];
  onClose: () => void;
  onSuccess: () => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
}

export const EditSchoolModal: React.FC<EditSchoolModalProps> = ({
  isOpen,
  school,
  directorates,
  onClose,
  onSuccess,
  addToast,
}) => {
  const [form, setForm] = useState({
    schoolName: '',
    schoolCode: '',
    schoolType: 'government' as SchoolType,
    educationalStage: 'ثانوي (10-12)',
    directorate: '',
    governorate: 'أمانة العاصمة',
    status: 'Active' as SchoolStatus,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (school && isOpen) {
      setForm({
        schoolName: school.schoolName || '',
        schoolCode: school.schoolCode || '',
        schoolType: school.schoolType || 'government',
        educationalStage: school.educationalStage || 'ثانوي (10-12)',
        directorate: school.directorate || school.educationalDistrict || (directorates[0]?.directorateName ?? 'مديرية التحرير'),
        governorate: school.governorate || 'أمانة العاصمة',
        status: school.status || 'Active',
      });
      setErrors({});
    }
  }, [school, isOpen, directorates]);

  if (!isOpen || !school) return null;

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.schoolName.trim()) errs.schoolName = 'اسم المدرسة مطلوب';
    if (!form.schoolCode.trim()) errs.schoolCode = 'كود المدرسة مطلوب';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await schoolsApi.updateSchool(school.schoolId, {
        schoolName: form.schoolName,
        schoolCode: form.schoolCode,
        schoolType: form.schoolType,
        educationalStage: form.educationalStage,
        educationalDistrict: form.directorate,
        directorate: form.directorate,
        governorate: form.governorate,
        status: form.status,
      });

      addToast('success', `تم تحديث بيانات مدرسة "${form.schoolName}" بنجاح.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errors) {
        const mappedErrors: Record<string, string> = {};
        Object.entries(err.errors).forEach(([field, msgs]) => {
          mappedErrors[field] = Array.isArray(msgs) ? (msgs as string[])[0] : String(msgs);
        });
        setErrors(mappedErrors);
      } else {
        addToast('error', err?.message || 'فشل تحديث بيانات المدرسة.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (err?: string): React.CSSProperties => ({
    width: '100%',
    padding: '9px 12px',
    borderRadius: theme.radii.lg,
    border: `1px solid ${err ? '#DC2626' : theme.colors.neutral[300]}`,
    fontSize: theme.typography.fontSizes.sm,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: theme.typography.fontFamily.sans,
    backgroundColor: '#FAFAFA',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          direction: 'rtl',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${theme.colors.neutral[200]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: theme.radii.lg,
                backgroundColor: '#EEF2FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4F46E5',
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 700, margin: 0, color: theme.colors.neutral[900] }}>
                تعديل بيانات المدرسة
              </h2>
              <p style={{ fontSize: theme.typography.fontSizes.xs, margin: 0, color: theme.colors.neutral[500] }}>
                تحديث المعلومات الرسمية للمدرسة في النظام الوطني
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: theme.colors.neutral[400],
              cursor: 'pointer',
              padding: '6px',
              borderRadius: theme.radii.md,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* School Name */}
          <div>
            <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '6px' }}>
              اسم المدرسة الرسمي <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              style={inputStyle(errors.schoolName)}
              value={form.schoolName}
              onChange={(e) => handleChange('schoolName', e.target.value)}
              placeholder="مثال: مدرسة بلقيس الثانوية للبنات"
            />
            {errors.schoolName && <span style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '4px', display: 'block' }}>{errors.schoolName}</span>}
          </div>

          {/* School Code & Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                كود المدرسة التعريفي <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                style={inputStyle(errors.schoolCode)}
                value={form.schoolCode}
                onChange={(e) => handleChange('schoolCode', e.target.value)}
                placeholder="SCH-SANAA-101"
              />
              {errors.schoolCode && <span style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '4px', display: 'block' }}>{errors.schoolCode}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                نوع المدرسة <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                style={inputStyle()}
                value={form.schoolType}
                onChange={(e) => handleChange('schoolType', e.target.value)}
              >
                <option value="government">حكومية (رسمية)</option>
                <option value="private">أهلية (خاصة)</option>
              </select>
            </div>
          </div>

          {/* Governorate & Directorate */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                المحافظة <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                style={inputStyle()}
                value={form.governorate}
                onChange={(e) => handleChange('governorate', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                المديرية التعليمية <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                style={inputStyle()}
                value={form.directorate}
                onChange={(e) => handleChange('directorate', e.target.value)}
              >
                {directorates.map((d) => (
                  <option key={d.directorateId} value={d.directorateName}>
                    {d.directorateName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Educational Stage & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                المرحلة التعليمية
              </label>
              <select
                style={inputStyle()}
                value={form.educationalStage}
                onChange={(e) => handleChange('educationalStage', e.target.value)}
              >
                <option value="ثانوي (10-12)">ثانوي (10-12)</option>
                <option value="أساسي (1-9)">أساسي (1-9)</option>
                <option value="أساسي وثانوي (1-12)">أساسي وثانوي (1-12)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                حالة المدرسة
              </label>
              <select
                style={inputStyle()}
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="Active">نشطة ومفعلة</option>
                <option value="Inactive">معطلة مؤقتاً</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: `1px solid ${theme.colors.neutral[200]}`,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 18px',
                borderRadius: theme.radii.lg,
                border: `1px solid ${theme.colors.neutral[200]}`,
                backgroundColor: theme.colors.neutral.white,
                color: theme.colors.neutral[700],
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                borderRadius: theme.radii.lg,
                border: 'none',
                background: 'linear-gradient(90deg, #4F46E5, #6366F1)',
                color: '#fff',
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Save size={16} />
              {loading ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
