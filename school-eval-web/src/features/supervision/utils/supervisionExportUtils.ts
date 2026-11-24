/**
 * supervisionExportUtils.ts
 * أداة تصدير مصفوفات الإشراف والمتابعة إلى جداول Excel (.xlsx)
 * الامتثال الصارم للمعيار §7 من UI_STANDARDS.md:
 * - ملفات .xlsx حصراً باستخدام SheetJS (xlsx). يمنع منعاً باتاً تصدير ملفات CSV.
 * - تسمية موحدة مؤرخة بالصيغة: [report_name]_[YYYY-MM-DD]_[HH-mm].xlsx
 * - ترويسات عربية نقية وتنسيق اتجاه من اليمين إلى اليسار (RTL).
 */

import * as XLSX from 'xlsx';
import type {
  SchoolStatusMatrixRow,
  StandardMeanItem,
  IndicatorMeanItem,
  CentralSchoolsReportItem,
  HistoricalStandardDelta,
  HistoricalIndicatorDelta,
  ParticipatingSchoolItem,
  MilestoneEvent,
  SupervisorMemo,
} from '../api/supervisionTypes';

/**
 * تنسيق الطابع الزمني الموحد لأسماء الملفات: YYYY-MM-DD_HH-mm
 */
function getTimestampString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}`;
}

/**
 * 1. تصدير مصفوفة حالة المدارس الرباعية (Schools Status Matrix)
 */
export function exportSchoolsStatusMatrixToExcel(schools: SchoolStatusMatrixRow[]): void {
  const rows = schools.map((school, index) => ({
    'م': index + 1,
    'رمز المدرسة': school.schoolCode,
    'اسم المدرسة': school.schoolName,
    'المرحلة الدراسية': school.educationalStage,
    'المحافظة': school.governorate,
    'المديرية': school.directorate || 'غير محدد',
    'مدير المدرسة': school.principalName || 'غير محدد',
    'المقيم المدرسي': school.evaluatorName || 'غير محدد',
    'المؤشرات المقيمة': `${school.scoredIndicatorsCount ?? 0} من أصل ${school.totalIndicatorsCount ?? 109} (${school.selfEvaluationProgress}%)`,
    'تغطية متطلبات الشواهد': `${school.coveredRequirementsCount ?? 0} من أصل ${school.totalRequirementsCount ?? 278}`,
    'عدد الوثائق والمرفقات': `${school.documentsCount ?? 0} وثيقة (${school.evidenceCount ?? 0} رابط)`,
    'حالة المخرج': school.outputStatusArabic,
    'طلبات الاستكمال': school.completionRequestsCount > 0 ? `${school.completionRequestsCount} طلبات` : 'لا يوجد',
    'خطة التحسين': school.improvementPlanStatus,
    'تاريخ آخر رفع/إجراء': new Date(school.lastActionDate).toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!dir'] = 'rtl';

  // ضبط عروض الأعمدة
  worksheet['!cols'] = [
    { wch: 5 },  // م
    { wch: 14 }, // رمز المدرسة
    { wch: 32 }, // اسم المدرسة
    { wch: 18 }, // المرحلة
    { wch: 16 }, // المحافظة
    { wch: 16 }, // المديرية
    { wch: 22 }, // مدير المدرسة
    { wch: 22 }, // المقيم المدرسي
    { wch: 26 }, // المؤشرات المقيمة
    { wch: 24 }, // تغطية الشواهد
    { wch: 24 }, // عدد الوثائق والمرفقات
    { wch: 18 }, // حالة المخرج
    { wch: 18 }, // طلبات الاستكمال
    { wch: 18 }, // خطة التحسين
    { wch: 20 }, // تاريخ الإجراء
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'مصفوفة حالة المدارس');

  const fileName = `supervision_schools_matrix_${getTimestampString()}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * 2. تصدير مصفوفة التحليلات المركزية الوطنية الشاملة (3 أوراق عمل RTL)
 * - ورقة 1: ملخص المعايير والمراحل
 * - ورقة 2: التقرير المركزي لحالة المدارس ومخرجاتها (FR-SUP-15)
 * - ورقة 3: مصفوفة المؤشرات الـ 109 التفصيلية
 */
