import React, { useState } from 'react';
import {
  ShieldAlert,
  Activity,
  AlertOctagon,
  CheckCircle2,

  ShieldX,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { theme } from '../../theme';
import { StatCard } from '../common/StatCard';
import { RefreshButton } from '../common/RefreshButton';
import { StatusBadge } from '../common/StatusBadge';
import { AuditFilterBar } from './AuditFilterBar';
import { BlockedIpsModal } from './BlockedIpsModal';
import { ExportAuditConfirmModal } from './ExportAuditConfirmModal';
import { useAdminAudit } from '../../hooks/useAdminAudit';
import { exportToExcel, formatExportFilename } from '../../utils/exportUtils';
import { FileSpreadsheet, ChevronRight, ChevronLeft } from 'lucide-react';
import { formatRelativeArabic, formatArabicDateTime } from '../../utils/dateUtils';
import type { AdminScreen } from '../../types/admin.types';

interface SecurityAuditProps {
  onNavigate: (screen: AdminScreen) => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
}

export const SecurityAudit: React.FC<SecurityAuditProps> = ({ onNavigate, addToast }) => {
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    return new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
  });
  const {
    logs: _logs,
    filteredLogs,
    availableEventTypes,
    availableEventOptions,
    availableActors,
    blockedIps,
    loading,
    error,
    selectedActions,
    setSelectedActions,
    actionType,
    setActionType,
    actor,
    setActor,
    timeScope,
    setTimeScope,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    totalPages,
    totalCount,
    auditStats,
    fetchData,
    fetchAllMatchingLogs,
  } = useAdminAudit();
  const [isExporting, setIsExporting] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Modals
  const [isBlockedIpsOpen, setIsBlockedIpsOpen] = useState(false);

  const handleRefresh = async () => { await fetchData(); setLastUpdated(new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })); };

  // Export full audit data matching active filters
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const allLogs = await fetchAllMatchingLogs();
      const headers = [
        'معرف السجل',
        'الوقت والتاريخ',
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
      const rows = allLogs.map((l) => [
        l.logId,
        formatArabicDateTime(l.timestamp),
        l.actorName,
        l.actorRole,
        l.actorRoleCode,
        l.eventType,
        l.eventCategory,
        (l.descriptionAr || l.description),
        l.digitalHash,
        l.ipAddress,
        l.location,
        l.deviceInfo,
        l.securityStatus === 'verified' ? 'موثق' : 'محظور',
      ]);
      const filename = formatExportFilename('سجل_التدقيق_الامني', 'xlsx');
      exportToExcel(filename, 'سجل التدقيق', headers, rows);
      addToast('success', `تم تصدير ${allLogs.length} سجلاً بنجاح إلى ملف Excel (.xlsx)`);
    } catch {
      addToast('error', 'حدث خطأ أثناء تصدير سجل التدقيق الأمني');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ padding: '24px 20px', direction: 'rtl', fontFamily: theme.typography.fontFamily.sans, boxSizing: 'border-box' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>


          <RefreshButton onRefresh={handleRefresh} loading={loading} lastUpdated={lastUpdated} />


          <button
            onClick={() => setIsExportModalOpen(true)}
            disabled={isExporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: theme.radii.lg,
              border: '1px solid #10B981',
              backgroundColor: '#ECFDF5',
              color: '#065F46',
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: 700,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              opacity: isExporting ? 0.7 : 1,
              fontFamily: theme.typography.fontFamily.sans,
              boxShadow: theme.shadows.sm,
            }}
          >
            <FileSpreadsheet size={16} color="#059669" />
            {isExporting ? 'جاري تصدير السجل...' : 'تصدير Excel (.xlsx)'}
          </button>
        </div>
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
          title="سجل العمليات الموثقة بالـ API"
          value={loading ? '...' : `${auditStats.totalLogs || totalCount} عملية`}
          subtitle={
            selectedActions.length > 0 || actor !== 'الكل' || searchQuery || timeScope !== 'all'
              ? `معروض ${totalCount} عملية مطابقة للفلتر`
              : 'سجلات تدقيق فعلية بالنظام'
          }
          icon={<Activity size={24} />}
          iconBgColor="#EFF6FF"
          iconColor="#2563EB"
        />
        <StatCard
          title="عمليات حوكمة حساسة"
          value={loading ? '...' : `${auditStats.sensitiveCount} عملية`}
          subtitle="إجراءات حاسمة (حذف/صلاحيات/اعتماد)"
          icon={<ShieldAlert size={24} />}
          iconBgColor="#FEF3C7"
          iconColor="#D97706"
        />
        <StatCard
          title="محاولات دخول غير مصرح بها"
          value={loading ? '...' : `${auditStats.failedLoginsCount} محاولة`}
          subtitle="مرصودة ومسجلة في جدار الحماية"
          icon={<AlertOctagon size={24} />}
          iconBgColor="#FEE2E2"
          iconColor="#EF4444"
        />
        <StatCard
          title="المزامنة مع خادم الأرشيف"
          value={auditStats.archiveSyncStatus || 'متزامن 100%'}
          subtitle="سلامة البصمات الرقمية SHA-256"
          icon={<CheckCircle2 size={24} />}
          iconBgColor="#ECFDF5"
          iconColor="#059669"
        />
      </div>

      {/* Filter Bar */}
      <AuditFilterBar
        selectedActions={selectedActions}
        onSelectedActionsChange={setSelectedActions}
        actionType={actionType}
        onActionTypeChange={setActionType}
        actor={actor}
        onActorChange={setActor}
        timeScope={timeScope}
        onTimeScopeChange={setTimeScope}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onRefresh={handleRefresh}
        isLoading={loading}
        totalFiltered={filteredLogs.length}
        currentPage={currentPage}
        perPage={15}
        totalLogs={totalCount}
        availableEventOptions={availableEventOptions}
        availableEventTypes={availableEventTypes}
        availableActors={availableActors}
      />

      {/* Error Fallback Prompt */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: theme.radii.lg,
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991B1B', fontSize: theme.typography.fontSizes.sm }}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => void fetchData()}
            style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: theme.radii.md,
              padding: '6px 14px',
              fontSize: theme.typography.fontSizes.xs,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Audit Data Table */}
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          border: `1px solid ${theme.colors.neutral[200]}`,
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          boxShadow: theme.shadows.sm,
          marginBottom: '24px',
          maxWidth: '100%',
        }}
      >
        <table style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ backgroundColor: theme.colors.neutral[50], borderBottom: `1px solid ${theme.colors.neutral[200]}` }}>
              <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                الوقت والتاريخ
              </th>
              <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                الفاعل والحساب
              </th>
              <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                نوع العملية والتصنيف
              </th>
              <th style={{ padding: '14px 20px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                الشرح والتفاصيل
              </th>
              <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                البصمة والتوثيق
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
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`audit-skel-${i}`} className="animate-pulse" style={{ borderBottom: `1px solid ${theme.colors.neutral[100]}` }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ width: '80px', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px', marginBottom: '4px' }} />
                    <div style={{ width: '110px', height: '10px', backgroundColor: '#F3F4F6', borderRadius: '4px' }} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ width: '100px', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px', marginBottom: '4px' }} />
                    <div style={{ width: '80px', height: '12px', backgroundColor: '#F3F4F6', borderRadius: '4px' }} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ width: '90px', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px', marginBottom: '6px' }} />
                    <div style={{ width: '70px', height: '18px', backgroundColor: '#E5E7EB', borderRadius: '12px' }} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ width: '220px', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px', marginBottom: '4px' }} />
                    <div style={{ width: '80px', height: '12px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ width: '70px', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px' }} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ width: '90px', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px' }} />
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ width: '60px', height: '22px', backgroundColor: '#E5E7EB', borderRadius: '12px', margin: '0 auto' }} />
                  </td>
                </tr>
              ))
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: theme.colors.neutral[400] }}>
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

                  {/* Detailed Explanation */}
                  <td style={{ padding: '14px 20px', minWidth: '320px', maxWidth: '520px' }}>
                    <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[800], lineHeight: 1.65, fontWeight: 500 }}>
                      {log.descriptionAr || log.description || "عملية موثقة في النظام"}
                    </div>
                  </td>

                  {/* Digital Hash */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontFamily: 'monospace',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                        border: '1px solid #E2E8F0',
                        display: 'inline-block',
                      }}
                    >
                      {log.digitalHash}
                    </span>
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

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: '#FAFAFA',
              borderTop: `1px solid ${theme.colors.neutral[200]}`,
            }}
          >
            <span style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[600] }}>
              عرض الصفحة {currentPage} من {totalPages} (إجمالي {totalCount} سجل)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: theme.radii.md,
                  border: `1px solid ${theme.colors.neutral[300]}`,
                  backgroundColor: currentPage <= 1 ? '#F3F4F6' : '#fff',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: theme.typography.fontSizes.xs,
                }}
              >
                <ChevronRight size={14} />
                السابق
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: theme.radii.md,
                  border: `1px solid ${theme.colors.neutral[300]}`,
                  backgroundColor: currentPage >= totalPages ? '#F3F4F6' : '#fff',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  fontSize: theme.typography.fontSizes.xs,
                }}
              >
                التالي
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>
        )}
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

      {/* Export Confirmation Modal */}
      <ExportAuditConfirmModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={handleExportExcel}
        isExporting={isExporting}
        totalCount={totalCount}
        selectedActions={selectedActions}
        actor={actor}
        timeScope={timeScope}
        searchQuery={searchQuery}
      />
    </div>
  );
};
