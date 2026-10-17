/**
 * أنواع نماذج إدارة النظام (System Admin Models & DTOs)
 */

export interface SchoolItem {
  schoolId: number;
  schoolName: string;
  educationalStage: string;
  identificationData: string | null;
  educationalDistrict: string;
  governorate: string;
  status: 'Active' | 'Inactive';
}

export interface UserItem {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  userType: 'school' | 'ministry' | 'system';
  status: 'Active' | 'Disabled';
  schoolId: number | null;
  ministryId: number | null;
  school: {
    schoolId: number;
    schoolName: string;
    status: string;
  } | null;
  ministry: {
    ministryId: number;
    ministryName: string;
  } | null;
  roles: Array<{
    roleId: number;
    roleName: string;
    description: string;
  }>;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminMeta {
  roles: Array<{
    roleId: number;
    roleName: string;
    description: string;
  }>;
  schools: Array<{
    schoolId: number;
    schoolName: string;
  }>;
  ministries: Array<{
    ministryId: number;
    ministryName: string;
  }>;
}
