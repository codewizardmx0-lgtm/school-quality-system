import React, { useState } from 'react';
import { X, UserCheck } from 'lucide-react';
import { theme } from '../../theme';
import { mockAdminService, MOCK_USERS } from '../../services/mockAdminData';
import type { School } from '../../types/admin.types';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !school) return null;

  // Available school evaluators
  const availableEvaluators = MOCK_USERS.filter((u) => u.userType === 'school');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('يرجى اختيار مسؤول التقييم المراد ربطه');
      return;
    }
    setLoading(true);
    try {
      await mockAdminService.linkEvaluator(school.schoolId, Number(selectedUserId));
      const user = MOCK_USERS.find((u) => u.userId === Number(selectedUserId));
      addToast('success', `تم ربط المستخدم "${user?.fullName}" بـ "${school.schoolName}" بنجاح`);
      onSuccess();
      onClose();
    } catch {
      addToast('error', 'فشل في ربط مسؤول التقييم، يرجى المحاولة لاحقاً');
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
          maxWidth: '480px',
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
                ربط مسؤول تقييم بالمدرسة
              </h2>
              <p style={{ fontSize: theme.typography.fontSizes.xs, color: '#94A3B8', marginTop: '2px' }}>
                تفعيل الحساب الإداري المسؤول عن دورة التقييم
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
              padding: '12px 16px',
              backgroundColor: '#F5F3FF',
              borderRadius: theme.radii.lg,
              border: '1px solid #DDD6FE',
            }}
          >
            <div style={{ fontSize: theme.typography.fontSizes.xs, color: '#6D28D9', fontWeight: 600 }}>المدرسة المحددة:</div>
            <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: '#2E1065', marginTop: '2px' }}>
              {school.schoolName} ({school.schoolCode})
            </div>
            <div style={{ fontSize: theme.typography.fontSizes.xs, color: '#7C3AED', marginTop: '2px' }}>
              {school.directorate} • {school.educationalStage}
            </div>
          </div>

          <div>
            <label style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '6px', display: 'block' }}>
              اختر مسؤول التقييم من الحسابات المسجلة: *
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value ? Number(e.target.value) : '');
                setError('');
              }}
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
              <option value="">-- اختر المستخدم المراد ربطه --</option>
              {availableEvaluators.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.fullName} ({u.email}) - {u.status === 'Active' ? 'نشط' : 'معلق'}
                </option>
              ))}
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
              disabled={loading}
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
              {loading ? 'جاري الربط...' : 'ربط الحساب وتفعيل المدرسة ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
