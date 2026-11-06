import { useState, useEffect, useCallback } from 'react';
import { evaluatorApi } from '../api/evaluatorApi';
import type {
  EvidenceItem,
  EvidenceVaultStats,
  UploadEvidencePayload,
} from '../api/evaluationTypes';

export function useEvidences(initialStandardId?: number) {
  const [evidences, setEvidences] = useState<EvidenceItem[]>([]);
  const [vaultStats, setVaultStats] = useState<EvidenceVaultStats | null>(null);
  const [selectedStandardFilter, setSelectedStandardFilter] = useState<number | undefined>(initialStandardId);
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchEvidences = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await evaluatorApi.getEvidences(
        selectedStandardFilter,
        selectedFormatFilter || undefined
      );
      setEvidences(res.evidences);
      setVaultStats(res.vaultStats);
    } catch (err) {
      console.error('Failed to load evidences:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStandardFilter, selectedFormatFilter]);

  useEffect(() => {
    fetchEvidences();
  }, [fetchEvidences]);

  // رفع شاهد جديد أو استبدال بنسخة جديدة مع شريط التقدم
  const uploadEvidenceFile = useCallback(
    async (payload: UploadEvidencePayload) => {
      // التحقق من الحجم
      const maxSizeBytes = 25 * 1024 * 1024;
      if (payload.file.size > maxSizeBytes) {
        setUploadError('حجم الملف يتجاوز الحد الأقصى المسموح (25 ميجابايت).');
        throw new Error('حجم الملف يتجاوز الحد الأقصى المسموح (25 ميجابايت).');
      }

      // التحقق من نوع الملف
      const allowedMimes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.ms-excel',
      ];
      if (!allowedMimes.includes(payload.file.type)) {
        setUploadError('نوع الملف غير مسموح. يُسمح فقط بملفات PDF و Word و Excel والصور (PNG/JPG).');
        throw new Error('نوع الملف غير مسموح.');
      }

      setIsUploading(true);
      setUploadProgress(10);
      setUploadError(null);

      // محاكاة تقدم الرفع الميداني السلس
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressTimer);
            return 85;
          }
          return prev + 25;
        });
      }, 150);

      try {
        const result = await evaluatorApi.uploadEvidence(payload);
        clearInterval(progressTimer);
        setUploadProgress(100);

        // إضافة الشاهد تفاؤلياً للمستودع
        const newEvidenceItem: EvidenceItem = {
          id: result.versionId,
          documentId: result.documentId,
          title: result.title,
          fileName: result.fileName,
          mimeType: payload.file.type,
          fileSize: payload.file.size,
          formattedSize: (payload.file.size / (1024 * 1024)).toFixed(2) + ' MB',
          versionNumber: result.versionNumber,
          standardCode: 'STD-01',
          standardName: 'القيادة والإدارة المدرسية',
          indicatorCode: 'IND-01-01',
          indicatorTitle: 'شاهد موثق حديثاً',
          uploadedAt: new Date().toISOString().split('T')[0],
          uploadedBy: 'عمار عمر عبدالله',
          verificationStatus: 'Compliant',
          verificationStatusArabic: 'مطابق ومعتمد داخلياً',
        };

        setEvidences((prev) => {
          if (payload.documentId) {
            // تحديث المستند القائم ببيانات الإصدار الأحدث
            return prev.map((item) => (item.documentId === payload.documentId ? newEvidenceItem : item));
          }
          return [newEvidenceItem, ...prev];
        });

        // تحديث إحصاءات المستودع تفاؤلياً
        setVaultStats((prev) => {
          if (!prev) return null;
          const additionalMb = payload.file.size / (1024 * 1024);
          const newUsed = Number((prev.storageUsedMb + additionalMb).toFixed(2));
          return {
            ...prev,
            totalEvidences: payload.documentId ? prev.totalEvidences : prev.totalEvidences + 1,
            compliantEvidences: prev.compliantEvidences + 1,
            storageUsedMb: newUsed,
            storagePercentage: Number(((newUsed / prev.storageLimitMb) * 100).toFixed(1)),
          };
        });

        return result;
      } catch (err: unknown) {
        clearInterval(progressTimer);
        const msg = (err as Error)?.message || 'فشل في رفع الشاهد.';
        setUploadError(msg);
        throw err;
      } finally {
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      }
    },
    []
  );

  return {
    evidences,
    vaultStats,
    selectedStandardFilter,
    setSelectedStandardFilter,
    selectedFormatFilter,
    setSelectedFormatFilter,
    isLoading,
    isUploading,
    uploadProgress,
    uploadError,
    fetchEvidences,
    uploadEvidenceFile,
  };
}
