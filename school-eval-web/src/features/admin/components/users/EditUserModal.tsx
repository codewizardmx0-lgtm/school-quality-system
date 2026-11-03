import React, { useState } from 'react';
import { X } from 'lucide-react';
import { theme } from '../../theme';
import { usersApi } from '../../api/usersApi';
import { MOCK_ROLES, MOCK_SCHOOLS, MOCK_DIRECTORATES } from '../../services/mockAdminData';
import type { User, EditUserDto, UserType } from '../../types/admin.types';

interface EditUserModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
  addToast: (type: 'success' | 'error', msg: string) => void;
}

const ROLES_BY_TYPE: Record<UserType, number[]> = {
  school: [1],
  ministry: [2],
  system: [3, 4],
};

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  user,
  onClose,
  onSuccess,
  addToast,
}) => {
  const [prevUserId, setPrevUserId] = useState<number | undefined>(user?.userId);
  const [form, setForm] = useState<EditUserDto>(() => ({
    fullName: user?.fullName || '',
    email: user?.email || '',
    userType: user?.userType || 'school',
    roleId: user?.roleId || 1,
    schoolId: user?.schoolId || null,
    directorateId: user?.directorateId || null,
    status: user?.status || 'Active',
  }));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (user && user.userId !== prevUserId) {
    setPrevUserId(user.userId);
    setForm({
      fullName: user.fullName,
      email: user.email,
      userType: user.userType,
      roleId: user.roleId,
      schoolId: user.schoolId,
      directorateId: user.directorateId,
      status: user.status,
    });
    setErrors({});
  }

  if (!isOpen || !user) return null;

  const filteredRoles = MOCK_ROLES.filter((r) =>
    ROLES_BY_TYPE[form.userType].includes(r.roleId)
  );

  const handleChange = (field: keyof EditUserDto, value: string | number | null) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'userType') {
        const allowed = ROLES_BY_TYPE[value as UserType];
        next.roleId = allowed[0];
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
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'البريد الإلكتروني غير صالح';
    if (form.userType === 'school' && !form.schoolId) e.schoolId = 'يجب تحديد المدرسة';
    if (form.userType === 'ministry' && !form.directorateId) e.directorateId = 'يجب تحديد المديرية';
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
      await usersApi.updateUser(user.userId, form);
      addToast('success', `تم تحديث بيانات ${form.fullName} بنجاح`);
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
        addToast('error', err?.message || 'فشل تحديث البيانات، يرجى المحاولة لاحقاً');
      }
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
  const errorStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    color: '#EF4444',
    marginTop: '3px',
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
          maxWidth: '560px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
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
            <h2 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: theme.typography.fontWeights.bold, color: '#fff', margin: 0 }}>
              تعديل بيانات المستخدم: {user.fullName}
            </h2>
            <p style={{ fontSize: theme.typography.fontSizes.xs, color: '#94A3B8', marginTop: '4px' }}>
              معرف المستخدم: #{user.userId} • {user.username}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>الاسم الكامل *</label>
            <input
              style={inputStyle(!!errors.fullName)}
              value={form.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
            />
            {errors.fullName && <p style={errorStyle}>{errors.fullName}</p>}
          </div>

          <div>
            <label style={labelStyle}>البريد الإلكتروني الرسمي *</label>
            <input
              type="email"
              style={inputStyle(!!errors.email)}
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              dir="ltr"
            />
            {errors.email && <p style={errorStyle}>{errors.email}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>نوع المستخدم *</label>
              <select
                style={inputStyle()}
                value={form.userType}
                onChange={(e) => handleChange('userType', e.target.value as UserType)}
              >
                <option value="school">مستخدم مدرسة</option>
                <option value="ministry">مشرف وزاري</option>
                <option value="system">إدارة النظام</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>الدور المسند *</label>
              <select
                style={inputStyle()}
                value={form.roleId}
                onChange={(e) => handleChange('roleId', Number(e.target.value))}
              >
                {filteredRoles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.roleName} ({r.roleCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.userType === 'school' && (
            <div>
              <label style={labelStyle}>المدرسة التابعة *</label>
              <select
                style={inputStyle(!!errors.schoolId)}
                value={form.schoolId || ''}
                onChange={(e) => handleChange('schoolId', e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">-- اختر المدرسة --</option>
                {MOCK_SCHOOLS.map((s) => (
                  <option key={s.schoolId} value={s.schoolId}>
                    {s.schoolName} ({s.schoolCode})
                  </option>
                ))}
              </select>
              {errors.schoolId && <p style={errorStyle}>{errors.schoolId}</p>}
            </div>
          )}

          {form.userType === 'ministry' && (
            <div>
              <label style={labelStyle}>المديرية التابعة *</label>
              <select
                style={inputStyle(!!errors.directorateId)}
                value={form.directorateId || ''}
                onChange={(e) => handleChange('directorateId', e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">-- اختر المديرية --</option>
                {MOCK_DIRECTORATES.map((d) => (
                  <option key={d.directorateId} value={d.directorateId}>
                    {d.directorateName}
                  </option>
                ))}
              </select>
              {errors.directorateId && <p style={errorStyle}>{errors.directorateId}</p>}
            </div>
          )}

          <div>
            <label style={labelStyle}>حالة الحساب</label>
            <select
              style={inputStyle()}
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value as 'Active' | 'Disabled')}
            >
              <option value="Active">نشط</option>
              <option value="Disabled">معلق مؤقتاً</option>
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
                background: 'linear-gradient(90deg, #4F46E5, #6366F1)',
                color: '#fff',
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontFamily: theme.typography.fontFamily.sans,
              }}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ التعديلات ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
