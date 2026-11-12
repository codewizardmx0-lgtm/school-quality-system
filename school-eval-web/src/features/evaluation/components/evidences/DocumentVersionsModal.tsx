import React, { useEffect, useState } from 'react';
import { X, History, Download, CheckCircle, FileText, Loader2, AlertCircle } from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';

interface DocumentVersionItem {
  versionId: number;
  documentId: number;
  versionNo: number;
  isCurrent: boolean;
  fileName: string;
  fileSize: number;
  mimeType: string;
  notes?: string;
  createdAt: string;
  downloadUrl: string;
}

interface DocumentVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number | null;
  documentTitle?: string;
}

export const DocumentVersionsModal: React.FC<DocumentVersionsModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle = 'الشاهد',
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<DocumentVersionItem[]>([]);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !documentId) {
      setVersions([]);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    evaluatorApi
      .getDocumentVersions(documentId)
      .then((res) => {
        if (isMounted) {
          setVersions(res.versions || []);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err?.response?.data?.message || 'تعذر تحميل سجل إصدارات المستند.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 كيلوبايت';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} كيلوبايت`;
    return `${(kb / 1024).toFixed(2)} ميجابايت`;
  };

  const handleDownload = async (version: DocumentVersionItem) => {
    try {
      setDownloadingId(version.versionId);
      await evaluatorApi.downloadEvidence(version.versionId, version.fileName);
    } catch {
      alert('تعذر تحميل نسخة المستند من وحدة التخزين.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        direction: 'rtl',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <History size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                سجل الإصدارات وتاريخ التعديل
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                المستند: <strong style={{ color: '#0F172A' }}>{documentTitle}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: '#FFFFFF',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '10px', color: '#64748B' }}>
              <Loader2 size={28} className="animate-spin" color="#4F46E5" />
              <span style={{ fontSize: '13px' }}>جاري استرجاع سجل الإصدارات التاريخية...</span>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13px' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          ) : versions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '13px' }}>
              لا توجد إصدارات مسجلة لهذا المستند.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {versions.map((ver) => (
                <div
                  key={ver.versionId}
                  style={{
                    border: ver.isCurrent ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    backgroundColor: ver.isCurrent ? '#F0FDF4' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '240px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: ver.isCurrent ? '#DCFCE7' : '#F1F5F9',
                        color: ver.isCurrent ? '#15803D' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={18} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                          إصدار رقم {ver.versionNo}
                        </span>
                        {ver.isCurrent ? (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              border: '1px solid #86EFAC',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckCircle size={12} />
                            النسخة الحالية المعتمدة
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#F1F5F9',
                              color: '#64748B',
                              border: '1px solid #CBD5E1',
                            }}
                          >
                            نسخة سابقة مؤرشفة
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569' }}>
                        {ver.fileName} ({formatFileSize(ver.fileSize)})
                      </div>
                      {ver.notes && (
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                          ملاحظات: {ver.notes}
                        </div>
                      )}
                      {ver.createdAt && (
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                          تاريخ الإيداع: {new Date(ver.createdAt).toLocaleString('ar-SA')}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(ver)}
                    disabled={downloadingId === ver.versionId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#1E293B',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: downloadingId === ver.versionId ? 'not-allowed' : 'pointer',
                      opacity: downloadingId === ver.versionId ? 0.6 : 1,
                    }}
                  >
                    <Download size={14} color="#4F46E5" />
                    <span>{downloadingId === ver.versionId ? 'جاري التحميل...' : 'تحميل هذه النسخة'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <span style={{ fontSize: '11.5px', color: '#64748B' }}>
            يتم الاحتفاظ بجميع الإصدارات السابقة للشواهد بصورة دائمة لأغراض التدقيق والمطابقة.
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
