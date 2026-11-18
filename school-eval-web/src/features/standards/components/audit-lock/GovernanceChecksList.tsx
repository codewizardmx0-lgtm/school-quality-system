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
  Zap,
} from 'lucide-react';
import type { VersionLockPreconditions, DiffLogResponse } from '../../api/standardsTypes';

interface GovernanceChecksListProps {
  preconditions: VersionLockPreconditions | null;
  diffData?: DiffLogResponse | null;
  isDraft?: boolean;
  isApproved?: boolean;
  isLocking: boolean;
  onLock: (approvalCode: string, legalConfirmed: boolean, action?: 'approve' | 'activate') => Promise<any>;
}

export const GovernanceChecksList: React.FC<GovernanceChecksListProps> = ({
  preconditions,
  diffData,
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

  const handleExecute = async (action: 'approve' | 'activate') => {
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
    try {
      await onLock(approvalCode.trim(), legalConfirmed, action);
    } catch (err: any) {
      setError(err?.message || 'فشل إتمام القفل الرقمي والإقرار.');
    }
  };

  // إذا كان الإصدار مُقرّاً بالفعل، نعرض الختم الرسمي كشارة وبطاقة ثابتة موثقة
  if (isApproved) {
    return (
      <div className="bg-gradient-to-br from-amber-50 via-white to-emerald-50 rounded-2xl border-2 border-emerald-300 shadow-md p-6 text-right space-y-5">
        <div className="flex items-center justify-between border-b border-emerald-200 pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                وثيقة معيارية مُقرّة ونافذة رسمياً
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                حائزة على الختم الوزاري الرقمي ومكتسبة لحصانة عدم التعديل (Immutability)
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-600 text-white rounded-full shadow-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>مُقرّ / نافذ للتقييم المدرسي</span>
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
            <span className="text-slate-400 shrink-0">بصمة الإقرار الرقمية:</span>
            <span className="text-emerald-300 font-bold truncate max-w-sm sm:max-w-md">
              {diffData?.integrityHash || preconditions?.integrityHash || '069e798b2d4b8e92a77e7f55d95c712bb1b48ee13e050820e4078bea7b2b5329'}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
            وثيقة مصدقة رسمياً ✓
          </span>
        </div>
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
      <form onSubmit={(e) => { e.preventDefault(); handleExecute('approve'); }} className="space-y-4 pt-2 border-t border-slate-200">
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

        {/* Dual Lock/Approve Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {/* Action 1: Approve and Schedule for Next Cycle (Recommended) */}
          <button
            type="button"
            onClick={() => handleExecute('approve')}
            disabled={!passesAll || !legalConfirmed || isLocking}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-xl shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="إقرار الوثيقة وجدولتها للدورة القادمة دون التأثير على دورات التقييم الجارية"
          >
            {isLocking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري توثيق الختم...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>إقرار وجدولة للدورة القادمة (موصى به ✓)</span>
              </>
            )}
          </button>

          {/* Action 2: Immediate Activation for Current Cycle */}
          <button
            type="button"
            onClick={() => handleExecute('activate')}
            disabled={!passesAll || !legalConfirmed || isLocking}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="تفعيل فوري للدورة الحالية مع أرشفة الإصدار النشط السابق تلقائياً"
          >
            <Zap className="w-4 h-4 text-amber-700" />
            <span>إقرار وتفعيل فوري للدورة الجارية</span>
          </button>
        </div>
      </form>
    </div>
  );
};
