/**
 * useAdminBackup.ts
 * React Hook managing Backup archives and System Integration settings
 */

import { useState, useEffect, useCallback } from 'react';
import { backupApi } from '../api/backupApi';
import type { BackupRecord, SystemSettings } from '../types/admin.types';

export function useAdminBackup() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [backupsRes, settingsRes] = await Promise.all([
        backupApi.getBackups(),
        backupApi.getSystemSettings(),
      ]);
      if (backupsRes.data) setBackups(backupsRes.data);
      if (settingsRes.data) setSettings(settingsRes.data);
    } catch (err: any) {
      setError(err?.message || 'فشل في تحميل بيانات النسخ الاحتياطية وإعدادات النظام');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const triggerBackup = useCallback(async (backupType: string): Promise<BackupRecord> => {
    const res = await backupApi.triggerBackup(backupType);
    if (!res.data) {
      throw new Error(res.message || 'فشل تشغيل النسخ الاحتياطي');
    }
    const newRecord = res.data;
    setBackups((prev) => [newRecord, ...prev]);
    return newRecord;
  }, []);

  const verifyBackup = useCallback(async (backupId: number): Promise<boolean> => {
    const res = await backupApi.verifyBackup(backupId);
    return Boolean(res.data?.verified);
  }, []);

  const saveSettings = useCallback(async (newSettings: SystemSettings): Promise<SystemSettings> => {
    const res = await backupApi.saveSystemSettings(newSettings);
    if (!res.data) {
      throw new Error(res.message || 'فشل حفظ الإعدادات');
    }
    const saved = res.data;
    setSettings(saved);
    return saved;
  }, []);

  const toggleMaintenance = useCallback(async (): Promise<void> => {
    const res = await backupApi.toggleMaintenanceMode();
    if (res.data && settings) {
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              maintenanceMode: res.data!,
            }
          : null
      );
    }
  }, [settings]);

  return {
    backups,
    settings,
    loading,
    error,
    fetchData,
    triggerBackup,
    verifyBackup,
    saveSettings,
    toggleMaintenance,
  };
}
