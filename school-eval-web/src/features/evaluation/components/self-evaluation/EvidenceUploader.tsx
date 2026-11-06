import React, { useState, useRef } from 'react';
import type { LinkedEvidenceBrief } from '../../api/evaluationTypes';
import { UploadCloud, File, RefreshCw, AlertCircle } from 'lucide-react';

interface EvidenceUploaderProps {
  indicatorId?: number;
  evidenceLinks: LinkedEvidenceBrief[];
  onUploadFile: (file: File, notes?: string, documentId?: number) => Promise<unknown>;
  isUploading?: boolean;
  uploadProgress?: number;
  readOnly?: boolean;
}

export const EvidenceUploader: React.FC<EvidenceUploaderProps> = ({
  evidenceLinks,
  onUploadFile,
  isUploading = false,
  uploadProgress = 0,
  readOnly = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [replaceDocId, setReplaceDocId] = useState<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!readOnly) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (readOnly) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);
    const maxSizeBytes = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSizeBytes) {
      setErrorMessage('حجم الملف يتجاوز الحد الأقصى المسموح به (25 ميجابايت).');
      return;
    }

    try {
      await onUploadFile(file, 'تم الرفع من شاشة رصد المؤشر', replaceDocId);
      setReplaceDocId(undefined);
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || 'فشل في رفع الملف.');
    }
  };

  const triggerSelectFile = (docIdToReplace?: number) => {
    if (readOnly) return;
    setReplaceDocId(docIdToReplace);
    fileInputRef.current?.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>
          الشواهد والأدلة الميدانية الداعمة للرصد (PDF, PNG, JPG, Word, Excel - بحد أقصى 25MB)
        </label>
        <span style={{ fontSize: '12px', color: '#64748B' }}>
          {evidenceLinks.length} مستندات مرفقة
        </span>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
        style={{ display: 'none' }}
      />

      {/* Drag & Drop Upload Zone */}
      {!readOnly && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => triggerSelectFile()}
          style={{
            border: `2px dashed ${isDragOver ? '#059669' : '#CBD5E1'}`,
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            backgroundColor: isDragOver ? '#ECFDF5' : '#F8FAFC',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px',
            }}
          >
            <UploadCloud size={24} />
          </div>

          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E293B' }}>
            اسحب وأفلت ملف الشاهد هنا، أو اضغط للاستعراض
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
            يتم تسجيل الإصدار تلقائياً (الإصدار 1، 2...) دون حذف النسخ السابقة
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div style={{ marginTop: '16px', maxWidth: '320px', margin: '16px auto 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#059669', marginBottom: '4px', fontWeight: 700 }}>
                <span>جاري الرفع والتوثيق الرقمي...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: '#059669', transition: 'width 0.2s' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message if any */}
      {errorMessage && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Attached Evidences List */}
      {evidenceLinks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {evidenceLinks.map((link) => (
            <div
              key={link.linkId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <File size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E293B' }}>
                    {link.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', gap: '8px' }}>
                    <span>{link.fileName}</span>
                    <span>•</span>
                    <span style={{ color: '#059669', fontWeight: 600 }}>الإصدار v{link.versionNumber}</span>
                  </div>
                </div>
              </div>

              {!readOnly && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => triggerSelectFile(link.documentId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    title="رفع نسخة بديلة دون حذف النسخ السابقة"
                  >
                    <RefreshCw size={12} />
                    استبدال بنسخة أحدث
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
