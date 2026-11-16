/**
 * Tree Calculators & Mathematical Balance Utilities
 * معايرة حسابية للأوزان النسبية وفرض شرط التوازن الحتمي (المجموع = 100.0%)
 */

import type { StandardNode } from '../api/standardsTypes';

/**
 * حساب مجموع الأوزان بدقة خانتين عشريتين
 */
export function calculateTotalWeight(items: Array<{ weight: number }>): number {
  if (!items || items.length === 0) return 0;
  const sum = items.reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0);
  return Math.round(sum * 100) / 100;
}

/**
 * التحقق الحتمي من التوازن 100.0%
 */
export function isBalanced100(items: Array<{ weight: number }>): boolean {
  const sum = calculateTotalWeight(items);
  return Math.abs(sum - 100.0) < 0.05;
}

/**
 * إعادة توزيع الأوزان بالتساوي الرياضي الدقيق على المعايير السبعة
 * بمجموع 100.0% تام دون أي كسر فائض
 */
export function distributeWeightsEqually(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor((100 / count) * 10) / 10; // مثلاً 14.2
  const weights = new Array(count).fill(base);
  const currentSum = Math.round(weights.reduce((a, b) => a + b, 0) * 10) / 10;
  const remainder = Math.round((100 - currentSum) * 10) / 10;

  // إضافة الكسر المتبقي إلى المعيار الأول لضمان 100.0% تماماً
  if (remainder !== 0) {
    weights[0] = Math.round((weights[0] + remainder) * 10) / 10;
  }
  return weights;
}

/**
 * التوزيع الموصى به للاعتماد الأكاديمي الوطني (7 معايير)
 * 15%, 20%, 15%, 20%, 15%, 5%, 10% = 100%
 */
export const RECOMMENDED_WEIGHTS_7 = [15, 20, 15, 20, 15, 5, 10];

/**
 * احتساب الوزن النسبي الفرعي للمؤشر الواحد ضمن مجاله أو معياره
 */
export function calculateSubWeightPerIndicator(standardWeight: number, indicatorCount: number): number {
  if (!indicatorCount || indicatorCount <= 0) return 0;
  return Math.round((standardWeight / indicatorCount) * 100) / 100;
}

/**
 * إحصاء إجمالي المؤشرات في الشجرة
 */
export function countAllIndicators(standards: StandardNode[]): number {
  if (!standards) return 0;
  return standards.reduce((acc, std) => {
    const subCount = std.subStandards?.reduce((sAcc, sub) => sAcc + (sub.indicators?.length || 0), 0) || 0;
    return acc + subCount;
  }, 0);
}

/**
 * إحصاء إجمالي المعايير الفرعية (المجالات) في الشجرة
 */
export function countAllSubStandards(standards: StandardNode[]): number {
  if (!standards) return 0;
  return standards.reduce((acc, std) => acc + (std.subStandards?.length || 0), 0);
}
