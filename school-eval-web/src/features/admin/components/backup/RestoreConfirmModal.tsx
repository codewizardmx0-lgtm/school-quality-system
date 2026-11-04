import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { theme } from '../../theme';
import type { BackupRecord } from '../../types/admin.types';

interface RestoreConfirmModalProps {
  isOpen: boolean;
  backup: BackupRecord | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const RestoreConfirmModal: React.FC<RestoreConfirmModalProps> = ({
  isOpen,
  backup,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const [confirmationText, setConfirmationText] = useState('');

  if (!isOpen || !backup) return null;

  const isConfirmed = confirmationText.trim() === 'استعادة النظام';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 8500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15,23,42,0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          width: '90%',
          maxWidth: '500px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: theme.shadows.xl,
          fontFamily: theme.typography.fontFamily.sans,
          direction: 'rtl',
        }}
      >
        {/* Warning Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${theme.colors.neutral[200]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #7C2D12 0%, #1E293B 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F87171',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: theme.typography.fontSizes.base, fontWeight: 700, color: '#fff', margin: 0 }}>
                تأكيد استعادة النسخة الاحتياطية
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#FCA5A5', marginTop: '2px' }}>
                إجراء تعافي حرج بعد الكوارث (Disaster Recovery)
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File details */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#FFFBEB',
              borderRadius: theme.radii.lg,
              border: '1px solid #FDE68A',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600 }}>الملف المختار للاستعادة:</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#78350F', fontFamily: 'monospace', marginTop: '2px' }}>
              {backup.fileName}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: '2px' }}>
              البصمة: {backup.sha256Hash.slice(0, 24)}...
            </div>
          </div>

          <div style={{ fontSize: theme.typography.fontSizes.sm, color: theme.colors.neutral[700], lineHeight: 1.6 }}>
            <p style={{ marginBottom: '8px', color: '#B91C1C', fontWeight: 700 }}>
              تحذير تشغيلي بالغ الأهمية:
            </p>
            <ul style={{ paddingRight: '20px', margin: 0, fontSize: '0.8rem', color: theme.colors.neutral[600], display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>سيتم إيقاف خدمات النظام مؤقتاً لمدة تتراوح بين 15 - 30 دقيقة.</li>
              <li>سيتم استبدال البيانات الحالية بالكامل بالبيانات المخزنة في هذه النسخة.</li>
              <li>سيقوم النظام تلقائياً بإنشاء نقطة استعادة فورية (Snapshot) قبل بدء العملية.</li>
            </ul>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: theme.colors.neutral[800], display: 'block', marginBottom: '6px' }}>
              للتأكيد، اكتب عبارة "استعادة النظام" في الحقل أدناه:
            </label>
            <input
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="استعادة النظام"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: theme.radii.lg,
                border: `1px solid ${theme.colors.neutral[300]}`,
                fontSize: theme.typography.fontSizes.sm,
                backgroundColor: theme.colors.neutral[50],
                outline: 'none',
                fontFamily: theme.typography.fontFamily.sans,
                boxSizing: 'border-box',
              }}
            />
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
              disabled={isLoading}
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
              إلغاء التراجع
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!isConfirmed || isLoading}
              style={{
                padding: '9px 24px',
                borderRadius: theme.radii.lg,
                border: 'none',
                backgroundColor: isConfirmed ? '#DC2626' : '#FCA5A5',
                color: '#fff',
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: 600,
                cursor: isConfirmed && !isLoading ? 'pointer' : 'not-allowed',
                fontFamily: theme.typography.fontFamily.sans,
              }}
            >
              {isLoading ? 'جاري بدء الاستعادة...' : 'تأكيد الاستعادة الفورية'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
