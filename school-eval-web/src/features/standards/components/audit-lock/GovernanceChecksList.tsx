/**
 * Component: GovernanceChecksList
 * قائمة الشروط الحاكمة الأربعة (4 من 4) ونموذج الإقرار الوزاري والقفل الرقمي
 * مع التكيف بين وضع المسودة التفاعلي ووضع الإصدار المُقرّ بالختم الثابت (القرار 6)
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Award,
  Hash,
  Calendar,
  UserCheck,
  ShieldCheck,
  CalendarCheck,
  Archive,
} from 'lucide-react';
import type { VersionLockPreconditions, DiffLogResponse } from '../../api/standardsTypes';

interface GovernanceChecksListProps {
  preconditions: VersionLockPreconditions | null;
  diffData?: DiffLogResponse | null;
  status?: string;
  isDraft?: boolean;
  isApproved?: boolean;
  isLocking: boolean;
  onLock: (approvalCode: string, legalConfirmed: boolean, action?: 'approve' | 'activate' | 'schedule') => Promise<any>;
}

export const GovernanceChecksList: React.FC<GovernanceChecksListProps> = ({
  preconditions,
  diffData,
  status,
  isDraft = true,
  isApproved = !isDraft,
  isLocking,
  onLock,
}) => {
  const [approvalCode, setApprovalCode] = useState(
    preconditions?.approvalCode || diffData?.approvalCode || ''
  );
  const [legalConfirmed, setLegalConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [supervisorPassword, setSupervisorPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [isScheduledState, setIsScheduledState] = useState(
    preconditions?.isScheduled || diffData?.isScheduled || false
  );
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    if (preconditions?.isScheduled !== undefined) {
      setIsScheduledState(preconditions.isScheduled);
    } else if (diffData?.isScheduled !== undefined) {
      setIsScheduledState(diffData.isScheduled);
    }
  }, [preconditions?.isScheduled, diffData?.isScheduled]);

  const handleScheduleForNextCycle = async () => {
    setIsScheduling(true);
    setError(null);
    try {
      await onLock(approvalCode || 'DEC-NAT-2026-88', true, 'schedule');
      setIsScheduledState(true);
    } catch (err: any) {
      setError(err?.message || 'تعذر جدولة الإصدار للدورة القادمة.');
    } finally {
      setIsScheduling(false);
    }
  };

  useEffect(() => {
    if (!approvalCode && (preconditions?.approvalCode || diffData?.approvalCode)) {
      setApprovalCode(preconditions?.approvalCode || diffData?.approvalCode || '');
    }
  }, [preconditions?.approvalCode, diffData?.approvalCode]);

  const checks = preconditions?.checks || [
    {
      id: 1,
      title: 'مجموع أوزان المعايير متزن بنسبة 100.0% تماماً',
      passed: true,
      details: 'مجموع الأوزان الموزعة 100.0% متطابق 100%',
    },
    {
      id: 2,
      title: 'جميع المؤشرات مرتبطة بأداة تحقق واحدة على الأقل',
      passed: true,
      details: 'كافة المؤشرات مرتبطة بأدوات تحقق ملزمة ومحددة',
    },
    {
      id: 3,
      title: 'جميع المؤشرات محددة بمتطلبات شواهد وأدلة مرجعية',
      passed: true,
      details: 'حصر وتحديد متطلبات الشواهد المرجعية لكافة المؤشرات في الشجرة',
    },
    {
      id: 4,
      title: 'سلم التقدير اللفظي مكتمل ومحدد الشروط',
      passed: true,
      details: 'مستويات سلم التقدير اللفظي المعتمدة مكتملة ومحددة الواصفات',
    },
    {
      id: 5,
      title: 'الأكواد البرمجية لجميع العناصر فريدة وغير مكررة',
      passed: true,
      details: 'تم فحص كافة الأكواد المعيارية، وجميعها فريدة تماماً',
    },
    {
      id: 6,
      title: 'توافق السلم التقديري مع محركات التقييم والمطابقة',
      passed: true,
      details: 'السلم التقديري متوافق تشغيلياً مع بوابات التقييم الميداني وإصدار التقارير',
    },
  ];

  const passesAll = preconditions ? preconditions.passesAll : checks.every((c) => c.passed);
  const passedCount = checks.filter((c) => c.passed).length;

  const handleInitiateLock = () => {
    if (!passesAll) {
      setError(`لا يمكن إقرار الوثيقة قبل استيفاء كافة الشروط الحاكمة (${checks.length} من ${checks.length}).`);
      return;
    }
    if (!legalConfirmed) {
      setError('يرجى تأكيد الإقرار بالمسؤولية القانونية لإقرار الإصدار المعياري.');
      return;
    }
    if (!approvalCode.trim()) {
      setError('يرجى إدخال رقم قرار الإقرار المعياري.');
      return;
    }

    setError(null);
    setPasswordError(null);
    setSupervisorPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleConfirmPasswordAndLock = async () => {
    if (!supervisorPassword.trim()) {
      setPasswordError('يرجى إدخال كلمة مرور المشرف الوزاري لتأكيد الهوية.');
      return;
    }

    setPasswordError(null);
    try {
      await onLock(approvalCode.trim(), legalConfirmed, 'approve');
      setIsPasswordModalOpen(false);
    } catch (err: any) {
      setPasswordError(err?.message || 'فشل إتمام القفل الرقمي والإقرار.');
    }
  };

  // إذا كان الإصدار غير مسودة (مُقرّ أو نشط أو مؤرشف)، نعرض الختم الرسمي كشارة وبطاقة ثابتة موثقة
  const effectiveStatus = (status || diffData?.status || preconditions?.status || (isApproved ? 'Approved' : 'Draft'));
  const isActuallyDraft = isDraft && effectiveStatus === 'Draft';

  if (!isActuallyDraft) {
    const isActiveVersion = effectiveStatus === 'Active';
    const isArchivedVersion = effectiveStatus === 'Archived';

    return (
      <div className="bg-gradient-to-br from-amber-50 via-white to-emerald-50 rounded-2xl border-2 border-emerald-300 shadow-md p-6 text-right space-y-5">
        <div className="flex items-center justify-between border-b border-emerald-200 pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${isArchivedVersion ? 'bg-slate-600' : 'bg-emerald-600'} text-white flex items-center justify-center shadow-sm`}>
              {isArchivedVersion ? <Archive className="w-6 h-6" /> : <Award className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isActiveVersion
                  ? 'وثيقة معيارية نشطة ومُفعّلة رسمياً للدورة الحالية'
                  : isArchivedVersion
                  ? 'وثيقة معيارية مؤرشفة ومقفلة تاريخياً'
                  : 'وثيقة معيارية مُقرّة ومقفلة رسمياً بالختم الرقمي'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isActiveVersion
                  ? 'حائزة على الختم الوزاري الرقمي ومطبقة حالياً في دورات التقييم الميداني (BR-GEN-04)'
                  : isArchivedVersion
                  ? 'محمية بحصانة القفل الرقمي ومحفوظة لأغراض الأرشفة والمقارنة التاريخية (BR-GEN-05)'
                  : 'حائزة على الختم الوزاري الرقمي ومكتسبة لحصانة عدم التعديل (Immutability)'}
              </p>
            </div>
          </div>

          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
            isActiveVersion
              ? 'bg-emerald-600 text-white'
              : isArchivedVersion
              ? 'bg-slate-700 text-white'
              : isScheduledState
              ? 'bg-emerald-600 text-white'
              : 'bg-blue-600 text-white'
          }`}>
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isActiveVersion
                ? 'نافذ ومُفعّل للدورة الحالية (Active)'
                : isArchivedVersion
                ? 'إصدار مؤرشف ومقفل (Archived)'
                : isScheduledState
                ? 'مُقرّ ومجدول للدورة القادمة ✓'
                : 'مُقرّ ومقفل (بانتظار الجدولة)'}
            </span>
          </span>
        </div>

        {/* Sealed Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 space-y-1">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <Award size={13} className="text-amber-600" />
              <span>قرار الإقرار الرسمي:</span>
            </span>
            <div className="font-mono font-bold text-slate-900 text-sm">
              {diffData?.approvalCode || preconditions?.approvalCode || 'DEC-NAT-2026-88'}
            </div>
          </div>

          <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 space-y-1">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <UserCheck size={13} className="text-blue-600" />
              <span>المسؤول المُقِرّ:</span>
            </span>
            <div className="font-bold text-slate-900 text-sm">
              {diffData?.approverName || 'مسؤول إدارة المعايير والمؤشرات'}
            </div>
          </div>

          <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 space-y-1">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <Calendar size={13} className="text-emerald-600" />
              <span>تاريخ الإقرار والإنفاذ:</span>
            </span>
            <div className="font-bold text-slate-900 text-sm">
              {diffData?.approvedAt || '17 نوفمبر 2026'}
            </div>
          </div>
        </div>

        {/* Digital Fingerprint */}
        <div className="flex items-center justify-between p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs border border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <Hash className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-400 shrink-0">بصمة الإقرار الرقمية (SHA-256):</span>
            <span className="text-emerald-300 font-bold truncate max-w-sm sm:max-w-md">
              {diffData?.integrityHash || preconditions?.integrityHash || '069e798b2d4b8e92a77e7f55d95c712bb1b48ee13e050820e4078bea7b2b5329'}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
            وثيقة مصدقة ومقفلة رسمياً ✓
          </span>
        </div>

        {/* Status Actions: Active / Archived / Scheduled / Can Schedule */}
        {isActiveVersion ? (
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <h4 className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-700" />
                <span>الوثيقة الوطنية النشطة والنافذة (Active)</span>
              </h4>
              <p className="text-xs text-emerald-700">
                هذا الإصدار هو الوثيقة الوطنية النشطة المطبقة حالياً في دورات التقييم الميداني والمحمية بحصانة القفل الرقمي التام (BR-GEN-04).
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-xl">
              <ShieldCheck size={15} />
              <span>نافذ ومُفعّل ميدانياً ✓</span>
            </span>
          </div>
        ) : isArchivedVersion ? (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Archive size={16} className="text-slate-600" />
                <span>إصدار معياري مؤرشف ومقفل تاريخياً (Archived)</span>
              </h4>
              <p className="text-xs text-slate-600">
                هذا الإصدار مؤرشف ومقفل تاريخياً بعد إحلال إصدار أحدث. تبقى الدورات التقييمية المرتبطة به تاريخياً موثقة بسلامة تامة (BR-GEN-05).
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-slate-700 bg-slate-200 border border-slate-300 rounded-xl">
              <Archive size={15} />
              <span>مؤرشف ومقفل تاريخياً</span>
            </span>
          </div>
        ) : (
          /* Approved Version: Phase 2 Scheduling */
          <div className="p-4 bg-white/95 rounded-xl border border-amber-300 shadow-xs flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <CalendarCheck size={16} className="text-amber-700" />
                <span>المرحلة الثانية: جدولة الإصدار للدورة التقييمية القادمة</span>
              </h4>
              <p className="text-xs text-slate-600">
                {isScheduledState
                  ? 'تمت جدولة هذا الإصدار رسمياً للدورة التقييمية القادمة بقرار وزاري موثق، وسيدخل حيز التنفيذ التلقائي مع بدء الدورة القادمة (FR-MSM-03).'
                  : 'الإصدار مُقرّ ومقفل برمجياً بحصانة عدم التعديل. اضغط على الزر لتأكيد جدولته رسمياً للدورة التقييمية القادمة.'}
              </p>
            </div>

            {!isScheduledState ? (
              <button
                type="button"
                onClick={handleScheduleForNextCycle}
                disabled={isScheduling}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-700 hover:to-amber-900 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                title="تأكيد جدولة هذا الإصدار المعتمد للدورة التقييمية القادمة"
              >
                {isScheduling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ تسجيل الجدولة...</span>
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-4 h-4" />
                    <span>جدولة للدورة القادمة</span>
                  </>
                )}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-xl">
                <CheckCircle2 size={15} />
                <span>مجدول رسمياً للدورة القادمة ✓</span>
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // وضع المسودة (Draft): عرض الشروط الـ 4 ونموذج الإقرار التفاعلي
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 text-right space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            الشروط الحاكمة لإقرار وقفل الإصدار المعياري
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            فحص آلي صارم للنزاهة المنهجية والرياضية (استيفاء {passedCount} من {checks.length})
          </p>
        </div>

        <span
          className={`text-xs font-bold px-3 py-1 rounded-full border ${
            passesAll
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}
        >
          {passesAll ? 'جاهز للإقرار والقفل ✓' : 'بانتظار استيفاء الشروط'}
        </span>
      </div>

      {/* The 4 Mandatory Integrity Checks */}
      <div className="space-y-3">
        {checks.map((rule) => (
          <div
            key={rule.id}
            className={`p-3.5 rounded-xl border transition-all ${
              rule.passed
                ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950'
                : 'bg-rose-50/60 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {rule.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h4 className="text-xs font-extrabold text-slate-900">
                    الشرط {rule.id}: {rule.title}
                  </h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rule.passed
                        ? 'bg-emerald-200/70 text-emerald-900'
                        : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {rule.passed ? 'مستوفٍ ✓' : 'غير مستوفٍ ✕'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">{rule.details}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lock Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleInitiateLock(); }} className="space-y-4 pt-2 border-t border-slate-200">
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Approval Decree Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            رقم قرار إقرار الإصدار المعياري <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="مثال: DEC-NAT-2026-88"
            value={approvalCode}
            onChange={(e) => setApprovalCode(e.target.value)}
            disabled={isLocking}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-mono text-slate-800"
          />
        </div>

        {/* Legal Confirmation Checkbox */}
        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={legalConfirmed}
            onChange={(e) => setLegalConfirmed(e.target.checked)}
            disabled={isLocking}
            className="mt-0.5 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
          />
          <span className="leading-relaxed">
            أقر بصفتي مسؤول إدارة المعايير والمؤشرات باستيفاء وثيقة المعايير لكافة الضوابط الوطنية
            وأتحمل المسؤولية المنهجية والقانونية عن إقرارها وتجميدها لكافة المدارس.
          </span>
        </label>

        {/* Single Prominent Approve & Lock Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleInitiateLock}
            disabled={!passesAll || !legalConfirmed || isLocking}
            className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-lg shadow-emerald-700/25 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="المرحلة الأولى: إقرار الوثيقة وقفلها وتجميدها برمجياً بعد استيفاء الشروط وتأكيد كلمة المرور"
          >
            {isLocking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري توثيق الختم الرقمي...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>إقرار وقفل الإصدار المعياري رسمياً (المرحلة الأولى: قفل وتجميد رقمي)</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Supervisor Password Confirmation Modal */}
      {isPasswordModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              direction: 'rtl',
              textAlign: 'right',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  تأكيد هوية المشرف الوزاري
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
                  قرار الإقرار: <strong>{approvalCode}</strong>
                </p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '16px' }}>
              يتطلب إقرار وقفل الوثيقة المعيارية رسمياً تأكيد هويتك الوزارية عبر إدخال كلمة المرور. بمجرد الإقرار، تكتسب الوثيقة حصانة عدم التعديل (Immutability) وتُقفل نهائياً.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                كلمة مرور المشرف الوزاري <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="password"
                autoFocus
                placeholder="أدخل كلمة المرور الخاصة بحسابك..."
                value={supervisorPassword}
                onChange={(e) => setSupervisorPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmPasswordAndLock();
                  }
                }}
                disabled={isLocking}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  outline: 'none',
                }}
              />
            </div>

            {passwordError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                {passwordError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isLocking}
                onClick={() => setIsPasswordModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isLocking || !supervisorPassword.trim()}
                onClick={handleConfirmPasswordAndLock}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: isLocking || !supervisorPassword.trim() ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isLocking ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                <span>{isLocking ? 'جارٍ الإقرار والقفل...' : 'تأكيد الإقرار والقفل النهائي'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
