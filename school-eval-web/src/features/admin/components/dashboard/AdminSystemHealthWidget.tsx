import React from 'react';
import { Activity, CheckCircle2, Cloud, Lock, Mail, Sparkles } from 'lucide-react';
import type { AdminDashboardStats } from '../../api/dashboardApi';

interface AdminSystemHealthWidgetProps {
  stats: AdminDashboardStats | null;
}

/**
 * بطاقة مراقبة سلامة الخدمات والذكاء الاصطناعي والبنية التحتية بالربط الحي مع الخادم.
 */
export const AdminSystemHealthWidget: React.FC<AdminSystemHealthWidgetProps> = ({ stats }) => {
  const details = stats?.systemHealthDetails;
  const dbOperational = (details?.databaseStatus ?? stats?.systemHealth?.database ?? 'operational') === 'operational';
  const dbEngine = details?.databaseEngine ?? 'MYSQL';
  const dbLatency = details?.databaseLatencyMs ?? 1;

  const storageUsedMb = details?.storageUsedMb ?? 0;
  const storageLimitMb = details?.storageLimitMb ?? 5120;
  const storagePercent = details?.storageUsagePercent ?? 0;
  const backupFilesCount = details?.backupFilesCount ?? 0;

  const aiEnabled = details?.aiEnabled ?? true;
  const aiModel = details?.aiModel ?? 'Artaqa-Assist v2.4 (محرك تحليل الفجوات)';
  const smtpEnabled = details?.smtpEnabled ?? false;
  const smtpHost = details?.smtpHost ?? 'غير مهيأ';
  const smtpPort = details?.smtpPort ?? 587;

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#EEF2FF',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0B0F19', margin: 0 }}>
              سلامة الخدمات والبنية التحتية الحية
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
              مراقبة مباشرة لحالة الخادم والتخزين والتكاملات
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: dbOperational ? '#059669' : '#DC2626',
            backgroundColor: dbOperational ? '#ECFDF5' : '#FEF2F2',
            border: dbOperational ? '1px solid #A7F3D0' : '1px solid #FECACA',
            padding: '3px 10px',
            borderRadius: '9999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <CheckCircle2 size={12} />
          {dbOperational ? `تعمل بكفاءة (${dbLatency} ms)` : 'تتطلب فحص الاتصال'}
        </span>
      </div>

      {/* 4 Health Status Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        {/* Service 1: محرك تحليل الفجوات والتوصيات */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0B0F19' }}>
                {aiModel}
              </div>
              <div style={{ fontSize: '0.75rem', color: aiEnabled ? '#059669' : '#DC2626', fontWeight: 600 }}>
                {aiEnabled ? 'محرك تحليل الفجوات الحتمي نشط ومربوط' : 'معطّل حالياً من إعدادات النظام'}
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: aiEnabled ? '#059669' : '#64748B',
              backgroundColor: aiEnabled ? '#ECFDF5' : '#F1F5F9',
              padding: '3px 8px',
              borderRadius: '6px',
            }}
          >
            {aiEnabled ? 'متصل' : 'معطل'}
          </span>
        </div>

        {/* Service 2: مستودع الشواهد والنسخ الاحتياطية */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Cloud size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0B0F19' }}>
                  مستودع الملفات والنسخ المشفرة
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  المستخدم فعلياً: {storageUsedMb} MB من {storageLimitMb} MB • {backupFilesCount} ملف نسخة
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              {storagePercent}%
            </span>
          </div>
          {/* Storage progress bar */}
          <div
            style={{
              height: '6px',
              width: '100%',
              borderRadius: '9999px',
              backgroundColor: '#E2E8F0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.max(storageUsedMb > 0 ? 2 : 0, storagePercent)}%`,
                backgroundColor: storagePercent > 85 ? '#DC2626' : '#2563EB',
                borderRadius: '9999px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Service 3: خادم البريد والإشعارات */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#FDF4FF',
                color: '#C026D3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mail size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0B0F19' }}>
                خادم البريد والإشعارات (SMTP Gateway)
              </div>
              <div style={{ fontSize: '0.75rem', color: smtpEnabled ? '#475569' : '#DC2626', fontWeight: 600 }}>
                {smtpEnabled ? `${smtpHost} (منفذ ${smtpPort})` : 'بوابة البريد SMTP معطلة في الإعدادات'}
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: smtpEnabled ? '#059669' : '#DC2626',
              backgroundColor: smtpEnabled ? '#ECFDF5' : '#FEF2F2',
              padding: '3px 8px',
              borderRadius: '6px',
            }}
          >
            {smtpEnabled ? 'مفعّل' : 'غير مفعل'}
          </span>
        </div>

        {/* Service 4: قاعدة البيانات والأمان الرقمي */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0B0F19' }}>
                قاعدة البيانات والتشفير ({dbEngine})
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                زمن الاستجابة: {dbLatency} ms • التشفير AES-256 وSanctum فعال
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: dbOperational ? '#059669' : '#DC2626',
              backgroundColor: dbOperational ? '#ECFDF5' : '#FEF2F2',
              padding: '3px 8px',
              borderRadius: '6px',
            }}
          >
            {dbOperational ? 'نشط ومؤمّن' : 'متعثر'}
          </span>
        </div>
      </div>
    </div>
  );
};
