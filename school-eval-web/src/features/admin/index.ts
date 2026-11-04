/**
 * index.ts
 * Central public API export for the System Administrator (مسؤول النظام) module
 */

// Master Layout & Screens
export { AdminLayout } from './components/layout/AdminLayout';
export { AdminSidebar } from './components/layout/AdminSidebar';
export { AdminTopBar } from './components/layout/AdminTopBar';

// Screens
export { AdminDashboard } from './components/dashboard/AdminDashboard';
export { UsersManagement } from './components/users/UsersManagement';
export { SchoolsDirectory } from './components/schools/SchoolsDirectory';
export { SecurityAudit } from './components/audit/SecurityAudit';
export { BackupAndSettings } from './components/backup/BackupAndSettings';

// Common Components
export { StatCard } from './components/common/StatCard';
export { StatusBadge } from './components/common/StatusBadge';
export { ToastNotification } from './components/common/ToastNotification';
export { useToast } from './components/common/useToast';
export { ConfirmationDialog } from './components/common/ConfirmationDialog';

// Live API Services (§2 & §3)
export { usersApi } from './api/usersApi';
export { schoolsApi } from './api/schoolsApi';
export { auditApi } from './api/auditApi';
export { backupApi } from './api/backupApi';
export { dashboardApi } from './api/dashboardApi';

// Live React Hooks
export { useAdminUsers } from './hooks/useAdminUsers';
export { useAdminSchools } from './hooks/useAdminSchools';
export { useAdminAudit } from './hooks/useAdminAudit';
export { useAdminBackup } from './hooks/useAdminBackup';
export { useAdminDashboard } from './hooks/useAdminDashboard';

// Types & DTOs
export * from './types/admin.types';

// Mock Services & Data
export {
  mockAdminService,
  MOCK_ROLES,
  MOCK_DIRECTORATES,
  MOCK_SCHOOLS,
  MOCK_USERS,
  MOCK_AUDIT_LOGS,
  MOCK_BLOCKED_IPS,
  MOCK_BACKUPS,
  MOCK_SYSTEM_SETTINGS,
} from './services/mockAdminData';

// Utilities
export { downloadCsv, downloadXlsx, downloadEncryptedLog, formatNumber } from './utils/exportUtils';
export { formatArabicDate, formatArabicTime, formatArabicDateTime, formatRelativeArabic, formatFileSize } from './utils/dateUtils';
