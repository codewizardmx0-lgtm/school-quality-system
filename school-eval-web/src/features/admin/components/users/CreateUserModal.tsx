import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { theme } from '../../theme';
import { usersApi } from '../../api/usersApi';
import { schoolsApi } from '../../api/schoolsApi';
import { SearchableSelect, type SearchableOption } from '../common/SearchableSelect';
import { formatRoleNameAr } from '../../utils/roleUtils';
import type { CreateUserDto, UserType, Role, Directorate } from '../../types/admin.types';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  addToast: (type: 'success' | 'error', msg: string) => void;
}


export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSuccess, addToast }) => {
  const [form, setForm] = useState<CreateUserDto>({
    fullName: '', username: '', email: '', password: '', userType: 'school',
    roleId: 2, schoolId: null, directorateId: null, status: 'Active',
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [schools, setSchools] = useState<Array<{ schoolId: number; schoolName: string; schoolCode: string }>>([]);
  const [directorates, setDirectorates] = useState<Directorate[]>([]);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    usersApi.getUsersMeta().then((res) => {
      if (!ignore && res.data) {
        if (res.data.roles?.length) setRoles(res.data.roles);
        if (res.data.schools?.length) setSchools(res.data.schools);
      }
    }).catch((err) => console.warn('Failed to load users meta:', err));

    schoolsApi.getDirectorates().then((res) => {
      if (!ignore && res.data?.length) setDirectorates(res.data);
    }).catch((err) => console.warn('Failed to load directorates:', err));

    return () => { ignore = true; };
  }, [isOpen]);

  if (!isOpen) return null;

  const schoolOptions: SearchableOption[] = schools.map((s) => ({
    value: s.schoolId,
    label: s.schoolName,
    code: s.schoolCode,
    sublabel: (s as any).educationalDistrict || (s as any).directorate,
  }));

  const directorateOptions: SearchableOption[] = directorates.map((d) => ({
    value: d.directorateId,
    label: d.directorateName,
    sublabel: d.governorate,
  }));

  // Filter roles dynamically according to official DB roles
  const filteredRoles = roles.filter((r) => {
    if (form.userType === 'school') {
      return r.roleName === 'school_evaluator' || r.roleName === 'school_principal' || r.roleName.includes('school');
    }
    if (form.userType === 'ministry') {
      return r.roleName === 'ministry_supervisor' || r.roleName === 'ministry_standards_manager' || r.roleName.includes('ministry');
    }
    if (form.userType === 'system') {
      return r.roleName === 'admin' || r.roleName.includes('admin') || r.roleName.includes('system');
    }
    return true;
  });

  const handleChange = (field: keyof CreateUserDto, value: string | number | null) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'userType') {
        const allowed = roles.filter((r) => {
          if (value === 'school') return r.roleName.includes('school');
          if (value === 'ministry') return r.roleName.includes('ministry');
          return r.roleName === 'admin';
        });
        next.roleId = allowed[0]?.roleId || (value === 'school' ? 2 : value === 'ministry' ? 4 : 1);
        next.schoolId = null;
        next.directorateId = null;
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'الاسم الكامل مطلوب';
    if (!form.username.trim()) e.username = 'اسم المستخدم مطلوب';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'البريد الإلكتروني غير صالح';
    if (!form.password || form.password.length < 8) e.password = 'كلمة المرور يجب ألا تقل عن 8 أحرف';
    if (form.userType === 'school' && !form.schoolId) e.schoolId = 'يجب تحديد المدرسة التابع لها';
    if (form.userType === 'ministry' && !form.directorateId) e.directorateId = 'يجب تحديد المديرية';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      await usersApi.createUser(form);
      addToast('success', `تم إنشاء حساب ${form.fullName} بنجاح`);
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
        addToast('error', err?.message || 'فشل إنشاء الحساب، يرجى المحاولة لاحقاً');
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          width: '90%',
          maxWidth: '560px',
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
          <div>
            <h2 style={{ fontSize: theme.typography.fontSizes.base, fontWeight: 700, color: '#fff', margin: 0 }}>
              إنشاء حساب مستخدم جديد
            </h2>
            <p style={{ fontSize: theme.typography.fontSizes.xs, color: '#94A3B8', marginTop: '2px', margin: '2px 0 0' }}>
              إسناد الصلاحيات ومطابقة الارتباط بالمدرسة أو المديرية
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>الاسم الكامل الثلاثي *</label>
            <input style={inputStyle(!!errors.fullName)} value={form.fullName} onChange={(e) => handleChange('fullName', e.target.value)} placeholder="مثال: د. عبدالرحمن محمد الشامي" />
            {errors.fullName && <p style={errorStyle}>{errors.fullName}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>اسم المستخدم (Sign In) *</label>
              <input style={inputStyle(!!errors.username)} value={form.username} onChange={(e) => handleChange('username', e.target.value)} placeholder="مثال: quality_belqees" dir="ltr" />
              {errors.username && <p style={errorStyle}>{errors.username}</p>}
            </div>
            <div>
              <label style={labelStyle}>البريد الإلكتروني الرسمي *</label>
              <input type="email" style={inputStyle(!!errors.email)} value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="user@domain.ye" dir="ltr" />
              {errors.email && <p style={errorStyle}>{errors.email}</p>}
            </div>
          </div>

          <div>
            <label style={labelStyle}>كلمة المرور المبدئية *</label>
            <div style={{ position: 'relative' }}>
              <input type={showPwd ? 'text' : 'password'} style={{ ...inputStyle(!!errors.password), paddingLeft: '40px' }} value={form.password} onChange={(e) => handleChange('password', e.target.value)} placeholder="8 أحرف كحد أدنى" dir="ltr" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p style={errorStyle}>{errors.password}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>نوع الحساب (User Type) *</label>
              <select style={inputStyle()} value={form.userType} onChange={(e) => handleChange('userType', e.target.value as UserType)}>
                <option value="school">مستخدم مدرسة (تقييم / إدارة)</option>
                <option value="ministry">مشرف / مسؤول وزاري</option>
                <option value="system">مسؤول النظام المركزي</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>الدور المسند *</label>
              <select style={inputStyle()} value={form.roleId} onChange={(e) => handleChange('roleId', Number(e.target.value))}>
                {filteredRoles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.roleNameAr || formatRoleNameAr(r.roleName, r.description)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.userType === 'school' && (
            <div>
              <label style={labelStyle}>المدرسة التابعة *</label>
              <SearchableSelect
                options={schoolOptions}
                value={form.schoolId}
                onChange={(val) => handleChange('schoolId', val ? Number(val) : null)}
                placeholder="ابحث باسم المدرسة أو الكود (مثال: بلقيس، 1000)..."
                error={errors.schoolId}
              />
              {errors.schoolId && <p style={errorStyle}>{errors.schoolId}</p>}
            </div>
          )}

          {form.userType === 'ministry' && (
            <div>
              <label style={labelStyle}>المديرية التابعة *</label>
              <SearchableSelect
                options={directorateOptions}
                value={form.directorateId}
                onChange={(val) => handleChange('directorateId', val ? Number(val) : null)}
                placeholder="ابحث باسم المديرية أو المحافظة..."
                error={errors.directorateId}
              />
              {errors.directorateId && <p style={errorStyle}>{errors.directorateId}</p>}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '16px', borderTop: `1px solid ${theme.colors.neutral[100]}` }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', borderRadius: theme.radii.lg, border: `1px solid ${theme.colors.neutral[200]}`, backgroundColor: theme.colors.neutral.white, color: theme.colors.neutral[700], fontSize: theme.typography.fontSizes.sm, cursor: 'pointer', fontFamily: theme.typography.fontFamily.sans }}>
              إلغاء
            </button>
            <button type="submit" disabled={loading} style={{ padding: '9px 24px', borderRadius: theme.radii.lg, border: 'none', background: 'linear-gradient(90deg, #059669, #10B981)', color: '#fff', fontSize: theme.typography.fontSizes.sm, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: theme.typography.fontFamily.sans }}>
              {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
