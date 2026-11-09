import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, AlertCircle, FileCheck, Trash2 } from 'lucide-react';
import { theme } from '../../../../styles/theme';

interface UploadEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (payload: { file: File; title: string; notes?: string; documentId?: number }) => Promise<unknown>;
  documentIdToReplace?: number;
  initialTitle?: string;
  isUploading?: boolean;
  uploadProgress?: number;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB الموحد نظامياً

export const UploadEvidenceModal: React.FC<UploadEvidenceModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  documentIdToReplace,
  initialTitle = '',
  isUploading = false,
  uploadProgress = 0,
}) => {
  if (!isOpen) return null;

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>(initialTitle);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // توليد رابط معاينة محلية آمنة للصور فقط (PNG / JPG)
  useEffect(() => {
    if (file && (file.type.startsWith('image/') || /\.(png|jpe?g)$/i.test(file.name))) {
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setImagePreviewUrl(null);
    }
  }, [file]);

  const isReplacing = !!documentIdToReplace;

  const handleClose = () => {
    if (isUploading) return;
    setFile(null);
    setTitle(initialTitle);
    setNotes('');
    setError(null);
    setIsDragging(false);
    setImagePreviewUrl(null);
    onClose();
  };

  const validateAndSetFile = (selected: File) => {
    setError(null);

    // التحقق من الحجم
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setError(`حجم الملف (${(selected.size / (1024 * 1024)).toFixed(2)} ميجابايت) يتجاوز الحد الأقصى المسموح به (20 ميجابايت).`);
      return false;
    }

    // التحقق من الامتداد
    const fileName = selected.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    if (!hasValidExt) {
      setError('نوع الملف غير مدعوم. الصيغ المعتمدة: PDF, PNG, JPG, JPEG, Word (docx), Excel (xlsx).');
      return false;
    }

    setFile(selected);
    if (!title && !isReplacing) {
      setTitle(selected.name.replace(/\.[^/.]+$/, ''));
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('يرجى اختيار أو سحب ملف الشاهد للرفع.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('حجم الملف يتجاوز الحد الأقصى المسموح به (25 ميجابايت).');
      return;
    }

    try {
      await onUpload({
        file,
        title: title || file.name,
        notes,
        documentId: documentIdToReplace,
      });
      handleClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'فشل في رفع الملف.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
        direction: 'rtl',
        fontFamily: theme.typography.fontFamily.sans,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: theme.radii.xl,
          width: '100%',
          maxWidth: '540px',
          boxShadow: theme.shadows.xl,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${theme.colors.neutral[200]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.colors.neutral[50],
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[900], margin: 0 }}>
              {isReplacing ? 'استبدال الشاهد بنسخة أحدث (إصدار جديد)' : 'إيداع وتوثيق شاهد جديد في المستودع'}
            </h3>
            <p style={{ fontSize: '12px', color: theme.colors.neutral[500], margin: '4px 0 0 0' }}>
              {isReplacing
                ? 'يتم حفظ النسخة السابقة في الأرشيف وتوليد إصدار جديد برقم تسلسلي'
                : 'رفع المستند وفهرسته مع تحديد بيانات التحقق'}
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="إغلاق"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.neutral[200],
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.neutral[600],
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div
              role="alert"
              style={{
                padding: '12px 14px',
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.status.danger.bg,
                border: `1px solid ${theme.colors.status.danger.border}`,
                color: theme.colors.status.danger.text,
                fontSize: theme.typography.fontSizes.xs,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: theme.typography.fontWeights.semibold, color: theme.colors.neutral[700], display: 'block', marginBottom: '6px' }}>
              عنوان المستند / الشاهد <span style={{ color: theme.colors.status.danger.text }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: محاضر اجتماعات لجنة التميز والجودة 2026"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: theme.radii.md,
                border: `1px solid ${theme.colors.neutral[300]}`,
                fontSize: theme.typography.fontSizes.sm,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
            style={{ display: 'none' }}
          />

          {/* Drag & Drop Zone */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: theme.typography.fontWeights.semibold, color: theme.colors.neutral[700], display: 'block', marginBottom: '6px' }}>
              ملف الشاهد المعتمد
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (!file) fileInputRef.current?.click();
              }}
              style={{
                border: isDragging
                  ? `2px dashed ${theme.colors.primary[500]}`
                  : file
                  ? `2px solid ${theme.colors.primary[300]}`
                  : `2px dashed ${theme.colors.neutral[300]}`,
                borderRadius: theme.radii.lg,
                padding: '24px 16px',
                textAlign: 'center',
                backgroundColor: isDragging
                  ? theme.colors.primary[50]
                  : file
                  ? theme.colors.primary[50]
                  : theme.colors.neutral[50],
                cursor: file ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'right' }}>
                    {imagePreviewUrl ? (
                      <img
                        src={imagePreviewUrl}
                        alt="معاينة الشاهد"
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: theme.radii.md,
                          objectFit: 'cover',
                          border: `1px solid ${theme.colors.primary[200]}`,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: theme.radii.md,
                          backgroundColor: theme.colors.primary[100],
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: theme.colors.primary[700],
                        }}
                      >
                        <FileCheck size={22} />
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: theme.typography.fontWeights.bold, color: theme.colors.primary[900] }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '11px', color: theme.colors.neutral[500], marginTop: '2px' }}>
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • جاهز للرفع والاعتماد
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    title="إزالة الملف واختيار غيره"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: theme.colors.status.danger.text,
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: theme.radii.md,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = theme.colors.status.danger.bg)}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: isDragging ? theme.colors.primary[100] : theme.colors.neutral[200],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 10px',
                      color: isDragging ? theme.colors.primary[700] : theme.colors.neutral[600],
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <UploadCloud size={26} />
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[800] }}>
                    {isDragging ? 'أفلت الملف هنا للإيداع المباشر' : 'اسحب وأفلت ملف الشاهد هنا، أو اضغط للتصفح'}
                  </div>
                  <div style={{ fontSize: '11px', color: theme.colors.neutral[500], marginTop: '4px' }}>
                    الصيغ المدعومة: PDF, PNG, JPG, Word (docx), Excel (xlsx) — الحجم الأقصى 20 ميجابايت
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Change notes */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: theme.typography.fontWeights.semibold, color: theme.colors.neutral[700], display: 'block', marginBottom: '6px' }}>
              ملاحظات التوثيق والتعديل
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="بيان سبب الاستبدال أو توضيح محتوى الشاهد المرفق..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: theme.radii.md,
                border: `1px solid ${theme.colors.neutral[300]}`,
                fontSize: theme.typography.fontSizes.sm,
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Progress Bar during upload */}
          {isUploading && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: theme.colors.primary[700], marginBottom: '4px', fontWeight: theme.typography.fontWeights.bold }}>
                <span>جاري رفع وتوثيق الشاهد...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: '6px', backgroundColor: theme.colors.neutral[200], borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: theme.colors.primary[600], transition: 'width 0.2s' }} />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              style={{
                padding: '9px 18px',
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.neutral[100],
                color: theme.colors.neutral[700],
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.medium,
                border: 'none',
                cursor: isUploading ? 'not-allowed' : 'pointer',
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isUploading || !file}
              style={{
                padding: '9px 22px',
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.primary[600],
                color: theme.colors.neutral.white,
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.semibold,
                border: 'none',
                cursor: isUploading || !file ? 'not-allowed' : 'pointer',
                opacity: isUploading || !file ? 0.6 : 1,
                boxShadow: theme.shadows.sm,
                transition: 'background-color 0.15s ease',
              }}
              onMouseOver={(e) => {
                if (!isUploading && file) e.currentTarget.style.backgroundColor = theme.colors.primary[700];
              }}
              onMouseOut={(e) => {
                if (!isUploading && file) e.currentTarget.style.backgroundColor = theme.colors.primary[600];
              }}
            >
              {isUploading ? 'جاري الرفع...' : isReplacing ? 'اعتماد النسخة الجديدة' : 'إيداع الشاهد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
