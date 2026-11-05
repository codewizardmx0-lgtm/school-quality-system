import React, { useState, useEffect } from 'react';
import { X, UserMinus, AlertCircle, Plus, Users } from 'lucide-react';
import { theme } from '../../theme';
import { schoolsApi } from '../../api/schoolsApi';
import { usersApi } from '../../api/usersApi';
import type { School, User } from '../../types/admin.types';

interface LinkEvaluatorModalProps {
  isOpen: boolean;
  school: School | null;
  onClose: () => void;
  onSuccess: () => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
}

export const LinkEvaluatorModal: React.FC<LinkEvaluatorModalProps> = ({
  isOpen,
  school,
  onClose,
  onSuccess,
  addToast,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [evaluatorsList, setEvaluatorsList] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = () => {
    setLoadingUsers(true);
    usersApi
      .getUsers()
      .then((res) => {
        if (res.data) {
          // Filter users who have role 'school_evaluator' or roleCode 'S1'
          const schoolEvaluators = res.data.filter(
            (u) =>
              u.roleName === 'school_evaluator' ||
              u.roleCode === 'S1' ||
              (u.userType === 'school' && !u.roleName?.includes('principal'))
          );
          setEvaluatorsList(schoolEvaluators);
        }
      })
      .catch((err) => {
        console.warn('Failed to load real evaluators:', err);
      })
      .finally(() => {
        setLoadingUsers(false);
      });
  };

  useEffect(() => {
    if (!isOpen) return;
    loadUsers();
  }, [isOpen]);

  if (!isOpen || !school) return null;

  // Real evaluators currently linked to this school (from School resource evaluators or from users list)
  const currentEvaluators = school.evaluators && school.evaluators.length > 0
    ? school.evaluators
    : evaluatorsList.filter((u) => u.schoolId === school.schoolId);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('يرجى اختيار مقيّم المدرسة المراد إسناده');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await schoolsApi.assignEvaluator(school.schoolId, Number(selectedUserId));
      const user = evaluatorsList.find((u) => u.userId === Number(selectedUserId));
      addToast('success', res.message || `تم إسناد المقيّم "${user?.fullName || ''}" بنجاح`);
      setSelectedUserId('');
      loadUsers();
      onSuccess();
    } catch (err: any) {
      const msg = err?.errors?.userId?.[0] || err?.message || 'فشل إسناد المقيّم للمدرسة';
      setError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async (evaluatorUserId: number, evaluatorName: string) => {
    if (!window.confirm(`هل أنت متأكد من فك ارتباط المقيّم "${evaluatorName}" عن مدرسة "${school.schoolName}"؟`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await schoolsApi.unassignEvaluator(school.schoolId, evaluatorUserId);
      addToast('info', res.message || `تم فك ارتباط المقيّم "${evaluatorName}" بنجاح`);
      loadUsers();
      onSuccess();
    } catch (err: any) {
      const msg = err?.errors?.userId?.[0] || err?.message || 'فشل فك ارتباط المقيّم';
      addToast('error', msg);
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
          maxWidth: '560px',
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
                backgroundColor: '#EEF2FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4F46E5',
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 700, margin: 0, color: theme.colors.neutral[900] }}>
                فريق التقييم المدرسي
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

        {/* Content Body */}
        <div style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Current Evaluators List */}
          <div>
            <h4 style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, margin: '0 0 10px 0', color: theme.colors.neutral[800] }}>
              المقيّمون المسندون حالياً ({currentEvaluators.length}):
            </h4>
            {currentEvaluators.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: theme.radii.lg,
                  padding: '12px 16px',
                  color: '#92400E',
                  fontSize: '0.8rem',
                }}
              >
                ⚠️ لا يوجد أي مقيّم مسند لهذه المدرسة حالياً. يرجى إضافة مقيّم واحد على الأقل لتجهيز المدرسة للتقييم.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentEvaluators.map((ev) => (
                  <div
                    key={ev.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: theme.radii.lg,
                      border: `1px solid ${theme.colors.neutral[200]}`,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.colors.neutral[800], display: 'block' }}>
                        {ev.fullName}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: theme.colors.neutral[500] }}>
                        {ev.email}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnassign(ev.userId, ev.fullName)}
                      disabled={loading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        borderRadius: theme.radii.md,
                        border: '1px solid #FCA5A5',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <UserMinus size={13} />
                      فك ارتباط
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Evaluator Form */}
          <form
            onSubmit={handleAssign}
            style={{
              borderTop: `1px solid ${theme.colors.neutral[200]}`,
              paddingTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <h4 style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, margin: 0, color: theme.colors.neutral[800] }}>
              إسناد مقيّم جديد للمدرسة:
            </h4>
            <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: theme.radii.md, fontSize: '0.75rem', color: theme.colors.neutral[600], lineHeight: 1.5 }}>
              💡 <strong>قاعدة الإسناد:</strong> المدرسة يمكن أن تضم أكثر من مقيّم، لكن المقيّم لا يمكن أن ينتمي إلا لمدرسة واحدة فقط.
            </div>

            <div>
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
                <option value="">-- اضغط لاختيار مقيّم من القائمة المعتمدة --</option>
                {evaluatorsList.map((ev) => {
                  const isAlreadyInThisSchool = currentEvaluators.some((c) => c.userId === ev.userId);
                  const isAnotherSchool = ev.schoolId && ev.schoolId !== school.schoolId;
                  return (
                    <option
                      key={ev.userId}
                      value={ev.userId}
                      disabled={Boolean(isAlreadyInThisSchool || isAnotherSchool)}
                    >
                      {ev.fullName} ({ev.username}) {isAlreadyInThisSchool ? '⭐ [مسند لهذه المدرسة]' : isAnotherSchool ? '🔒 [مسند لمدرسة أخرى]' : '✅ [متاح للإسناد]'}
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="submit"
                disabled={loading || loadingUsers || !selectedUserId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 20px',
                  borderRadius: theme.radii.lg,
                  border: 'none',
                  background: 'linear-gradient(90deg, #4F46E5, #6366F1)',
                  color: '#fff',
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: 600,
                  cursor: loading || !selectedUserId ? 'not-allowed' : 'pointer',
                  opacity: loading || !selectedUserId ? 0.6 : 1,
                }}
              >
                <Plus size={16} />
                {loading ? 'جارٍ الإسناد...' : 'إضافة المقيّم للمدرسة'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: `1px solid ${theme.colors.neutral[200]}`,
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#F8FAFC',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: theme.radii.lg,
              border: `1px solid ${theme.colors.neutral[300]}`,
              backgroundColor: theme.colors.neutral.white,
              color: theme.colors.neutral[700],
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
