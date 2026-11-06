/**
 * roleUtils.ts
 * Utility functions for Arabic role name formatting and badges
 */

export const ROLE_ARABIC_NAMES: Record<string, string> = {
  admin: 'مدير النظام المركزي',
  school_evaluator: 'مقيّم جودة بالمدرسة',
  school_principal: 'مدير مدرسة / مراجع داخلي',
  ministry_supervisor: 'مشرف ومراجع وزاري',
  ministry_standards_manager: 'مسؤول المعايير بالوزارة',
  // Legacy / alternative aliases
  directorate_supervisor: 'مشرف مديرية',
  quality_supervisor: 'مشرف جودة',
};

/**
 * Returns clean Arabic role name.
 * Priority:
 * 1. Arabic prefix from backend description (e.g. 'مدير النظام' from 'مدير النظام - إدارة المنصة...')
 * 2. Standard Arabic dictionary lookup
 * 3. Fallback to clean roleName
 */
export function formatRoleNameAr(roleName?: string, description?: string): string {
  if (!roleName) return 'غير محدد';

  if (description) {
    const parts = description.split(/[-–—:]/);
    const candidate = parts[0]?.trim();
    if (candidate && /[\u0600-\u06FF]/.test(candidate) && candidate.length <= 40) {
      return candidate;
    }
  }

  return ROLE_ARABIC_NAMES[roleName] || roleName;
}

/**
 * Badge style variant according to role level
 */
export function getRoleBadgeVariant(roleName?: string, userType?: string): 'info' | 'success' | 'warning' | 'neutral' {
  if (roleName === 'admin' || userType === 'system') return 'warning';
  if (roleName === 'ministry_supervisor' || roleName === 'ministry_standards_manager' || userType === 'ministry') return 'info';
  if (roleName === 'school_principal') return 'neutral';
  return 'success';
}
