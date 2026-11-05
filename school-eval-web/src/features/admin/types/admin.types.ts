/**
 * admin.types.ts
 * TypeScript type definitions for the System Administrator module (مسؤول النظام)
 */

// Unified API Response Envelope (§3)
export interface ApiResponse<T> {
  data: T | null;
  message: string | null;
  errors: Record<string, string[]> | null;
  meta: {
    page?: number;
    perPage?: number;
    total?: number;
    lastPage?: number;
  } | null;
}

// Domain Enums (§5)
export type UserType = 'school' | 'ministry' | 'system';
export type SchoolStatus = 'Active' | 'Inactive';
export type AccountStatus = 'Active' | 'Disabled';
export type AuditSeverity = 'normal' | 'sensitive' | 'breach';
export type BackupType = 'full' | 'db_only' | 'incremental';
export type BackupStatus = 'completed' | 'in_progress' | 'failed';
export type SchoolType = 'government' | 'private';
export type AdminScreen = 'dashboard' | 'users' | 'schools' | 'audit' | 'backup';

// Role
export interface Role {
  roleId: number;
  roleName: string;
  roleNameAr?: string;
  roleCode: string;
  description: string;
  userType: UserType;
}

// Directorate
export interface Directorate {
  directorateId: number;
  directorateName: string;
  governorate: string;
  schoolCount: number;
  isActive: boolean;
  createdAt: string;
}

// School
export interface School {
  schoolId: number;
  schoolCode: string;
  schoolName: string;
  schoolType: SchoolType;
  educationalStage: string;
  directorateId: number;
  directorate: string;
  educationalDistrict?: string;
  governorate: string;
  status: SchoolStatus;
  evaluatorUserId: number | null;
  evaluatorName: string | null;
  evaluatorEmail: string | null;
  isLinked: boolean;
  principal?: {
    userId: number;
    fullName: string;
    email: string;
    phone?: string | null;
  } | null;
  evaluators?: {
    userId: number;
    fullName: string;
    email: string;
    phone?: string | null;
  }[];
  createdAt: string;
  updatedAt: string;
}

// User
export interface User {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  userType: UserType;
  status: AccountStatus;
  roleId: number;
  roleName: string;
  roleCode: string;
  schoolId: number | null;
  schoolName: string | null;
  schoolCode: string | null;
  directorateId: number | null;
  directorate: string | null;
  lastActivity: string;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
}

// Audit Log Entry
export interface AuditLogEntry {
  logId: number;
  timestamp: string;
  actorUserId: number;
  actorName: string;
  actorRole: string;
  actorRoleCode: string;
  eventType: string;
  eventCategory: AuditSeverity;
  description: string;
  digitalHash: string;
  ipAddress: string;
  location: string;
  deviceInfo: string;
  securityStatus: 'verified' | 'blocked';
}

// Blocked IP
export interface BlockedIp {
  ipId: number;
  ipAddress: string;
  reason: string;
  blockedAt: string;
  attemptCount: number;
  location: string;
}

// Backup Record
export interface BackupRecord {
  backupId: number;
  fileName: string;
  backupType: BackupType;
  sizeBytes: number;
  status: BackupStatus;
  sha256Hash: string;
  createdAt: string;
  completedAt: string | null;
}

// System Settings
export interface AiEngineSettings {
  isEnabled: boolean;
  model: string;
  responseMs: number;
  status: 'connected' | 'disconnected' | 'error';
}

export interface CloudStorageSettings {
  isEnabled: boolean;
  endpoint: string;
  maxFileSizeMb: number;
  encryptionAlgorithm: string;
}

export interface SmtpSettings {
  isEnabled: boolean;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  status: 'running' | 'error' | 'stopped';
}

export interface MaintenanceModeSettings {
  isEnabled: boolean;
  scheduledAt: string | null;
  reason: string;
}

export interface SystemSettings {
  aiEngine: AiEngineSettings;
  cloudStorage: CloudStorageSettings;
  smtp: SmtpSettings;
  maintenanceMode: MaintenanceModeSettings;
}

// Form DTOs
export interface CreateUserDto {
  fullName: string;
  username: string;
  email: string;
  password: string;
  userType: UserType;
  roleId: number;
  schoolId: number | null;
  directorateId: number | null;
  status: AccountStatus;
}

export interface EditUserDto {
  fullName: string;
  email: string;
  userType: UserType;
  roleId: number;
  schoolId: number | null;
  directorateId: number | null;
  status: AccountStatus;
}

export interface RegisterSchoolDto {
  schoolName: string;
  schoolCode: string;
  schoolType: SchoolType;
  educationalStage: string;
  directorateId: number;
  directorateName?: string;
  educationalDistrict?: string;
  governorate: string;
}

export interface AddDirectorateDto {
  directorateName: string;
  governorate: string;
}

// Toast UI State
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}
