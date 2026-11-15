import React from 'react';
import type { EvidenceItem, EvaluatorScreen } from '../../api/evaluationTypes';
import { File, Download, RefreshCw, Clock, Link2, Pencil, ExternalLink, History, Trash2 } from 'lucide-react';

interface EvidenceCardProps {
  evidence: EvidenceItem;
  onReplaceVersion: (docId: number) => void;
  onDownload: (evidence: EvidenceItem) => void;
  onManageLinks?: (evidence: EvidenceItem) => void;
  onEditMetadata?: (evidence: EvidenceItem) => void;
  onViewVersions?: (evidence: EvidenceItem) => void;
  onDeleteUnlinked?: (evidence: EvidenceItem) => void;
  onNavigate?: (screen: EvaluatorScreen, param?: number) => void;
  readOnly?: boolean;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidence,
  onReplaceVersion,
  onDownload,
  onManageLinks,
  onEditMetadata,
  onViewVersions,
  onDeleteUnlinked,
  onNavigate,
  readOnly = false,
}) => {
  const docTypeLabels: Record<string, { label: string; bg: string; text: string; border: string }> = {
    minutes: { label: 'محضر اجتماع', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    plan: { label: 'خطة عمل', bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
    record: { label: 'سجل رسمي', bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
    report: { label: 'تقرير وإحصائية', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    board: { label: 'لوحة إعلانات', bg: '#FDF2F8', text: '#BE185D', border: '#FBCFE8' },
    image: { label: 'صورة فوتوغرافية', bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4' },
    evidence: { label: 'شاهد توثيقي', bg: '#F8FAFC', text: '#334155', border: '#CBD5E1' },
    other: { label: 'أخرى / عام', bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' },
  };
  const typeConf = docTypeLabels[evidence.documentType || 'other'] || docTypeLabels.other;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'transform 0.15s, box-shadow 0.15s',
        minWidth: 0,
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.07)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
      }}
    >
      <div style={{ minWidth: 0 }}>
        {/* Top Tag & Version */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '6px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: typeConf.bg,
                color: typeConf.text,
                border: `1px solid ${typeConf.border}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {typeConf.label}
            </span>
          </div>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '20px',
              backgroundColor: '#F1F5F9',
              color: '#475569',
              whiteSpace: 'nowrap',
            }}
          >
            الإصدار v{evidence.versionNumber}
          </span>
        </div>

        {/* Title & File Info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <File size={18} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h4
              style={{
                fontSize: '13.5px',
                fontWeight: 800,
                color: '#0F172A',
                margin: 0,
                lineHeight: 1.3,
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
              }}
            >
              {evidence.title}
            </h4>
            <div
              style={{
                fontSize: '11.5px',
                color: '#64748B',
                marginTop: '3px',
                wordBreak: 'break-all',
                overflowWrap: 'anywhere',
              }}
            >
              {evidence.fileName} • {evidence.formattedSize}
            </div>
            {evidence.description && (
              <p
                style={{
                  fontSize: '11px',
                  color: '#475569',
                  margin: '4px 0 0 0',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}
              >
                {evidence.description}
              </p>
            )}
          </div>
        </div>

        {/* Linked standard & indicators */}
        <div style={{ marginTop: '12px', fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
          {evidence.isUnlinked || (!evidence.indicatorId && (!evidence.linkedIndicators || evidence.linkedIndicators.length === 0)) ? (
            <span style={{ fontSize: '11.5px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', width: 'fit-content' }}>
              غير مرتبط بأي مؤشر (في المستودع)
            </span>
          ) : (
            <>
              {evidence.standardName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontWeight: 700, color: '#059669', flexShrink: 0 }}>{evidence.standardCode}:</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evidence.standardName}</span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                {(evidence.linkedIndicators && evidence.linkedIndicators.length > 0
                  ? evidence.linkedIndicators
                  : [{ indicatorId: evidence.indicatorId, indicatorCode: evidence.indicatorCode, indicatorTitle: evidence.indicatorTitle }]
                ).map((li, idx) => (
                  <div key={idx} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                    {onNavigate && li.indicatorId ? (
                      <button
                        type="button"
                        onClick={() => onNavigate('rubric-assessment', li.indicatorId)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          color: '#1D4ED8',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                        title={`الانتقال لتقييم المؤشر ${li.indicatorCode} ↗`}
                      >
                        <span>{li.indicatorCode}</span>
                        <ExternalLink size={9} />
                      </button>
                    ) : (
                      <span style={{ fontWeight: 800, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '1px 6px', borderRadius: '4px', flexShrink: 0 }}>
                        {li.indicatorCode}
                      </span>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={li.indicatorTitle}>
                      {li.indicatorTitle}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div
        style={{
          paddingTop: '12px',
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} />
          {evidence.uploadedAt}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          {/* Download */}
          <button
            onClick={() => onDownload(evidence)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#059669',
              cursor: 'pointer',
            }}
            title="تحميل الشاهد"
          >
            <Download size={14} />
          </button>

          {/* Manage Links */}
          {!readOnly && onManageLinks && (
            <button
              onClick={() => onManageLinks(evidence)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                cursor: 'pointer',
              }}
              title="إدارة علاقات الشاهد وربطه بالمؤشرات"
            >
              <Link2 size={14} />
            </button>
          )}

          {/* Edit Metadata */}
          {!readOnly && onEditMetadata && (
            <button
              onClick={() => onEditMetadata(evidence)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                color: '#475569',
                cursor: 'pointer',
              }}
              title="تعديل بيانات الشاهد والنوع والوصف"
            >
              <Pencil size={13} />
            </button>
          )}

          {/* Replace Version */}
          {!readOnly && (
            <button
              onClick={() => onReplaceVersion(evidence.documentId)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                color: '#D97706',
                cursor: 'pointer',
              }}
              title="رفع نسخة بديلة دون حذف النسخ السابقة"
            >
              <RefreshCw size={13} />
            </button>
          )}

          {/* Version History */}
          {onViewVersions && (
            <button
              onClick={() => onViewVersions(evidence)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                color: '#4F46E5',
                cursor: 'pointer',
              }}
              title="استعراض سجل الإصدارات التاريخية للشاهد"
            >
              <History size={13} />
            </button>
          )}

          {/* Delete Unlinked */}
          {!readOnly && onDeleteUnlinked && (evidence.isUnlinked || !evidence.linkedIndicators || evidence.linkedIndicators.length === 0) && (
            <button
              onClick={() => onDeleteUnlinked(evidence)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                cursor: 'pointer',
              }}
              title="حذف هذا الشاهد غير المرتبط نهائياً من مستودع المدرسة"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
