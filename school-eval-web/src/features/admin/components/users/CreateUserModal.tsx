import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { theme } from '../../theme';
import { mockAdminService, MOCK_ROLES, MOCK_SCHOOLS, MOCK_DIRECTORATES } from '../../services/mockAdminData';
import type { CreateUserDto, UserType } from '../../types/admin.types';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  addToast: (type: 'success' | 'error', msg: string) => void;
}

const ROLES_BY_TYPE: Record<UserType, number[]> = {
  school: [1],
  ministry: [2],
  system: [3, 4],
};

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSuccess, addToast }) => {
  const [form, setForm] = useState<CreateUserDto>({
    fullName: '', username: '', email: '', password: '', userType: 'school',
    roleId: 1, schoolId: null, directorateId: null, status: 'Active',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const filteredRoles = MOCK_ROLES.filter((r) => ROLES_BY_TYPE[form.userType].includes(r.roleId));

  const handleChange = (field: keyof CreateUserDto, value: string | number | null) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'userType') {
        const allowedRoles = ROLES_BY_TYPE[value as UserType];
        next.roleId = allowedRoles[0];
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
    if (form.userType === 'school' && !form.schoolId) e.schoolId = 'يجب تحديد المدرسة';
    if (form.userType === 'ministry' && !form.directorateId) e.directorateId = 'يجب تحديد المديرية';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const role = MOCK_ROLES.find((r) => r.roleId === form.roleId);
      const school = form.schoolId ? MOCK_SCHOOLS.find((s) => s.schoolId === form.schoolId) : null;
      await mockAdminService.createUser({
        ...form,
        roleName: role?.roleName,
        roleCode: role?.roleCode,
        schoolName: school?.schoolName || null,
        schoolCode: school?.schoolCode || null,
        directorate: form.directorateId
          ? MOCK_DIRECTORATES.find((d) => d.directorateId === form.directorateId)?.directorateName || null
          : null,
      });
      addToast('success', `تم إنشاء حساب ${form.fullName} بنجاح`);
      onSuccess();
      onClose();
    } catch {
      addToast('error', 'فشل إنشاء الحساب، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', padding: '9px 12px', borderRadius: theme.radii.lg,
    border: `1px solid ${hasError ? '#EF4444' : theme.colors.neutral[200]}`,
    fontSize: theme.typography.fontSizes.sm, color: theme.colors.neutral[800],
    backgroundColor: theme.colors.neutral[50], outline: 'none', fontFamily: theme.typography.fontFamily.sans,
    boxSizing: 'border-box',
  });
  const labelStyle: React.CSSProperties = { fontSize: theme.typography.fontSizes.sm, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '4px', display: 'block' };
  const errorStyle: React.CSSProperties = { fontSize: '0.7rem', color: '#EF4444', marginTop: '3px' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ backgroundColor: theme.colors.neutral.white, borderRadius: theme.radii.xl, width: '90%', maxWidth: '560px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: theme.shadows.xl, fontFamily: theme.typography.fontFamily.sans, direction: 'rtl' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.colors.neutral[200]}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #0B0F19 0%, #1e293b 100%)' }}>
          <div>
            <h2 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: theme.typography.fontWeights.bold, color: '#fff', margin: 0 }}>إنشاء حساب مستخدم جديد</h2>
            <p style={{ fontSize: theme.typography.fontSizes.xs, color: '#94A3B8', marginTop: '4px' }}>يُطبق مبدأ الفصل الصارم بين الصلاحيات تلقائياً</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>الاسم الكامل *</label>
              <input style={inputStyle(!!errors.fullName)} value={form.fullName} onChange={(e) => handleChange('fullName', e.target.value)} placeholder="د. محمد أحمد..." />
              {errors.fullName && <p style={errorStyle}>{errors.fullName}</p>}
            </div>
            <div>
              <label style={labelStyle}>اسم المستخدم *</label>
              <input style={inputStyle(!!errors.username)} value={form.username} onChange={(e) => handleChange('username', e.target.value)} placeholder="user.name" dir="ltr" />
              {errors.username && <p style={errorStyle}>{errors.username}</p>}
            </div>
          </div>
          <div>
            <label style={labelStyle}>البريد الإلكتروني الرسمي *</label>
            <input type="email" style={inputStyle(!!errors.email)} value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="name@arteqa.edu.ye" dir="ltr" />
            {errors.email && <p style={errorStyle}>{errors.email}</p>}
          </div>
          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>كلمة المرور المؤقتة *</label>
            <input type={showPwd ? 'text' : 'password'} style={{ ...inputStyle(!!errors.password), paddingLeft: '40px' }} value={form.password} onChange={(e) => handleChange('password', e.target.value)} placeholder="8 أحرف على الأقل" dir="ltr" />
            <button type="button" onClick={() => setShowPwd((p) => !p)} style={{ position: 'absolute', left: '10px', bottom: errors.password ? '26px' : '9px', background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.neutral[400] }}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            {errors.password && <p style={errorStyle}>{errors.password}</p>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>نوع المستخدم *</label>
              <select style={inputStyle()} value={form.userType} onChange={(e) => handleChange('userType', e.target.value as UserType)}>
                <option value="school">مستخدم مدرسة</option>
                <option value="ministry">مشرف وزاري</option>
                <option value="system">إدارة النظام</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>الدور المسند *</label>
              <select style={inputStyle()} value={form.roleId} onChange={(e) => handleChange('roleId', Number(e.target.value))}>
                {filteredRoles.map((r) => <option key={r.roleId} value={r.roleId}>{r.roleName}</option>)}
              </select>
            </div>
          </div>
          {form.userType === 'school' && (
            <div>
              <label style={labelStyle}>المدرسة التابعة *</label>
              <select style={inputStyle(!!errors.schoolId)} value={form.schoolId || ''} onChange={(e) => handleChange('schoolId', e.target.value ? Number(e.target.value) : null)}>
                <option value="">-- اختر المدرسة --</option>
                {MOCK_SCHOOLS.map((s) => <option key={s.schoolId} value={s.schoolId}>{s.schoolName} ({s.schoolCode})</option>)}
              </select>
              {errors.schoolId && <p style={errorStyle}>{errors.schoolId}</p>}
            </div>
          )}
          {form.userType === 'ministry' && (
            <div>
              <label style={labelStyle}>المديرية التابعة *</label>
              <select style={inputStyle(!!errors.directorateId)} value={form.directorateId || ''} onChange={(e) => handleChange('directorateId', e.target.value ? Number(e.target.value) : null)}>
                <option value="">-- اختر المديرية --</option>
                {MOCK_DIRECTORATES.map((d) => <option key={d.directorateId} value={d.directorateId}>{d.directorateName}</option>)}
              </select>
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