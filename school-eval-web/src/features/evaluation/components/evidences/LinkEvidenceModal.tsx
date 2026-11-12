import React, { useState, useEffect, useMemo } from 'react';
import { X, Link2, Check, AlertTriangle, ArrowRightLeft, Unlink, Search, FileCheck } from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';
import type { EvidenceItem, StandardsTreeData, EvidenceRequirementItem } from '../../api/evaluationTypes';

interface LinkEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: EvidenceItem | null;
  initialMode?: LinkMode;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

type LinkMode = 'single' | 'multi' | 'unlink';

export const LinkEvidenceModal: React.FC<LinkEvidenceModalProps> = ({
  isOpen,
  onClose,
  evidence,
  initialMode = 'single',
  onSuccess,
  onError,
}) => {
  const [mode, setMode] = useState<LinkMode>(initialMode);
  const [standardsTree, setStandardsTree] = useState<StandardsTreeData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSingleIndicatorId, setSelectedSingleIndicatorId] = useState<number | null>(null);
  const [selectedMultiIndicatorIds, setSelectedMultiIndicatorIds] = useState<number[]>([]);
  const [selectedCoveredReqIds, setSelectedCoveredReqIds] = useState<number[]>([]);
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute initially linked indicator IDs
  const initiallyLinkedIds: number[] = useMemo(() => {
    if (!evidence) return [];
    if (evidence.linkedIndicators && evidence.linkedIndicators.length > 0) {
      return evidence.linkedIndicators.map((l) => l.indicatorId);
    }
    return evidence.indicatorId ? [evidence.indicatorId] : [];
  }, [evidence]);

  useEffect(() => {
    if (isOpen && evidence) {
      evaluatorApi.getActiveStandardsTree().then((tree) => {
        setStandardsTree(tree);
      });
      // Reset state
      setMode(initialMode);
      setSearchTerm('');
      setSelectedSingleIndicatorId(null);
      const initialIds = evidence.linkedIndicators && evidence.linkedIndicators.length > 0
        ? evidence.linkedIndicators.map((l) => l.indicatorId)
        : (evidence.indicatorId ? [evidence.indicatorId] : []);
      setSelectedMultiIndicatorIds(initialIds);

      // تهيئة المتطلبات المحددة مسبقاً للشاهد
      let initialCovered: number[] = [];
      const evAny = evidence as any;
      if (Array.isArray(evAny.coveredRequirements)) {
        initialCovered.push(...evAny.coveredRequirements);
      }
      if (Array.isArray(evAny.linkedIndicators)) {
        evAny.linkedIndicators.forEach((link: any) => {
          if (Array.isArray(link.coveredRequirements)) {
            initialCovered.push(...link.coveredRequirements);
          }
        });
      }
      setSelectedCoveredReqIds(Array.from(new Set(initialCovered)));
      setJustification('');
    }
  }, [isOpen, initialMode, evidence]);

  if (!isOpen || !evidence) return null;

  // Flatten indicators from standards tree with evidence requirements
  const allIndicators: {
    indicatorId: number;
    code: string;
    title: string;
    standardName: string;
    evidenceRequirements: EvidenceRequirementItem[];
  }[] = [];

  if (standardsTree?.standards) {
    for (const std of standardsTree.standards) {
      if (std.subStandards) {
        for (const sub of std.subStandards) {
          if (sub.indicators) {
            for (const ind of sub.indicators) {
              allIndicators.push({
                indicatorId: ind.indicatorId,
                code: ind.code,
                title: ind.title,
                standardName: std.title,
                evidenceRequirements: ind.evidenceRequirements || [],
              });
            }
          }
        }
      }
    }
  }

  const filteredIndicators = allIndicators.filter(
    (ind) =>
      ind.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ind.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ind.standardName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isCurrentIndicator = (id: number) => Boolean(evidence.indicatorId && evidence.indicatorId === id);
  const isInitiallyLinked = (id: number) => initiallyLinkedIds.includes(id);

  const handleToggleMultiIndicator = (id: number) => {
    setSelectedMultiIndicatorIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredIndicators.map((i) => i.indicatorId);
    setSelectedMultiIndicatorIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleClearMultiSelection = () => {
    setSelectedMultiIndicatorIds([]);
  };

  const handleToggleCoveredReq = (reqId: number) => {
    setSelectedCoveredReqIds((prev) =>
      prev.includes(reqId) ? prev.filter((id) => id !== reqId) : [...prev, reqId]
    );
  };

  // Requirements for single mode target indicator
  const singleIndicatorReqs = selectedSingleIndicatorId
    ? allIndicators.find((i) => i.indicatorId === selectedSingleIndicatorId)?.evidenceRequirements?.filter((r) => r.required) || []
    : [];

  // Requirements for newly selected multi-mode indicators
  const multiIndicatorsWithReqs = allIndicators.filter(
    (ind) => selectedMultiIndicatorIds.includes(ind.indicatorId) && ind.evidenceRequirements.some((r) => r.required)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === 'single') {
        if (!selectedSingleIndicatorId || isCurrentIndicator(selectedSingleIndicatorId)) {
          onError('يرجى اختيار مؤشر آخر مستهدف لنقل الشاهد إليه.');
          setIsSubmitting(false);
          return;
        }

        const targetInd = allIndicators.find((i) => i.indicatorId === selectedSingleIndicatorId);
        const reqs = targetInd?.evidenceRequirements?.filter((r) => r.required) || [];
        if (reqs.length > 0) {
          const hasSelected = reqs.some((r) => selectedCoveredReqIds.includes(r.id));
          if (!hasSelected) {
            onError(`لا بد أن تحدد متطلباً إلزامياً من المؤشر (${targetInd?.code || ''}).`);
            setIsSubmitting(false);
            return;
          }
        }

        // Link to new target indicator
        await evaluatorApi.multiLinkEvidence({
          documentId: evidence.documentId,
          versionId: evidence.id,
          indicatorIds: [selectedSingleIndicatorId],
          coveredRequirements: selectedCoveredReqIds.length > 0 ? selectedCoveredReqIds : undefined,
          justification: justification || 'نقل الشاهد لمؤشر آخر بديل',
        });

        // Unlink from old indicator if linkId exists
        if (evidence.linkId) {
          await evaluatorApi.unlinkEvidence(evidence.linkId);
        }

        onSuccess(`تم نقل الشاهد "${evidence.title}" بنجاح إلى المؤشر المختار.`);
        onClose();
      } else if (mode === 'multi') {
        const unlinkedIds = initiallyLinkedIds.filter((id) => !selectedMultiIndicatorIds.includes(id));
        const keptOrAddedIds = selectedMultiIndicatorIds;

        if (keptOrAddedIds.length === 0 && unlinkedIds.length === 0) {
          onError('يرجى تحديد مؤشر واحد على الأقل أو فك الارتباط.');
          setIsSubmitting(false);
          return;
        }

        for (const indId of keptOrAddedIds) {
          const ind = allIndicators.find((i) => i.indicatorId === indId);
          const reqs = ind?.evidenceRequirements?.filter((r) => r.required) || [];
          if (reqs.length > 0) {
            const hasSelected = reqs.some((r) => selectedCoveredReqIds.includes(r.id));
            if (!hasSelected) {
              onError(`لا بد أن تحدد متطلباً إلزامياً من المؤشر (${ind?.code || indId}).`);
              setIsSubmitting(false);
              return;
            }
          }
        }

        await evaluatorApi.multiLinkEvidence({
          documentId: evidence.documentId,
          versionId: evidence.id,
          indicatorIds: keptOrAddedIds,
          unlinkedIndicatorIds: unlinkedIds,
          coveredRequirements: selectedCoveredReqIds.length > 0 ? selectedCoveredReqIds : undefined,
          justification: justification || 'إدارة الروابط المتعددة للشاهد',
        });

        const addedCount = keptOrAddedIds.filter((id) => !initiallyLinkedIds.includes(id)).length;
        const unlinkedCount = unlinkedIds.length;
        let msg = `تم تحديث روابط الشاهد بنجاح`;
        if (addedCount > 0 && unlinkedCount > 0) {
          msg = `تم ربط الشاهد بـ ${addedCount} مؤشر جديد، وفك ارتباطه عن ${unlinkedCount} مؤشر.`;
        } else if (addedCount > 0) {
          msg = `تم ربط الشاهد بنجاح بـ ${addedCount} مؤشر إضافي.`;
        } else if (unlinkedCount > 0) {
          msg = `تم فك ارتباط الشاهد عن ${unlinkedCount} مؤشر بنجاح.`;
        }

        onSuccess(msg);
        onClose();
      } else if (mode === 'unlink') {
        if (!evidence.linkId) {
          onError('لا يوجد معرف ارتباط صالح لفك الارتباط.');
          setIsSubmitting(false);
          return;
        }

        if (
          !window.confirm(
            `هل أنت متأكد من فك ارتباط الشاهد «${evidence.title}» من هذا المؤشر؟ سيبقى الملف محفوظاً في مستودع المدرسة بحالة «غير مرتبط بأي مؤشر».`
          )
        ) {
          setIsSubmitting(false);
          return;
        }

        await evaluatorApi.unlinkEvidence(evidence.linkId);
        onSuccess(`تم فك ارتباط الشاهد "${evidence.title}" من هذا المؤشر وبقي محفوظاً في مستودع المدرسة.`);
        onClose();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || (err as Error)?.message || 'فشلت عملية تحديث ارتباط الشاهد.';
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
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
                backgroundColor: '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4338ca',
              }}
            >
              <Link2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                🔗 إدارة روابط وعلاقات الشاهد بالمؤشرات
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                نقل الشاهد، أو ربطه بعدة مؤشرات (Multi-link)، أو فك الارتباط
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

        {/* Selected Evidence Context Bar */}
        <div
          style={{
            backgroundColor: '#f1f5f9',
            padding: '12px 24px',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#64748b' }}>الشاهد المختار:</span>
            <strong style={{ color: '#1e293b' }}>{evidence.title}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ color: '#64748b' }}>المؤشرات المربوط بها حالياً:</span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {initiallyLinkedIds.length > 0 ? (
                allIndicators
                  .filter((ind) => initiallyLinkedIds.includes(ind.indicatorId))
                  .map((ind) => (
                    <span
                      key={ind.indicatorId}
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#E0E7FF',
                        color: '#4338CA',
                        fontWeight: 700,
                      }}
                    >
                      {ind.code}
                    </span>
                  ))
              ) : (
                <span style={{ color: '#B45309', fontWeight: 600 }}>غير مرتبط بأي مؤشر</span>
              )}
            </div>
          </div>
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
            onClick={() => setMode('single')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: mode === 'single' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
              backgroundColor: mode === 'single' ? '#eff6ff' : '#ffffff',
              color: mode === 'single' ? '#1d4ed8' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <ArrowRightLeft size={15} />
            نقل لمؤشر آخر
          </button>

          <button
            type="button"
            onClick={() => setMode('multi')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: mode === 'multi' ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
              backgroundColor: mode === 'multi' ? '#f5f3ff' : '#ffffff',
              color: mode === 'multi' ? '#6d28d9' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Link2 size={15} />
            إدارة الربط المتعدد (Multi-link)
          </button>

          <button
            type="button"
            onClick={() => setMode('unlink')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: mode === 'unlink' ? '2px solid #ef4444' : '1px solid #e2e8f0',
              backgroundColor: mode === 'unlink' ? '#fef2f2' : '#ffffff',
              color: mode === 'unlink' ? '#b91c1c' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Unlink size={15} />
            فك الارتباط
          </button>
        </div>

        {/* Tab Content & Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
            {mode === 'single' && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  اختر المؤشر المستهدف لنقل الشاهد إليه:
                </label>
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                  <Search size={16} style={{ position: 'absolute', right: '12px', top: '10px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث برمز أو اسم المؤشر أو المعيار..."
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
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '6px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  {filteredIndicators.map((ind) => {
                    const disabled = isCurrentIndicator(ind.indicatorId);
                    return (
                      <div
                        key={ind.indicatorId}
                        onClick={() => {
                          if (!disabled) {
                            setSelectedSingleIndicatorId(ind.indicatorId);
                            setSelectedCoveredReqIds([]);
                          }
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          marginBottom: '4px',
                          opacity: disabled ? 0.55 : 1,
                          backgroundColor: disabled
                            ? '#f8fafc'
                            : selectedSingleIndicatorId === ind.indicatorId
                            ? '#eff6ff'
                            : '#ffffff',
                          border:
                            selectedSingleIndicatorId === ind.indicatorId && !disabled
                              ? '1px solid #3b82f6'
                              : '1px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '12.5px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#2563eb' }}>{ind.code}</span>
                            <span>{ind.title}</span>
                            {disabled && (
                              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 700 }}>
                                المؤشر الحالي (المصدر)
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{ind.standardName}</div>
                        </div>
                        {selectedSingleIndicatorId === ind.indicatorId && !disabled && <Check size={16} color="#2563eb" />}
                      </div>
                    );
                  })}
                  {filteredIndicators.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '13px' }}>
                      لا توجد مؤشرات مطابقة للبحث
                    </div>
                  )}
                </div>

                {/* Single Mode Mandatory Requirements selection */}
                {singleIndicatorReqs.length > 0 && (
                  <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#92400E', marginBottom: '6px' }}>
                      <FileCheck size={14} color="#D97706" />
                      <span>المتطلبات الإلزامية للمؤشر المستهدف (حدد المتطلبات التي يغطيها هذا الشاهد):</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {singleIndicatorReqs.map((req) => {
                        const checked = selectedCoveredReqIds.includes(req.id);
                        return (
                          <label
                            key={req.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 8px',
                              borderRadius: '5px',
                              backgroundColor: checked ? '#FEF3C7' : '#FFFFFF',
                              border: `1px solid ${checked ? '#D97706' : '#CBD5E1'}`,
                              fontSize: '11.5px',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleCoveredReq(req.id)}
                              style={{ accentColor: '#D97706' }}
                            />
                            <span style={{ fontWeight: checked ? 700 : 500 }}>{req.title}</span>
                            {req.isCovered && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  color: '#059669',
                                  backgroundColor: '#ECFDF5',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  border: '1px solid #A7F3D0',
                                  fontWeight: 600,
                                }}
                              >
                                ✓ مربوط بشاهد آخر
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    مبررات نقل الشاهد (اختياري):
                  </label>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={2}
                    placeholder="بيان سبب إعادة تصنيف ونقل هذا الشاهد..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            {mode === 'multi' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    حدد المؤشرات المرتبطة بهذا الشاهد ({selectedMultiIndicatorIds.length} مؤشر محدد):
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      style={{ fontSize: '11px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      تحديد الكل
                    </button>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <button
                      type="button"
                      onClick={handleClearMultiSelection}
                      style={{ fontSize: '11px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                </div>

                <div style={{ position: 'relative', marginBottom: '10px' }}>
                  <Search size={16} style={{ position: 'absolute', right: '12px', top: '10px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث لاختيار مؤشرات أو إلغاء ربطها..."
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
                    maxHeight: '210px',
                    overflowY: 'auto',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '6px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  {filteredIndicators.map((ind) => {
                    const isChecked = selectedMultiIndicatorIds.includes(ind.indicatorId);
                    const isPrior = isInitiallyLinked(ind.indicatorId);
                    return (
                      <label
                        key={ind.indicatorId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          marginBottom: '4px',
                          backgroundColor: isChecked ? '#f5f3ff' : '#ffffff',
                          border: isChecked ? '1px solid #8b5cf6' : '1px solid transparent',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMultiIndicator(ind.indicatorId)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#7c3aed' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '12.5px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#7c3aed' }}>{ind.code}</span>
                            <span>{ind.title}</span>
                            {isPrior && (
                              <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', fontWeight: 700 }}>
                                مربوط مسبقاً
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{ind.standardName}</div>
                        </div>
                      </label>
                    );
                  })}
                  {filteredIndicators.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '13px' }}>
                      لا توجد مؤشرات مطابقة للبحث
                    </div>
                  )}
                </div>

                {/* Mandatory Requirements selection for selected indicators in multi mode */}
                {multiIndicatorsWithReqs.length > 0 && (
                  <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#92400E', marginBottom: '6px' }}>
                      <FileCheck size={14} color="#D97706" />
                      <span>المتطلبات الإلزامية للمؤشرات المحددة (اختر ما يغطيه هذا الشاهد):</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {multiIndicatorsWithReqs.flatMap((ind) =>
                        ind.evidenceRequirements
                          .filter((r) => r.required)
                          .map((req) => {
                            const checked = selectedCoveredReqIds.includes(req.id);
                            return (
                              <label
                                key={req.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 8px',
                                  borderRadius: '5px',
                                  backgroundColor: checked ? '#FEF3C7' : '#FFFFFF',
                                  border: `1px solid ${checked ? '#D97706' : '#CBD5E1'}`,
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleToggleCoveredReq(req.id)}
                                  style={{ accentColor: '#D97706' }}
                                />
                                <span>
                                  <strong style={{ color: '#7c3aed', marginLeft: '4px' }}>[{ind.code}]</strong>
                                  {req.title}
                                </span>
                                {req.isCovered && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      color: '#059669',
                                      backgroundColor: '#ECFDF5',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      border: '1px solid #A7F3D0',
                                      fontWeight: 600,
                                      marginRight: '4px',
                                    }}
                                  >
                                    ✓ مربوط بشاهد آخر
                                  </span>
                                )}
                              </label>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    مبررات الربط المتعدد (اختياري):
                  </label>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={2}
                    placeholder="بيان شمولية الشاهد لأكثر من مؤشر..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            {mode === 'unlink' && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#fffbeb',
                  borderRadius: '10px',
                  border: '1px solid #fef3c7',
                  display: 'flex',
                  gap: '12px',
                }}
              >
                <AlertTriangle size={24} color="#d97706" style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#92400e', fontWeight: 700 }}>
                    تنبيه فك ارتباط الشاهد عن المؤشر:
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#78350f', lineHeight: 1.6 }}>
                    فك الارتباط يزيل ربط الشاهد بهذا المؤشر فقط (<strong>{evidence.indicatorCode}</strong>) ويبقى المستند محفوظاً بمستودع وثائق المدرسة دون حذفه نهائياً.
                  </p>
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
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: mode === 'unlink' ? '#ef4444' : mode === 'multi' ? '#7c3aed' : '#2563eb',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isSubmitting ? (
                'جارِ الحفظ...'
              ) : mode === 'single' ? (
                <>
                  <ArrowRightLeft size={16} />
                  تأكيد نقل الشاهد
                </>
              ) : mode === 'multi' ? (
                <>
                  <Link2 size={16} />
                  حفظ إدارة الروابط
                </>
              ) : (
                <>
                  <Unlink size={16} />
                  تأكيد فك الارتباط
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
