import React from 'react';
import type { EvidenceItem } from '../../api/evaluationTypes';
import { File, Download, RefreshCw, CheckCircle2, AlertCircle, Clock, Link2 } from 'lucide-react';

interface EvidenceCardProps {
  evidence: EvidenceItem;
  onReplaceVersion: (docId: number) => void;
  onDownload: (evidence: EvidenceItem) => void;
  onManageLinks?: (evidence: EvidenceItem) => void;
  readOnly?: boolean;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidence,
  onReplaceVersion,
  onDownload,
  onManageLinks,
  readOnly = false,
}) => {
  const isCompliant = evidence.verificationStatus === 'Compliant';

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
      <div>
        {/* Top Tag & Version */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: isCompliant ? '#ECFDF5' : '#FEF3C7',
              color: isCompliant ? '#059669' : '#B45309',
              border: `1px solid ${isCompliant ? '#A7F3D0' : '#FDE68A'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isCompliant ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            {evidence.verificationStatusArabic}
          </span>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '20px',
              backgroundColor: '#F1F5F9',
              color: '#475569',
            }}
          >
            الإصدار v{evidence.versionNumber}
          </span>
        </div>

        {/* Title & File Info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
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
          <div>
            <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>
              {evidence.title}
            </h4>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '3px' }}>
              {evidence.fileName} • {evidence.formattedSize}
            </div>
          </div>
        </div>

        {/* Linked standard & indicator */}
        <div style={{ marginTop: '12px', fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: '#059669' }}>{evidence.standardCode}:</span>
            <span>{evidence.standardName}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748B' }}>
            المؤشر: {evidence.indicatorCode} — {evidence.indicatorTitle}
          </div>
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
        }}
      >
        <span style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} />
          {evidence.uploadedAt}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!readOnly && (
            <button
              onClick={() => onReplaceVersion(evidence.documentId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                color: '#334155',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="رفع نسخة بديلة دون حذف النسخ السابقة"
            >
              <RefreshCw size={12} />
              استبدال
            </button>
          )}

          {!readOnly && onManageLinks && (
            <button
              onClick={() => onManageLinks(evidence)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="إدارة علاقات الشاهد (نقل / ربط متعدد / فك ارتباط)"
            >
              <Link2 size={12} />
              إدارة الشواهد
            </button>
          )}

          <button
            onClick={() => onDownload(evidence)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#059669',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Download size={13} />
            تحميل
          </button>
        </div>
      </div>
    </div>
  );
};
