/**
 * ملف الهوية البصرية ونظام التصميم المعتمد (Design System & Theme)
 * 
 * المرجعية: شاشة تسجيل الدخول الموحد من docs/الواجهات ووثائق التصميم المعماري (الفصل الرابع).
 * تم استخراج وتنسيق جميع الألوان، التدريجات، الخطوط، المسافات، أنصاف الأقطار، والظلال بدقة متناهية.
 */

export const theme = {
  colors: {
    // الألوان الرئيسية والعلامة التجارية (Brand & Primary)
    primary: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      300: '#6EE7B7',
      400: '#34D399',
      500: '#10B981', // اللون الزمردي الرئيسي (Emerald / Primary Green)
      600: '#059669', // اللون الزمردي الداكن (الأزرار والتفاعلات)
      700: '#047857',
      800: '#065F46',
      900: '#064E3B',
      950: '#022C22',
    },

    // اللوح الأيمن الداكن (Dark Hero/Branding Canvas)
    darkBrand: {
      bgGradientStart: '#041813',
      bgGradientMid: '#09231D',
      bgGradientEnd: '#0F2E27',
      bgCorner: '#0A1C24',
      cardBg: '#0B2620',
      cardBgSecondary: '#0E332B',
      cardBorder: '#1B4D40',
      cardBorderHover: '#10B981',
      statsBoxBg: '#081E19',
      statsBoxBorder: '#164E40',
      textPrimary: '#FFFFFF',
      textSecondary: '#CBD5E1',
      textMuted: '#94A3B8',
      accentGlow: '#10B981',
      accentCyan: '#0284C7',
      accentAmber: '#F59E0B',
    },

    // درجات الرمادي والأساسيات (Grayscale / Neutral)
    neutral: {
      white: '#FFFFFF',
      50: '#F8FAFC',  // خلفية البطاقات والحقول وحاوية الصفحة
      100: '#F1F5F9', // خلفية الأزرار الثانوية والأيقونات
      200: '#E2E8F0', // الحدود الفاصلة الافتراضية
      300: '#CBD5E1', // حدود حقول الإدخال النشطة
      400: '#94A3B8', // النصوص الفرعية والتلميحات
      500: '#64748B', // الأيقونات والنصوص الثانوية
      600: '#475569', // نصوص الحقول والتسميات
      700: '#334155', // النصوص البارزة والأزرار
      800: '#1E293B', // العناوين الفرعية
      900: '#0F172A', // العناوين الرئيسية الداكنة
    },

    // الألوان الدلالية والحالات (Status & Semantic)
    status: {
      success: {
        text: '#15803D',
        bg: '#F0FDF4',
        border: '#BBF7D0',
        badgeBg: '#DCFCE7',
      },
      warning: {
        text: '#B45309',
        bg: '#FFFBEB',
        border: '#FDE68A',
        badgeBg: '#FEF3C7',
      },
      danger: {
        text: '#B91C1C',
        bg: '#FEF2F2',
        border: '#FECACA',
        badgeBg: '#FEE2E2',
      },
      info: {
        text: '#1D4ED8',
        bg: '#EFF6FF',
        border: '#BFDBFE',
        badgeBg: '#DBEAFE',
      },
    },

    // التدريجات اللونية (Gradients)
    gradients: {
      // تدريج الزر الرئيسي وشريط العلامة التجارية
      primaryButton: 'linear-gradient(90deg, #059669 0%, #10B981 50%, #34D399 100%)',
      primaryHover: 'linear-gradient(90deg, #047857 0%, #059669 50%, #10B981 100%)',
      
      // تدريج خلفية البانر الأيمن في شاشة الدخول
      darkBanner: 'linear-gradient(135deg, #041813 0%, #09231D 45%, #0F2E27 85%, #0A1C24 100%)',
      
      // تدريج بطاقة الخطوات/المزايا في الشاشات
      cardGlow: 'linear-gradient(180deg, rgba(20, 57, 48, 0.75) 0%, rgba(14, 39, 33, 0.85) 100%)',
    },
  },

  // الخطوط والطباعة (Typography)
  typography: {
    fontFamily: {
      sans: "'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif",
      heading: "'Cairo', 'Tajawal', sans-serif",
      mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    fontSizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    lineHeights: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  // المسافات (Spacing)
  spacing: {
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',      // 16px
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
    16: '4rem',    // 64px
    20: '5rem',    // 80px
  },

  // أنصاف الأقطار (Border Radii)
  radii: {
    none: '0px',
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    '3xl': '24px',
    full: '9999px',
  },

  // الظلال والعمق (Box Shadows)
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    emeraldGlow: '0 4px 20px rgba(16, 185, 129, 0.25)',
    emeraldGlowSubtle: '0 0 15px rgba(16, 185, 129, 0.15)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  },

  // التحولات الزمنية (Transitions)
  transitions: {
    fast: 'all 0.15s ease-in-out',
    normal: 'all 0.25s ease-in-out',
    slow: 'all 0.4s ease-in-out',
  },
} as const;

export type Theme = typeof theme;
