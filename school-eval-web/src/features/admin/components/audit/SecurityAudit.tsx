import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Activity,
  AlertOctagon,
  CheckCircle2,
  Download,
  ShieldX,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { theme } from '../../theme';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { AuditFilterBar } from './AuditFilterBar';
import { BlockedIpsModal } from './BlockedIpsModal';
import { mockAdminService } from '../../services/mockAdminData';
import { downloadEncryptedLog } from '../../utils/exportUtils';
import { formatRelativeArabic, formatArabicDateTime } from '../../utils/dateUtils';
import type { AuditLogEntry, BlockedIp, AdminScreen } from '../../types/admin.types';

interface SecurityAuditProps {
  onNavigate: (screen: AdminScreen) => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
}

export const SecurityAudit: React.FC<SecurityAuditProps> = ({ onNavigate, addToast }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionType, setActionType] = useState('الكل');
  const [actor, setActor] = useState('الكل');
  const [timeScope, setTimeScope] = useState('all');

  // Modals
  const [isBlockedIpsOpen, setIsBlockedIpsOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [logsRes, ipsRes] = await Promise.all([
        mockAdminService.getAuditLogs(),
        mockAdminService.getBlockedIps(),
      ]);
      if (logsRes.data) setLogs(logsRes.data);
      if (ipsRes.data) setBlockedIps(ipsRes.data);
    } catch {
      addToast('error', 'فشل في تحميل سجلات التدقيق الأمني');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    void fetchData();
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      mockAdminService.getAuditLogs(),
      mockAdminService.getBlockedIps(),
    ])
      .then(([logsRes, ipsRes]) => {
        if (!ignore) {
          if (logsRes.data) setLogs(logsRes.data);
          if (ipsRes.data) setBlockedIps(ipsRes.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          addToast('error', 'فشل في تحميل سجلات التدقيق الأمني');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    const baseTimestamp = new Date('2026-11-02T12:00:00Z').getTime();
    return logs.filter((l) => {
      const matchAction = actionType === 'الكل' || l.eventType === actionType;
      const matchActor = actor === 'الكل' || l.actorName.includes(actor);

      let matchTime = true;
      if (timeScope === '24h') {
        const diffMs = baseTimestamp - new Date(l.timestamp).getTime();
        matchTime = diffMs <= 24 * 3600 * 1000;
      } else if (timeScope === '7d') {
        const diffMs = baseTimestamp - new Date(l.timestamp).getTime();
        matchTime = diffMs <= 7 * 24 * 3600 * 1000;
      }

      return matchAction && matchActor && matchTime;
    });
  }, [logs, actionType, actor, timeScope]);

  // Export encrypted CSV
  const handleExport = () => {
    const headers = [
      'معرف السجل',
      'الوقت والتاريخ (UTC)',
      'الفاعل',
      'الدور',
      'كود الدور',
      'نوع الحدث',
      'التصنيف',
      'البيان والتفاصيل',
      'البصمة الرقمية (SHA-256)',
      'عنوان IP',
      'الموقع الجغرافي',
      'بيانات الجهاز',
      'حالة الأمان',
    ];
    const rows = filteredLogs.map((l) => [
      l.logId,
      l.timestamp,
      l.actorName,
      l.actorRole,
      l.actorRoleCode,
      l.eventType,
      l.eventCategory,
      l.description,
      l.digitalHash,
      l.ipAddress,
      l.location,
      l.deviceInfo,
      l.securityStatus === 'verified' ? 'موثق' : 'محظور',
    ]);
    downloadEncryptedLog('erteqa_security_audit_log.csv', headers, rows);
    addToast('success', 'تم تصدير سجل التدقيق الأمني المشفّر بنجاح');
  };

  return (
    <div style={{ padding: '32px', direction: 'rtl', fontFamily: theme.typography.fontFamily.sans }}>
      {/* Header & Primary Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: theme.colors.neutral[900],
              margin: 0,
            }}
          >
            سجل التدقيق الأمني ومراقبة النزاهة التشغيلية (Audit Trail)
          </h1>
          <p
            style={{
              fontSize: theme.typography.fontSizes.sm,
              color: theme.colors.neutral[500],
              marginTop: '4px',
            }}
          >
            توثيق زمني غير قابل للتعديل لكافة العمليات المنفذة على قواعد البيانات والملفات الشاهدة
          </p>
        </div>

        <button
          onClick={handleExport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: theme.radii.lg,
            border: 'none',
            background: 'linear-gradient(90deg, #059669, #10B981)',
            color: '#fff',
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            fontFamily: theme.typography.fontFamily.sans,
          }}
        >
          <Download size={18} />
          تصدير السجل المشفّر (CSV) ↓
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <StatCard
          title="أحداث النظام المسجلة اليوم"
          value="1,428 عملية"
          subtitle="معدل نشاط طبيعي"
          icon={<Activity size={24} />}
          iconBgColor="#EFF6FF"
          iconColor="#2563EB"
        />
        <StatCard
          title="عمليات حوكمة حساسة"
          value="18 عملية"
          subtitle="قفل معايير وتعديل صلاحيات"
          icon={<ShieldAlert size={24} />}
          iconBgColor="#FEF3C7"
          iconColor="#D97706"
        />
        <StatCard
          title="محاولات دخول غير مصرح بها"
          value="3 محاولات"
          subtitle="تم حظر الـ IP تلقائياً"
          icon={<AlertOctagon size={24} />}
          iconBgColor="#FEE2E2"
          iconColor="#EF4444"
        />
        <StatCard
          title="المزامنة مع خادم الأرشيف"
          value="متزامن 100%"
          subtitle="SHA-256 Validated"
          icon={<CheckCircle2 size={24} />}
          iconBgColor="#ECFDF5"
          iconColor="#059669"
        />
      </div>

      {/* Filter Bar */}
      <AuditFilterBar
        actionType={actionType}
        onActionTypeChange={setActionType}
        actor={actor}
        onActorChange={setActor}
        timeScope={timeScope}
        onTimeScopeChange={setTimeScope}
        onRefresh={handleRefresh}
        isLoading={loading}
        totalFiltered={filteredLogs.length}
        totalLogs={logs.length}
      />

      {/* Audit Data Table */}
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          border: `1px solid ${theme.colors.neutral[200]}`,
          overflow: 'hidden',
          boxShadow: theme.shadows.sm,
          marginBottom: '24px',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ backgroundColor: theme.colors.neutral[50], borderBottom: `1px solid ${theme.colors.neutral[200]}` }}>
              <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                الوقت والتاريخ
              </th>
              <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                الفاعل والحساب
              </th>
              <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                نوع الحدث والتصنيف
              </th>
              <th style={{ padding: '14px 20px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                البيان والتفاصيل
              </th>
              <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                عنوان IP والجهاز
              </th>
              <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600], textAlign: 'center' }}>
                حالة الأمان
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: theme.colors.neutral[400] }}>
                  لا توجد سجلات تدقيق مطابقة لمعايير التصفية المحددة
                </td>
              </tr>
            ) : (
              filteredLogs.map((log, idx) => (
                <tr
                  key={log.logId}
                  style={{
                    borderBottom: idx < filteredLogs.length - 1 ? `1px solid ${theme.colors.neutral[100]}` : 'none',
                    backgroundColor:
                      log.eventCategory === 'breach'
                        ? '#FFF5F5'
                        : idx % 2 === 0
                        ? theme.colors.neutral.white
                        : '#FAFAFA',
                  }}
                >
                  {/* Timestamp */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: theme.typography.fontSizes.xs, fontWeight: 600, color: theme.colors.neutral[800] }}>
                      {formatRelativeArabic(log.timestamp)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: theme.colors.neutral[400], marginTop: '2px' }}>
                      {formatArabicDateTime(log.timestamp)}
                    </div>
                  </td>

                  {/* Actor */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: theme.colors.neutral[900] }}>
                      {log.actorName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: theme.colors.neutral[400] }}>
                      {log.actorRole} ({log.actorRoleCode})
                    </div>
                  </td>

                  {/* Event Type & Category Badge */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 600, color: theme.colors.neutral[800] }}>
                        {log.eventType}
                      </span>
                    </div>
                    <StatusBadge
                      variant={log.eventCategory}
                      label={
                        log.eventCategory === 'breach'
                          ? 'أمني حرج / هجوم'
                          : log.eventCategory === 'sensitive'
                          ? 'حوكمة حساسة'
                          : 'نشاط تشغيلي'
                      }
                      size="sm"
                    />
                  </td>

                  {/* Description & Digital Hash */}
                  <td style={{ padding: '14px 20px', maxWidth: '320px' }}>
                    <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[700], lineHeight: 1.5 }}>
                      {log.description}
                    </div>
                    <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontFamily: 'monospace',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        {log.digitalHash}
                      </span>
                    </div>
                  </td>

                  {/* IP & Device */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: theme.typography.fontSizes.xs, fontWeight: 600, color: theme.colors.neutral[800], fontFamily: 'monospace' }}>
                      {log.ipAddress}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: theme.colors.neutral[500], marginTop: '2px' }}>
                      {log.location}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: theme.colors.neutral[400] }}>
                      {log.deviceInfo}
                    </div>
                  </td>

                  {/* Security Status */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <StatusBadge
                      variant={log.securityStatus === 'verified' ? 'verified' : 'blocked'}
                      label={log.securityStatus === 'verified' ? 'موثق ✓' : 'محظور ⬛'}
                      size="md"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Legal Non-Repudiation Callout Box */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#F8FAFC',
          borderRadius: theme.radii.xl,
          border: '1px solid #E2E8F0',
          borderRight: '4px solid #F59E0B',
          marginBottom: '28px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}
      >
        <Lock size={20} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
            الحجية القانونية والامتثال الرقمي (Non-Repudiation)
          </div>
          <div style={{ fontSize: theme.typography.fontSizes.xs, color: '#64748B', lineHeight: 1.6 }}>
            جميع السجلات مشفرة بتسلسل كتل رقمية تمنع التلاعب بأثر رجعي، وتُعتمد كوثائق إثبات رسمية أمام جهات الرقابة والمحاسبة. يتم أرشفة نسخة مشفرة إضافية خارج بيئة التشغيل يومياً في تمام الساعة 02:00 صباحاً.
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingTop: '8px',
        }}
      >
        <button
          onClick={() => setIsBlockedIpsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: theme.radii.lg,
            border: '1px solid #FECACA',
            backgroundColor: '#FEF2F2',
            color: '#B91C1C',
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: theme.typography.fontFamily.sans,
          }}
        >
          <ShieldX size={16} />
          عرض قائمة الـ IPs المحظورة ({blockedIps.length})
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onNavigate('schools')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: theme.radii.lg,
              border: `1px solid ${theme.colors.neutral[200]}`,
              backgroundColor: theme.colors.neutral.white,
              color: theme.colors.neutral[700],
              fontSize: theme.typography.fontSizes.sm,
              cursor: 'pointer',
              fontFamily: theme.typography.fontFamily.sans,
            }}
          >
            دليل المدارس والربط
          </button>
          <button
            onClick={() => onNavigate('backup')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: theme.radii.lg,
              border: 'none',
              backgroundColor: '#0F172A',
              color: '#fff',
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: theme.typography.fontFamily.sans,
            }}
          >
            النسخ الاحتياطي والتهيئة
            <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>
      </div>

      {/* Blocked IPs Modal */}
      <BlockedIpsModal
        isOpen={isBlockedIpsOpen}
        blockedIps={blockedIps}
        onClose={() => setIsBlockedIpsOpen(false)}
        onSuccess={fetchData}
        addToast={addToast}
      />
    </div>
  );
};
