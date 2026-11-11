import React, { useState, useRef, useEffect } from 'react';
import type { LinkedEvidenceBrief, EvidenceRequirementItem } from '../../api/evaluationTypes';
import { UploadCloud, File, RefreshCw, AlertCircle, Trash2, FileCheck, Link2, ArrowRightLeft } from 'lucide-react';

interface EvidenceUploaderProps {
  indicatorId?: number;
  evidenceLinks: LinkedEvidenceBrief[];
  evidenceRequirements?: EvidenceRequirementItem[];
  onUploadFile: (
    file: File,
    notes?: string,
    documentId?: number,
    coveredRequirements?: number[]
  ) => Promise<unknown>;
  onUnlinkEvidence?: (linkId: number) => Promise<void>;
  onManageEvidenceLink?: (link: LinkedEvidenceBrief, mode: 'single' | 'multi' | 'unlink') => void;
  onUpdateCoveredRequirements?: (linkId: number, coveredRequirements: number[]) => Promise<void>;
  isUploading?: boolean;
  uploadProgress?: number;
  readOnly?: boolean;
}

export const EvidenceUploader: React.FC<EvidenceUploaderProps> = ({
  indicatorId,
  evidenceLinks,
  evidenceRequirements = [],
  onUploadFile,
  onUnlinkEvidence,
  onManageEvidenceLink,
  onUpdateCoveredRequirements,
  isUploading = false,
  uploadProgress = 0,
  readOnly = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [replaceDocId, setReplaceDocId] = useState<number | undefined>(undefined);
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);
  const [selectedUploadReqIds, setSelectedUploadReqIds] = useState<number[]>([]);
  const [updatingReqLinkId, setUpdatingReqLinkId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mandatoryRequirements = evidenceRequirements.filter((r) => r.required === true);

  useEffect(() => {
    setSelectedUploadReqIds([]);
    setErrorMessage(null);
  }, [indicatorId]);

  const handleToggleUploadReq = (reqId: number) => {
    setSelectedUploadReqIds((prev) =>
      prev.includes(reqId) ? prev.filter((id) => id !== reqId) : [...prev, reqId]
    );
  };

  const handleToggleExistingLinkReq = async (link: LinkedEvidenceBrief, reqId: number) => {
    if (readOnly || !onUpdateCoveredRequirements) return;
    const current = link.coveredRequirements || [];
    const next = current.includes(reqId)
      ? current.filter((id) => id !== reqId)
      : [...current, reqId];
    setUpdatingReqLinkId(link.linkId);
    setErrorMessage(null);
    try {
      await onUpdateCoveredRequirements(link.linkId, next);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'تعذر تحديث المتطلبات المغطاة للشاهد.');
    } finally {
      setUpdatingReqLinkId(null);
    }
  };

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
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const processFiles = async (files: File[]) => {
    setErrorMessage(null);
    const maxSizeBytes = 25 * 1024 * 1024; // 25MB

    for (const file of files) {
      if (file.size > maxSizeBytes) {
        setErrorMessage(`الملف «${file.name}» يتجاوز الحد الأقصى المسموح به (25 ميجابايت).`);
        return;
      }
    }

    try {
      for (const file of files) {
        await onUploadFile(
          file,
          'تم الرفع من استمارة رصد المؤشر',
          replaceDocId,
          selectedUploadReqIds.length > 0 ? selectedUploadReqIds : undefined
        );
      }
      setReplaceDocId(undefined);
      setSelectedUploadReqIds([]);
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || 'فشل في رفع ملف الشاهد.');
    }
  };

  const handleUnlink = async (linkId: number) => {
    if (readOnly || !onUnlinkEvidence) return;
    if (!window.confirm('هل أنت متأكد من فك ارتباط هذا الشاهد بالمؤشر؟ لن يتم حذف الملف الأصلي من المستودع.')) {
      return;
    }
    setUnlinkingId(linkId);
    try {
      await onUnlinkEvidence(linkId);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'تعذر فك ارتباط الشاهد.');
    } finally {
      setUnlinkingId(null);
    }
  };

  const triggerSelectFile = (docIdToReplace?: number) => {
    if (readOnly) return;
    setReplaceDocId(docIdToReplace);
    fileInputRef.current?.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* 1. Official Evidence Requirements specific to this Indicator (FR-SCH-12 / Prototype feature) */}
      <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <FileCheck size={18} color="#059669" />
          <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            متطلبات الشواهد والأدلة الرسمية المقررة لهذا المؤشر (الإطار الوطني):
          </h4>
        </div>

        {evidenceRequirements && evidenceRequirements.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {evidenceRequirements.map((req) => (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                }}
              >
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: req.required ? '#FEF2F2' : '#EFF6FF',
                    color: req.required ? '#DC2626' : '#2563EB',
                    border: `1px solid ${req.required ? '#FECACA' : '#BFDBFE'}`,
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                  }}
                >
                  {req.required ? 'إلزامي' : 'استرشادي'}
                </span>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E293B' }}>
                    {req.title}
                  </div>
                  {req.description && (
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                      {req.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            يمكن إرفاق وثائق، خطط تشغيلية، محاضر اجتماعات، تقارير، أو صور ميدانية معتمدة تثبت استيفاء أداء المؤشر.
          </div>
        )}
      </div>

      {/* 2. Upload and Drop Zone */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>
          الشواهد المرفقة والمربوطة بالمؤشر حالياً (PDF, PNG, JPG, Word, Excel - بحد أقصى 25MB):
        </label>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '12px',
            backgroundColor: evidenceLinks.length > 0 ? '#ECFDF5' : '#FEF2F2',
            color: evidenceLinks.length > 0 ? '#059669' : '#DC2626',
            border: `1px solid ${evidenceLinks.length > 0 ? '#A7F3D0' : '#FECACA'}`,
          }}
        >
          {evidenceLinks.length} {evidenceLinks.length === 1 ? 'شاهد مربوط' : 'شواهد مربوطة'}
        </span>
      </div>

      {/* Hidden File Input supporting multiple files */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
        multiple
        style={{ display: 'none' }}
      />

      {/* Mandatory Requirements Selection before Upload (IMP-03: Mandatory Only) */}
      {!readOnly && mandatoryRequirements.length > 0 && (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#92400E' }}>
            حدد المتطلبات الإلزامية التي يغطيها الملف قبل الرفع (يمكن لملف واحد تغطية أكثر من متطلب):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {mandatoryRequirements.map((req) => {
              const checked = selectedUploadReqIds.includes(req.id);
              return (
                <label
                  key={req.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    backgroundColor: checked ? '#FEF3C7' : '#FFFFFF',
                    border: `1px solid ${checked ? '#D97706' : '#E2E8F0'}`,
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1E293B',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleUploadReq(req.id)}
                    style={{ accentColor: '#D97706' }}
                  />
                  <span>{req.title}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

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
            padding: '22px',
            textAlign: 'center',
            backgroundColor: isDragOver ? '#ECFDF5' : '#F8FAFC',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
            }}
          >
            <UploadCloud size={22} />
          </div>

          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E293B' }}>
            اسحب وأفلت ملفات الشواهد هنا، أو اضغط للاستعراض واختيار ملف أو أكثر
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
            يمكنك رفع شواهد متعددة لنفس المؤشر، ويتم تتبع الإصدارات تلقائياً
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

      {/* Attached Evidences List with Multi-Link, Transfer, Unlink & Replace actions */}
      {evidenceLinks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {evidenceLinks.map((link) => (
            <div
              key={link.linkId}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                transition: 'background-color 0.15s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
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
                      flexShrink: 0,
                    }}
                  >
                    <File size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                      {link.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', gap: '8px', marginTop: '2px' }}>
                      <span>{link.fileName}</span>
                      <span>•</span>
                      <span style={{ color: '#059669', fontWeight: 600 }}>الإصدار v{link.versionNumber}</span>
                    </div>
                  </div>
                </div>

                {!readOnly && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {onManageEvidenceLink && (
                      <>
                        <button
                          type="button"
                          onClick={() => onManageEvidenceLink(link, 'multi')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#ECFDF5',
                            color: '#047857',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            border: '1px solid #A7F3D0',
                            cursor: 'pointer',
                          }}
                          title="ربط هذا الشاهد بمؤشرات إضافية أخرى"
                        >
                          <Link2 size={12} />
                          <span>ربط مؤشرات أخرى</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onManageEvidenceLink(link, 'single')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            border: '1px solid #BFDBFE',
                            cursor: 'pointer',
                          }}
                          title="نقل الشاهد إلى مؤشر آخر"
                        >
                          <ArrowRightLeft size={12} />
                          <span>نقل المؤشر</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
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
                      title="رفع نسخة أحدث لهذا الشاهد"
                    >
                      <RefreshCw size={12} />
                      <span>تحديث النسخة</span>
                    </button>

                    <button
                      type="button"
                      disabled={unlinkingId === link.linkId}
                      onClick={() => handleUnlink(link.linkId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        border: '1px solid #FECACA',
                        cursor: 'pointer',
                      }}
                      title="فك ارتباط هذا الشاهد بالمؤشر"
                    >
                      <Trash2 size={12} />
                      <span>{unlinkingId === link.linkId ? 'جارٍ الفك...' : 'فك الارتباط'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mandatory requirements covered by this existing link (IMP-03: Mandatory only) */}
              {mandatoryRequirements.length > 0 && (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                    المتطلبات الإلزامية المغطاة بهذا الشاهد:
                  </span>
                  {mandatoryRequirements.map((req) => {
                    const isCovered = (link.coveredRequirements || []).includes(req.id);
                    return (
                      <label
                        key={req.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          backgroundColor: isCovered ? '#ECFDF5' : '#FFFFFF',
                          border: `1px solid ${isCovered ? '#10B981' : '#CBD5E1'}`,
                          fontSize: '11px',
                          fontWeight: 600,
                          color: isCovered ? '#065F46' : '#64748B',
                          cursor: readOnly || updatingReqLinkId === link.linkId ? 'default' : 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isCovered}
                          disabled={readOnly || updatingReqLinkId === link.linkId}
                          onChange={() => handleToggleExistingLinkReq(link, req.id)}
                          style={{ accentColor: '#059669' }}
                        />
                        <span>{req.title}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
