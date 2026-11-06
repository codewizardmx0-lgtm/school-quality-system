import React, { useState, useEffect } from 'react';
import { X, School as SchoolIcon } from 'lucide-react';
import { theme } from '../../theme';
import { schoolsApi } from '../../api/schoolsApi';
import type { RegisterSchoolDto, Directorate, Governorate } from '../../types/admin.types';

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
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [selectedGovId, setSelectedGovId] = useState<number>(1);
  const [filteredDirectorates, setFilteredDirectorates] = useState<Directorate[]>(propDirectorates || []);
  const [isCodeCustom, setIsCodeCustom] = useState(false);

  const [form, setForm] = useState<RegisterSchoolDto>({
    schoolName: '',
    schoolCode: '',
    schoolType: 'government',
    educationalStage: 'ثانوي (10-12)',
    governorateId: 1,
    directorateId: 1,
    governorate: 'أمانة العاصمة',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Load Governorates on open
  useEffect(() => {
    if (!isOpen) return;
    setIsCodeCustom(false);
    schoolsApi
      .getGovernorates()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setGovernorates(res.data);
          const firstGov = res.data[0];
          setSelectedGovId(firstGov.governorateId);
          loadDirectoratesAndCode(firstGov.governorateId, firstGov.nameAr, false);
        }
      })
      .catch((err) => console.warn('Failed to fetch governorates:', err));
  }, [isOpen]);

  const loadDirectoratesAndCode = async (govId: number, govName: string, userEditedCode: boolean) => {
    try {
      const dirRes = await schoolsApi.getDirectorates(govId);
      if (dirRes.data) {
        setFilteredDirectorates(dirRes.data);
        const firstDir = dirRes.data[0];
        setForm((prev) => ({
          ...prev,
          governorate: govName,
          governorateId: govId,
          directorateId: firstDir ? firstDir.directorateId : 0,
        }));
      }
    } catch (err) {
      console.warn('Failed to load directorates:', err);
    }

    if (!userEditedCode) {
      try {
        const codeRes = await schoolsApi.suggestSchoolCode(govId);
        const codeData = codeRes?.data;
        if (codeData && codeData.code) {
          setForm((prev) => ({ ...prev, schoolCode: codeData.code }));
        }
      } catch (err) {
        console.warn('Failed to suggest school code:', err);
      }
    }
  };

  const handleGovChange = (govId: number) => {
    setSelectedGovId(govId);
    const gov = governorates.find((g) => g.governorateId === govId);
    const govName = gov?.nameAr || 'أمانة العاصمة';
    loadDirectoratesAndCode(govId, govName, isCodeCustom);
  };

  if (!isOpen) return null;

  const handleChange = (field: keyof RegisterSchoolDto, value: string | number) => {
    if (field === 'schoolCode') {
      setIsCodeCustom(true);
    }
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
      const selectedDir = filteredDirectorates.find((d) => d.directorateId === form.directorateId);
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
    border: `1px solid ${hasErr ? '#DC2626' : theme.colors.neutral[200]}`,
    fontSize: theme.typography.fontSizes.sm,
    fontFamily: theme.typography.fontFamily.sans,
    outline: 'none',
    boxSizing: 'border-box' as const,
  });

  const labelStyle = {
    display: 'block',
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: 600,
    color: theme.colors.neutral[700],
    marginBottom: '6px',
    fontFamily: theme.typography.fontFamily.sans,
  };

  const errorStyle = {
    color: '#DC2626',
    fontSize: '0.75rem',
    marginTop: '4px',
    margin: '4px 0 0 0',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: `1px solid ${theme.colors.neutral[100]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: theme.radii.lg,
                backgroundColor: '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <SchoolIcon size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: theme.colors.neutral[900] }}>
                تسجيل صرح تعليمي جديد
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500] }}>
                إضافة مدرسة جديدة لقاعدة البيانات الوطنية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              borderRadius: theme.radii.md,
              cursor: 'pointer',
              color: theme.colors.neutral[400],
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>اسم المدرسة الرسمي *</label>
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
              <label style={labelStyle}>كود المدرسة المقترح (SCH-XXX) *</label>
              <input
                style={inputStyle(!!errors.schoolCode)}
                value={form.schoolCode}
                onChange={(e) => handleChange('schoolCode', e.target.value)}
                placeholder="SCH-AMANA-2026-001"
                dir="ltr"
              />
              {errors.schoolCode && <p style={errorStyle}>{errors.schoolCode}</p>}
              <span style={{ fontSize: '0.7rem', color: theme.colors.neutral[400], display: 'block', marginTop: '3px' }}>
                {isCodeCustom ? '✏️ كود مخصص يدوياً' : '⚡ تم اقتراح الكود تلقائياً بناءً على المحافظة'}
              </span>
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
              <label style={labelStyle}>المحافظة *</label>
              <select
                style={inputStyle()}
                value={selectedGovId}
                onChange={(e) => handleGovChange(Number(e.target.value))}
              >
                {governorates.map((g) => (
                  <option key={g.governorateId} value={g.governorateId}>
                    {g.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>المديرية التعليمية *</label>
            <select
              style={inputStyle()}
              value={form.directorateId || ''}
              onChange={(e) => handleChange('directorateId', Number(e.target.value))}
              disabled={filteredDirectorates.length === 0}
            >
              {filteredDirectorates.length === 0 ? (
                <option value="">-- لا توجد مديريات بعد لهذه المحافظة --</option>
              ) : (
                filteredDirectorates.map((d) => (
                  <option key={d.directorateId} value={d.directorateId}>
                    {d.directorateName}
                  </option>
                ))
              )}
            </select>
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
