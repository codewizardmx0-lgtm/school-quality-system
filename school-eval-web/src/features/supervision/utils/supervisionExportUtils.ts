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
  HistoricalStandardDelta,
  ParticipatingSchoolItem,
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
 * 2. تصدير مصفوفة متوسطات المعايير الوطنية (Central Standards Means)
 */
export function exportCentralStandardsMatrixToExcel(standards: StandardMeanItem[]): void {
  const rows = standards.map((item, index) => ({
    'م': index + 1,
    'رمز المعيار': item.code,
    'المعيار الوطني الرئيسي': item.name,
    'عدد المؤشرات': item.indicatorsCount,
    'المتوسط الحسابي (0-3)': item.meanScore.toFixed(2),
    'النسبة المئوية للتحقق': `${item.percentageAttainment.toFixed(1)}%`,
    'المستوى المعياري': item.benchmarkLevel,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!dir'] = 'rtl';

  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 34 },
    { wch: 16 },
    { wch: 24 },
    { wch: 24 },
    { wch: 20 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'مؤشرات المعايير الوطنية');

  const fileName = `standards_means_matrix_${getTimestampString()}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * 3. تصدير مصفوفة المقارنة التاريخية التراكمية (Historical Comparison Matrix)
 */
export function exportHistoricalComparisonToExcel(
  schoolName: string,
  baseCycle: string,
  comparedCycle: string,
  deltas: HistoricalStandardDelta[]
): void {
  const rows = deltas.map((item, index) => ({
    'م': index + 1,
    'المعيار': item.name,
    [`الدورة السابقة (${comparedCycle})`]: item.previousScore.toFixed(2),
    [`الدورة الحالية (${baseCycle})`]: item.currentScore.toFixed(2),
    'الفارق (Delta)': (item.delta >= 0 ? `+${item.delta.toFixed(2)}` : item.delta.toFixed(2)),
    'اتجاه الأداء': item.trend === 'up' ? 'نمو إيجابي ↑' : item.trend === 'down' ? 'تراجع ↓' : 'مستقر =',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!dir'] = 'rtl';

  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 32 },
    { wch: 24 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'مسار النمو التاريخي');

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
