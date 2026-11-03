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
