/**
 * Component: StandardsTopBar
 * الشريط العلوي الموحد الثابت (68px) لقطاع المعايير والمرجعية
 * متوافق تماماً مع UI_STANDARDS (§1 و §3):
 * - الارتفاع: 68px تماماً ثابت
 * - مسار التتبع يبدأ بـ «منصة ارتقاء»
 * - شارة الإصدار الرسمي المعتمد الحاكم للدورات
 * - كبسولة المستخدم: د.خ، د. خالد الرازحي، مسؤول إدارة المرجعية والمعايير
 * - بدون أي تقاويم أو تواريخ عشوائية
 */

import React from 'react';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import type { StandardsScreenKey } from './StandardsSidebar';

interface StandardsTopBarProps {
  activeScreen: StandardsScreenKey;
  activeVersionNo?: string;
  onNavigateHome?: () => void;
}

const screenTitles: Record<StandardsScreenKey, string> = {
  versions: 'إدارة إصدارات وثيقة المعايير والاعتماد',
  tree: 'بناء وهيكلة الشجرة المعيارية والمؤشرات',
  weights: 'معايرة الأوزان وسلالم التقدير اللفظي (0-3)',
  'audit-lock': 'تدقيق الفروقات والقفل والاعتماد الرسمي',
};

export const StandardsTopBar: React.FC<StandardsTopBarProps> = ({
  activeScreen,
  activeVersionNo = '2026.1',
  onNavigateHome,
}) => {
  return (
    <header
      className="std-topbar-fixed"
      style={{
        height: '68px',
        minHeight: '68px',
        maxHeight: '68px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        flexShrink: 0,
        zIndex: 40,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* 1. Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
        <button
          type="button"
          onClick={onNavigateHome}
          style={{
            fontWeight: 700,
            color: '#1E293B',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            padding: 0,
          }}
        >
          منصة ارتقاء
        </button>
        <ChevronLeft size={14} color="#94A3B8" />
        <span style={{ color: '#64748B', fontWeight: 500 }}>أمانة المعايير</span>
        <ChevronLeft size={14} color="#94A3B8" />
        <span style={{ fontWeight: 700, color: '#D97706' }}>{screenTitles[activeScreen]}</span>
      </div>

      {/* 2. Right Side: Official Version Pill & User Capsule */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Active Official Version Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            fontSize: '12px',
            fontWeight: 700,
            color: '#065F46',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
              display: 'inline-block',
            }}
          />
          <ShieldCheck size={15} color="#059669" />
          <span>إصدار رسمي نشط ومقفل ({activeVersionNo})</span>
        </div>

        {/* User Capsule */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '5px 14px 5px 6px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '9999px',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D97706, #92400E)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '12px',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
            }}
          >
            د.خ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', lineHeight: 1.25 }}>
              د. خالد الرازحي
            </span>
            <span style={{ fontSize: '10px', fontWeight: 500, color: '#64748B', lineHeight: 1.25 }}>
              مسؤول إدارة المرجعية والمعايير
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
