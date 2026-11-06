import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { theme } from '../../theme';
import type { Toast } from '../../types/admin.types';

interface ToastNotificationProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const TOAST_STYLES = {
  success: { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', icon: CheckCircle2, iconColor: '#16A34A' },
  error:   { bg: '#FEF2F2', border: '#FCA5A5', text: '#B91C1C', icon: XCircle,      iconColor: '#DC2626' },
  warning: { bg: '#FFFBEB', border: '#FCD34D', text: '#92400E', icon: AlertTriangle, iconColor: '#D97706' },
  info:    { bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8', icon: Info,          iconColor: '#3B82F6' },
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const styles = TOAST_STYLES[toast.type];
  const Icon = styles.icon;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        backgroundColor: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: theme.radii.lg,
        boxShadow: theme.shadows.lg,
        minWidth: '300px',
        maxWidth: '420px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        fontFamily: theme.typography.fontFamily.sans,
      }}
    >
      <Icon size={20} color={styles.iconColor} style={{ flexShrink: 0, marginTop: '1px' }} />
      <p style={{ flex: 1, fontSize: theme.typography.fontSizes.sm, color: styles.text, fontWeight: 500, lineHeight: 1.5 }}>
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: styles.text,
          opacity: 0.6,
          padding: '2px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};