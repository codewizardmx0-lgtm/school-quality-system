import React, { useState } from 'react';
import { Download, ShieldCheck, RotateCcw } from 'lucide-react';
import { theme } from '../../theme';
import { StatusBadge } from '../common/StatusBadge';
import { backupApi } from '../../api/backupApi';
import { formatRelativeArabic, formatFileSize } from '../../utils/dateUtils';
import type { BackupRecord } from '../../types/admin.types';

interface BackupArchiveTableProps {
  backups: BackupRecord[];
  onRestore: (backup: BackupRecord) => void;
  addToast: (type: 'success' | 'info' | 'warning', msg: string) => void;
}

export const BackupArchiveTable: React.FC<BackupArchiveTableProps> = ({
  backups,
  onRestore,
  addToast,
}) => {
  const [testingHashId, setTestingHashId] = useState<number | null>(null);

  const handleDownload = (backup: BackupRecord) => {
    // Simulate real encrypted archive download
    const dummyContent = `ARTEQA_ENCRYPTED_BACKUP_CONTAINER\nFILE: ${backup.fileName}\nSHA256: ${backup.sha256Hash}\nTIMESTAMP: ${backup.createdAt}\nSIZE: ${backup.sizeBytes}`;
    const blob = new Blob([dummyContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = backup.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('success', `بدأ تنزيل ملف النسخة الاحتياطية (${backup.fileName})`);
  };

  const handleTestHash = async (backup: BackupRecord) => {
    setTestingHashId(backup.backupId);
    try {
      const res = await backupApi.verifyBackup(backup.backupId);
      if (backup.status === 'failed' || !res.data?.verified) {
        addToast('warning', `فشل اختبار سلامة الملف: البصمة الرقمية لا تطابق الأصل للملف ${backup.fileName}`);
      } else {
        addToast('info', `تم فحص النزاهة بنجاح: البصمة الرقمية SHA-256 متطابقة بنسبة 100%`);
      }
    } catch {
      addToast('warning', `تعذر التحقق من البصمة الرقمية للملف`);
    } finally {
      setTestingHashId(null);
    }
  };

  return (
    <div
      style={{
        backgroundColor: theme.colors.neutral.white,
        borderRadius: theme.radii.xl,
        border: `1px solid ${theme.colors.neutral[200]}`,
        overflow: 'hidden',
        boxShadow: theme.shadows.sm,
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${theme.colors.neutral[200]}`,
          backgroundColor: theme.colors.neutral[50],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: theme.colors.neutral[800] }}>
          أرشيف النسخ الاحتياطية المتاحة ({backups.length} ملفات)
        </span>
        <span style={{ fontSize: '0.75rem', color: theme.colors.neutral[400] }}>
          تشفير AES-256 متزامن مع التخزين السحابي
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ backgroundColor: theme.colors.neutral[50], borderBottom: `1px solid ${theme.colors.neutral[200]}` }}>
              <th style={{ padding: '12px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                اسم الملف والتاريخ
              </th>
              <th style={{ padding: '12px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                النوع
              </th>
              <th style={{ padding: '12px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                الحجم
              </th>
              <th style={{ padding: '12px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                الحالة
              </th>
              <th style={{ padding: '12px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600], textAlign: 'center' }}>
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody>
            {backups.map((b, idx) => (
              <tr
                key={b.backupId}
                style={{
                  borderBottom: idx < backups.length - 1 ? `1px solid ${theme.colors.neutral[100]}` : 'none',
                  backgroundColor: idx % 2 === 0 ? theme.colors.neutral.white : '#FAFAFA',
                }}
              >
                {/* Filename & Date */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.colors.neutral[900], fontFamily: 'monospace' }}>
                    {b.fileName}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: theme.colors.neutral[400], marginTop: '2px' }}>
                    {formatRelativeArabic(b.createdAt)}
                  </div>
                </td>

                {/* Type */}
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: b.backupType === 'full' ? '#EFF6FF' : b.backupType === 'db_only' ? '#F5F3FF' : '#FEF3C7',
                      color: b.backupType === 'full' ? '#1D4ED8' : b.backupType === 'db_only' ? '#6D28D9' : '#B45309',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}
                  >
                    {b.backupType === 'full' ? 'شاملة' : b.backupType === 'db_only' ? 'قاعدة بيانات' : 'تفاضلية'}
                  </span>
                </td>

                {/* Size */}
                <td style={{ padding: '12px 16px', fontSize: '0.75rem', color: theme.colors.neutral[700], fontFamily: 'monospace' }}>
                  {formatFileSize(b.sizeBytes)}
                </td>

                {/* Status */}
                <td style={{ padding: '12px 16px' }}>
                  <StatusBadge
                    variant={b.status === 'completed' ? 'completed' : b.status === 'failed' ? 'failed' : 'in_progress'}
                    label={b.status === 'completed' ? 'مكتملة ✓' : b.status === 'failed' ? 'فاشلة ✗' : 'جارية...'}
                    size="sm"
                  />
                </td>

                {/* Actions */}
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {/* Download */}
                    <button
                      onClick={() => handleDownload(b)}
                      title="تنزيل الملف"
                      style={{
                        padding: '5px 8px',
                        borderRadius: theme.radii.md,
                        border: `1px solid ${theme.colors.neutral[200]}`,
                        backgroundColor: theme.colors.neutral.white,
                        color: theme.colors.neutral[700],
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontFamily: theme.typography.fontFamily.sans,
                      }}
                    >
                      <Download size={12} />
                      تنزيل ↓
                    </button>

                    {/* Hash test */}
                    <button
                      onClick={() => handleTestHash(b)}
                      disabled={testingHashId === b.backupId}
                      title="فحص صحة التجزئة (SHA-256)"
                      style={{
                        padding: '5px 8px',
                        borderRadius: theme.radii.md,
                        border: '1px solid #BBF7D0',
                        backgroundColor: '#F0FDF4',
                        color: '#15803D',
                        fontSize: '0.7rem',
                        cursor: testingHashId === b.backupId ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontFamily: theme.typography.fontFamily.sans,
                      }}
                    >
                      <ShieldCheck size={12} />
                      {testingHashId === b.backupId ? 'فحص...' : 'فحص'}
                    </button>

                    {/* Restore */}
                    {b.status === 'completed' && (
                      <button
                        onClick={() => onRestore(b)}
                        title="استعادة هذه النسخة"
                        style={{
                          padding: '5px 8px',
                          borderRadius: theme.radii.md,
                          border: '1px solid #FED7AA',
                          backgroundColor: '#FFF7ED',
                          color: '#C2410C',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontFamily: theme.typography.fontFamily.sans,
                        }}
                      >
                        <RotateCcw size={12} />
                        استعادة
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
