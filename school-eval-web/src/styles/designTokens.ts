/**
 * Design Tokens & Theme Constants - منصة ارتقاء
 * Unified design token system for school-eval-web.
 * Enforces visual consistency across evaluator screens and admin modules.
 */

export const designTokens = {
  colors: {
    // Primary Brand - الزمردي التعليمي المعتمد
    primary: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      300: '#6EE7B7',
      400: '#34D399',
      500: '#10B981',
      600: '#059669', // Primary Button & Active state
      700: '#047857', // Primary Hover
      800: '#065F46', // Primary Dark text
      900: '#064E3B',
      950: '#022C22',
    },

    // Neutral & Surfaces - الدرجات المحايدة
    neutral: {
      white: '#FFFFFF',
      50: '#F8FAFC',  // Page & card surfaces
      100: '#F1F5F9', // Subtle containers & tags
      200: '#E2E8F0', // Default borders
      300: '#CBD5E1', // Active input / card borders
      400: '#94A3B8', // Muted text & placeholders
      500: '#64748B', // Secondary text & inactive icons
      600: '#475569', // Field labels & descriptions
      700: '#334155', // Emphasized body text
      800: '#1E293B', // Subheadings & primary text
      900: '#0F172A', // Main headings & bold titles
    },

    // Semantic Status - مصفوفة الحالات الدلالية الأربع المعتمدة
    status: {
      // المستوى 3: متحقق كلياً / نجاح
      success: {
        text: '#065F46',
        primary: '#059669',
        bg: '#ECFDF5',
        border: '#A7F3D0',
        badgeBg: '#DCFCE7',
        badgeText: '#166534',
        label: 'المستوى 3: متحقق',
      },
      // المستوى 2: متحقق بدرجة متوسطة / معلومات
      info: {
        text: '#1E40AF',
        primary: '#2563EB',
        bg: '#EFF6FF',
        border: '#BFDBFE',
        badgeBg: '#DBEAFE',
        badgeText: '#1E40AF',
        label: 'المستوى 2: متحقق بدرجة متوسطة',
      },
      // المستوى 1: متحقق بدرجة ضعيفة / تحذير
      warning: {
        text: '#92400E',
        primary: '#D97706',
        bg: '#FFFBEB',
        border: '#FDE68A',
        badgeBg: '#FEF3C7',
        badgeText: '#92400E',
        label: 'المستوى 1: متحقق بدرجة ضعيفة',
      },
      // المستوى 0: غير متوفر / حرج / خطر
      danger: {
        text: '#991B1B',
        primary: '#DC2626',
        bg: '#FEF2F2',
        border: '#FECACA',
        badgeBg: '#FEE2E2',
        badgeText: '#991B1B',
        label: 'المستوى 0: غير متوفر',
      },
      // غير مرصود / محايد
      unscored: {
        text: '#64748B',
        primary: '#94A3B8',
        bg: '#F1F5F9',
        border: '#E2E8F0',
        badgeBg: '#F1F5F9',
        badgeText: '#64748B',
        label: 'غير مرصود',
      },
    },

    // File Types Branding - هوية أيقونات الملفات في مركز التقارير والمستودع
    fileTypes: {
      pdf: {
        color: '#DC2626',
        bg: '#FEF2F2',
        border: '#FECACA',
        label: 'PDF',
      },
      excel: {
        color: '#059669',
        bg: '#ECFDF5',
        border: '#A7F3D0',
        label: 'Excel',
      },
      zip: {
        color: '#D97706',
        bg: '#FFFBEB',
        border: '#FDE68A',
        label: 'ZIP',
      },
      word: {
        color: '#2563EB',
        bg: '#EFF6FF',
        border: '#BFDBFE',
        label: 'Word',
      },
      image: {
        color: '#0D9488',
        bg: '#F0FDFA',
        border: '#99F6E4',
        label: 'صورة',
      },
    },
  },

  // Button Presets
  buttons: {
    primary: {
      backgroundColor: '#059669',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 18px',
      fontSize: '13px',
      fontWeight: 700,
      cursor: 'pointer',
      boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
      transition: 'all 0.15s ease-in-out',
    },
    secondary: {
      backgroundColor: '#F8FAFC',
      color: '#334155',
      border: '1px solid #CBD5E1',
      borderRadius: '8px',
      padding: '9px 16px',
      fontSize: '12.5px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.15s ease-in-out',
    },
    dangerSoft: {
      backgroundColor: '#FEF2F2',
      color: '#DC2626',
      border: '1px solid #FECACA',
      borderRadius: '8px',
      padding: '8px 14px',
      fontSize: '12px',
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.15s ease-in-out',
    },
    iconAction: {
      width: '32px',
      height: '32px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px',
      backgroundColor: '#F8FAFC',
      border: '1px solid #E2E8F0',
      color: '#475569',
      cursor: 'pointer',
      transition: 'all 0.15s ease-in-out',
    },
  },

  // Layout Spacing & Borders
  radii: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '14px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    card: '0 1px 3px rgba(0, 0, 0, 0.04)',
    elevated: '0 4px 14px rgba(0, 0, 0, 0.08)',
    primaryGlow: '0 4px 14px rgba(5, 150, 105, 0.25)',
  },
} as const;

/**
 * Helper to get unified status colors by score level (0 to 3)
 */
export function getScoreLevelColor(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return designTokens.colors.status.unscored;
  }
  switch (Number(score)) {
    case 3:
      return designTokens.colors.status.success;
    case 2:
      return designTokens.colors.status.info;
    case 1:
      return designTokens.colors.status.warning;
    case 0:
    default:
      return designTokens.colors.status.danger;
  }
}
