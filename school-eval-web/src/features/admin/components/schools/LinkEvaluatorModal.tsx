import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle } from 'lucide-react';
import { theme } from '../../theme';
import { schoolsApi } from '../../api/schoolsApi';
import { usersApi } from '../../api/usersApi';
import type { School, User } from '../../types/admin.types';

interface LinkEvaluatorModalProps {
  isOpen: boolean;
  school: School | null;
  onClose: () => void;
  onSuccess: () => void;
  addToast: (type: 'success' | 'error', msg: string) => void;
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

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    setLoadingUsers(true);
    usersApi.getUsers().then((res) => {
      if (!ignore && res.data) {
        // Filter users who have role 'school_evaluator' or roleCode 'S1' or userType 'school'
        const schoolEvaluators = res.data.filter((u) => 
          u.roleName === 'school_evaluator' || u.roleCode === 'S1' || (u.userType === 'school' && !u.roleName?.includes('principal'))
        );
        setEvaluatorsList(schoolEvaluators);
      }
    }).catch((err) => {
      console.warn('Failed to load real evaluators:', err);
    }).finally(() => {
      if (!ignore) setLoadingUsers(false);
    });
    return () => { ignore = true; };
  }, [isOpen]);

  if (!isOpen || !school) return null;

  // Real evaluators currently linked to this school
  const currentEvaluators = evaluatorsList.filter((u) => u.schoolId === school.schoolId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('يرجى اختيار مسؤول التقييم المراد ربطه');
      return;
    }
    setLoading(true);
    try {
      await schoolsApi.assignEvaluator(school.schoolId, Number(selectedUserId));
      const user = evaluatorsList.find((u) => u.userId === Number(selectedUserId));
      addToast('success', `تم ربط مسؤول التقييم "${user?.fullName || ''}" بـ "${school.schoolName}" بنجاح`);
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', err?.message || 'فشل في ربط مسؤول التقييم، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
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
          maxWidth: '520px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(124, 58, 237, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#A78BFA',
              }}
            >
              <UserCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: theme.typography.fontSizes.base, fontWeight: theme.typography.fontWeights.bold, color: '#fff', margin: 0 }}>
                إسناد وربط مقيّم جودة بالمدرسة
              </h2>
              <p style={{ fontSize: theme.typography.fontSizes.xs, color: '#94A3B8', marginTop: '2px', margin: '2px 0 0' }}>
                المستخدم المقيم ينتمي لمدرسة واحدة فقط عبر users.school_id
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* School Info Box */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#F5F3FF',
              borderRadius: theme.radii.lg,
              border: '1px solid #DDD6FE',
            }}
          >
            <div style={{ fontSize: theme.typography.fontSizes.xs, color: '#6D28D9', fontWeight: 600 }}>المدرسة المستهدفة:</div>
            <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: '#2E1065', marginTop: '2px' }}>
              {school.schoolName} ({school.schoolCode})
            </div>
            <div style={{ fontSize: theme.typography.fontSizes.xs, color: '#7C3AED', marginTop: '4px' }}>
              المديرية: {school.directorate} • المرحلة: {school.educationalStage}
            </div>
          </div>

          {/* Currently linked evaluators */}
          <div style={{ padding: '12px 14px', borderRadius: theme.radii.md, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              المقيّمون المرتبطون حالياً بهذه المدرسة في قاعدة البيانات:
            </div>
            {currentEvaluators.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {currentEvaluators.map((ev) => (
                  <div key={ev.userId} style={{ fontSize: '0.8rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓</span>
                    <span style={{ fontWeight: 600 }}>{ev.fullName}</span>
                    <span style={{ color: '#64748B', fontSize: '0.75rem' }}>({ev.username} - {ev.email})</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} />
                لا يوجد مقيّم مرتبط بهذه المدرسة حالياً (غير مهيأة)
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '6px', display: 'block' }}>
              اختر مقيّم الجودة المراد إسناده: *
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value ? Number(e.target.value) : '');
                setError('');
              }}
              disabled={loadingUsers}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: theme.radii.lg,
                border: `1px solid ${error ? '#EF4444' : theme.colors.neutral[200]}`,
                fontSize: theme.typography.fontSizes.sm,
                backgroundColor: theme.colors.neutral.white,
                outline: 'none',
                fontFamily: theme.typography.fontFamily.sans,
              }}
            >
              <option value="">
                {loadingUsers ? 'جاري تحميل قائمة المقيمين...' : '-- اختر مقيّم الجودة --'}
              </option>
              {evaluatorsList.map((u) => {
                const isThisSchool = u.schoolId === school.schoolId;
                const hasOtherSchool = Boolean(u.schoolId && u.schoolId !== school.schoolId);
                const affiliationNote = isThisSchool 
                  ? '(مسند لهذه المدرسة حالياً)' 
                  : hasOtherSchool 
                  ? `(مرتبط بمدرسة أخرى: ${u.schoolName || u.schoolId})` 
                  : '(غير مسند لأي مدرسة)';
                return (
                  <option key={u.userId} value={u.userId}>
                    {u.fullName} ({u.username}) {affiliationNote}
                  </option>
                );
              })}
            </select>
            {error && <p style={{ fontSize: '0.7rem', color: '#EF4444', marginTop: '4px' }}>{error}</p>}
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
              disabled={loading || loadingUsers}
              style={{
                padding: '9px 24px',
                borderRadius: theme.radii.lg,
                border: 'none',
                background: 'linear-gradient(90deg, #7C3AED, #8B5CF6)',
                color: '#fff',
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontFamily: theme.typography.fontFamily.sans,
              }}
            >
              {loading ? 'جاري الربط...' : 'إسناد المقيّم للمدرسة ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
