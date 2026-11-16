import { useState, useEffect, useCallback } from 'react';
import { evaluatorApi } from '../api/evaluatorApi';
import type {
  EvidenceItem,
  EvidenceVaultStats,
  UploadEvidencePayload,
  VersionsArchiveData,
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

  // حالة سجل الإصدارات والأرشيف
  const [versionsArchive, setVersionsArchive] = useState<VersionsArchiveData | null>(null);
  const [isLoadingArchive, setIsLoadingArchive] = useState<boolean>(false);

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

  const fetchVersionsArchive = useCallback(async () => {
    setIsLoadingArchive(true);
    try {
      const data = await evaluatorApi.getVersionsArchive();
      setVersionsArchive(data);
    } catch (err) {
      console.error('Failed to load versions archive:', err);
    } finally {
      setIsLoadingArchive(false);
    }
  }, []);

  const pruneVersionFile = useCallback(async (versionId: number) => {
    await evaluatorApi.pruneVersionFile(versionId);
    await fetchVersionsArchive();
    await fetchEvidences();
  }, [fetchVersionsArchive, fetchEvidences]);

  useEffect(() => {
    fetchEvidences();
  }, [fetchEvidences]);

  // رفع شاهد جديد أو استبدال بنسخة جديدة مع شريط التقدم
  const uploadEvidenceFile = useCallback(
    async (payload: UploadEvidencePayload) => {
      // التحقق من الحجم (25 ميجابايت الموحد مع الباك إند)
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
      setUploadProgress(0);
      setUploadError(null);

      try {
        const result = await evaluatorApi.uploadEvidence(payload, (percent) => {
          setUploadProgress(percent);
        });
        setUploadProgress(100);

        // مزامنة حالة المستودع فورياً من الخادم لضمان دقة كامل الروابط
        await fetchEvidences();
        if (versionsArchive) {
          await fetchVersionsArchive();
        }

        return result;
      } catch (err: unknown) {
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
    [fetchEvidences, fetchVersionsArchive, versionsArchive]
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
    versionsArchive,
    isLoadingArchive,
    fetchVersionsArchive,
    pruneVersionFile,
  };
}
