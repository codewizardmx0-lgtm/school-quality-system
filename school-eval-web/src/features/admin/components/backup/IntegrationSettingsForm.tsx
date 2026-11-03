import React, { useState } from 'react';
import { Bot, HardDrive, Mail, Power, Check, Send } from 'lucide-react';
import { theme } from '../../theme';
import { mockAdminService } from '../../services/mockAdminData';
import type { SystemSettings } from '../../types/admin.types';

interface IntegrationSettingsFormProps {
  settings: SystemSettings;
  onSave: (newSettings: SystemSettings) => void;
  addToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const IntegrationSettingsForm: React.FC<IntegrationSettingsFormProps> = ({
  settings,
  onSave,
  addToast,
}) => {
  const [form, setForm] = useState<SystemSettings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingMail, setIsSendingMail] = useState(false);

  const handleToggle = (
    section: keyof SystemSettings,
    field: string,
    value: boolean | string | number
  ) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as unknown as Record<string, unknown>),
        [field]: value,
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await mockAdminService.saveSystemSettings(form);
      if (res.data) {
        onSave(res.data);
        addToast('success', 'تم حفظ وتطبيق إعدادات النظام المركزية بنجاح ✓');
      }
    } catch {
      addToast('error', 'فشل في حفظ إعدادات النظام');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setIsSendingMail(true);
    try {
      await mockAdminService.sendTestEmail();
      addToast('info', `تم إرسال بريد اختباري إلى (${form.smtp.senderEmail}) بنجاح`);
    } catch {
      addToast('error', 'فشل إرسال البريد الاختباري');
    } finally {
      setIsSendingMail(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.radii.xl,
    padding: '20px',
    border: `1px solid ${theme.colors.neutral[200]}`,
    boxShadow: theme.shadows.sm,
    marginBottom: '16px',
  };

  const toggleSwitch = (checked: boolean, onChange: (val: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        backgroundColor: checked ? '#10B981' : '#CBD5E1',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background-color 0.2s ease',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          right: checked ? '22px' : '2px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'right 0.2s ease',
        }}
      />
    </button>
  );

  return (
    <form onSubmit={handleSave}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: theme.colors.neutral[800], margin: 0 }}>
          تهيئة خدمات وتكاملات النظام - إعدادات الذكاء الاصطناعي والتخزين والبريد:
        </h3>
      </div>

      {/* 1. AI Engine */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
              <Bot size={20} />
            </div>
            <div>
              <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: theme.colors.neutral[900] }}>
                محرك الذكاء الاصطناعي المساند (08-S)
              </div>
              <div style={{ fontSize: '0.75rem', color: theme.colors.neutral[400] }}>
                تحليل الشواهد والمساعدة في صياغة تقارير التقييم
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: form.aiEngine.isEnabled ? '#DCFCE7' : '#F1F5F9',
                color: form.aiEngine.isEnabled ? '#15803D' : '#64748B',
              }}
            >
              {form.aiEngine.isEnabled ? 'متصل' : 'معطل'}
            </span>
            {toggleSwitch(form.aiEngine.isEnabled, (val) => handleToggle('aiEngine', 'isEnabled', val))}
          </div>
        </div>

        {form.aiEngine.isEnabled && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${theme.colors.neutral[100]}` }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.colors.neutral[600], marginBottom: '4px', display: 'block' }}>
                النموذج النشط (Active Model):
              </label>
              <select
                value={form.aiEngine.model}
                onChange={(e) => handleToggle('aiEngine', 'model', e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: theme.radii.md,
                  border: `1px solid ${theme.colors.neutral[200]}`,
                  fontSize: '0.8rem',
                  fontFamily: theme.typography.fontFamily.sans,
                }}
              >
                <option value="Artaqa-Assist v2.4">Artaqa-Assist v2.4 (الأحدث والأسرع)</option>
                <option value="Artaqa-Assist v2.1">Artaqa-Assist v2.1 (مستقر)</option>
                <option value="Claude-3.5-Sonnet">Claude-3.5-Sonnet (تحليل شواهد عميق)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.colors.neutral[600], marginBottom: '4px', display: 'block' }}>
                زمن الاستجابة المستهدف:
              </label>
              <input
                type="text"
                value={`${form.aiEngine.responseMs} ms (معدل قياسي)`}
                readOnly
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: theme.radii.md,
                  border: `1px solid ${theme.colors.neutral[200]}`,
                  fontSize: '0.8rem',
                  backgroundColor: '#F8FAFC',
                  color: '#059669',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Cloud Storage */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#CFFAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891B2' }}>
              <HardDrive size={20} />
            </div>
            <div>
              <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: theme.colors.neutral[900] }}>
                مستودع وثائق الشواهد (Cloud Storage)
              </div>
              <div style={{ fontSize: '0.75rem', color: theme.colors.neutral[400] }}>
                تخزين سحابي متوافق مع S3 بتشفير AES-256
              </div>
            </div>
          </div>
          {toggleSwitch(form.cloudStorage.isEnabled, (val) => handleToggle('cloudStorage', 'isEnabled', val))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${theme.colors.neutral[100]}` }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.colors.neutral[600], marginBottom: '4px', display: 'block' }}>
              عنوان نقطة التخزين (Endpoint):
            </label>
            <input
              value={form.cloudStorage.endpoint}
              onChange={(e) => handleToggle('cloudStorage', 'endpoint', e.target.value)}
              dir="ltr"
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: theme.radii.md,
                border: `1px solid ${theme.colors.neutral[200]}`,
                fontSize: '0.8rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.colors.neutral[600], marginBottom: '4px', display: 'block' }}>
              أقصى حجم لملف الشاهد (MB):
            </label>
            <input
              type="number"
              value={form.cloudStorage.maxFileSizeMb}
              onChange={(e) => handleToggle('cloudStorage', 'maxFileSizeMb', Number(e.target.value))}
              dir="ltr"
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: theme.radii.md,
                border: `1px solid ${theme.colors.neutral[200]}`,
                fontSize: '0.8rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. SMTP Server */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
              <Mail size={20} />
            </div>
            <div>
              <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: theme.colors.neutral[900] }}>
                خادم الإشعارات والبريد (SMTP Server)
              </div>
              <div style={{ fontSize: '0.75rem', color: theme.colors.neutral[400] }}>
                إرسال بيانات الدخول، تنبيهات المهام، وإشعارات الدورات
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#DCFCE7', color: '#15803D' }}>
            يعمل
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${theme.colors.neutral[100]}` }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.colors.neutral[600], marginBottom: '4px', display: 'block' }}>
              البريد الرسمي المرسل (Sender Email):
            </label>
            <input
              type="email"
              value={form.smtp.senderEmail}
              onChange={(e) => handleToggle('smtp', 'senderEmail', e.target.value)}
              dir="ltr"
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: theme.radii.md,
                border: `1px solid ${theme.colors.neutral[200]}`,
                fontSize: '0.8rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={isSendingMail}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: theme.radii.md,
                border: `1px solid ${theme.colors.neutral[300]}`,
                backgroundColor: theme.colors.neutral[50],
                color: theme.colors.neutral[700],
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: isSendingMail ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                fontFamily: theme.typography.fontFamily.sans,
              }}
            >
              <Send size={12} />
              {isSendingMail ? 'جاري الإرسال...' : 'إرسال بريد اختباري'}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Maintenance Mode */}
      <div style={{ ...cardStyle, border: form.maintenanceMode.isEnabled ? '1px solid #FECACA' : `1px solid ${theme.colors.neutral[200]}`, backgroundColor: form.maintenanceMode.isEnabled ? '#FFF5F5' : theme.colors.neutral.white }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: form.maintenanceMode.isEnabled ? '#FEE2E2' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: form.maintenanceMode.isEnabled ? '#DC2626' : '#64748B' }}>
              <Power size={20} />
            </div>
            <div>
              <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: form.maintenanceMode.isEnabled ? '#991B1B' : theme.colors.neutral[900] }}>
                وضع الصيانة المجدولة (Maintenance Mode)
              </div>
              <div style={{ fontSize: '0.75rem', color: theme.colors.neutral[400] }}>
                حظر وصول مسؤولي المدارس والمشرفين أثناء التحديثات
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: form.maintenanceMode.isEnabled ? '#DC2626' : '#64748B' }}>
              {form.maintenanceMode.isEnabled ? 'الوضع نشط (مغلق)' : 'معطل (متاح)'}
            </span>
            {toggleSwitch(form.maintenanceMode.isEnabled, (val) => handleToggle('maintenanceMode', 'isEnabled', val))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        type="submit"
        disabled={isSaving}
        style={{
          width: '100%',
          padding: '12px 24px',
          borderRadius: theme.radii.lg,
          border: 'none',
          background: 'linear-gradient(90deg, #059669, #10B981)',
          color: '#fff',
          fontSize: theme.typography.fontSizes.sm,
          fontWeight: 700,
          cursor: isSaving ? 'not-allowed' : 'pointer',
          opacity: isSaving ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          fontFamily: theme.typography.fontFamily.sans,
          marginTop: '8px',
        }}
      >
        <Check size={18} />
        {isSaving ? 'جاري الحفظ والتطبيق...' : 'حفظ وتطبيق إعدادات النظام المركزية ✓'}
      </button>
    </form>
  );
};
