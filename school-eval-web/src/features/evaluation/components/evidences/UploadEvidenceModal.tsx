import React, { useState, useRef } from 'react';
import { UploadCloud, X, AlertCircle } from 'lucide-react';

interface UploadEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (payload: { file: File; title: string; notes?: string; documentId?: number }) => Promise<unknown>;
  documentIdToReplace?: number;
  initialTitle?: string;
  isUploading?: boolean;
  uploadProgress?: number;
}

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleClose = () => {
    if (isUploading) return;
    setFile(null);
    setTitle(initialTitle);
    setNotes('');
    setError(null);
    onClose();
  };

  const isReplacing = !!documentIdToReplace;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title && !isReplacing) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('يرجى اختيار ملف الشاهد للرفع.');
      return;
    }

    const maxSizeBytes = 25 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
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
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'فشل في رفع الملف.');
    }
  };

  return (
    <div
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
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
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
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {isReplacing ? 'استبدال الشاهد بنسخة أحدث (إصدار جديد)' : 'إيداع وتوثيق شاهد جديد في المستودع'}
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>
              {isReplacing
                ? 'يتم حفظ النسخة السابقة في الأرشيف وتوليد إصدار جديد برقم تسلسلي'
                : 'رفع المستند وفهرسته مع تحديد بيانات التحقق'}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#F1F5F9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
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
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              عنوان المستند / الشاهد
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: محاضر اجتماعات لجنة التميز والجودة 2026"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
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

          {/* File Picker Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #CBD5E1',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#F8FAFC',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            <UploadCloud size={32} color="#059669" style={{ margin: '0 auto 8px' }} />
            {file ? (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • جاهز للرفع
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                  اضغط لاختيار ملف الشاهد من جهازك
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                  الصيغ المسموحة: PDF, PNG, JPG, Word, Excel (حد أقصى 25MB)
                </div>
              </div>
            )}
          </div>

          {/* Change notes */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
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
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#059669', marginBottom: '4px', fontWeight: 700 }}>
                <span>جاري رفع وتوثيق الشاهد...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: '#059669', transition: 'width 0.2s' }} />
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
                borderRadius: '8px',
                backgroundColor: '#F1F5F9',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isUploading}
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
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
