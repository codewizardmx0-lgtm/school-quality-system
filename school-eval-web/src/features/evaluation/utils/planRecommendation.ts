import type { ImprovementSuggestion, AiInitiative, PlanType } from '../api/evaluationTypes';

export const getRecommendedPlanType = (
  item: ImprovementSuggestion | AiInitiative
): { type: PlanType; label: string; reason: string } => {
  const code = ('indicatorCode' in item ? item.indicatorCode || item.standardCode || '' : '').toUpperCase();
  const text = (
    'title' in item
      ? `${item.title} ${item.description || ''}`
      : `${item.standardName || ''} ${item.indicatorName || ''} ${item.suggestedName || ''}`
  ).toLowerCase();

  if (
    code.includes('STD-02') ||
    text.includes('معلم') ||
    text.includes('تدريب') ||
    text.includes('مهني') ||
    text.includes('كوادر') ||
    text.includes('تأهيل') ||
    text.includes('تدريسي')
  ) {
    return {
      type: 'StaffProfessionalDevelopment',
      label: 'خطة التطوير المهني والتربوي للكوادر',
      reason: 'يرتبط هذا الإجراء بالمعيار الثاني وتطوير الكفايات المهنية والتربوية للكوادر التعليمية والإدارية',
    };
  }

  if (
    text.includes('تشغيل') ||
    text.includes('سنوي') ||
    text.includes('مبنى') ||
    text.includes('مرافق') ||
    text.includes('تجهيزات') ||
    text.includes('أمن') ||
    text.includes('سلامة') ||
    text.includes('صيانة')
  ) {
    return {
      type: 'AnnualOperational',
      label: 'الخطة التشغيلية السنوية للمدرسة',
      reason: 'يرتبط هذا الإجراء بالعمليات والموارد التشغيلية والبيئة المادية للمدرسة',
    };
  }

  return {
    type: 'QualityImprovement',
    label: 'خطة تحسين الجودة المدرسية الشاملة',
    reason: 'يرتبط هذا الإجراء بمعايير نواتج التعليم والتعلم والفاعلية المؤسسية العامة',
  };
};
