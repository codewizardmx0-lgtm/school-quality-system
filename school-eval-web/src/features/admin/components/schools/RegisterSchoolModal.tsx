import React, { useState, useEffect } from 'react';
import { X, School as SchoolIcon } from 'lucide-react';
import { theme } from '../../theme';
import { schoolsApi } from '../../api/schoolsApi';
import type { RegisterSchoolDto, Directorate } from '../../types/admin.types';

interface RegisterSchoolModalProps {
  isOpen: boolean;
  directorates?: Directorate[];
  onClose: () => void;
  onSuccess: () => void;
  addToast: (type: 'success' | 'error', msg: string) => void;
}

export const RegisterSchoolModal: React.FC<RegisterSchoolModalProps> = ({
  isOpen,
  directorates: propDirectorates,
  onClose,
  onSuccess,
  addToast,
}) => {
  const [directorates, setDirectorates] = useState<Directorate[]>(propDirectorates || []);
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

  useEffect(() => {
    if (!isOpen) return;
    if (propDirectorates && propDirectorates.length > 0) {
      setDirectorates(propDirectorates);
      if (!form.directorateId && propDirectorates[0]) {
        setForm((prev) => ({ ...prev, directorateId: propDirectorates[0].directorateId }));
      }
    } else {
      schoolsApi.getDirectorates().then((res) => {
        if (res.data && res.data.length > 0) {
          setDirectorates(res.data);
          setForm((prev) => ({ ...prev, directorateId: res.data![0].directorateId }));
        }
      }).catch((err) => console.warn('Failed to fetch directorates:', err));
    }
  }, [isOpen, propDirectorates]);

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
      const selectedDir = directorates.find((d) => d.directorateId === form.directorateId);
      await schoolsApi.registerSchool({
        ...form,
        directorateName: selectedDir ? selectedDir.directorateName : undefined,
      });
      addToast('success', `تم تسجيل مدرسة "${form.schoolName}" بنجاح في النظام`);
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
        addToast('error', err?.message || 'فشل تسجيل المدرسة');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasErr?: boolean) => ({
    width: '100%',
    padding: '9px 12px',
    borderRadius: theme.radii.lg,
    border: `1px solid ${hasErr ? '#EF4444' : theme.colors.neutral[200]}`,
    fontSize: theme.typography.fontSizes.sm,
    backgroundColor: theme.colors.neutral.white,
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: theme.typography.fontFamily.sans,
  });

  const labelStyle = {
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.neutral[700],
    marginBottom: '4px',
    display: 'block',
  };

  const errorStyle = {
    fontSize: '0.7rem',
    color: '#EF4444',
    marginTop: '3px',
    margin: '3px 0 0',
  };

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
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: theme.shadows.xl,
          fontFamily: theme.typography.fontFamily.sans,
          direction: 'rtl',
        }}
      >
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
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34D399',
              }}
            >
              <SchoolIcon size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: theme.typography.fontSizes.base, fontWeight: 700, color: '#fff', margin: 0 }}>
                تسجيل مدرسة جديدة بالدليل
              </h2>
              <p style={{ fontSize: theme.typography.fontSizes.xs, color: '#94A3B8', marginTop: '2px', margin: '2px 0 0' }}>
                تسجيل بيانات المدرسة لتأهيلها لدورات التقييم الوطني
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>اسم الصرح التعليمي / المدرسة *</label>
            <input
              style={inputStyle(!!errors.schoolName)}
              value={form.schoolName}
              onChange={(e) => handleChange('schoolName', e.target.value)}
              placeholder="مثال: ثانوية جمال عبدالناصر للمتفوقين"
            />
            {errors.schoolName && <p style={errorStyle}>{errors.schoolName}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>كود المدرسة الرقمي (SCH-XXX) *</label>
              <input
                style={inputStyle(!!errors.schoolCode)}
                value={form.schoolCode}
                onChange={(e) => handleChange('schoolCode', e.target.value)}
                placeholder="SCH-SANAA-2026-003"
                dir="ltr"
              />
              {errors.schoolCode && <p style={errorStyle}>{errors.schoolCode}</p>}
            </div>
            <div>
              <label style={labelStyle}>تصنيف المدرسة *</label>
              <select
                style={inputStyle()}
                value={form.schoolType}
                onChange={(e) => handleChange('schoolType', e.target.value as any)}
              >
                <option value="government">حكومية عامة</option>
                <option value="private">خاصة / أهلية</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>المرحلة التعليمية *</label>
              <select
                style={inputStyle()}
                value={form.educationalStage}
                onChange={(e) => handleChange('educationalStage', e.target.value)}
              >
                <option value="أساسي (1-9)">أساسي (1-9)</option>
                <option value="ثانوي (10-12)">ثانوي (10-12)</option>
                <option value="أساسي وثانوي مشترك">أساسي وثانوي مشترك</option>
                <option value="مجمع تربوي متكامل">مجمع تربوي متكامل</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>المديرية التعليمية *</label>
              <select
                style={inputStyle()}
                value={form.directorateId}
                onChange={(e) => handleChange('directorateId', Number(e.target.value))}
              >
                {directorates.map((d) => (
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
                background: 'linear-gradient(90deg, #059669, #10B981)',
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
