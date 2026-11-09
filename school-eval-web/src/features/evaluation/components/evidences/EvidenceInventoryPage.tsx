import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Link2,
} from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';
import type {
  EvidenceInventoryData,
  EvidenceInventoryStandard,
  EvidenceItem,
} from '../../api/evaluationTypes';
import { LinkEvidenceModal } from './LinkEvidenceModal';

interface EvidenceInventoryPageProps {
  onSuccessToast?: (msg: string) => void;
  onErrorToast?: (msg: string) => void;
  readOnly?: boolean;
}

export const EvidenceInventoryPage: React.FC<EvidenceInventoryPageProps> = ({
  onSuccessToast,
  onErrorToast,
  readOnly = false,
}) => {
  const [data, setData] = useState<EvidenceInventoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'missing' | 'sufficient'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStandards, setExpandedStandards] = useState<Record<number, boolean>>({});
  const [selectedEvidenceForLinking, setSelectedEvidenceForLinking] = useState<EvidenceItem | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const res = await evaluatorApi.getEvidenceInventory();
      setData(res);
      // Expand all standards by default
      const initialExpanded: Record<number, boolean> = {};
      res.standards.forEach((std) => {
        initialExpanded[std.standardId] = true;
      });
      setExpandedStandards(initialExpanded);
    } catch (err) {
      console.error('Failed to load evidence inventory:', err);
      onErrorToast?.('فشل تحميل بيانات جرد الشواهد.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const toggleStandard = (id: number) => {
    setExpandedStandards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenLinkModal = (ev: {
    evidenceId: number;
    title: string;
    evidenceType: string;
  }, ind: { indicatorId: number; indicatorCode: string; indicatorName: string }, std: EvidenceInventoryStandard) => {
    setSelectedEvidenceForLinking({
      id: ev.evidenceId,
      documentId: ev.evidenceId,
      linkId: ev.evidenceId,
      indicatorId: ind.indicatorId,
      title: ev.title,
      fileName: `${ev.title}.pdf`,
      mimeType: 'application/pdf',
      fileSize: 1024 * 1024,
      formattedSize: '1.2 MB',
      versionNumber: 1,
      standardCode: std.standardCode,
      standardName: std.standardName,
      indicatorCode: ind.indicatorCode,
      indicatorTitle: ind.indicatorName,
      uploadedAt: new Date().toISOString().split('T')[0],
      uploadedBy: 'مسؤول الجودة',
      verificationStatus: 'Compliant',
      verificationStatusArabic: 'مطابق ومعتمد',
    });
    setIsLinkModalOpen(true);
  };

  if (isLoading || !data) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', direction: 'rtl' }}>
        <RefreshCw size={28} className="animate-spin" style={{ color: '#3b82f6', margin: '30px auto 12px auto' }} />
        <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>جارِ تحميل سجل جرد الشواهد والوثائق...</div>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div style={{ direction: 'rtl', padding: '0 4px' }}>
      {/* Top Banner / Summary KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            borderRight: '4px solid #3b82f6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
            نسبة استيفاء الشواهد الإجمالية
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b' }}>
            {data.overallEvidenceCompletionRate}%
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>
            حالة السجل: {data.inventoryStatus === 'InProgress' ? 'قيد التوثيق والاستيفاء' : 'مستوفٍ بالكامل'}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            borderRight: '4px solid #10b981',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
            مؤشرات مستوفية الشواهد
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669' }}>
            {summary.indicatorsWithSufficientEvidence}{' '}
            <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>
              من {summary.totalIndicators}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            حسب متطلبات الاعتماد الإلزامية
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            borderRight: '4px solid #ef4444',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
            مؤشرات بحاجة لاستكمال الشواهد
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#dc2626' }}>
            {summary.indicatorsMissingEvidence}
          </div>
          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
            مؤشرات تفتقر للحد الأدنى الإلزامي
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            borderRight: '4px solid #8b5cf6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
            إجمالي الشواهد والوثائق المودعة
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#7c3aed' }}>
            {summary.totalEvidencesUploaded}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            {summary.totalValidEvidences} معتمدة | {summary.totalDraftEvidences} مسودة
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '14px 18px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              border: filterType === 'all' ? '1px solid #3b82f6' : '1px solid #e2e8f0',
              backgroundColor: filterType === 'all' ? '#eff6ff' : '#ffffff',
              color: filterType === 'all' ? '#1d4ed8' : '#64748b',
            }}
          >
            كافة المؤشرات ({summary.totalIndicators})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('missing')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              border: filterType === 'missing' ? '1px solid #ef4444' : '1px solid #e2e8f0',
              backgroundColor: filterType === 'missing' ? '#fef2f2' : '#ffffff',
              color: filterType === 'missing' ? '#b91c1c' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={14} />
            المؤشرات الناقصة الشواهد ({summary.indicatorsMissingEvidence})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('sufficient')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              border: filterType === 'sufficient' ? '1px solid #10b981' : '1px solid #e2e8f0',
              backgroundColor: filterType === 'sufficient' ? '#ecfdf5' : '#ffffff',
              color: filterType === 'sufficient' ? '#047857' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={14} />
            المؤشرات المستوفية ({summary.indicatorsWithSufficientEvidence})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px', flex: 1, maxWidth: '360px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', right: '10px', top: '9px', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث برمز المؤشر أو الاسم..."
              style={{
                width: '100%',
                padding: '6px 32px 6px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                outline: 'none',
              }}
            />
          </div>
          <button
            type="button"
            onClick={fetchInventory}
            title="تحديث البيانات"
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Standards & Indicators List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {data.standards.map((std) => {
          // Filter indicators based on active filter and search
          const filteredIndicators = std.indicators.filter((ind) => {
            if (filterType === 'missing' && ind.isSufficient) return false;
            if (filterType === 'sufficient' && !ind.isSufficient) return false;
            if (searchTerm.trim()) {
              const term = searchTerm.toLowerCase();
              return (
                ind.indicatorCode.toLowerCase().includes(term) ||
                ind.indicatorName.toLowerCase().includes(term) ||
                (ind.domainName && ind.domainName.toLowerCase().includes(term))
              );
            }
            return true;
          });

          if (filteredIndicators.length === 0) return null;

          const isExpanded = !!expandedStandards[std.standardId];

          return (
            <div
              key={std.standardId}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}
            >
              {/* Standard Header */}
              <div
                onClick={() => toggleStandard(std.standardId)}
                style={{
                  padding: '14px 20px',
                  backgroundColor: '#f8fafc',
                  borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#e0e7ff',
                      color: '#4338ca',
                      fontSize: '11.5px',
                      fontWeight: 700,
                    }}
                  >
                    {std.standardCode}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                    {std.standardName}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    ({filteredIndicators.length} مؤشر)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    إنجاز المعيار:{' '}
                    <strong style={{ color: std.completionRate >= 100 ? '#16a34a' : '#d97706' }}>
                      {std.completionRate}%
                    </strong>
                  </div>
                  {isExpanded ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                </div>
              </div>

              {/* Indicators Table / Accordion Body */}
              {isExpanded && (
                <div style={{ padding: '8px 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                  <table style={{ width: '100%', minWidth: '750px', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'right' }}>
                        <th style={{ padding: '10px 8px', width: '90px' }}>الرمز</th>
                        <th style={{ padding: '10px 8px' }}>المؤشر ومجال التحقق</th>
                        <th style={{ padding: '10px 8px', width: '130px', textAlign: 'center' }}>الشواهد المودعة</th>
                        <th style={{ padding: '10px 8px', width: '110px', textAlign: 'center' }}>الحالة</th>
                        <th style={{ padding: '10px 8px', width: '180px' }}>الشواهد المرتبطة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIndicators.map((ind) => (
                        <tr
                          key={ind.indicatorId}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: ind.isSufficient ? '#ffffff' : '#fffdfa',
                          }}
                        >
                          <td style={{ padding: '12px 8px', fontWeight: 700, color: '#2563eb' }}>
                            {ind.indicatorCode}
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>
                              {ind.indicatorName}
                            </div>
                            {ind.domainName && (
                              <div style={{ fontSize: '11.5px', color: '#64748b' }}>المجال: {ind.domainName}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, color: ind.isSufficient ? '#16a34a' : '#dc2626' }}>
                              {ind.uploadedEvidenceCount}
                            </span>
                            <span style={{ color: '#94a3b8' }}> / {ind.mandatoryRequiredCount} إلزامي</span>
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            {ind.isSufficient ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#ecfdf5',
                                  color: '#047857',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                }}
                              >
                                <CheckCircle2 size={13} />
                                مستوفٍ
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#fef2f2',
                                  color: '#b91c1c',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                }}
                              >
                                <AlertTriangle size={13} />
                                ناقص ({ind.mandatoryRequiredCount - ind.uploadedEvidenceCount})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            {ind.evidences.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {ind.evidences.map((ev) => (
                                  <div
                                    key={ev.evidenceId}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '4px 6px',
                                      borderRadius: '6px',
                                      backgroundColor: '#f8fafc',
                                      border: '1px solid #e2e8f0',
                                      fontSize: '11px',
                                    }}
                                  >
                                    <span
                                      title={ev.title}
                                      style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '100px',
                                        color: '#334155',
                                      }}
                                    >
                                      {ev.title}
                                    </span>
                                    {!readOnly && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenLinkModal(ev, ind, std)}
                                        title="إدارة علاقات وربط هذا الشاهد"
                                        style={{
                                          padding: '2px 5px',
                                          borderRadius: '4px',
                                          backgroundColor: '#eff6ff',
                                          border: '1px solid #bfdbfe',
                                          color: '#1d4ed8',
                                          fontSize: '10.5px',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                        }}
                                      >
                                        <Link2 size={11} />
                                        إدارة
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>لا توجد شواهد</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Link Evidence Modal */}
      <LinkEvidenceModal
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setSelectedEvidenceForLinking(null);
        }}
        evidence={selectedEvidenceForLinking}
        onSuccess={(msg) => {
          onSuccessToast?.(msg);
          fetchInventory();
        }}
        onError={(err) => onErrorToast?.(err)}
      />
    </div>
  );
};
