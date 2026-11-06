import React, { useState, useEffect, useMemo } from 'react';
import { X, UserMinus, AlertCircle, Plus, Users } from 'lucide-react';
import { theme } from '../../theme';
import { schoolsApi } from '../../api/schoolsApi';
import { usersApi } from '../../api/usersApi';
import { SearchableSelect } from '../common/SearchableSelect';
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

  const currentEvaluators = useMemo(() => {
    if (!school) return [];
    return school.evaluators && school.evaluators.length > 0
      ? school.evaluators
      : evaluatorsList.filter((u) => u.schoolId === school.schoolId);
  }, [school, evaluatorsList]);

  const evaluatorOptions = useMemo(() => {
    if (!school) return [];
    return evaluatorsList.map((ev) => {
      const isAlreadyInThisSchool = currentEvaluators.some((c) => c.userId === ev.userId);
      const isAnotherSchool = ev.schoolId && ev.schoolId !== school.schoolId;
      return {
        value: ev.userId,
        label: ev.fullName,
        code: `@${ev.username}`,
        sublabel: isAlreadyInThisSchool
          ? '⭐ [مسند لهذه المدرسة]'
          : isAnotherSchool
          ? '🔒 [مسند لمدرسة أخرى]'
          : '✅ [متاح للإسناد]',
        disabled: Boolean(isAlreadyInThisSchool || isAnotherSchool),
      };
    });
  }, [evaluatorsList, currentEvaluators, school]);

  if (!isOpen || !school) return null;

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
                إدارة مقيّمي المدرسة
              </h2>
              <p style={{ fontSize: theme.typography.fontSizes.xs, margin: 0, color: theme.colors.neutral[500] }}>
                مدرسة: {school.schoolName} ({school.schoolCode})
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

        {/* Modal Content */}
        <div style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Linked Evaluators List */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3 style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, margin: 0, color: theme.colors.neutral[800] }}>
                المقيّمون المسندون حالياً ({currentEvaluators.length})
              </h3>
            </div>

            {currentEvaluators.length === 0 ? (
              <div
                style={{
                  padding: '20px',
                  borderRadius: theme.radii.lg,
                  border: '1px dashed #CBD5E1',
                  textAlign: 'center',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <p style={{ margin: 0, fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500] }}>
                  لا يوجد مقيّمون مسندون لهذه المدرسة حالياً. استخدم النموذج أدناه لإسناد مقيّم.
                </p>
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
                      borderRadius: theme.radii.lg,
                      border: `1px solid ${theme.colors.neutral[200]}`,
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
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

          {/* Add Evaluator Form (Smart Searchable Dropdown) */}
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
              <SearchableSelect
                options={evaluatorOptions}
                value={selectedUserId || null}
                onChange={(val) => {
                  setSelectedUserId(val ? Number(val) : '');
                  setError('');
                }}
                placeholder="-- اضغط للبحث واختيار مقيّم المدرسة --"
                searchPlaceholder="ابحث باسم المقيّم، اسم المستخدم أو البريد..."
                emptyText="لا يوجد مقيّمون مطابقون للبحث"
                icon={<Users size={16} color="#4F46E5" style={{ flexShrink: 0 }} />}
                error={error}
              />
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
