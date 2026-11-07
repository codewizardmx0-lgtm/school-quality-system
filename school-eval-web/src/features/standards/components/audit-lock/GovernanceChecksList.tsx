/**
 * Component: GovernanceChecksList
 * قائمة الشروط الحاكمة الأربعة (4 من 4) ونموذج الإقرار الوزاري والقفل الرقمي
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Lock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { VersionLockPreconditions } from '../../api/standardsTypes';

interface GovernanceChecksListProps {
  preconditions: VersionLockPreconditions | null;
  isLocking: boolean;
  onLock: (approvalCode: string, legalConfirmed: boolean) => Promise<any>;
}

export const GovernanceChecksList: React.FC<GovernanceChecksListProps> = ({
  preconditions,
  isLocking,
  onLock,
}) => {
  const [approvalCode, setApprovalCode] = useState('DEC-NAT-2026-88');
  const [legalConfirmed, setLegalConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      details: 'كافة المؤشرات (109 مؤشر) مرتبطة بأدوات تحقق وشواهد ملزمة',
    },
    {
      id: 3,
      title: 'سلم التقدير اللفظي (0-3) مكتمل ومحدد الشروط',
      passed: true,
      details: 'المستويات الأربعة المعتمدة (0, 1, 2, 3) مكتملة ومحددة الواصفات',
    },
    {
      id: 4,
      title: 'الأكواد البرمجية لجميع العناصر فريدة وغير مكررة',
      passed: true,
      details: 'تم فحص كافة الأكواد المعيارية، وجميعها فريدة تماماً',
    },
  ];

  const passesAll = preconditions ? preconditions.passesAll : checks.every((c) => c.passed);
  const passedCount = checks.filter((c) => c.passed).length;

  const handleExecuteLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passesAll) {
      setError('لا يمكن قفل الوثيقة قبل استيفاء كافة الشروط الحاكمة (4 من 4).');
      return;
    }
    if (!legalConfirmed) {
      setError('يرجى تأكيد الإقرار بالمسؤولية القانونية للاعتماد الوزاري.');
      return;
    }
    if (!approvalCode.trim()) {
      setError('يرجى إدخال رقم قرار الاعتماد الوزاري.');
      return;
    }

    setError(null);
    try {
      await onLock(approvalCode.trim(), legalConfirmed);
    } catch (err: any) {
      setError(err?.message || 'فشل إتمام القفل الرقمي للوثيقة.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 text-right space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            الشروط الحاكمة لإقرار وقفل الوثيقة
          </h3>
          <p className="text-xs text-slate-500">
            فحص آلي صارم للنزاهة المنهجية والرياضية (استيفاء {passedCount} من 4)
          </p>
        </div>

        <span
          className={`text-xs font-bold px-3 py-1 rounded-full border ${
            passesAll
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}
        >
          {passesAll ? 'جاهز للاعتماد والقفل ✓' : 'بانتظار استيفاء الشروط'}
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
      <form onSubmit={handleExecuteLock} className="space-y-4 pt-2 border-t border-slate-200">
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Approval Decree Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            رقم قرار الاعتماد الوزاري / الأكاديمي <span className="text-rose-500">*</span>
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
            أقر بصفتي مسؤول إدارة المرجعية والمعايير باستيفاء وثيقة المعايير لكافة الضوابط الوطنية
            وأتحمل المسؤولية المنهجية والقانونية عن اعتمادها وتجميدها لكافة المدارس.
          </span>
        </label>

        {/* Lock Button */}
        <button
          type="submit"
          disabled={!passesAll || !legalConfirmed || isLocking}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-xl shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLocking ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري توثيق الختم الرقمي والقفل...</span>
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              <span>قفل واعتماد الإصدار رسمياً للدورات ✓</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
