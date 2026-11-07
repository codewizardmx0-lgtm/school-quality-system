import React from 'react';
import type { EvaluatorSchoolInfo, EvaluatorScreen } from '../../api/evaluationTypes';
import {
  Bell,
  Download,
  Sparkles,
  AlertTriangle,
  User,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface EvaluatorTopBarProps {
  activeScreen: EvaluatorScreen;
  schoolInfo?: EvaluatorSchoolInfo | null;
  hasOpenCompletionRequest?: boolean;
  onOpenCompletionRequest?: () => void;
  onNavigate: (screen: EvaluatorScreen) => void;
  isLocked?: boolean;
}

export const EvaluatorTopBar: React.FC<EvaluatorTopBarProps> = ({
  activeScreen,
  schoolInfo,
  hasOpenCompletionRequest = false,
  onOpenCompletionRequest,
  onNavigate,
  isLocked = false,
}) => {
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

  // توليد ملف PDF أو تقرير معتمد مع UTF-8 BOM
  const handleExportQuickReport = () => {
    const reportContent = `\uFEFFتقرير التقييم الذاتي الشامل - مدرسة الأمل النموذجية الثانوية
العام الدراسي: 2026/2027
المقيم: عمار عمر عبدالله
تاريخ الإصدار: ${new Date().toLocaleDateString('ar-YE')}
الحالة: ${isLocked ? 'مرفوع ومختوم رقمياً' : 'مسودة معتمدة داخلياً'}

ملخص الإنجاز:
- نسبة اكتمال التقييم: 75%
- عدد المؤشرات المنجزة: 42 من 56
- إجمالي الشواهد المفهرسة: 38 مستنداً
- نقاط القوة المعتمدة: 28 عنصراً
- مجالات التحسين: 14 عنصراً
`;
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `تقرير_التقييم_الذاتي_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Top Banner Notice if Supervisor Requested Completion */}
      {hasOpenCompletionRequest && (
        <div
          style={{
            margin: '0 -24px',
            backgroundColor: '#FEF3C7',
            borderBottom: '1px solid #FCD34D',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} color="#D97706" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
              طلب استكمال للمخرج من المراجعة الوزارية: يتطلب إعادة النظر في بعض الشواهد والمؤشرات المحددة.
            </span>
          </div>
          {onOpenCompletionRequest && (
            <button
              onClick={onOpenCompletionRequest}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: '#D97706',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              فتح طلب الاستكمال ومعالجة الملاحظات
            </button>
          )}
        </div>
      )}

      {/* Main TopBar Content */}
      <div
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left (RTL Start): Screen title & school details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {getScreenTitle(activeScreen)}
            </h1>
            <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{schoolInfo?.schoolName || 'مدرسة الأمل النموذجية الثانوية'}</span>
              <span>•</span>
              <span>المقيم: {schoolInfo?.currentEvaluator || 'عمار عمر عبدالله'}</span>
            </div>
          </div>

          {/* Status Pill */}
          <div
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              backgroundColor: statusBg,
              color: statusColor,
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: `1px solid ${statusColor}33`,
            }}
          >
            {isLocked ? <Lock size={13} /> : <CheckCircle2 size={13} />}
            {statusLabel}
          </div>
        </div>

        {/* Right (RTL End): Actions & Shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Quick AI Trigger */}
          <button
            onClick={() => onNavigate('ai-assistant')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="الانتقال إلى المساعد الذكي وتحليل الفجوات"
          >
            <Sparkles size={15} />
            المساعد الذكي (AI)
          </button>

          {/* Export Report */}
          <button
            onClick={handleExportQuickReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="تصدير تقرير التقييم الذاتي المعتمد"
          >
            <Download size={15} />
            تصدير التقرير
          </button>

          {/* Notifications */}
          <button
            onClick={() => onNavigate('notifications')}
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
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
            <Bell size={18} />
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '7px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#EF4444',
              }}
            />
          </button>

          {/* User Avatar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px 4px 6px',
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
              }}
            >
              <User size={16} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                عمار عمر
              </div>
              <div style={{ fontSize: '10px', color: '#64748B' }}>
                مسؤول الجودة
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
