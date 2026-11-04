import React, { useState } from 'react';
import { X, ShieldX, Unlock } from 'lucide-react';
import { theme } from '../../theme';
import { auditApi } from '../../api/auditApi';
import { formatRelativeArabic } from '../../utils/dateUtils';
import type { BlockedIp } from '../../types/admin.types';

interface BlockedIpsModalProps {
  isOpen: boolean;
  blockedIps: BlockedIp[];
  onClose: () => void;
  onSuccess: () => void;
  addToast: (type: 'success' | 'error', msg: string) => void;
}

export const BlockedIpsModal: React.FC<BlockedIpsModalProps> = ({
  isOpen,
  blockedIps,
  onClose,
  onSuccess,
  addToast,
}) => {
  const [unblockingId, setUnblockingId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleUnblock = async (ip: BlockedIp) => {
    setUnblockingId(ip.ipId);
    try {
      await auditApi.unblockIp({ ipId: ip.ipId, ip: ip.ipAddress });
      addToast('success', `تم إلغاء حظر عنوان IP (${ip.ipAddress}) بنجاح`);
      onSuccess();
    } catch {
      addToast('error', 'فشل في إلغاء الحظر');
    } finally {
      setUnblockingId(null);
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
          maxWidth: '620px',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: theme.shadows.xl,
          fontFamily: theme.typography.fontFamily.sans,
          direction: 'rtl',
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
            background: 'linear-gradient(135deg, #450A0A 0%, #1E293B 100%)',
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
              <ShieldX size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: theme.typography.fontSizes.base, fontWeight: 700, color: '#fff', margin: 0 }}>
                قائمة عناوين IP المحظورة تلقائياً
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#FCA5A5', marginTop: '2px' }}>
                تم عزلها فورياً بواسطة منظومة الجدار الناري الذكية
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {blockedIps.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: theme.colors.neutral[400] }}>
              لا توجد عناوين IP محظورة حالياً. المنظومة مؤمّنة بالكامل.
            </div>
          ) : (
            blockedIps.map((ip) => (
              <div
                key={ip.ipId}
                style={{
                  padding: '16px',
                  borderRadius: theme.radii.lg,
                  border: '1px solid #FECACA',
                  backgroundColor: '#FEF2F2',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#DC2626',
                        color: '#fff',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                      }}
                    >
                      {ip.ipAddress}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: 600 }}>
                      {ip.location}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#7F1D1D' }}>
                      ({ip.attemptCount} محاولات اختراق)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#7F1D1D', marginBottom: '4px' }}>
                    السبب: {ip.reason}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#B91C1C' }}>
                    تاريخ الحظر: {formatRelativeArabic(ip.blockedAt)}
                  </div>
                </div>

                <button
                  onClick={() => handleUnblock(ip)}
                  disabled={unblockingId === ip.ipId}
                  style={{
                    padding: '6px 12px',
                    borderRadius: theme.radii.md,
                    border: '1px solid #DC2626',
                    backgroundColor: '#fff',
                    color: '#DC2626',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: unblockingId === ip.ipId ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                    fontFamily: theme.typography.fontFamily.sans,
                  }}
                >
                  <Unlock size={12} />
                  {unblockingId === ip.ipId ? 'جاري الفك...' : 'إلغاء الحظر'}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: `1px solid ${theme.colors.neutral[200]}`,
            backgroundColor: theme.colors.neutral[50],
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: theme.radii.lg,
              border: `1px solid ${theme.colors.neutral[200]}`,
              backgroundColor: theme.colors.neutral.white,
              color: theme.colors.neutral[700],
              fontSize: theme.typography.fontSizes.sm,
              cursor: 'pointer',
              fontFamily: theme.typography.fontFamily.sans,
            }}
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
