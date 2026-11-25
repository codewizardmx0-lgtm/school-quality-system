import React from 'react';
import { Loader2 } from 'lucide-react';
import { theme } from '../../styles/theme';

interface PortalLoaderProps {
  /** وضع مدمج داخل منطقة المحتوى بدلاً من ملء الشاشة بالكامل */
  inline?: boolean;
  /** رسالة تحميل اختيارية مخصصة */
  label?: string;
}

/**
 * مؤشر تحميل موحد للبوابات والشاشات المحمّلة كسولاً (React.lazy + Suspense).
 */
export const PortalLoader: React.FC<PortalLoaderProps> = ({
  inline = false,
  label = 'جاري تحميل الشاشة...',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        minHeight: inline ? '360px' : '100vh',
        width: '100%',
        backgroundColor: inline ? 'transparent' : theme.colors.neutral[50],
        color: theme.colors.primary[600],
        fontFamily: 'inherit',
      }}
    >
      <Loader2
        size={inline ? 34 : 42}
        className="animate-spin"
        style={{ color: theme.colors.primary[600] }}
      />
      <span
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: theme.colors.neutral[600],
        }}
      >
        {label}
      </span>
    </div>
  );
};

export default PortalLoader;
