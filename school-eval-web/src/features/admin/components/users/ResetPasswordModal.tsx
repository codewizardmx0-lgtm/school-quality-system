import React, { useState } from 'react';
import { X, KeyRound, Copy, CheckCircle2 } from 'lucide-react';
import { theme } from '../../theme';
import { mockAdminService } from '../../services/mockAdminData';
import type { User } from '../../types/admin.types';

interface ResetPasswordModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  addToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  user,
  onClose,
  addToast,
}) => {
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !user) return null;

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await mockAdminService.resetPassword(user.userId);
      if (res.data) {
        setGeneratedPassword(res.data.tempPassword);
        addToast('success', `تم توليد كلمة مرور جديدة لحساب ${user.fullName}`);
      }
    } catch {
      addToast('error', 'فشل في إعادة ضبط كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      addToast('info', 'تم نسخ كلمة المرور المؤقتة إلى الحافظة');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setGeneratedPassword(null);
    setCopied(false);
    onClose();
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
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          width: '90%',
          maxWidth: '460px',
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
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F59E0B',
              }}
            >
              <KeyRound size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: theme.typography.fontSizes.base, fontWeight: theme.typography.fontWeights.bold, color: '#fff', margin: 0 }}>
                إعادة ضبط كلمة المرور
              </h2>
              <p style={{ fontSize: theme.typography.fontSizes.xs, color: '#94A3B8', marginTop: '2px' }}>
                توليد بيانات اعتماد مؤقتة جديدة
              </p>
            </div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: theme.colors.neutral[50],
              borderRadius: theme.radii.lg,
              border: `1px solid ${theme.colors.neutral[200]}`,
            }}
          >
            <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500] }}>المستخدم المعني:</div>
            <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: theme.colors.neutral[900], marginTop: '2px' }}>
              {user.fullName} ({user.email})
            </div>
            <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500], marginTop: '2px' }}>
              الدور: {user.roleName}
            </div>
          </div>

          {!generatedPassword ? (
            <div>
              <p style={{ fontSize: theme.typography.fontSizes.sm, color: theme.colors.neutral[600], lineHeight: 1.6 }}>
                سيتم إبطال كلمة المرور السابقة للمستخدم وتوليد كلمة مرور مؤقتة عشوائية آمنة. سيُطلب من المستخدم تغييرها عند أول تسجيل دخول.
              </p>
              <button
                onClick={handleReset}
                disabled={loading}
                style={{
                  marginTop: '16px',
                  width: '100%',
                  padding: '11px',
                  borderRadius: theme.radii.lg,
                  border: 'none',
                  background: 'linear-gradient(90deg, #D97706, #F59E0B)',
                  color: '#fff',
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: theme.typography.fontFamily.sans,
                }}
              >
                <KeyRound size={16} />
                {loading ? 'جاري التوليد والتشفير...' : 'توليد كلمة مرور جديدة الآن'}
              </button>
            </div>
          ) : (
            <div>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  borderRadius: theme.radii.lg,
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: '#92400E', marginBottom: '8px' }}>
                  كلمة المرور المؤقتة الجديدة (يرجى نسخها وحفظها):
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#fff',
                    padding: '8px 12px',
                    borderRadius: theme.radii.md,
                    border: '1px solid #FCD34D',
                  }}
                >
                  <code style={{ fontSize: '1rem', fontWeight: 700, color: '#B45309', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                    {generatedPassword}
                  </code>
                  <button
                    onClick={handleCopy}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      backgroundColor: copied ? '#DCFCE7' : '#F3F4F6',
                      color: copied ? '#15803D' : '#374151',
                      borderRadius: theme.radii.sm,
                      fontSize: theme.typography.fontSizes.xs,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    {copied ? 'تم النسخ!' : 'نسخ'}
                  </button>
                </div>
              </div>

              <button
                onClick={handleClose}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: theme.radii.lg,
                  border: 'none',
                  backgroundColor: theme.colors.primary[600],
                  color: '#fff',
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: theme.typography.fontFamily.sans,
                }}
              >
                إغلاق و إنهاء
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
