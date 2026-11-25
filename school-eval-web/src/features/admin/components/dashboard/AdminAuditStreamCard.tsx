import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { theme } from '../../theme';
import { formatRelativeArabic } from '../../utils/dateUtils';
import type { AuditLogEntry } from '../../types/admin.types';

interface AdminAuditStreamCardProps {
  auditLogs: AuditLogEntry[];
  onNavigateAudit: () => void;
}

/**
 * بطاقة تدفق سجل العمليات والتدقيق الأمني اللحظي في لوحة مسؤول النظام.
 */
export const AdminAuditStreamCard: React.FC<AdminAuditStreamCardProps> = ({
  auditLogs,
  onNavigateAudit,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '14px',
          borderBottom: '1px solid #F1F5F9',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0B0F19', margin: 0 }}>
              سجل العمليات والتدقيق الأمني اللحظي
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
              تدفق غير قابل للتعديل مع بصمات التشفير التلقائية
            </span>
          </div>
        </div>

        <button
          onClick={onNavigateAudit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            color: '#4F46E5',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#EEF2FF';
            e.currentTarget.style.borderColor = '#A5B4FC';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = '#CBD5E1';
          }}
        >
          <span>الانتقال إلى سجل التدقيق الكامل</span>
          <ArrowLeft size={14} />
        </button>
      </div>

      {/* Audit stream items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {auditLogs.map((log) => {
          const isBreach = log.eventCategory === 'breach';
          const isSensitive = log.eventCategory === 'sensitive';
          const badgeBg = isBreach ? '#FEF2F2' : isSensitive ? '#FEF3C7' : '#F1F5F9';
          const badgeColor = isBreach ? '#EF4444' : isSensitive ? '#D97706' : '#475569';
          const badgeBorder = isBreach ? '#FECACA' : isSensitive ? '#FDE68A' : '#E2E8F0';
          const badgeLabel = isBreach ? 'حظر أمني' : isSensitive ? 'عملية حساسة' : 'عادي';

          return (
            <div
              key={log.logId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 200px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {log.actorName?.slice(0, 2) ?? 'AD'}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0B0F19' }}>
                    {log.description}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontWeight: 600 }}>{log.actorName}</span>
                    <span>•</span>
                    <span>IP: {log.ipAddress}</span>
                    <span>•</span>
                    <span>{formatRelativeArabic(log.timestamp || new Date().toISOString())}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Cryptographic Hash Badge */}
                <div
                  style={{
                    fontFamily: theme.typography.fontFamily.mono,
                    fontSize: '0.7rem',
                    color: '#64748B',
                    backgroundColor: '#fff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    letterSpacing: '0.02em',
                  }}
                  title={`البصمة التشفيرية الكاملة: ${log.digitalHash}`}
                >
                  SHA256: {(log.digitalHash || '00000000').substring(0, 10)}...
                </div>

                {/* Severity Badge */}
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: badgeBg,
                    color: badgeColor,
                    border: `1px solid ${badgeBorder}`,
                    padding: '3px 10px',
                    borderRadius: '6px',
                  }}
                >
                  {badgeLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
