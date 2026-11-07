/**
 * Screen 4: Version Audit & Ministerial Lock Seal
 * سجل التغييرات والفروقات، التحقق الآلي من الشروط الحاكمة (4/4)،
 * والقفل والاعتماد الوزاري الرقمي بختم SHA-256
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Loader2,
} from 'lucide-react';
import { DiffTimelineView } from './DiffTimelineView';
import { GovernanceChecksList } from './GovernanceChecksList';
import { OfficialLockSealModal } from './OfficialLockSealModal';
import { useVersionAuditLock } from '../../hooks/useVersionAuditLock';

interface VersionAuditLockPageProps {
  versionId?: number | string;
  onNavigateToWeights: (versionId?: number | string) => void;
  onNavigateToVersions: () => void;
}

export const VersionAuditLockPage: React.FC<VersionAuditLockPageProps> = ({
  versionId = 1,
  onNavigateToWeights,
  onNavigateToVersions,
}) => {
  const {
    diffData,
    preconditions,
    isLocking,
    isLockedSuccessfully,
    error,
    executeOfficialLock,
    triggerPdfExport,
  } = useVersionAuditLock(versionId);

  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    setPdfSuccessMessage(null);
    try {
      const res = await triggerPdfExport();
      setPdfSuccessMessage(res?.message || 'تم توليد تقرير الاعتماد المعياري الرسمي PDF بنجاح.');
      setTimeout(() => setPdfSuccessMessage(null), 4000);
    } catch {
      // Error handled by hook
    } finally {
      setIsExportingPdf(false);
    }
  };

  const passesAllChecks = preconditions?.passesAll ?? false;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '16px',
          borderBottom: '1px solid #E2E8F0',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#B45309',
                backgroundColor: '#FFFBEB',
                padding: '2px 10px',
                borderRadius: '9999px',
                border: '1px solid #FDE68A',
              }}
            >
              التدقيق النهائي والقفل الرقمي
            </span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              وثيقة المعايير ({preconditions?.versionNo || '2026.1'})
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            سجل الفروقات والتدقيق الوزاري وقفل الاعتماد الرسمي
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            مراجعة فوارق المسودة عن الإصدار السابق، التحقق من الشروط الأربعة، وتثبيت الختم الرقمي (SHA-256)
          </p>
        </div>

        {/* Primary Action: Official Lock Trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setIsLockModalOpen(true)}
            disabled={!passesAllChecks || isLocking || isLockedSuccessfully}
            className="std-btn-primary"
            style={{
              background: passesAllChecks ? 'linear-gradient(135deg, #059669, #047857)' : undefined,
              opacity: !passesAllChecks || isLockedSuccessfully ? 0.6 : 1,
              cursor: !passesAllChecks || isLockedSuccessfully ? 'not-allowed' : 'pointer',
            }}
          >
            {isLocking ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>جاري تثبيت القفل والاعتماد...</span>
              </>
            ) : isLockedSuccessfully ? (
              <>
                <CheckCircle2 size={15} />
                <span>تم الاعتماد والقفل الرسمي</span>
              </>
            ) : (
              <>
                <Lock size={15} />
                <span>+ اعتماد وقفل الوثيقة رسمياً</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success / Error Messages */}
      {isLockedSuccessfully && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '12px',
            color: '#065F46',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span>تم اعتماد وقفل الإصدار المعياري رسمياً بنجاح واكتساب حصانة عدم التعديل (Immutability).</span>
        </div>
      )}

      {pdfSuccessMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '12px',
            color: '#1E40AF',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={18} color="#2563EB" />
          <span>{pdfSuccessMessage}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            color: '#991B1B',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <AlertTriangle size={18} color="#DC2626" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Governance Integrity Checks (4/4 Mandatory Rules) */}
      <GovernanceChecksList
        preconditions={preconditions}
        isLocking={isLocking}
        onLock={async (approvalCode, legalConfirmed) => {
          await executeOfficialLock({ approval_code: approvalCode, legal_confirmation: legalConfirmed });
        }}
      />

      {/* 2. Visual Diff Timeline & SHA-256 Hash Display */}
      <DiffTimelineView diffData={diffData} />

      {/* 3. Bottom Actions Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => onNavigateToWeights(versionId)}
            className="std-btn-secondary"
          >
            <ArrowRight size={14} />
            <span>العودة لمعايرة الأوزان</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#1E293B',
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: '12px',
              cursor: isExportingPdf ? 'not-allowed' : 'pointer',
            }}
          >
            {isExportingPdf ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <FileText size={15} color="#D97706" />
            )}
            <span>تصدير تقرير الاعتماد الرسمي (PDF)</span>
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={onNavigateToVersions}
            className="std-btn-primary"
          >
            <span>العودة لسجل الإصدارات المعتمدة</span>
            <ShieldCheck size={14} />
          </button>
        </div>
      </div>

      {/* Official Lock Seal Modal */}
      {isLockModalOpen && (
        <OfficialLockSealModal
          isOpen={isLockModalOpen}
          versionNo={preconditions?.versionNo || '2026.1'}
          approvalCode="DEC-2026-001"
          hash={preconditions?.integrityHash || '069e798b2d4b8e92a77e7f55d95c712bb1b48ee13e050820e4078bea7b2b5329'}
          onClose={() => setIsLockModalOpen(false)}
          onDownloadReport={handleExportPdf}
        />
      )}
    </div>
  );
};
