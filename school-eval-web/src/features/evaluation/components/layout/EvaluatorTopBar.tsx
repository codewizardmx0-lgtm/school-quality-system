import React, { useState, useEffect, useRef } from 'react';
import type { EvaluatorSchoolInfo, EvaluatorScreen, EvaluationCycleArchiveItem } from '../../api/evaluationTypes';
import {
  Bell,
  CheckCircle2,
  Lock,
  Menu,
  KeyRound,
  LogOut,
  ChevronLeft,
  ChevronDown,
  User as UserIcon,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { SYSTEM_SHORT_NAME } from '../../../../constants/systemConstants';
import { evaluatorApi } from '../../api/evaluatorApi';
import { useAuth } from '../../../auth/AuthContext';
import { ConfirmationDialog } from '../../../admin/components/common/ConfirmationDialog';
import { UniversalNotificationsDrawer } from '../../../../components/notifications/UniversalNotificationsDrawer';

interface EvaluatorTopBarProps {
  activeScreen: EvaluatorScreen;
  schoolInfo?: EvaluatorSchoolInfo | null;
  hasOpenCompletionRequest?: boolean;
  onOpenCompletionRequest?: () => void;
  onNavigate: (screen: EvaluatorScreen, param?: number, fromHub?: boolean) => void;
  isLocked?: boolean;
  isMobile?: boolean;
  onOpenMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenChangePassword?: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  notifRefreshKey?: number;
  addToast?: (type: 'error' | 'success' | 'warning' | 'info', message: string, duration?: number) => void;
  archiveEvaluations?: EvaluationCycleArchiveItem[];
  selectedArchiveEvalId?: number | null;
  onSelectArchiveEvaluation?: (evalId: number | null) => void;
  isPrincipal?: boolean;
}

export const EvaluatorTopBar: React.FC<EvaluatorTopBarProps> = ({
  activeScreen,
  schoolInfo,
  hasOpenCompletionRequest = false,
  onOpenCompletionRequest: _onOpenCompletionRequest,
  onNavigate,
  isLocked = false,
  isMobile = false,
  onOpenMobile,
  onOpenChangePassword,
  onOpenProfile,
  onLogout,
  notifRefreshKey = 0,
  addToast: _addToast,
  archiveEvaluations = [],
  selectedArchiveEvalId = null,
  onSelectArchiveEvaluation,
  isPrincipal = false,
}) => {
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { user: authUser } = useAuth();
  const displayName = authUser?.fullName || authUser?.username || schoolInfo?.currentEvaluator || 'مقيّم المدرسة';
  const roleObj = authUser?.roles?.[0];
  const roleNameMap: Record<string, string> = {
    admin: 'مدير النظام المركزي',
    school_evaluator: 'مقيّم المدرسة',
    school_principal: 'مدير المدرسة',
    ministry_standards_manager: 'مسؤول إدارة المعايير',
    ministry_supervisor: 'المشرف الوزاري',
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
  }, [notifRefreshKey]);

  const getScreenTitle = (screen: EvaluatorScreen) => {
    switch (screen) {
      case 'dashboard':
        return isPrincipal ? 'لوحة المتابعة الإدارية والتقدم' : 'لوحة تحكم التقييم والتقدم';
      case 'standards-tree':
        return isPrincipal ? 'دليل واستعراض المعايير والمؤشرات' : 'شجرة المعايير والمؤشرات الوطنية';
      case 'rubric-assessment':
        return isPrincipal ? 'استعراض رصد التقديرات وأدلة التحقق' : 'استمارة رصد التقديرات وأدلة التحقق';
      case 'evidences':
        return 'مستودع الشواهد والأدلة الميدانية';
      case 'ai-assistant':
        return 'تحليل الفجوات والمساعد الذكي (AI)';
      case 'improvement-plan':
        return isPrincipal ? 'متابعة خطة التحسين والتطوير المدرسي' : 'خطة التحسين والتطوير المدرسي';
      case 'audit-hub':
        return isPrincipal ? 'مركز التدقيق والمراجعة الإدارية الشاملة' : 'سجل تدقيق ومراجعات مدير المدرسة';
      case 'final-review':
        return isPrincipal ? 'المراجعة والإقرار الداخلي لمدير المدرسة' : 'المراجعة الداخلية والختم الرقمي';
      case 'completion-request':
        return 'معالجة طلب استكمال المشرف الوزاري';
      case 'reports':
        return 'مركز التقارير وحزم الوثائق الرسمية';
      case 'historical':
        return 'مقارنة الأداء التاريخي ومسار التطور';
      case 'notifications':
        return 'مركز الإشعارات والتنبيهات';
      default:
        return isPrincipal ? 'بوابة مدير المدرسة' : 'بوابة التقييم الذاتي';
    }
  };

  const statusLabel = isPrincipal
    ? 'وضع الملاحظة والإقرار الإداري'
    : isLocked
    ? 'مرفوع ومقفل (للقراءة فقط)'
    : hasOpenCompletionRequest
    ? 'طلب استكمال من المشرف'
    : schoolInfo?.statusArabic || 'مسودة قيد الإدخال';

  const statusBg = isPrincipal
    ? 'rgba(217, 119, 6, 0.12)'
    : isLocked
    ? 'rgba(16, 185, 129, 0.15)'
    : hasOpenCompletionRequest
    ? 'rgba(245, 158, 11, 0.15)'
    : 'rgba(5, 150, 105, 0.12)';

  const statusColor = isPrincipal
    ? '#D97706'
    : isLocked
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
              <span>{isPrincipal ? 'بوابة مدير المدرسة' : 'بوابة التقييم'}</span>
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

              {/* Standard Version Badge (Separate & Isolated) */}
              <div
                className="hidden lg:inline-flex"
                style={{
                  padding: '3px 9px',
                  borderRadius: '14px',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #FCD34D',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                }}
                title={`المرجعية المعيارية المعتمدة: ${schoolInfo?.standardVersion?.title || 'المعايير الوطنية'} (${schoolInfo?.standardVersion?.status || 'Active'})`}
              >
                <BookOpen size={11} color="#D97706" />
                <span>المعايير: {schoolInfo?.standardVersion?.versionNumber || 'v2026.1'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Left (RTL End): Actions & User Capsule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Separate Evaluation Cycle Display / Switcher */}
          {archiveEvaluations.length > 0 && onSelectArchiveEvaluation ? (
            <div
              className="hidden md:flex"
              style={{
                alignItems: 'center',
                gap: '6px',
                backgroundColor: selectedArchiveEvalId ? '#EFF6FF' : '#F0FDF4',
                border: `1px solid ${selectedArchiveEvalId ? '#93C5FD' : '#BBF7D0'}`,
                borderRadius: '8px',
                padding: '4px 8px',
              }}
              title="استعراض أرشيف دورات التقييم السابقة للمدرسة (للقراءة فقط)"
            >
              <Calendar size={14} color={selectedArchiveEvalId ? '#2563EB' : '#16A34A'} />
              <select
                value={selectedArchiveEvalId ? String(selectedArchiveEvalId) : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onSelectArchiveEvaluation(val ? Number(val) : null);
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: selectedArchiveEvalId ? '#1E40AF' : '#166534',
                  outline: 'none',
                  cursor: 'pointer',
                  paddingLeft: '4px',
                }}
              >
                <option value="">
                  الدورة الحالية ({archiveEvaluations[0]?.academicYear || schoolInfo?.academicYear || '2025/2026'})
                </option>
                {archiveEvaluations.slice(1).map((ev) => (
                  <option key={ev.evaluationId} value={String(ev.evaluationId)}>
                    أرشيف {ev.academicYear} ({ev.evaluationStatus} - قراءة فقط)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div
              className="hidden md:flex"
              style={{
                alignItems: 'center',
                gap: '5px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#166534',
              }}
              title="الدورة التقييمية الحالية للمدرسة"
            >
              <Calendar size={13} color="#16A34A" />
              <span>الدورة التقييمية: {schoolInfo?.evaluationCycle?.academicYear || schoolInfo?.academicYear || '2025/2026'}</span>
            </div>
          )}

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={() => setIsNotificationsDrawerOpen(true)}
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
              borderRadius: '9px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
              transition: 'all 0.15s ease',
            }}
            title="مركز التنبيهات والإشعارات"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EFF6FF';
              e.currentTarget.style.color = '#2563EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.color = '#64748B';
            }}
          >
            <Bell size={18} />
            {unreadNotificationsCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 4px',
                  borderRadius: '999px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
                  border: '2px solid #FFFFFF',
                  boxSizing: 'border-box',
                }}
              >
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* User Profile Capsule with Dropdown Menu (UI_STANDARDS.md §7.1) */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px 4px 6px',
                borderRadius: '10px',
                backgroundColor: isUserMenuOpen ? '#F1F5F9' : '#F8FAFC',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="خيارات الحساب الشخصي"
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: isPrincipal ? '#0284C7' : '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '12px',
                  boxShadow: isPrincipal
                    ? '0 2px 6px rgba(2, 132, 199, 0.25)'
                    : '0 2px 6px rgba(5, 150, 105, 0.25)',
                  flexShrink: 0,
                }}
              >
                {userInitials}
              </div>
              <div className="hidden sm:block" style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', lineHeight: 1.25 }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>
                  {displayRole}
                </div>
              </div>
              <ChevronDown
                size={14}
                style={{
                  color: '#94A3B8',
                  transform: isUserMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  marginRight: '2px',
                }}
              />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  width: '210px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #E2E8F0',
                  padding: '6px',
                  zIndex: 50,
                  direction: 'rtl',
                }}
              >
                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenProfile();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#334155',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      textAlign: 'right',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <UserIcon size={15} color={isPrincipal ? '#0284C7' : '#059669'} />
                    <span>ملفي الشخصي</span>
                  </button>
                )}

                {onOpenChangePassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenChangePassword();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#334155',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      textAlign: 'right',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <KeyRound size={15} color="#64748B" />
                    <span>تغيير كلمة المرور</span>
                  </button>
                )}

                {onLogout && (
                  <>
                    <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '4px 0' }} />
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsLogoutConfirmOpen(true);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: '#DC2626',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'right',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <LogOut size={15} color="#DC2626" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Logout */}
      {isLogoutConfirmOpen && (
        <ConfirmationDialog
          isOpen={isLogoutConfirmOpen}
          title="تأكيد تسجيل الخروج"
          message="هل أنت متأكد من رغبتك في تسجيل الخروج من منصة ارتقاء للتقييم الذاتي والتحسين المدرسي؟"
          confirmLabel="نعم، تسجيل الخروج"
          cancelLabel="إلغاء"
          variant="danger"
          onConfirm={() => {
            setIsLogoutConfirmOpen(false);
            onLogout?.();
          }}
          onCancel={() => setIsLogoutConfirmOpen(false)}
        />
      )}

      {/* Universal Notifications Drawer (FE-GAP-10) */}
      <UniversalNotificationsDrawer
        isOpen={isNotificationsDrawerOpen}
        onClose={() => setIsNotificationsDrawerOpen(false)}
        onNavigate={(screen, param) => onNavigate(screen as EvaluatorScreen, typeof param === 'number' ? param : undefined)}
      />
    </header>
  );
};