export function exportCentralStandardsMatrixToExcel(
  standards: StandardMeanItem[],
  centralSchools?: CentralSchoolsReportItem[],
  allIndicators?: IndicatorMeanItem[],
  _stageBreakdown?: Array<{ stage: string; averageScore: number; schoolsCount: number }>,
  _scopeSummary?: { governorate?: string; academicYear?: string; overallPercentage?: number; averageScore?: number }
): void {
  const workbook = XLSX.utils.book_new();

  // الورقة 1: ملخص المعايير السبعة ومقارنة المراحل
  const standardsRows = standards.map((item, index) => ({
    'م': index + 1,
    'رمز المعيار': item.code,
    'المعيار الوطني الرئيسي': item.name,
    'الوزن النسبي (%)': item.weight !== undefined ? `${item.weight}%` : '—',
    'عدد المؤشرات': item.indicatorsCount,
    'المتوسط الحسابي (0-3)': item.meanScore.toFixed(2),
    'نسبة التحقق': `${item.percentageAttainment.toFixed(1)}%`,
    'المستوى المعياري': item.benchmarkLevel,
  }));

  const worksheet1 = XLSX.utils.json_to_sheet(standardsRows);
  worksheet1['!dir'] = 'rtl';
  worksheet1['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 34 },
    { wch: 16 },
    { wch: 14 },
    { wch: 22 },
    { wch: 16 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet1, 'ملخص المعايير والمراحل');

  // الورقة 2: التقرير المركزي لحالة المدارس (FR-SUP-15)
  if (centralSchools && centralSchools.length > 0) {
    const schoolsRows = centralSchools.map((sch, index) => ({
      'م': index + 1,
      'رمز المدرسة': sch.schoolCode,
      'اسم المدرسة': sch.schoolName,
      'المرحلة الدراسية': sch.stage,
      'المديرية': sch.directorate,
      'المحافظة': sch.governorate,
      'حالة الملف الإشرافي': sch.statusLabel,
      'نسبة إنجاز المؤشرات (من 109)': `${sch.completionPercentage}%`,
      'المتوسط الحسابي (0-3)': sch.averageScore !== null ? sch.averageScore.toFixed(2) : '—',
      'طلبات الاستكمال الكلية': sch.completionRequestsCount,
      'طلبات الاستكمال المعلقة': sch.pendingRequestsCount,
      'تأخير آلي (قاعدة 80%)': sch.isDelayed ? 'نعم (متأخرة)' : 'لا',
    }));

    const worksheet2 = XLSX.utils.json_to_sheet(schoolsRows);
    worksheet2['!dir'] = 'rtl';
    worksheet2['!cols'] = [
      { wch: 5 },
      { wch: 14 },
      { wch: 32 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 24 },
      { wch: 24 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet2, 'التقرير المركزي للمدارس');
  }

  // الورقة 3: مصفوفة المؤشرات الـ 109 التفصيلية
  const indicatorsList = allIndicators && allIndicators.length > 0
    ? allIndicators
    : standards.flatMap((s) => s.indicators || []);

  if (indicatorsList.length > 0) {
    const indicatorsRows = indicatorsList.map((ind, index) => ({
      'م': index + 1,
      'رمز المؤشر': ind.code,
      'اسم المؤشر الوطني': ind.name,
      'المعيار الرئيسي': ind.standardName,
      'المعيار الفرعي': ind.subStandardName,
      'المتوسط الحسابي (0-3)': ind.meanScore.toFixed(2),
      'نسبة التحقق': `${ind.percentageAttainment.toFixed(1)}%`,
      'المستوى المعياري': ind.benchmarkLevel,
      'عدد المدارس المقيمة': ind.evaluatedCount,
    }));

    const worksheet3 = XLSX.utils.json_to_sheet(indicatorsRows);
    worksheet3['!dir'] = 'rtl';
    worksheet3['!cols'] = [
      { wch: 5 },
      { wch: 14 },
      { wch: 42 },
      { wch: 28 },
      { wch: 28 },
      { wch: 20 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet3, 'مصفوفة المؤشرات الـ 109');
  }

  const fileName = `central_analytics_matrix_${getTimestampString()}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * 3. تصدير مصفوفة المقارنة التاريخية التراكمية (Historical Comparison Matrix)
 */
export function exportHistoricalComparisonToExcel(
  schoolName: string,
  baseCycle: string,
  comparedCycle: string,
  standardsDeltas: HistoricalStandardDelta[],
  indicatorsDeltas?: HistoricalIndicatorDelta[]
): void {
  // ورقة 1: ملخص المعايير السبعة
  const standardsRows = standardsDeltas.map((item, index) => ({
    'م': index + 1,
    'رمز المعيار': item.code || `STD-0${index + 1}`,
    'المعيار الوطني الرئيسي': item.name,
    'الوزن النسبي (%)': item.weight ? `${item.weight}%` : '—',
    [`الدورة السابقة (${comparedCycle})`]: item.previousScore.toFixed(2),
    [`الدورة الحالية (${baseCycle})`]: item.currentScore.toFixed(2),
    'الفارق (Delta)': item.delta >= 0 ? `+${item.delta.toFixed(2)}` : item.delta.toFixed(2),
    'اتجاه الأداء': item.trend === 'up' ? 'نمو إيجابي ↑' : item.trend === 'down' ? 'تراجع ↓' : 'مستقر =',
  }));

  const stdSheet = XLSX.utils.json_to_sheet(standardsRows);
  stdSheet['!dir'] = 'rtl';
  stdSheet['!cols'] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 36 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, stdSheet, 'ملخص المعايير السبعة');

  // ورقة 2: مصفوفة المؤشرات الـ 109
  if (indicatorsDeltas && indicatorsDeltas.length > 0) {
    const indicatorsRows = indicatorsDeltas.map((ind, index) => ({
      'م': index + 1,
      'رمز المؤشر': ind.code,
      'عنوان المؤشر التفصيلي': ind.name,
      'المعيار الرئيسي': ind.standardName || '—',
      'المعيار الفرعي': ind.subStandardName || '—',
      [`درجة السابقة (${comparedCycle})`]: ind.previousScore,
      [`درجة الحالية (${baseCycle})`]: ind.currentScore,
      'الفارق (Delta)': ind.delta >= 0 ? `+${ind.delta}` : `${ind.delta}`,
      'حالة الاتجاه':
        ind.trend === 'improved'
          ? 'تحسن ↑'
          : ind.trend === 'regressed'
          ? 'تراجع ↓'
          : ind.trend === 'maintained'
          ? 'ثبات ='
          : ind.trend === 'new'
          ? 'مستحدث 🆕'
          : 'مستبعد',
    }));

    const indSheet = XLSX.utils.json_to_sheet(indicatorsRows);
    indSheet['!dir'] = 'rtl';
    indSheet['!cols'] = [
      { wch: 5 },
      { wch: 14 },
      { wch: 45 },
      { wch: 26 },
      { wch: 26 },
      { wch: 20 },
      { wch: 20 },
      { wch: 14 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(workbook, indSheet, 'مصفوفة المؤشرات الـ 109');
  }

  const safeSchoolName = schoolName.replace(/[\\/:*?"<>|]/g, '_');
  const fileName = `historical_comparison_${safeSchoolName}_${getTimestampString()}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * 4. تصدير كشف المدارس المشاركة في الدورة التقييمية (Cycle Participating Schools)
 */
export function exportCycleParticipatingSchoolsToExcel(
  cycleName: string,
  academicYear: string,
  schools: ParticipatingSchoolItem[]
): void {
  const rows = schools.map((school, index) => ({
    'م': index + 1,
    'رمز المدرسة': school.schoolCode,
    'اسم المدرسة': school.schoolName,
    'المرحلة الدراسية': school.stage || 'غير محدد',
    'المحافظة': school.governorate || 'غير محدد',
    'المديرية': school.district || 'غير محدد',
    'تاريخ التسجيل بالدورة': school.enrolledAt
      ? new Date(school.enrolledAt).toLocaleDateString('ar-YE', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'غير محدد',
    'الدورة التقييمية': cycleName,
    'حالة القيد': 'مسجلة بالدورة',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!dir'] = 'rtl';

  worksheet['!cols'] = [
    { wch: 5 },  // م
    { wch: 15 }, // رمز المدرسة
    { wch: 34 }, // اسم المدرسة
    { wch: 20 }, // المرحلة الدراسية
    { wch: 18 }, // المحافظة
    { wch: 18 }, // المديرية
    { wch: 22 }, // تاريخ التسجيل
    { wch: 32 }, // الدورة التقييمية
    { wch: 18 }, // حالة القيد
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'المدارس المشاركة');

  const safeYear = academicYear.replace(/[\\/:*?"<>|]/g, '_');
  const fileName = `cycle_schools_${safeYear}_${getTimestampString()}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * 5. تصدير سجل المتابعة الميدانية والخط الزمني والمذكرات (School Tracking Log)
 */
export function exportTrackingLogToExcel(params: {
  schoolName: string;
  schoolCode: string;
  governorate?: string;
  milestones: MilestoneEvent[];
  memos: SupervisorMemo[];
}): void {
  const { schoolName, schoolCode, governorate, milestones, memos } = params;

  // ورقة 1: سجل المحطات والتدخلات الميدانية
  const milestoneRows = milestones.map((item, index) => ({
    'م': index + 1,
    'نوع المحطة': item.statusBadge || item.eventType,
    'العنوان': item.title,
    'تفاصيل الإجراء والملاحظات': item.description,
    'القائم بالإجراء': item.actorName,
    'الدور الوظيفي': item.actorRole,
    'التصنيف': item.actorType === 'school' ? 'المدرسة' : item.actorType === 'system' ? 'النظام الآلي' : 'المشرف الوزاري',
    'انتقال الحالة': item.stateTransition ? `${item.stateTransition.from} ← ${item.stateTransition.to}` : 'غير محدد',
    'الدورة التقييمية': item.cycleName || 'الدورة النشطة',
    'التاريخ والوقت': new Date(item.timestamp).toLocaleString('ar-YE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  const wsMilestones = XLSX.utils.json_to_sheet(milestoneRows);
  wsMilestones['!dir'] = 'rtl';
  wsMilestones['!cols'] = [
    { wch: 5 },  // م
    { wch: 18 }, // نوع المحطة
    { wch: 35 }, // العنوان
    { wch: 45 }, // التفاصيل
    { wch: 22 }, // القائم بالإجراء
    { wch: 18 }, // الدور الوظيفي
    { wch: 15 }, // التصنيف
    { wch: 35 }, // انتقال الحالة
    { wch: 25 }, // الدورة
    { wch: 24 }, // التاريخ
  ];

  // ورقة 2: المذكرات والزيارات الرسمية
  const memoRows = memos.map((memo, index) => ({
    'م': index + 1,
    'نوع الإجراء': memo.memoType,
    'موضوع المذكرة': memo.subject,
    'نص وتفاصيل المذكرة / التقرير': memo.details,
    'المشرف الوزاري': memo.authorName,
    'الظهور للمدرسة': memo.isVisibleToSchool ? 'نعم (ظاهرة للمدرسة)' : 'لا (داخلية)',
    'تاريخ التوثيق': new Date(memo.createdAt).toLocaleString('ar-YE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  const wsMemos = XLSX.utils.json_to_sheet(memoRows);
  wsMemos['!dir'] = 'rtl';
  wsMemos['!cols'] = [
    { wch: 5 },  // م
    { wch: 20 }, // نوع الإجراء
    { wch: 30 }, // الموضوع
    { wch: 50 }, // التفاصيل
    { wch: 22 }, // المشرف
    { wch: 20 }, // الظهور للمدرسة
    { wch: 24 }, // التاريخ
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsMilestones, 'سجل المحطات والتدخلات');
  XLSX.utils.book_append_sheet(workbook, wsMemos, 'المذكرات والزيارات الميدانية');

  const safeName = (schoolName ? `${schoolName}_${schoolCode}` : schoolCode || 'SCH')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_');
  const govSuffix = governorate ? `_${governorate.replace(/\s+/g, '_')}` : '';
  const fileName = `tracking_log_${safeName}${govSuffix}_${getTimestampString()}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
