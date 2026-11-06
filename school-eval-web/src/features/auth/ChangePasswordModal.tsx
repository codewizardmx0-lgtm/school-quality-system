import React, { useState } from 'react';
import { X, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { theme } from '../admin/theme';
import { usersApi } from '../admin/api/usersApi';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  addToast,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!currentPassword) {
      errs.currentPassword = 'كلمة المرور الحالية مطلوبة.';
    }
    if (!newPassword) {
      errs.newPassword = 'كلمة المرور الجديدة مطلوبة.';
    } else if (newPassword.length < 8) {
      errs.newPassword = 'يجب ألا تقل كلمة المرور عن 8 خانات.';
    } else if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      errs.newPassword = 'يجب أن تحتوي على أحرف كبيرة وصغيرة وأرقام.';
    } else if (newPassword === currentPassword) {
      errs.newPassword = 'يجب أن تكون كلمة المرور الجديدة مختلفة عن الحالية.';
    }

    if (!newPasswordConfirmation) {
      errs.newPasswordConfirmation = 'تأكيد كلمة المرور مطلوب.';
    } else if (newPassword !== newPasswordConfirmation) {
      errs.newPasswordConfirmation = 'تأكيد كلمة المرور غير متطابق.';
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await usersApi.changePassword({
        currentPassword,
        newPassword,
        newPasswordConfirmation,
      });

      addToast('success', res.message || 'تم تغيير كلمة المرور بنجاح.');
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
      onClose();
    } catch (err: any) {
      const backendErrors = err?.response?.data?.errors || err?.errors;
      if (backendErrors) {
        const mapped: Record<string, string> = {};
        if (backendErrors.current_password || backendErrors.currentPassword) {
          mapped.currentPassword = (backendErrors.current_password || backendErrors.currentPassword)[0];
        }
        if (backendErrors.new_password || backendErrors.newPassword) {
          mapped.newPassword = (backendErrors.new_password || backendErrors.newPassword)[0];
        }
        if (backendErrors.new_password_confirmation || backendErrors.newPasswordConfirmation) {
          mapped.newPasswordConfirmation = (backendErrors.new_password_confirmation || backendErrors.newPasswordConfirmation)[0];
        }
        setErrors(mapped);
      } else {
        const msg = err?.response?.data?.message || err?.message || 'فشل تغيير كلمة المرور. يرجى التحقق من صحة كلمة المرور الحالية.';
        setErrors({ currentPassword: msg });
        addToast('error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasErr?: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '10px 40px 10px 12px',
    borderRadius: theme.radii.lg,
    border: `1px solid ${hasErr ? '#DC2626' : theme.colors.neutral[300]}`,
    fontSize: theme.typography.fontSizes.sm,
    fontFamily: theme.typography.fontFamily.sans,
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#FAFAFA',
    color: theme.colors.neutral[900],
    direction: 'ltr',
    textAlign: 'right',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
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
          maxWidth: '460px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
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
              <KeyRound size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: theme.typography.fontSizes.base, fontWeight: 700, color: theme.colors.neutral[900] }}>
                تغيير كلمة المرور
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500] }}>
                تحديث بيانات الأمان للحساب الحالي
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Policy Info */}
          <div style={{ backgroundColor: '#F0FDF4', padding: '10px 14px', borderRadius: theme.radii.md, border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: '#166534', lineHeight: 1.4 }}>
              يجب ألا تقل كلمة المرور عن 8 خانات، وتحتوي على مزيج من أحرف وأرقام.
            </span>
          </div>

          {/* Current Password */}
          <div>
            <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '6px' }}>
              كلمة المرور الحالية <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrent ? 'text' : 'password'}
                style={inputStyle(!!errors.currentPassword)}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, currentPassword: '' }));
                }}
                placeholder="أدخل كلمة المرور الحالية"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.neutral[400],
                  padding: 0,
                  display: 'flex',
                }}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.currentPassword && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '0.75rem', marginTop: '4px' }}>
                <AlertCircle size={13} />
                <span>{errors.currentPassword}</span>
              </div>
            )}
          </div>

          {/* New Password */}
          <div>
            <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '6px' }}>
              كلمة المرور الجديدة <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                style={inputStyle(!!errors.newPassword)}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, newPassword: '' }));
                }}
                placeholder="أدخل كلمة المرور الجديدة (8 محارف على الأقل)"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.neutral[400],
                  padding: 0,
                  display: 'flex',
                }}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '0.75rem', marginTop: '4px' }}>
                <AlertCircle size={13} />
                <span>{errors.newPassword}</span>
              </div>
            )}
          </div>

          {/* New Password Confirmation */}
          <div>
            <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '6px' }}>
              تأكيد كلمة المرور الجديدة <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                style={inputStyle(!!errors.newPasswordConfirmation)}
                value={newPasswordConfirmation}
                onChange={(e) => {
                  setNewPasswordConfirmation(e.target.value);
                  setErrors((prev) => ({ ...prev, newPasswordConfirmation: '' }));
                }}
                placeholder="أعد إدخال كلمة المرور الجديدة"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.neutral[400],
                  padding: 0,
                  display: 'flex',
                }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPasswordConfirmation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '0.75rem', marginTop: '4px' }}>
                <AlertCircle size={13} />
                <span>{errors.newPasswordConfirmation}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '6px',
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
              disabled={loading}
              style={{
                padding: '9px 22px',
                borderRadius: theme.radii.lg,
                border: 'none',
                background: 'linear-gradient(90deg, #4F46E5, #6366F1)',
                color: '#fff',
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'جارٍ التحديث...' : 'تحديث كلمة المرور ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ChangePasswordModal;
