/**
 * Component: SupervisionTopBar
 * الشريط العلوي الثابت بارتفاع 68px لبوابة المشرف الوزاري
 * متوافق تماماً مع معايير UI_STANDARDS (§1 و §3):
 * - الارتفاع: 68px بالضبط (height: '68px')
 * - مسار التنقل (Breadcrumb) يبدأ بـ SYSTEM_SHORT_NAME («منصة ارتقاء»)
 * - منع وجود تواريخ أو تقاويم عشوائية في الشريط العلوي (NO RANDOM DATES)
 * - كبسولة المستخدم: الحروف الأولى (ع.ش)، الاسم الكامل، واللقب (المشرف الوزاري)
 * - شارة النطاق المعتمدة: نطاق: أمانة العاصمة (48 مدرسة)
 */

import React from 'react';
import { ChevronLeft, MapPin } from 'lucide-react';
import type { SupervisionScreenKey } from '../../api/supervisionTypes';

interface SupervisionTopBarProps {
  activeScreen: SupervisionScreenKey;
  onNavigate: (screen: SupervisionScreenKey) => void;
  scopeText?: string;
  userName?: string;
  userRole?: string;
}

const screenTitleMap: Record<SupervisionScreenKey, string> = {
  dashboard: 'لوحة المتابعة الميدانية',
  'cycles-new': 'إطلاق دورة تقييم جديدة',
  submissions: 'استلام ومراجعة المخرجات',
  'completion-requests': 'طلبات الاستكمال الموجهة',
  'tracking-log': 'سجل إجراءات المتابعة',
  reports: 'التقارير والتحليلات المركزية',
  historical: 'المقارنة التاريخية التراكمية',
};

export const SupervisionTopBar: React.FC<SupervisionTopBarProps> = ({
  activeScreen,
  onNavigate,
  scopeText = 'أمانة العاصمة (48 مدرسة)',
  userName = 'أ. عبدالرحمن الشامي',
  userRole = 'المشرف الوزاري',
}) => {
  return (
    <header
      style={{
        height: '68px',
        maxHeight: '68px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. مسار التنقل النظيف (Breadcrumb) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748B',
            cursor: 'pointer',
            padding: 0,
            border: 'none',
            background: 'none',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
        >
          منصة ارتقاء
        </button>

        <ChevronLeft size={14} color="#94A3B8" />

        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748B',
            cursor: 'pointer',
            padding: 0,
            border: 'none',
            background: 'none',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
        >
          بوابة الإشراف الوزاري
        </button>

        {activeScreen !== 'dashboard' && (
          <>
            <ChevronLeft size={14} color="#94A3B8" />
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                whiteSpace: 'nowrap',
              }}
            >
              {screenTitleMap[activeScreen]}
            </span>
          </>
        )}
      </div>

      {/* 2. الجانب الأيسر: شارة النطاق وكبسولة المستخدم */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        {/* شارة النطاق الإشرافي (Scope Badge) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '999px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            color: '#1E40AF',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          <MapPin size={14} color="#2563EB" />
          <span>نطاق: {scopeText}</span>
        </div>

        {/* خط فاصل أنيق */}
        <div style={{ width: '1px', height: '24px', backgroundColor: '#E2E8F0' }} />

        {/* كبسولة المستخدم (User Capsule) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '4px 10px 4px 6px',
            borderRadius: '10px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}
        >
          {/* الصورة الرمزية بالحروف الأولى (ع.ش) */}
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
            }}
          >
            ع.ش
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              {userName}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: '#64748B',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              {userRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
