import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, UserMinus, AlertCircle } from 'lucide-react';
import { theme } from '../../theme';
import { schoolsApi } from '../../api/schoolsApi';
import { usersApi } from '../../api/usersApi';
import type { School, User } from '../../types/admin.types';

interface AssignPrincipalModalProps {
  isOpen: boolean;
  school: School | null;
  onClose: () => void;
  onSuccess: () => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
}

export const AssignPrincipalModal: React.FC<AssignPrincipalModalProps> = ({
  isOpen,
  school,
  onClose,
  onSuccess,
  addToast,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [principalsList, setPrincipalsList] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    setLoadingUsers(true);
    usersApi
      .getUsers()
      .then((res) => {
        if (!ignore && res.data) {
          // Filter users who have role 'school_principal' or roleCode 'P1'
          const principals = res.data.filter(
            (u) =>
              u.roleName === 'school_principal' ||
              u.roleCode === 'P1' ||
              u.roleName?.includes('principal') ||
              u.roleName === 'مدير المدرسة'
          );
          setPrincipalsList(principals);
        }
      })
      .catch((err) => {
        console.warn('Failed to load principals:', err);
      })
      .finally(() => {
        if (!ignore) setLoadingUsers(false);
      });
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  if (!isOpen || !school) return null;

  // The current principal of this school
  const currentPrincipal = school.principal || principalsList.find((u) => u.schoolId === school.schoolId && u.roleName === 'school_principal');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('يرجى اختيار مدير المدرسة المراد إسناده');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await schoolsApi.assignPrincipal(school.schoolId, Number(selectedUserId));
      addToast('success', res.message || 'تم إسناد مدير المدرسة بنجاح');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.errors?.userId?.[0] || err?.message || 'فشل إسناد مدير المدرسة';
      setError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async () => {
    if (!window.confirm(`هل أنت متأكد من فك ارتباط مدير المدرسة الحالي عن "${school.schoolName}"؟`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await schoolsApi.unassignPrincipal(school.schoolId);
      addToast('info', res.message || 'تم فك ارتباط مدير المدرسة بنجاح');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', err?.message || 'فشل فك ارتباط مدير المدرسة');
    } finally {
      setLoading(false);
    }
  };

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
        direction: 'rtl',
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
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
                backgroundColor: '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 700, margin: 0, color: theme.colors.neutral[900] }}>
                إسناد مدير المدرسة
              </h2>
              <p style={{ fontSize: theme.typography.fontSizes.xs, margin: 0, color: theme.colors.neutral[500] }}>
                مدرسة: {school.schoolName}
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
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Current Principal Notice */}
          <div
            style={{
              backgroundColor: currentPrincipal ? '#F0FDF4' : '#FFFBEB',
              borderRadius: theme.radii.lg,
              border: `1px solid ${currentPrincipal ? '#BBF7D0' : '#FDE68A'}`,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: currentPrincipal ? '#166534' : '#92400E', display: 'block' }}>
                {currentPrincipal ? 'المدير المسند حالياً:' : 'تنبيه: المدرسة لا تحتوي على مدير حالياً'}
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: currentPrincipal ? '#15803D' : '#B45309' }}>
                {currentPrincipal ? currentPrincipal.fullName : 'لم يتم تعيين مدير معتمد بعد'}
              </span>
            </div>
            {currentPrincipal && (
              <button
                type="button"
                onClick={handleUnassign}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: theme.radii.md,
                  border: '1px solid #FCA5A5',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <UserMinus size={14} />
                فك الارتباط
              </button>
            )}
          </div>

          {/* Rule Card */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: theme.radii.md, fontSize: '0.75rem', color: theme.colors.neutral[600], lineHeight: 1.6 }}>
            💡 <strong>قاعدة الإسناد:</strong> لكل مدرسة مدير واحد فقط. عند إسناد مدير جديد لمدرسة تحتوي مديراً، سيتم فك ارتباط المدير السابق تلقائياً مع توثيق ذلك في النظام.
          </div>

          {/* Select Principal */}
          <div>
            <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '8px' }}>
              اختر مدير المدرسة المراد إسناده:
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(Number(e.target.value) || '');
                setError('');
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: theme.radii.lg,
                border: `1px solid ${error ? '#DC2626' : theme.colors.neutral[300]}`,
                fontSize: theme.typography.fontSizes.sm,
                outline: 'none',
                fontFamily: theme.typography.fontFamily.sans,
                backgroundColor: '#FAFAFA',
              }}
            >
              <option value="">-- اضغط للاختيار من قائمة المدراء المعتمدين --</option>
              {principalsList.map((p) => {
                const isCurrent = p.schoolId === school.schoolId;
                const isAnotherSchool = p.schoolId && p.schoolId !== school.schoolId;
                return (
                  <option
                    key={p.userId}
                    value={p.userId}
                    disabled={Boolean(isAnotherSchool)}
                  >
                    {p.fullName} ({p.username}) {isCurrent ? '⭐ [المدير الحالي]' : isAnotherSchool ? '🔒 [مسند لمدرسة أخرى - لا يمكن اختياره]' : '✅ [متاح للإسناد]'}
                  </option>
                );
              })}
            </select>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#DC2626', fontSize: '0.75rem', marginTop: '6px' }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '12px',
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
              disabled={loading || loadingUsers || !selectedUserId}
              style={{
                padding: '9px 22px',
                borderRadius: theme.radii.lg,
                border: 'none',
                background: 'linear-gradient(90deg, #059669, #10B981)',
                color: '#fff',
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: 600,
                cursor: loading || !selectedUserId ? 'not-allowed' : 'pointer',
                opacity: loading || !selectedUserId ? 0.6 : 1,
              }}
            >
              {loading ? 'جارٍ الإسناد...' : 'تأكيد إسناد المدير'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
