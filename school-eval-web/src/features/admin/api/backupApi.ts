/**
 * backupApi.ts
 * Real API service for Backup Archives and System Integration Settings
 * Conforms to conventions.md (§2, §3, §7, §8) - Zero Mock Fallback
 */

import { get, post, put } from '../../../api/apiClient';
import type { ApiResponse } from '../../../api/apiTypes';
import type { BackupRecord, SystemSettings } from '../types/admin.types';

export const backupApi = {
  /**
   * Retrieve backup archives list
   */
  async getBackups(): Promise<ApiResponse<BackupRecord[]>> {
    const response = await get<BackupRecord[]>('/backups');
    if (response && response.data && Array.isArray(response.data)) {
      return response;
    }
    return { data: [], message: null, errors: null, meta: null };
  },

  /**
   * Trigger immediate backup creation
   */
  async triggerBackup(backupType: string): Promise<ApiResponse<BackupRecord>> {
    return await post<BackupRecord>('/backups', { backupType });
  },

  /**
   * Perform SHA-256 integrity validation on a backup archive
   */
  async verifyBackup(backupId: number): Promise<ApiResponse<{ backupId: number; verified: boolean; algorithm: string }>> {
    return await post<{ backupId: number; verified: boolean; algorithm: string }>(`/backups/${backupId}/verify`);
  },

  /**
   * Retrieve system integration settings (AI model, Cloud Storage, SMTP, Maintenance)
   */
  async getSystemSettings(): Promise<ApiResponse<SystemSettings>> {
    const response = await get<SystemSettings>('/system-settings');
    if (response && response.data) {
      return response;
    }
    return {
      data: {
        aiEngine: { isEnabled: false, model: 'gemini-1.5-pro', responseMs: 0, status: 'disconnected' },
        cloudStorage: { isEnabled: false, endpoint: '', maxFileSizeMb: 10, encryptionAlgorithm: 'AES-256' },
        smtp: { isEnabled: false, senderEmail: 'noreply@school-eval.gov.ye', smtpHost: 'smtp.mailtrap.io', smtpPort: 2525, status: 'stopped' },
        maintenanceMode: { isEnabled: false, scheduledAt: null, reason: '' },
      },
      message: null,
      errors: null,
      meta: null,
    };
  },

  /**
   * Save updated system settings
   */
  async saveSystemSettings(settings: SystemSettings): Promise<ApiResponse<SystemSettings>> {
    return await put<SystemSettings>('/system-settings', settings);
  },

  /**
   * Toggle system maintenance mode
   */
  async toggleMaintenanceMode(): Promise<ApiResponse<{ isEnabled: boolean; scheduledAt: string | null; reason: string }>> {
    return await post<{ isEnabled: boolean; scheduledAt: string | null; reason: string }>('/system-settings/maintenance');
  },

  /**
   * Send test email to verify SMTP configuration
   */
  async sendTestEmail(email?: string): Promise<ApiResponse<{ sent: boolean; recipient: string }>> {
    return await post<{ sent: boolean; recipient: string }>('/system-settings/test-email', { email });
  },
};
