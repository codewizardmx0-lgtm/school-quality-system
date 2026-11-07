import React, { useState, useEffect } from 'react';
import { X, Paperclip, Check, Search, FileText, UploadCloud } from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';
import type { ImprovementPlanAction, EvidenceItem } from '../../api/evaluationTypes';

interface AttachActionEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: ImprovementPlanAction | null;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export const AttachActionEvidenceModal: React.FC<AttachActionEvidenceModalProps> = ({
  isOpen,
  onClose,
  action,
  onSuccess,
  onError,
}) => {
  const [tab, setTab] = useState<'existing' | 'upload'>('existing');
  const [existingEvidences, setExistingEvidences] = useState<EvidenceItem[]>([]);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      evaluatorApi
        .getEvidences()
        .then((res) => {
          setExistingEvidences(res.evidences || []);
        })
        .finally(() => {
          setIsLoading(false);
        });
      setTab('existing');
      setSelectedEvidenceId(null);
      setSearchTerm('');
      setUploadFile(null);
      setUploadTitle('');
    }
  }, [isOpen]);

  if (!isOpen || !action) return null;

  const filteredEvidences = existingEvidences.filter(
    (ev) =>
      ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.indicatorCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (tab === 'existing') {
        if (!selectedEvidenceId) {
          onError('يرجى اختيار شاهد من القائمة لربطه بالإجراء.');
          setIsSubmitting(false);
          return;
        }

        await evaluatorApi.attachActionEvidence(action.actionId, selectedEvidenceId);
        onSuccess(`تم إرفاق الشاهد بنجاح بالإجراء "${action.title}".`);
        onClose();
      } else {
        if (!uploadFile) {
          onError('يرجى اختيار ملف الشاهد المراد رفعه.');
          setIsSubmitting(false);
          return;
        }

        const uploaded = await evaluatorApi.uploadEvidence({
          file: uploadFile,
          title: uploadTitle || uploadFile.name,
          actionId: action.actionId,
        });

        await evaluatorApi.attachActionEvidence(action.actionId, uploaded.versionId || uploaded.documentId);
        onSuccess(`تم رفع وإرفاق الشاهد بنجاح بالإجراء "${action.title}".`);
        onClose();
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'فشلت عملية إرفاق الشاهد بالإجراء.';
      onError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          direction: 'rtl',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              <Paperclip size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                إرفاق شاهد إثبات لتنفيذ الإجراء الميداني
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                ربط وثيقة أو تقرير يثبت تنفيذ الإجراء وتحقيق نسبة الإنجاز
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Info Bar */}
        <div
          style={{
            backgroundColor: '#f1f5f9',
            padding: '12px 24px',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '12.5px',
          }}
        >
          <div style={{ color: '#64748b', marginBottom: '2px' }}>الإجراء المستهدف:</div>
          <strong style={{ color: '#1e293b' }}>{action.title}</strong>
        </div>

        {/* Mode Tabs */}
        <div
          style={{
            display: 'flex',
            padding: '8px 24px',
            gap: '8px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => setTab('existing')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: tab === 'existing' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              backgroundColor: tab === 'existing' ? '#eff6ff' : '#ffffff',
              color: tab === 'existing' ? '#1d4ed8' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <FileText size={15} />
            اختيار من الشواهد المودعة
          </button>

          <button
            type="button"
            onClick={() => setTab('upload')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: tab === 'upload' ? '2px solid #059669' : '1px solid #e2e8f0',
              backgroundColor: tab === 'upload' ? '#ecfdf5' : '#ffffff',
              color: tab === 'upload' ? '#065f46' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <UploadCloud size={15} />
            رفع ملف شاهد جديد
          </button>
        </div>

        {/* Tab Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
            {tab === 'existing' ? (
              <div>
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                  <Search size={16} style={{ position: 'absolute', right: '12px', top: '10px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث في شواهد المدرسة المودعة..."
                    style={{
                      width: '100%',
                      padding: '8px 36px 8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div
                  style={{
                    maxHeight: '230px',
                    overflowY: 'auto',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '6px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                      جارِ جلب الشواهد...
                    </div>
                  ) : filteredEvidences.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                      لا توجد شواهد مطابقة للبحث
                    </div>
                  ) : (
                    filteredEvidences.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEvidenceId(ev.id)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          marginBottom: '4px',
                          backgroundColor: selectedEvidenceId === ev.id ? '#eff6ff' : '#ffffff',
                          border: selectedEvidenceId === ev.id ? '1px solid #3b82f6' : '1px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '12.5px', color: '#1e293b' }}>
                            {ev.title}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {ev.fileName} • {ev.standardCode} ({ev.indicatorCode})
                          </div>
                        </div>
                        {selectedEvidenceId === ev.id && <Check size={16} color="#2563eb" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    عنوان أو وصف الشاهد المرفوع:
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="مثال: تقرير ورشة العمل التدريبية لمعلمي الرياضيات"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    اختر ملف الشاهد (PDF, Word, Excel, صور):
                  </label>
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                        if (!uploadTitle) setUploadTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px dashed #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: '#f8fafc',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                borderRadius: '8px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <Paperclip size={15} />
              <span>{isSubmitting ? 'جارِ الإرفاق...' : 'تأكيد إرفاق الشاهد'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
