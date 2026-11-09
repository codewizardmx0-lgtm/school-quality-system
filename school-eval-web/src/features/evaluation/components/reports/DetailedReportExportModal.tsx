import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  Calendar,
  ShieldCheck,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';

export interface DetailedReportStats {
  completionRate?: number;
  scoredIndicatorsCount?: number;
  totalIndicatorsCount?: number;
  totalEvidencesCount?: number;
}

interface DetailedReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats?: DetailedReportStats | null;
  schoolName?: string;
  schoolCode?: string;
}

export const DetailedReportExportModal: React.FC<DetailedReportExportModalProps> = ({
  isOpen,
  onClose,
  stats,
  schoolName = 'مدرسة الفاروق النموذجية',
  schoolCode = 'SCH-2026-001',
}) => {
  const [downloadingType, setDownloadingType] = useState<'pdf' | 'excel' | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleExportPdf = async () => {
    try {
      setDownloadingType('pdf');
      setFeedbackMsg(null);
      await evaluatorApi.exportDetailedReportPdf();
      setFeedbackMsg({
        type: 'success',
        text: 'تم توليد وتنزيل استمارة التقرير المفصلة (PDF) بنجاح.',
      });
    } catch (err: unknown) {
      console.error('Failed to export detailed PDF report', err);
      setFeedbackMsg({
        type: 'error',
        text: 'حدث خطأ أثناء توليد ملف الـ PDF. يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setDownloadingType(null);
    }
  };

  const handleExportExcel = async () => {
    try {
      setDownloadingType('excel');
      setFeedbackMsg(null);
      await evaluatorApi.exportDetailedReportExcel();
      setFeedbackMsg({
        type: 'success',
        text: 'تم تجهيز وتنزيل مصفوفة التقييم الشاملة (Excel) بنجاح.',
      });
    } catch (err: unknown) {
      console.error('Failed to export detailed Excel report', err);
      setFeedbackMsg({
        type: 'error',
        text: 'حدث خطأ أثناء تجهيز مصنف الـ Excel. يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setDownloadingType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* ترويسة النافذة */}
        <div className="px-6 py-4 bg-gradient-to-l from-teal-800 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
              <FileText className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">استمارة التقرير المفصلة لتقويم المدرسة</h2>
              <p className="text-xs text-teal-100 font-medium">ملف الاعتماد والتقييم الذاتي الشامل (Detailed Dossier)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* جسم النافذة وقسم المعاينة المسبقة */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700">
          {/* بطاقة المدرسة المختصرة */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-700" />
              <span className="font-semibold text-slate-800">{schoolName}</span>
              <span className="text-slate-400">|</span>
              <span className="font-mono text-slate-500">{schoolCode}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>العام الدراسي: 2025/2026</span>
            </div>
          </div>

          {/* لوحة محتويات التقرير المفصل (Preview Info) */}
          <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2.5 text-teal-900 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>محتويات ومكونات الاستمارة المفصلة قبل التصدير:</span>
            </div>
            <p className="text-xs text-teal-800 leading-relaxed mb-3">
              سيتم توليد ملف توثيقي واعتمادي كامل يتضمن أدق تفاصيل التقييم الميداني والشواهد الرسمية المودعة:
            </p>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>مصفوفة المؤشرات الوطنية الـ 109 كاملة:</strong> مرتبة حسب المعايير الرئيسية والفرعية مع رمز كل مؤشر ونصه الصريح.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>المستويات المرصودة الرسمية:</strong> التقدير المعتمد (المستوى 3: متحقق، 2: بدرجة متوسطة، 1: بدرجة ضعيفة، 0: غير متوفر).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>سجل الشواهد والوثائق المرفقة:</strong> تعداد وعناوين الملفات المربوطة بكل مؤشر لإثبات الكفاية التوثيقية.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>أدوات التحقق وتبريرات المقيم:</strong> تدوين أداة الفحص (ملاحظة، مقابلات، فحص سجلات) مع ملاحظات وتبريرات الرصد.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>مقارنة المجالات السبعة وتوزيع المستويات:</strong> رسوم بيانية وأوزان المعايير النسبية ومتوسطات النقاط من 3.00.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <span>
                  <strong>التوقيعات والاعتماد الرسمي:</strong> خانات مخصصة لختم وتوقيع مقيم المدرسة، مدير المدرسة، والمشرف الوزاري.
                </span>
              </li>
            </ul>
          </div>

          {/* لقطة سريعة من البيانات الحالية */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div className="text-[11px] text-slate-500 mb-1">نسبة استيفاء الرصد</div>
                <div className="text-base font-bold text-teal-700">
                  {Math.round(stats.completionRate || 0)}%
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div className="text-[11px] text-slate-500 mb-1">المؤشرات المرصودة</div>
                <div className="text-base font-bold text-sky-700">
                  {stats.scoredIndicatorsCount || 0} / {stats.totalIndicatorsCount || 109}
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div className="text-[11px] text-slate-500 mb-1">إجمالي الشواهد المودعة</div>
                <div className="text-base font-bold text-indigo-700">
                  {stats.totalEvidencesCount || 0}
                </div>
              </div>
            </div>
          )}

          {/* رسائل التغذية الراجعة */}
          {feedbackMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}
        </div>

        {/* أزرار وخيارات التصدير (PDF / Excel) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500">اختر صيغة التصدير المطلوبة:</span>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* خيار تصدير Excel */}
            <button
              onClick={handleExportExcel}
              disabled={downloadingType !== null}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {downloadingType === 'excel' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التجهيز...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>تصدير مصفوفة التقييم (Excel)</span>
                </>
              )}
            </button>

            {/* خيار تصدير PDF */}
            <button
              onClick={handleExportPdf}
              disabled={downloadingType !== null}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-800 text-white font-medium text-xs hover:bg-teal-900 active:bg-teal-950 transition-colors shadow-sm disabled:opacity-50"
            >
              {downloadingType === 'pdf' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التوليد...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>تحميل استمارة التقرير المفصلة (PDF)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
