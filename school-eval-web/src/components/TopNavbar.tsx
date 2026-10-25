import React from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { theme } from '../styles/theme';
import {
  Bell,
  Search,
  CheckCircle,
} from 'lucide-react';

export const TopNavbar: React.FC = () => {
  const { user } = useAuth();

  return (
    <header
      style={{
        height: '68px',
        backgroundColor: theme.colors.neutral.white,
        borderBottom: `1px solid ${theme.colors.neutral[200]}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 15,
      }}
    >
      {/* الجانب الأيمن: شريط البحث السريع والمسار */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            position: 'relative',
            width: '280px',
          }}
        >
          <input
            type="text"
            placeholder="البحث في المعايير والتقارير..."
            style={{
              width: '100%',
              height: '38px',
              padding: '0 36px 0 12px',
              backgroundColor: theme.colors.neutral[50],
              border: `1px solid ${theme.colors.neutral[200]}`,
              borderRadius: theme.radii.full,
              fontSize: theme.typography.fontSizes.xs,
              color: theme.colors.neutral[800],
              outline: 'none',
            }}
          />
          <Search
            size={16}
            style={{
              position: 'absolute',
              top: '11px',
              right: '12px',
              color: theme.colors.neutral[400],
              pointerEvents: 'none',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: theme.typography.fontSizes.xs,
            color: theme.colors.primary[700],
            backgroundColor: theme.colors.primary[50],
            padding: '4px 10px',
            borderRadius: theme.radii.sm,
            fontWeight: theme.typography.fontWeights.medium,
          }}
        >
          <CheckCircle size={14} color={theme.colors.primary[600]} />
          <span>الدورة التقييمية الرسمية 2026/2027</span>
        </div>
      </div>

      {/* الجانب الأيسر: الإشعارات وهوية المستخدم */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        {/* زر الإشعارات */}
        <button
          type="button"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: theme.radii.full,
            backgroundColor: theme.colors.neutral[50],
            border: `1px solid ${theme.colors.neutral[200]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            color: theme.colors.neutral[600],
          }}
          title="الإشعارات"
        >
          <Bell size={18} />
          <span
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: theme.colors.primary[500],
              border: '2px solid white',
            }}
          />
        </button>

        {/* فاصل */}
        <div style={{ width: '1px', height: '24px', backgroundColor: theme.colors.neutral[200] }} />

        {/* كبسولة بيانات المستخدم */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: theme.radii.full,
              backgroundColor: theme.colors.primary[100],
              color: theme.colors.primary[800],
              fontWeight: theme.typography.fontWeights.bold,
              fontSize: theme.typography.fontSizes.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${theme.colors.primary[300]}`,
            }}
          >
            {user?.fullName?.slice(0, 1) || 'م'}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.bold,
                color: theme.colors.neutral[900],
                lineHeight: '1.2',
              }}
            >
              {user?.fullName}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: theme.colors.neutral[500],
              }}
            >
              @{user?.username}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
