import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { theme } from '../../theme';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const confirmColors = {
    danger:  { bg: '#EF4444', hover: '#DC2626', text: '#fff' },
    warning: { bg: '#F59E0B', hover: '#D97706', text: '#fff' },
    info:    { bg: '#4F46E5', hover: '#4338CA', text: '#fff' },
  };
  const cc = confirmColors[variant];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          padding: '32px',
          maxWidth: '420px',
          width: '90%',
          boxShadow: theme.shadows.xl,
          animation: 'fadeIn 0.2s ease',
          direction: 'rtl',
          fontFamily: theme.typography.fontFamily.sans,
        }}
      >
        {/* Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: variant === 'danger' ? '#FEE2E2' : variant === 'warning' ? '#FEF3C7' : '#EDE9FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle
              size={22}
              color={variant === 'danger' ? '#B91C1C' : variant === 'warning' ? '#B45309' : '#6D28D9'}
            />
          </div>
          <h3 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[900] }}>
            {title}
          </h3>
          <button
            onClick={onCancel}
            style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.neutral[400], padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Message */}
        <p style={{ fontSize: theme.typography.fontSizes.sm, color: theme.colors.neutral[600], lineHeight: 1.6, marginBottom: '24px' }}>
          {message}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '9px 20px',
              borderRadius: theme.radii.lg,
              border: `1px solid ${theme.colors.neutral[200]}`,
              backgroundColor: theme.colors.neutral.white,
              color: theme.colors.neutral[700],
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: theme.typography.fontWeights.medium,
              cursor: 'pointer',
              fontFamily: theme.typography.fontFamily.sans,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '9px 20px',
              borderRadius: theme.radii.lg,
              border: 'none',
              backgroundColor: cc.bg,
              color: cc.text,
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: theme.typography.fontWeights.semibold,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              fontFamily: theme.typography.fontFamily.sans,
              minWidth: '80px',
            }}
          >
            {isLoading ? 'جاري التنفيذ...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};