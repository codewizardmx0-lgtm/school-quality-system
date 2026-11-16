/**
 * Component: EmptySupervisionState
 * حالة فارغة وأخطاء نظامية متوافقة تماماً مع معايير المنصة UI_STANDARDS (§16)
 * وثيم الإشراف والمتابعة الوزاري الأزرق الملكي (#2563EB)
 */

import React from 'react';
import { ShieldAlert, Inbox, RefreshCw } from 'lucide-react';

interface EmptySupervisionStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  isError?: boolean;
}

export const EmptySupervisionState: React.FC<EmptySupervisionStateProps> = ({
  title = 'لا توجد بيانات متاحة حالياً',
  description = 'لم يتم العثور على أي سجلات في هذا القسم.',
  icon,
  actionText,
  onAction,
  isError = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          backgroundColor: isError ? '#FEF2F2' : '#EFF6FF',
          color: isError ? '#DC2626' : '#2563EB',
        }}
      >
        {icon || (isError ? <ShieldAlert size={28} /> : <Inbox size={28} />)}
      </div>

      <h3
        style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#0F172A',
          marginBottom: '6px',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '14px',
          color: '#64748B',
          maxWidth: '460px',
          marginBottom: actionText && onAction ? '20px' : '0',
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#2563EB',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#DBEAFE')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
        >
          <RefreshCw size={16} />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
