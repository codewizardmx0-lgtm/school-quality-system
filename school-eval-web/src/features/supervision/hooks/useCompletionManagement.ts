/**
 * useCompletionManagement.ts
 * خطاف إدارة وصياغة طلبات الاستكمال الموجهة والفك الجزئي للمؤشرات
 */

import { useState } from 'react';
import { supervisionApi } from '../api/supervisionApi';
import type {
  CompletionItemPayload,
  CreateCompletionRequestPayload,
  PreloadedCompletionItem,
} from '../api/supervisionTypes';

const DEFAULT_PRELOADED_ITEMS: PreloadedCompletionItem[] = [
  {
    indicatorId: 412,
    code: '4-1-2',
    title: 'تحليل نتائج الاختبارات الفصلية ورصد فجوات تعلم الطلاب',
    defectReason: 'نقص وثيقة الشاهد الميداني ومحضر المعالجة الفصلية المعتمد',
    grantedPermission: 'استبدال / رفع الشاهد والمبرر',
    directives: 'يرجى إرفاق المحضر المعتمد للاجتماع التحليلي مع نتائج الاختبارات التشخيصية.',
    evidenceLinkId: 881,
  },
  {
    indicatorId: 514,
    code: '5-1-4',
    title: 'تفعيل مجتمعات التعلم المهنية لمعلمي المواد الأساسية',
    defectReason: 'نقص محضر التنفيذ الأخير وتوقيع المشرف التربوي المقيم',
    grantedPermission: 'تحديث مرفق الشاهد',
    directives: 'تحديث مرفق الشاهد ليتضمن المحضر الأخير لجلسة التغذية الراجعة وتوقيع الإدارة.',
    evidenceLinkId: 882,
  },
];

export function useCompletionManagement(
  submissionId: number = 101,
  initialItems?: PreloadedCompletionItem[],
  onSuccess?: () => void
) {
  const [items, setItems] = useState<PreloadedCompletionItem[]>(
    initialItems && initialItems.length > 0 ? initialItems : DEFAULT_PRELOADED_ITEMS
  );

  const [notes, setNotes] = useState<string>(
    'يرجى استيفاء الشواهد المطلوبة والمحاضر المعتمدة في موعد أقصاه 14 يوماً من تاريخ هذا الإشعار ليتسنى استكمال مراجعة المخرج.'
  );

  const [deadlineDays, setDeadlineDays] = useState<number>(14);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // حساب تاريخ الانتهاء بناءً على مهلة الـ 14 يوماً
  const calculateDeadlineDate = (): string => {
    const date = new Date();
    date.setDate(date.getDate() + deadlineDays);
    return date.toISOString().split('T')[0];
  };

  const [deadlineDate, setDeadlineDate] = useState<string>(calculateDeadlineDate());

  // إضافة بند جديد
  const addItem = (item: PreloadedCompletionItem) => {
    setItems((prev) => [...prev, item]);
  };

  // حذف بند
  const removeItem = (indicatorId: number) => {
    setItems((prev) => prev.filter((i) => i.indicatorId !== indicatorId));
  };

  // تعديل بند
  const updateItem = (indicatorId: number, field: keyof PreloadedCompletionItem, value: any) => {
    setItems((prev) =>
      prev.map((i) => (i.indicatorId === indicatorId ? { ...i, [field]: value } : i))
    );
  };

  // إرسال طلب الاستكمال للمدرسة
  const handleSendRequest = async () => {
    if (items.length === 0) {
      setErrorMessage('يجب تضمين بند استكمال واحد على الأقل لإصدار الطلب.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payloadItems: CompletionItemPayload[] = items.map((i) => ({
        indicatorId: i.indicatorId,
        missingDescription: i.defectReason,
        evidenceLinkId: i.evidenceLinkId ?? null,
        defectReason: i.defectReason,
        directives: i.directives,
        grantedPermission: i.grantedPermission,
      }));

      const payload: CreateCompletionRequestPayload = {
        notes,
        completionDeadline: new Date(deadlineDate).toISOString(),
        items: payloadItems,
      };

      await supervisionApi.createCompletionRequest(submissionId, payload);
      setSuccessMessage('تم إصدار طلب الاستكمال الرسمي وتوجيهه للمدرسة بنجاح.');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'تعذر إصدار طلب الاستكمال.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    items,
    itemsCount: items.length,
    notes,
    setNotes,
    deadlineDays,
    setDeadlineDays,
    deadlineDate,
    setDeadlineDate,
    addItem,
    removeItem,
    updateItem,
    handleSendRequest,
    isSubmitting,
    errorMessage,
    successMessage,
  };
}
