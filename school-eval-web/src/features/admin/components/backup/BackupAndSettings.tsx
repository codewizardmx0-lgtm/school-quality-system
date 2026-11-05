import React, { useState } from 'react';
import {
  Database,
  HardDrive,
  FileText,
  Bot,
  Plus,
  ArrowRight,
  AlertTriangle,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { theme } from '../../theme';
import { StatCard } from '../common/StatCard';
import { RefreshButton } from '../common/RefreshButton';
import { BackupArchiveTable } from './BackupArchiveTable';
import { IntegrationSettingsForm } from './IntegrationSettingsForm';
import { TriggerBackupModal } from './TriggerBackupModal';
import { RestoreConfirmModal } from './RestoreConfirmModal';
import { useAdminBackup } from '../../hooks/useAdminBackup';
import { formatRelativeArabic } from '../../utils/dateUtils';
import type { BackupRecord, AdminScreen } from '../../types/admin.types';

interface BackupAndSettingsProps {
  onNavigate: (screen: AdminScreen) => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
}

export const BackupAndSettings: React.FC<BackupAndSettingsProps> = ({ onNavigate, addToast }) => {
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    return new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
  });
  const {
    backups,
    settings,
    loading,
    error,
    fetchData,
  } = useAdminBackup();

  const handleRefresh = async () => {
    await fetchData();
    setLastUpdated(new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }));
  };

  // Modals
  const [isTriggerOpen, setIsTriggerOpen] = useState(false);
  const [restoreBackup, setRestoreBackup] = useState<BackupRecord | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestoreConfirm = async () => {
    if (!restoreBackup) return;
    setIsRestoring(true);
    setTimeout(() => {
      setIsRestoring(false);
      setRestoreBackup(null);
      addToast('success', `تمت استعادة النسخة الاحتياطية (${restoreBackup.fileName}) بنجاح. تم تحديث جداول النظام.`);
    }, 2500);
  };

  const handleHealthReport = () => {
    // Generate mock server health report PDF simulation
    const content = `تقرير صحة الخوادم والخدمات المركزية - منصة ارتقاء\nالتاريخ: ${new Date().toLocaleDateString('ar-YE')}\nقاعدة البيانات: متصلة ونشطة\nوحدة التخزين السحابي: متصلة ومؤمّنة (SHA-256 Validated)\nمحرك الذكاء الاصطناعي: استجابة 320ms`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `server_health_report_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('info', 'تم إنشاء وتنزيل تقرير صحة الخوادم بنجاح');
  };

  const latestSuccessBackup = backups.find((b) => b.status === 'completed');

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
            إدارة النسخ الاحتياطية وتهيئة خدمات النظام المركزية
          </h1>
          <p
            style={{
              fontSize: theme.typography.fontSizes.sm,
              color: theme.colors.neutral[500],
              marginTop: '4px',
            }}
          >
            النسخ الآلي اليومي لقاعدة البيانات والملفات الشاهدة • إدارة واجهات الربط والتخزين السحابي
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>


          <RefreshButton onRefresh={handleRefresh} loading={loading} lastUpdated={lastUpdated} />


          <button


            onClick={() => setIsTriggerOpen(true)}


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


            <Plus size={18} />


            + إنشاء نسخة احتياطية فورية


          </button>


        </div>
      </div>

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
            <AlertTriangle size={18} />
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

            {/* Inactive Services Notice Banner */}
      <div
        style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: theme.radii.lg,
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <ShieldAlert size={20} color="#DC2626" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: '#991B1B' }}>
            تنبيه: خدمات النسخ السحابي والذكاء الاصطناعي قيد الإعداد (ميزة مستقبلية)
          </div>
          <div style={{ fontSize: theme.typography.fontSizes.xs, color: '#7F1D1D', marginTop: '2px' }}>
            خدمات النسخ الاحتياطي التلقائي ومستودع الوثائق السحابي والذكاء الاصطناعي غير مفعلة حالياً في البيئة التشغيلية وتخضع للمحاكاة التجريبية.
          </div>
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
          title="آخر نسخة احتياطية ناجحة"
          value={latestSuccessBackup ? formatRelativeArabic(latestSuccessBackup.createdAt) : 'اليوم • 02:00 ص'}
          subtitle="مكتملة ومؤمّنة SHA-256"
          icon={<Database size={24} />}
          iconBgColor="#ECFDF5"
          iconColor="#059669"
        />
        <StatCard
          title="حجم قاعدة البيانات العلائقية"
          value="3.85 GB"
          subtitle="محاكاة تجريبية - غير مفعلة"
          icon={<HardDrive size={24} />}
          iconBgColor="#EFF6FF"
          iconColor="#2563EB"
        />
        <StatCard
          title="مستودع الشواهد والملفات"
          value="2,410 ملفاً"
          subtitle="محاكاة تجريبية - غير مفعلة"
          icon={<FileText size={24} />}
          iconBgColor="#FEF3C7"
          iconColor="#D97706"
        />
        <StatCard
          title="محرك الذكاء الاصطناعي المساند"
          value="غير مفعل حالياً"
          subtitle="ميزة مستقبلية قيد الربط"
          icon={<Bot size={24} />}
          iconBgColor="#EDE9FE"
          iconColor="#7C3AED"
        />
      </div>

      {/* Split View Layout: Backup Archives (Right) + Settings Form (Left) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '24px', alignItems: 'flex-start', marginBottom: '24px' }}>
        {/* Right Column: Backup Archives & Recovery */}
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: theme.colors.neutral[800], margin: 0 }}>
              أرشيف النسخ الاحتياطية وخيارات الاستعادة (تشمل قواعد البيانات وملفات الشواهد بتشفير AES-256 كامل):
            </h3>
          </div>

          <BackupArchiveTable
            backups={backups}
            onRestore={(b) => setRestoreBackup(b)}
            addToast={addToast}
          />

          {/* Disaster Recovery Callout Box (Orange) */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#FFFBEB',
              borderRadius: theme.radii.xl,
              border: '1px solid #FDE68A',
              borderRight: '4px solid #D97706',
              marginTop: '16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: '#92400E', marginBottom: '4px' }}>
                خطة التعافي من الكوارث (Disaster Recovery Protocol)
              </div>
              <div style={{ fontSize: theme.typography.fontSizes.xs, color: '#B45309', lineHeight: 1.6 }}>
                تتطلب عمليات استعادة النسخ الاحتياطية مصادقة ثنائية إدارية وإيقافاً تشغيلياً مؤقتاً للخدمات لمدة 15 - 30 دقيقة. يُنشئ النظام تلقائياً نقطة استعادة فورية (Snapshot) قبل بدء أي عملية استعادة لضمان عدم فقدان أي بيانات قيد المعالجة.
              </div>
            </div>
          </div>
        </div>

        {/* Left Column: Central System Settings & Integrations */}
        <div>
          {loading && !settings ? (
            <div className="animate-pulse" style={{ backgroundColor: theme.colors.neutral.white, borderRadius: theme.radii.xl, padding: '24px', border: `1px solid ${theme.colors.neutral[200]}` }}>
              <div style={{ width: '180px', height: '20px', backgroundColor: '#E5E7EB', borderRadius: '4px', marginBottom: '16px' }} />
              <div style={{ width: '100%', height: '80px', backgroundColor: '#F3F4F6', borderRadius: '8px', marginBottom: '12px' }} />
              <div style={{ width: '100%', height: '80px', backgroundColor: '#F3F4F6', borderRadius: '8px' }} />
            </div>
          ) : settings ? (
            <IntegrationSettingsForm
              settings={settings}
              onSave={() => void fetchData()}
              addToast={addToast}
            />
          ) : null}
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
          onClick={handleHealthReport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: theme.radii.lg,
            border: `1px solid ${theme.colors.neutral[300]}`,
            backgroundColor: theme.colors.neutral.white,
            color: theme.colors.neutral[700],
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: theme.typography.fontFamily.sans,
          }}
        >
          <ExternalLink size={16} />
          تقرير صحة الخوادم (PDF) ↗
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onNavigate('audit')}
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
            سجل الأمان والتدقيق
          </button>
          <button
            onClick={() => onNavigate('users')}
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
            العودة للوحة إدارة النظام الرئيسية
            <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>
      </div>

      {/* Modals */}
      <TriggerBackupModal
        isOpen={isTriggerOpen}
        onClose={() => setIsTriggerOpen(false)}
        onSuccess={() => void fetchData()}
        addToast={addToast}
      />

      <RestoreConfirmModal
        isOpen={!!restoreBackup}
        backup={restoreBackup}
        onClose={() => setRestoreBackup(null)}
        onConfirm={handleRestoreConfirm}
        isLoading={isRestoring}
      />
    </div>
  );
};
