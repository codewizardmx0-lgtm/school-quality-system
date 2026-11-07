import React, { useState } from 'react';
import type { EvaluatorSchoolInfo, EvaluatorScreen } from '../../api/evaluationTypes';
import {
  Bell,
  Download,
  Sparkles,
  AlertTriangle,
    CheckCircle2,
  Lock,
  Menu,
  KeyRound,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { SYSTEM_SHORT_NAME } from '../../../../constants/systemConstants';
import { evaluatorApi } from '../../api/evaluatorApi';
import { useAuth } from '../../../auth/AuthContext';
import { useEffect } from 'react';

interface EvaluatorTopBarProps {
  activeScreen: EvaluatorScreen;
  schoolInfo?: EvaluatorSchoolInfo | null;
  hasOpenCompletionRequest?: boolean;
  onOpenCompletionRequest?: () => void;
  onNavigate: (screen: EvaluatorScreen) => void;
  isLocked?: boolean;
  isMobile?: boolean;
  onOpenMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
  addToast?: (type: 'error' | 'success' | 'warning' | 'info', message: string, duration?: number) => void;
}

export const EvaluatorTopBar: React.FC<EvaluatorTopBarProps> = ({
  activeScreen,
  schoolInfo,
  hasOpenCompletionRequest = false,
  onOpenCompletionRequest,
  onNavigate,
  isLocked = false,
  isMobile = false,
  onOpenMobile,
  onOpenChangePassword,
  onLogout,
  addToast,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  const { user: authUser } = useAuth();
  const displayName = authUser?.fullName || authUser?.username || schoolInfo?.currentEvaluator || 'مقيّم المدرسة';
  const roleObj = authUser?.roles?.[0];
  const roleNameMap: Record<string, string> = {
    admin: 'مدير النظام المركزي',
    school_evaluator: 'مقيّم المدرسة',
    school_principal: 'مدير المدرسة',
    ministry_standards_manager: 'مسؤول إدارة المعايير',
    ministry_supervisor: 'مشرف وزاري معتمد',
  };
  const displayRole = roleObj
    ? (roleNameMap[roleObj.roleName] || roleObj.description || roleObj.roleName)
    : 'مقيّم المدرسة';

  const userInitials = displayName
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('') || 'مق';

  useEffect(() => {
    evaluatorApi.getUnreadNotificationsCount()
      .then((count) => setUnreadNotificationsCount(count))
      .catch(() => {});
  }, []);

  const getScreenTitle = (screen: EvaluatorScreen) => {
    switch (screen) {
      case 'dashboard':
        return 'لوحة تحكم التقييم والتقدم';
      case 'standards-tree':
        return 'شجرة المعايير والمؤشرات الوطنية';
      case 'rubric-assessment':
        return 'استمارة رصد التقديرات وأدلة التحقق';
      case 'evidences':
        return 'مستودع الشواهد والأدلة الميدانية';
      case 'ai-assistant':
        return 'تحليل الفجوات والمساعد الذكي (AI)';
      case 'improvement-plan':
        return 'خطة التحسين والتطوير المدرسي';
      case 'final-review':
        return 'المراجعة الداخلية والختم الرقمي';
      case 'completion-request':
        return 'معالجة طلب استكمال المشرف الوزاري';
      case 'notifications':
        return 'مركز الإشعارات والتنبيهات';
      default:
        return 'بوابة التقييم الذاتي';
    }
  };

  // Real PDF Export using backend mPDF engine (§7.1 of UI_STANDARDS.md)
  const handleExportQuickReport = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await evaluatorApi.exportReportPdf();
      if (addToast) {
        addToast('success', 'تم تصدير وتحميل تقرير التقييم الذاتي المعتمد (PDF) بنجاح.');
      }
    } catch (err: any) {
      console.error('Failed to export PDF report:', err);
      if (addToast) {
        addToast('error', err?.response?.data?.message || err?.message || 'تعذر تصدير تقرير التقييم PDF.');
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  const statusLabel = isLocked
    ? 'مرفوع ومقفل (للقراءة فقط)'
    : hasOpenCompletionRequest
    ? 'طلب استكمال من المشرف'
    : schoolInfo?.statusArabic || 'مسودة قيد الإدخال';

  const statusBg = isLocked
    ? 'rgba(16, 185, 129, 0.15)'
    : hasOpenCompletionRequest
    ? 'rgba(245, 158, 11, 0.15)'
    : 'rgba(5, 150, 105, 0.12)';

  const statusColor = isLocked
    ? '#059669'
    : hasOpenCompletionRequest
    ? '#D97706'
    : '#059669';

  return (
    <header
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Top Banner Notice if Supervisor Requested Completion */}
      {hasOpenCompletionRequest && (
        <div
          style={{
            margin: '0 -20px',
            backgroundColor: '#FEF3C7',
            borderBottom: '1px solid #FCD34D',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="#D97706" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400E' }}>
              طلب استكمال من المراجعة الوزارية: يتطلب مراجعة بعض الشواهد والمؤشرات المحددة.
            </span>
          </div>
          {onOpenCompletionRequest && (
            <button
              onClick={onOpenCompletionRequest}
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: '#D97706',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              معالجة الملاحظات ↗
            </button>
          )}
        </div>
      )}

      {/* Main TopBar Content - Standard 68px height (UI_STANDARDS.md §3.1) */}
      <div
        style={{
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        {/* Right (RTL Start): Mobile Hamburger + Breadcrumb & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {/* Mobile Hamburger Drawer Button */}
          {isMobile && onOpenMobile && (
            <button
              onClick={onOpenMobile}
              title="فتح القائمة الجانبية"
              style={{
                background: 'transparent',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              <Menu size={20} />
            </button>
          )}

          <div style={{ minWidth: 0 }}>
            {/* Breadcrumb with SYSTEM_SHORT_NAME */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
              <span>{SYSTEM_SHORT_NAME}</span>
              <ChevronLeft size={12} />
              <span>بوابة التقييم</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
              <h1
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#0F172A',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {getScreenTitle(activeScreen)}
              </h1>

              {/* Status Pill (hide on very narrow screens) */}
              <div
                className="hidden sm:inline-flex"
                style={{
                  padding: '3px 9px',
                  borderRadius: '14px',
                  backgroundColor: statusBg,
                  color: statusColor,
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: `1px solid ${statusColor}33`,
                  whiteSpace: 'nowrap',
                }}
              >
                {isLocked ? <Lock size={11} /> : <CheckCircle2 size={11} />}
                <span>{statusLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Left (RTL End): Actions & User Capsule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Quick AI Trigger */}
          <button
            onClick={() => onNavigate('ai-assistant')}
            className="hidden md:inline-flex"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="الانتقال إلى المساعد الذكي وتحليل الفجوات"
          >
            <Sparkles size={14} />
            <span>المساعد الذكي</span>
          </button>

          {/* Export Report (Official Real PDF) */}
          <button
            onClick={handleExportQuickReport}
            disabled={isExportingPdf}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isExportingPdf ? 'not-allowed' : 'pointer',
              opacity: isExportingPdf ? 0.7 : 1,
            }}
            title="تصدير تقرير التقييم الذاتي المعتمد (PDF)"
          >
            <Download size={14} />
            <span className="hidden sm:inline">{isExportingPdf ? 'جاري التحميل...' : 'تصدير التقرير (PDF)'}</span>
          </button>

          {/* Notifications */}
          <button
            onClick={() => onNavigate('notifications')}
            style={{
              position: 'relative',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
            }}
            title="مركز التنبيهات"
          >
            <Bell size={17} />
            {unreadNotificationsCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '6px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#EF4444',
                }}
              />
            )}
          </button>

          {/* Change Password Button */}
          {onOpenChangePassword && (
            <button
              onClick={onOpenChangePassword}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B',
              }}
              title="تغيير كلمة المرور"
            >
              <KeyRound size={16} />
            </button>
          )}

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#EF4444',
              }}
              title="تسجيل الخروج"
            >
              <LogOut size={16} />
            </button>
          )}

          {/* User Profile Capsule (UI_STANDARDS.md §3.2) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '3px 8px 3px 6px',
              borderRadius: '8px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                backgroundColor: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '11px',
              }}
            >
              {userInitials}
            </div>
            <div className="hidden sm:block" style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                {displayName}
              </div>
              <div style={{ fontSize: '9.5px', color: '#64748B' }}>
                {displayRole}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
