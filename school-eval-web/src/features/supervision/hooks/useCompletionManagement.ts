/**
 * useCompletionManagement.ts
 * خطاف إدارة وصياغة طلبات الاستكمال الموجهة والفك الجزئي للمؤشرات
 * منصة ارتقاء للتقييم والتحسين المدرسي
 */

import { useState, useEffect } from 'react';
import { supervisionApi } from '../api/supervisionApi';
import { extractApiErrorMessage } from '../../../api/apiTypes';
import type {
  CompletionItemPayload,
  CreateCompletionRequestPayload,
  PreloadedCompletionItem,
} from '../api/supervisionTypes';

export function useCompletionManagement(
  initialSubmissionId?: number,
  initialItems?: PreloadedCompletionItem[],
  onSuccess?: () => void
) {
  const [submissionId, setSubmissionId] = useState<number | undefined>(initialSubmissionId);
  const [items, setItems] = useState<PreloadedCompletionItem[]>(
    initialItems && initialItems.length > 0 ? initialItems : []
  );

  useEffect(() => {
    if (initialSubmissionId) {
      void Promise.resolve().then(() => setSubmissionId(initialSubmissionId));
    }
  }, [initialSubmissionId]);

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      void Promise.resolve().then(() => setItems(initialItems));
    }
  }, [initialItems]);

  const [notes, setNotes] = useState<string>(
    'يرجى استيفاء الشواهد المطلوبة والمحاضر المعتمدة في موعد أقصاه 14 يوماً من تاريخ هذا الإشعار ليتسنى استكمال مراجعة المخرج.'
  );

  const [deadlineDays, setDeadlineDays] = useState<number>(14);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // حساب تاريخ الانتهاء بناءً على مهلة الـ 14 يوماً
  const calculateDeadlineDate = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const [deadlineDate, setDeadlineDate] = useState<string>(() => calculateDeadlineDate(14));

  const updateDeadlineDays = (days: number) => {
    setDeadlineDays(days);
    setDeadlineDate(calculateDeadlineDate(days));
  };

  // إضافة بند جديد
  const addItem = (item: PreloadedCompletionItem) => {
    setItems((prev) => {
      // تفادي التكرار
      if (prev.some((i) => i.indicatorId === item.indicatorId)) {
        return prev;
      }
      return [...prev, item];
    });
  };

  // تعيين بنود مسبقة كاملة
  const setItemsList = (newItems: PreloadedCompletionItem[]) => {
    setItems(newItems);
  };

  // حذف بند
  const removeItem = (indicatorId: number) => {
    setItems((prev) => prev.filter((i) => i.indicatorId !== indicatorId));
  };

  // تعديل بند
  const updateItem = <K extends keyof PreloadedCompletionItem>(
    indicatorId: number,
    field: K,
    value: PreloadedCompletionItem[K]
  ) => {
    setItems((prev) =>
      prev.map((i) => (i.indicatorId === indicatorId ? { ...i, [field]: value } : i))
    );
  };

  // إرسال طلب الاستكمال للمدرسة
  const handleSendRequest = async (overrideSubmissionId?: number) => {
    const targetSubmissionId = overrideSubmissionId || submissionId;

    if (!targetSubmissionId) {
      setErrorMessage('يرجى اختيار مدرسة أو مخرج مؤهل أولاً لإصدار طلب الاستكمال.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('يجب تضمين مؤشر استكمال واحد على الأقل لإصدار الطلب.');
      return;
    }

    // التحقق من تعبئة أسباب الخلل
    const emptyDefect = items.find((i) => !i.defectReason || !i.defectReason.trim());
    if (emptyDefect) {
      setErrorMessage(`يرجى كتابة سبب الخلل أو النقص للمؤشر (${emptyDefect.code || emptyDefect.title}).`);
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
        allowedActions: i.allowedActions && i.allowedActions.length > 0 ? i.allowedActions : ['upload_replace_evidence'],
        categories: i.categories,
      }));

      const payload: CreateCompletionRequestPayload = {
        notes,
        completionDeadline: new Date(deadlineDate).toISOString(),
        items: payloadItems,
      };

      await supervisionApi.createCompletionRequest(targetSubmissionId, payload);
      setSuccessMessage('تم إصدار طلب الاستكمال الرسمي وتوجيهه للمدرسة بنجاح.');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      setErrorMessage(extractApiErrorMessage(err, 'تعذر إصدار طلب الاستكمال.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submissionId,
    setSubmissionId,
    items,
    setItemsList,
    itemsCount: items.length,
    notes,
    setNotes,
    deadlineDays,
    updateDeadlineDays,
    deadlineDate,
    setDeadlineDate,
    addItem,
    removeItem,
    updateItem,
    handleSendRequest,
    isSubmitting,
    errorMessage,
    setErrorMessage,
    successMessage,
  };
}
