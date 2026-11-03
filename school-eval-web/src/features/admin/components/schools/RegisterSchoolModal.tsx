import React, { useState } from 'react';
import { X, School as SchoolIcon } from 'lucide-react';
import { theme } from '../../theme';
import { mockAdminService, MOCK_DIRECTORATES } from '../../services/mockAdminData';
import type { RegisterSchoolDto, SchoolType } from '../../types/admin.types';

interface RegisterSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  addToast: (type: 'success' | 'error', msg: string) => void;
}

export const RegisterSchoolModal: React.FC<RegisterSchoolModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  addToast,
}) => {
  const [form, setForm] = useState<RegisterSchoolDto>({
    schoolName: '',
    schoolCode: '',
    schoolType: 'government',
    educationalStage: 'ثانوي (10-12)',
    directorateId: 1,
    governorate: 'أمانة العاصمة',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleChange = (field: keyof RegisterSchoolDto, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.schoolName.trim()) e.schoolName = 'اسم المدرسة مطلوب';
    if (!form.schoolCode.trim()) e.schoolCode = 'كود المدرسة التعريفي مطلوب';
    if (!form.educationalStage) e.educationalStage = 'المرحلة التعليمية مطلوبة';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      await mockAdminService.createSchool(form);
      addToast('success', `تم تسجيل مدرسة "${form.schoolName}" بنجاح في النظام`);
      onSuccess();
      onClose();
    } catch {
      addToast('error', 'فشل في تسجيل المدرسة، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '9px 12px',
    borderRadius: theme.radii.lg,
    border: `1px solid ${hasError ? '#EF4444' : theme.colors.neutral[200]}`,
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.neutral[800],
    backgroundColor: theme.colors.neutral[50],
    outline: 'none',
    fontFamily: theme.typography.fontFamily.sans,
    boxSizing: 'border-box',
  });
  const labelStyle: React.CSSProperties = {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: 600,
    color: theme.colors.neutral[700],
    marginBottom: '4px',
    display: 'block',
  };
  const errorStyle: React.CSSProperties = { fontSize: '0.7rem', color: '#EF4444', marginTop: '3px' };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 8000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          width: '90%',
          maxWidth: '540px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: theme.shadows.xl,
          fontFamily: theme.typography.fontFamily.sans,
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
            background: 'linear-gradient(135deg, #0B0F19 0%, #1e293b 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(79, 70, 229, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818CF8',
              }}
            >
              <SchoolIcon size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: theme.typography.fontSizes.base, fontWeight: theme.typography.fontWeights.bold, color: '#fff', margin: 0 }}>
                تسجيل مدرسة جديدة بالنظام
              </h2>
              <p style={{ fontSize: theme.typography.fontSizes.xs, color: '#94A3B8', marginTop: '2px' }}>
                تسكين المدرسة ضمن النطاق الجغرافي لدورات التقييم القادمة
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>اسم المدرسة الرسمي *</label>
            <input
              style={inputStyle(!!errors.schoolName)}
              value={form.schoolName}
              onChange={(e) => handleChange('schoolName', e.target.value)}
              placeholder="مثال: مدرسة الوحدة الحديثة..."
            />
            {errors.schoolName && <p style={errorStyle}>{errors.schoolName}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>كود المدرسة التعريفي *</label>
              <input
                style={inputStyle(!!errors.schoolCode)}
                value={form.schoolCode}
                onChange={(e) => handleChange('schoolCode', e.target.value.toUpperCase())}
                placeholder="SCH-109"
                dir="ltr"
              />
              {errors.schoolCode && <p style={errorStyle}>{errors.schoolCode}</p>}
            </div>
            <div>
              <label style={labelStyle}>نوع المدرسة *</label>
              <select
                style={inputStyle()}
                value={form.schoolType}
                onChange={(e) => handleChange('schoolType', e.target.value as SchoolType)}
              >
                <option value="government">حكومية</option>
                <option value="private">أهلية / خاصة</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>المرحلة التعليمية *</label>
              <select
                style={inputStyle()}
                value={form.educationalStage}
                onChange={(e) => handleChange('educationalStage', e.target.value)}
              >
                <option value="ثانوي (10-12)">ثانوي (10-12)</option>
                <option value="أساسي (1-9)">أساسي (1-9)</option>
                <option value="أساسي وثانوي">أساسي وثانوي</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>المديرية التعليمية *</label>
              <select
                style={inputStyle()}
                value={form.directorateId}
                onChange={(e) => handleChange('directorateId', Number(e.target.value))}
              >
                {MOCK_DIRECTORATES.map((d) => (
                  <option key={d.directorateId} value={d.directorateId}>
                    {d.directorateName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>المحافظة</label>
            <input
              style={{ ...inputStyle(), backgroundColor: '#F1F5F9', cursor: 'not-allowed' }}
              value={form.governorate}
              readOnly
            />
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '8px',
              paddingTop: '16px',
              borderTop: `1px solid ${theme.colors.neutral[100]}`,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 20px',
                borderRadius: theme.radii.lg,
                border: `1px solid ${theme.colors.neutral[200]}`,
                backgroundColor: theme.colors.neutral.white,
                color: theme.colors.neutral[700],
                fontSize: theme.typography.fontSizes.sm,
                cursor: 'pointer',
                fontFamily: theme.typography.fontFamily.sans,
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '9px 24px',
                borderRadius: theme.radii.lg,
                border: 'none',
                background: 'linear-gradient(90deg, #4F46E5, #6366F1)',
                color: '#fff',
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontFamily: theme.typography.fontFamily.sans,
              }}
            >
              {loading ? 'جاري التسجيل...' : 'تسجيل المدرسة ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
