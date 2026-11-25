import React, { useState, useRef, useEffect } from 'react';
import type { LinkedEvidenceBrief, EvidenceRequirementItem } from '../../api/evaluationTypes';
import { UploadCloud, File, RefreshCw, AlertCircle, FileCheck, Link2, Download, Pencil, FileDown, Eye, X, Copy, Check } from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';
import {
  findEvidenceTemplate,
  getTemplatesForStandard,
  downloadTemplateFile,
  type EvidenceTemplate,
} from '../../data/evidenceTemplates';

interface EvidenceUploaderProps {
  indicatorId?: number;
  indicatorCode?: string;
  standardCode?: string;
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
  onEditEvidenceMetadata?: (link: LinkedEvidenceBrief) => void;
  onUpdateCoveredRequirements?: (linkId: number, coveredRequirements: number[]) => Promise<void>;
  isUploading?: boolean;
  uploadProgress?: number;
  readOnly?: boolean;
}

export const EvidenceUploader: React.FC<EvidenceUploaderProps> = ({
  indicatorId,
  indicatorCode,
  standardCode,
  evidenceLinks,
  evidenceRequirements = [],
  onUploadFile,
  onUnlinkEvidence,
  onManageEvidenceLink,
  onEditEvidenceMetadata,
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
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EvidenceTemplate | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mandatoryRequirements = evidenceRequirements.filter((r) => r.required === true);

  const matchedTemplate = findEvidenceTemplate(indicatorCode, standardCode);
  const availableTemplates = getTemplatesForStandard(standardCode);
  const activeTemplate = selectedTemplate || matchedTemplate;

  useEffect(() => {
    void Promise.resolve().then(() => {
      setSelectedUploadReqIds([]);
      setErrorMessage(null);
      setSelectedTemplate(null);
      setIsCopied(false);
    });
  }, [indicatorId, indicatorCode]);

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
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setErrorMessage(apiErr?.response?.data?.message || 'تعذر تحديث المتطلبات المغطاة للشاهد.');
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

    // شرط حتمي: إذا كان للمؤشر متطلبات إلزامية، يجب تحديد متطلب واحد على الأقل قبل الرفع
    if (mandatoryRequirements.length > 0 && selectedUploadReqIds.length === 0) {
      setErrorMessage('يرجى تحديد متطلب إلزامي واحد على الأقل ليتم تغطيته بواسطة هذا الشاهد قبل الرفع.');
      return;
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
    const targetLink = evidenceLinks.find((l) => l.linkId === linkId);
    const coveredReqs = targetLink?.coveredRequirements || [];
    let confirmMsg = 'هل أنت متأكد من فك ارتباط هذا الشاهد بالمؤشر؟ لن يتم حذف الملف الأصلي من المستودع.';
    if (coveredReqs.length > 0) {
      confirmMsg = `تنبيه: هذا الشاهد يغطي (${coveredReqs.length}) متطلب(ات) إلزامي(ة) للمؤشر. سيؤدي فك الارتباط إلى نقص في تغطية هذه المتطلبات ما لم تكن مغطاة بشاهد آخر.\n\nهل تريد المتابعة وفك الارتباط؟`;
    }
    if (!window.confirm(confirmMsg)) {
      return;
    }
    setUnlinkingId(linkId);
    try {
      await onUnlinkEvidence(linkId);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setErrorMessage(apiErr?.response?.data?.message || 'تعذر فك ارتباط الشاهد.');
    } finally {
      setUnlinkingId(null);
    }
  };

  const triggerSelectFile = (docIdToReplace?: number) => {
    if (readOnly) return;
    setReplaceDocId(docIdToReplace);
    fileInputRef.current?.click();
  };

  const handleDownloadLink = async (link: LinkedEvidenceBrief) => {
    try {
      const idToDownload = link.versionId || link.linkId;
      await evaluatorApi.downloadEvidence(idToDownload, link.fileName);
    } catch {
      setErrorMessage('تعذر تحميل الشاهد من الخادم.');
    }
  };

  const isPreliminaryCover = (item: { title?: string; fileName?: string; documentType?: string }) => {
    const text = `${item.title || ''} ${item.fileName || ''} ${item.documentType || ''}`.toLowerCase();
    return (
      text.includes('غلاف') ||
      text.includes('تمهيدي') ||
      text.includes('cover') ||
      item.documentType === 'cover'
    );
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
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: req.isCovered ? '#F0FDF4' : '#FFFFFF',
                  border: `1px solid ${req.isCovered ? '#BBF7D0' : req.required ? '#FECACA' : '#CBD5E1'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: req.isCovered ? '#ECFDF5' : req.required ? '#FEF2F2' : '#EFF6FF',
                      color: req.isCovered ? '#059669' : req.required ? '#DC2626' : '#2563EB',
                      border: `1px solid ${req.isCovered ? '#A7F3D0' : req.required ? '#FECACA' : '#BFDBFE'}`,
                      whiteSpace: 'nowrap',
                      marginTop: '2px',
                    }}
                  >
                    {req.isCovered ? '✓ مغطى بشاهد' : req.required ? '⚠ مطلوب' : '○ استرشادي'}
                  </span>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: req.isCovered ? '#166534' : '#1E293B' }}>
                      {req.title}
                    </div>
                    {req.description && (
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                        {req.description}
                      </div>
                    )}
                  </div>
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUploadReqIds([req.id]);
                      fileInputRef.current?.click();
                    }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '5px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#0F766E',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0,
                    }}
                    title="رفع وتخصيص شاهد فوري لهذا المتطلب"
                  >
                    <span>ربط شاهد</span>
                    <Link2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            يمكن إرفاق وثائق، خطط تشغيلية، محاضر اجتماعات، تقارير، أو صور ميدانية معتمدة تثبت استيفاء أداء المؤشر.
          </div>
        )}

        {/* Official Evidence Template Box (Download & Preview) */}
        {activeTemplate && (
          <div
            style={{
              marginTop: '14px',
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#DCFCE7',
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileDown size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#14532D' }}>
                  نموذج القالب الرسمي: {activeTemplate.title}
                </div>
                <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                  {activeTemplate.standardCode} ({activeTemplate.standardTitle}) • رمز الشاهد المقترح: {activeTemplate.id}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#15803D',
                  border: '1px solid #86EFAC',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
              >
                <Eye size={13} />
                <span>معاينة القالب</span>
              </button>

              <button
                type="button"
                onClick={() => downloadTemplateFile(activeTemplate)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(5, 150, 105, 0.25)',
                  transition: 'background-color 0.15s',
                }}
              >
                <Download size={13} />
                <span>تحميل نموذج القالب الرسمي (.md)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Upload and Drop Zone */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>
          الشواهد المرفقة والمربوطة بالمؤشر حالياً (PDF, PNG, JPG, Word, Excel - بحد أقصى 25 ميجابايت لكل ملف على حدة):
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
              const alreadyCovered = evidenceLinks.some((l) => (l.coveredRequirements || []).includes(req.id));
              return (
                <label
                  key={req.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    backgroundColor: checked ? '#FEF3C7' : alreadyCovered ? '#F0FDF4' : '#FFFFFF',
                    border: `1px solid ${checked ? '#D97706' : alreadyCovered ? '#86EFAC' : '#E2E8F0'}`,
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
                  {alreadyCovered && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                        fontWeight: 700,
                        marginRight: '4px',
                      }}
                    >
                      ✓ مستوفى بشاهد آخر
                    </span>
                  )}
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
                    <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <span>{link.fileName}</span>
                      <span>•</span>
                      <span style={{ color: '#059669', fontWeight: 600 }}>الإصدار v{link.versionNumber}</span>
                    </div>
                    {/* Amber badge for preliminary cover documents */}
                    {isPreliminaryCover(link) && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#FFFBEB',
                          border: '1px solid #FDE68A',
                          color: '#B45309',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '5px',
                          marginTop: '6px',
                        }}
                      >
                        <span>⚠️ شاهد تمهيدي (غلاف فقط) - بحاجة لاستكمال الصفحات الداخلية المعبأة</span>
                      </div>
                    )}
                  </div>
                </div>

                {!readOnly && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {onManageEvidenceLink && (
                      <button
                        type="button"
                        onClick={() => onManageEvidenceLink(link, 'multi')}
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
                        title="إدارة علاقات الشاهد (ربط بمؤشرات أخرى، نقل لمؤشر آخر، أو فك الارتباط)"
                      >
                        <Link2 size={12} />
                        <span>إدارة الشاهد (ربط / نقل / فك)</span>
                      </button>
                    )}

                    {onEditEvidenceMetadata && (
                      <button
                        type="button"
                        onClick={() => onEditEvidenceMetadata(link)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#F8FAFC',
                          color: '#334155',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          border: '1px solid #CBD5E1',
                          cursor: 'pointer',
                        }}
                        title="تعديل بيانات الشاهد والنوع والمبررات"
                      >
                        <Pencil size={12} />
                        <span>تعديل البيانات</span>
                      </button>
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
                      onClick={() => handleDownloadLink(link)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#ECFDF5',
                        color: '#059669',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        border: '1px solid #A7F3D0',
                        cursor: 'pointer',
                      }}
                      title="تحميل ومعاينة هذا الشاهد"
                    >
                      <Download size={12} />
                      <span>تحميل</span>
                    </button>

                    {!onManageEvidenceLink && onUnlinkEvidence && (
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
                        <span>{unlinkingId === link.linkId ? 'جارٍ الفك...' : 'فك الارتباط'}</span>
                      </button>
                    )}
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

      {/* Modal: معاينة وتحميل قالب الشاهد الرسمي */}
      {isTemplateModalOpen && activeTemplate && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setIsTemplateModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
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
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileDown size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                    {activeTemplate.title}
                  </h3>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px', display: 'flex', gap: '8px' }}>
                    <span>{activeTemplate.standardCode} — {activeTemplate.standardTitle}</span>
                    <span>•</span>
                    <span style={{ color: '#059669', fontWeight: 700 }}>نموذج رسمي لتقويم الجودة ({activeTemplate.id})</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  color: '#64748B',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Multiple templates selector if standard has multiple */}
            {availableTemplates.length > 1 && (
              <div
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#F1F5F9',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>
                  قوالب إضافية للمعيار:
                </span>
                {availableTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl)}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '6px',
                      border: `1px solid ${tpl.id === activeTemplate.id ? '#10B981' : '#CBD5E1'}`,
                      backgroundColor: tpl.id === activeTemplate.id ? '#ECFDF5' : '#FFFFFF',
                      color: tpl.id === activeTemplate.id ? '#047857' : '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    {tpl.id}
                  </button>
                ))}
              </div>
            )}

            {/* Modal Content - Scrollable Markdown Preview */}
            <div
              style={{
                padding: '24px',
                overflowY: 'auto',
                flex: 1,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                lineHeight: 1.6,
                color: '#1E293B',
                fontSize: '13px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '18px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '12.5px',
                  direction: 'rtl',
                  maxHeight: '450px',
                  overflowY: 'auto',
                }}
              >
                {activeTemplate.content}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                يمكنك نسخ محتوى النموذج وتعديله، أو تحميله كملف Markdown لتعبئته ورفعه كشاهد.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeTemplate.content);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isCopied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                  <span>{isCopied ? 'تم النسخ!' : 'نسخ النص'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadTemplateFile(activeTemplate)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(5, 150, 105, 0.3)',
                  }}
                >
                  <Download size={14} />
                  <span>تحميل القالب ({activeTemplate.fileName})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
