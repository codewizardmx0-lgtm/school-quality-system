/**
 * Screen 4: Version Audit & Ministerial Lock Seal
 * سجل التغييرات والفروقات، التحقق الآلي من الشروط الحاكمة (4/4)،
 * والقفل والاعتماد الوزاري الرقمي بختم SHA-256
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Loader2,
  Clock,
} from 'lucide-react';
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
    isDraft,
    isApproved,
    isLocking,
    isLockedSuccessfully,
    error,
    executeOfficialLock,
    triggerPdfExport,
  } = useVersionAuditLock(versionId);

  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLockedSuccessfully) {
      setIsLockModalOpen(true);
    }
  }, [isLockedSuccessfully]);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    setPdfSuccessMessage(null);
    try {
      const res = await triggerPdfExport();
      setPdfSuccessMessage(res?.message || 'تم توليد تقرير الإقرار المعياري الرسمي PDF بنجاح.');
      setTimeout(() => setPdfSuccessMessage(null), 4000);
    } catch {
      // Error handled by hook
    } finally {
      setIsExportingPdf(false);
    }
  };

  const renderVersionStatusBadge = (statusStr?: string) => {
    const s = (statusStr || (isApproved ? 'Approved' : 'Draft')).toLowerCase();
    if (s === 'active') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 12px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 800,
            backgroundColor: '#ECFDF5',
            color: '#047857',
            border: '1px solid #A7F3D0',
          }}
        >
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981' }} />
          نافذ ومُفعّل للدورة الحالية (Active)
        </span>
      );
    }
    if (s === 'approved') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 12px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 800,
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE',
          }}
        >
          <ShieldCheck size={13} color="#2563EB" />
          مُقرّ ومجدول للدورة القادمة (Approved)
        </span>
      );
    }
    if (s === 'draft') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 12px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 800,
            backgroundColor: '#FFFBEB',
            color: '#B45309',
            border: '1px solid #FDE68A',
          }}
        >
          <Clock size={13} color="#D97706" />
          مسودة قيد التدقيق والتطوير (Draft)
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 12px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          backgroundColor: '#F1F5F9',
          color: '#475569',
          border: '1px solid #CBD5E1',
        }}
      >
        <Lock size={13} color="#64748B" />
        إصدار مؤرشف تاريخياً (Archived)
      </span>
    );
  };

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
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
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              وثيقة المعايير ({preconditions?.versionNo || '2026.1'})
            </span>
            {renderVersionStatusBadge(preconditions?.status || diffData?.status)}
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            التدقيق الوزاري وقفل الإقرار المعياري
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            التحقق الآلي من الشروط الحاكمة الأربعة وتثبيت الختم الرقمي المعتمد (SHA-256)
          </p>
        </div>

        {/* Primary Action: Print PDF (Draft or Approved) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#B45309',
              color: '#FFFFFF',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              boxShadow: '0 2px 6px rgba(180, 83, 9, 0.25)',
              cursor: isExportingPdf ? 'not-allowed' : 'pointer',
              opacity: isExportingPdf ? 0.7 : 1,
            }}
          >
            {isExportingPdf ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileText size={16} />
            )}
            <span>{isDraft ? 'طباعة مسودة وثيقة المعايير (PDF)' : 'طباعة وثيقة المعايير المعتمدة (PDF)'}</span>
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
          <span>تم إقرار وقفل الإصدار المعياري رسمياً بنجاح واكتساب حصانة عدم التعديل (Immutability).</span>
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
        diffData={diffData}
        isDraft={isDraft}
        isApproved={isApproved}
        isLocking={isLocking}
        onLock={async (approvalCode, legalConfirmed, action) => {
          await executeOfficialLock({
            approval_code: approvalCode,
            legal_confirmation: legalConfirmed,
            action: action || 'approve',
          });
        }}
      />

      {/* Educational Card: SHA-256 Digital Integrity Seal (§6 UX Standards) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={22} />
        </div>
        <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.6, color: '#334155' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
            ما هي بصمة الأمان الرقمية (SHA-256) ولماذا تُولّد عند الإقرار؟
          </h4>
          <p style={{ margin: '0 0 12px 0', color: '#475569' }}>
            بصمة النزاهة الرقمية (SHA-256 Cryptographic Hash) هي خوارزمية تشفير قياسية عالمية تُولّد تسلسلاً فريداً بطول 64 رمزاً مشتقاً رياضياً من كامل نصوص المعايير والمؤشرات وأوزانها وسلالم التقدير اللفظي في لحظة القفل.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: '12px', marginBottom: '3px' }}>
                🔒 منع التلاعب والتعديل اللاحق (Immutability):
              </strong>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                أي تغيير ولو لحرف واحد أو رقم بعد الإقرار يغيّر البصمة بالكامل، مما يكشف فوراً أي محاولة تعديل غير مصرح بها.
              </span>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: '12px', marginBottom: '3px' }}>
                ⚖️ الحجية القانونية والتوثيق الرسمي:
              </strong>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                تُثبّت البصمة على شهادات الاعتماد والتقارير المطبوعة لإثبات أن التقييم الميداني استند إلى النسخة المعتمدة بقرار وزاري.
              </span>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: '12px', marginBottom: '3px' }}>
                🛡️ حماية عمليات التقييم الجارية:
              </strong>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                تضمن ألا تتداخل معايير الدورات القادمة مع أعمال المقيمين في المدارس أثناء الدورة التقييمية النشطة.
              </span>
            </div>
          </div>
        </div>
      </div>


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
