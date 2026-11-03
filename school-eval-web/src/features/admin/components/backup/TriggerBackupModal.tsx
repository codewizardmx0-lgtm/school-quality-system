import React, { useState } from 'react';
import { X, Database } from 'lucide-react';
import { theme } from '../../theme';
import { backupApi } from '../../api/backupApi';
import type { BackupType, BackupRecord } from '../../types/admin.types';

interface TriggerBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBackup: BackupRecord) => void;
  addToast: (type: 'success' | 'error', msg: string) => void;
}

export const TriggerBackupModal: React.FC<TriggerBackupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  addToast,
}) => {
  const [backupType, setBackupType] = useState<BackupType>('full');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');

  const handleClose = () => {
    if (isRunning && progress < 100) return;
    setIsRunning(false);
    setProgress(0);
    setStage('');
    onClose();
  };

  const handleStart = async () => {
    setIsRunning(true);
    setProgress(5);
    setStage('قفل الجداول وبدء لقطة البيانات...');

    const t1 = setTimeout(() => {
      setProgress(35);
      setStage('ضغط وتشفير قاعدة البيانات (AES-256)...');
    }, 500);

    const t2 = setTimeout(() => {
      setProgress(70);
      setStage('أرشفة ملفات الشواهد والوثائق المرتبطة...');
    }, 1000);

    const t3 = setTimeout(() => {
      setProgress(90);
      setStage('توليد البصمة الرقمية للتحقق من النزاهة (SHA-256)...');
    }, 1500);

    try {
      const res = await backupApi.triggerBackup(backupType);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setProgress(100);
      setStage('اكتملت النسخة الاحتياطية بنجاح!');
      if (res.data) {
        addToast('success', `تم إنشاء النسخة الاحتياطية بنجاح: ${res.data.fileName}`);
        onSuccess(res.data);
        setTimeout(() => {
          handleClose();
        }, 800);
      }
    } catch {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      addToast('error', 'فشل في إنشاء النسخة الاحتياطية');
      setIsRunning(false);
    }
  };

  if (!isOpen) return null;

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
        if (e.target === e.currentTarget && (!isRunning || progress === 100)) handleClose();
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          width: '90%',
          maxWidth: '520px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: theme.shadows.xl,
          fontFamily: theme.typography.fontFamily.sans,
          direction: 'rtl',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${theme.colors.neutral[200]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #0B0F19 0%, #1e293b 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34D399',
              }}
            >
              <Database size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: theme.typography.fontSizes.base, fontWeight: 700, color: '#fff', margin: 0 }}>
                إنشاء نسخة احتياطية فورية
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                تشفير كامل AES-256 مع لقطة متزامنة
              </p>
            </div>
          </div>
          {!isRunning && (
            <button onClick={handleClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          )}
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isRunning ? (
            <>
              <div>
                <label style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '8px', display: 'block' }}>
                  اختر نوع النسخة الاحتياطية:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { id: 'full', title: 'نسخة احتياطية شاملة (Full Backup)', desc: 'تشمل قاعدة البيانات العلائقية ومستودع وثائق الشواهد بالكامل (~42 GB)' },
                    { id: 'db_only', title: 'قاعدة البيانات فقط (DB Only)', desc: 'جداول النظام وسجلات المدارس والمستخدمين والاستبيانات (~3.85 GB)' },
                    { id: 'incremental', title: 'نسخة تفاضلية تزايدية (Incremental)', desc: 'تغييرات اليوم فقط منذ آخر نسخة احتياطية ليلية (~500 MB)' },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: theme.radii.lg,
                        border: `1px solid ${backupType === opt.id ? '#10B981' : theme.colors.neutral[200]}`,
                        backgroundColor: backupType === opt.id ? '#ECFDF5' : theme.colors.neutral[50],
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="backupType"
                        value={opt.id}
                        checked={backupType === opt.id}
                        onChange={() => setBackupType(opt.id as BackupType)}
                        style={{ marginTop: '3px', accentColor: '#10B981' }}
                      />
                      <div>
                        <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: theme.colors.neutral[900] }}>
                          {opt.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: theme.colors.neutral[500], marginTop: '2px' }}>
                          {opt.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
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
                  onClick={handleClose}
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
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleStart}
                  style={{
                    padding: '9px 24px',
                    borderRadius: theme.radii.lg,
                    border: 'none',
                    background: 'linear-gradient(90deg, #059669, #10B981)',
                    color: '#fff',
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: theme.typography.fontFamily.sans,
                  }}
                >
                  بدء النسخ الآن
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                <Database size={48} color="#10B981" className="animate-pulse" />
              </div>

              <div style={{ fontSize: theme.typography.fontSizes.base, fontWeight: 700, color: theme.colors.neutral[900], marginBottom: '8px' }}>
                {stage}
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '10px',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: progress === 100 ? '#10B981' : '#059669',
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              <div style={{ fontSize: '0.8rem', color: theme.colors.neutral[500], fontWeight: 600 }}>
                {progress}% مكتمل
              </div>

              <div style={{ fontSize: '0.75rem', color: theme.colors.neutral[400], marginTop: '8px' }}>
                يرجى عدم إغلاق المتصفح أثناء عملية أرشفة وتشفير البيانات
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
