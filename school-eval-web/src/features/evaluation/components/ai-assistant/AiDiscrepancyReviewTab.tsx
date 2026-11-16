import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileX,
  FileCheck2,
  RefreshCw,
  ExternalLink,
  Layers,
  Info,
} from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';
import type { DiscrepancyAuditResponse, DiscrepancyCase } from '../../api/evaluationTypes';

interface AiDiscrepancyReviewTabProps {
  onNavigateToIndicator?: (standardId?: number, indicatorId?: number) => void;
  onToast: (type: 'success' | 'error', msg: string) => void;
}

export const AiDiscrepancyReviewTab: React.FC<AiDiscrepancyReviewTabProps> = ({
  onNavigateToIndicator,
  onToast,
}) => {
  const [auditData, setAuditData] = useState<DiscrepancyAuditResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('all');

  const fetchAudit = async () => {
    setIsLoading(true);
    try {
      const data = await evaluatorApi.getDiscrepanciesAudit();
      setAuditData(data);
    } catch (err: any) {
      console.error('Failed to run discrepancy audit:', err);
      onToast('error', 'تعذر تشغيل التدقيق المنطقي لإدخالات التقييم.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  const summary = auditData?.summary;
  const cases = auditData?.cases || [];

  const filteredCases = selectedCaseId === 'all'
    ? cases
    : cases.filter((c) => c.caseId === selectedCaseId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
          borderRadius: '16px',
          padding: '24px 30px',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 24px rgba(49, 46, 129, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <ShieldAlert size={28} color="#A5B4FC" />
          </div>
          <div>
            <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0 }}>
              محرك التدقيق المنطقي الحتمي للمفارقات (Deterministic Logic Auditor)
            </h2>
            <p style={{ fontSize: '13px', color: '#C7D2FE', margin: '4px 0 0 0' }}>
              كشف استباقي فوري لـ 5 حالات تناقض بين التقديرات والشواهد ومتطلبات الاعتماد قبل الإغلاق النهائي
            </p>
          </div>
        </div>

        <button
          onClick={fetchAudit}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 22px',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            color: '#312E81',
            fontWeight: 800,
            fontSize: '13.5px',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          <span>{isLoading ? 'جاري الفحص المنهجي...' : 'إعادة التدقيق الآن'}</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Total Discrepancies */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
              إجمالي المفارقات المرصودة
            </span>
            <Layers size={18} color="#6366F1" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', marginTop: '8px' }}>
            {summary?.totalDiscrepancies ?? 0}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '3px' }}>
            من أصل {summary?.evaluatedIndicatorsCount ?? 0} مؤشراً مقيماً
          </div>
        </div>

        {/* Critical Discrepancies */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #FECACA',
            boxShadow: '0 1px 3px rgba(220,38,38,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#991B1B' }}>
              مفارقات حرجة (P0)
            </span>
            <AlertTriangle size={18} color="#DC2626" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#DC2626', marginTop: '8px' }}>
            {summary?.criticalCount ?? 0}
          </div>
          <div style={{ fontSize: '11.5px', color: '#B91C1C', marginTop: '3px', fontWeight: 600 }}>
            درجة بلا شواهد أو درجة 3 بنقص
          </div>
        </div>

        {/* Medium Discrepancies */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #FED7AA',
            boxShadow: '0 1px 3px rgba(217,119,6,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#9A3412' }}>
              ملاحظات منهجية (متوسطة)
            </span>
            <FileX size={18} color="#D97706" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#D97706', marginTop: '8px' }}>
            {summary?.mediumCount ?? 0}
          </div>
          <div style={{ fontSize: '11.5px', color: '#C2410C', marginTop: '3px', fontWeight: 600 }}>
            نقص مبرر نصي أو تناقض أدوات
          </div>
        </div>

        {/* Warnings / Repetitions */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #E0E7FF',
            boxShadow: '0 1px 3px rgba(79,70,229,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#3730A3' }}>
              تنبيهات تكرار الشواهد
            </span>
            <FileCheck2 size={18} color="#4F46E5" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#4F46E5', marginTop: '8px' }}>
            {summary?.warningCount ?? 0}
          </div>
          <div style={{ fontSize: '11.5px', color: '#4338CA', marginTop: '3px', fontWeight: 600 }}>
            وثيقة مكررة في 10+ مؤشرات
          </div>
        </div>

        {/* Overall Status */}
        <div
          style={{
            backgroundColor: summary?.auditPassed ? '#ECFDF5' : '#FEF2F2',
            borderRadius: '12px',
            padding: '18px 20px',
            border: summary?.auditPassed ? '1px solid #A7F3D0' : '1px solid #FECACA',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {summary?.auditPassed ? (
              <ShieldCheck size={22} color="#059669" />
            ) : (
              <ShieldAlert size={22} color="#DC2626" />
            )}
            <span
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: summary?.auditPassed ? '#065F46' : '#991B1B',
              }}
            >
              {summary?.auditPassed ? 'سجل التقييم مطابق تماماً' : 'يتطلب معالجة المفارقات'}
            </span>
          </div>
          <p
            style={{
              fontSize: '11.5px',
              color: summary?.auditPassed ? '#047857' : '#B91C1C',
              margin: '4px 0 0 0',
              lineHeight: 1.4,
            }}
          >
            {summary?.auditPassed
              ? 'كافة التقديرات مدعومة بشواهد وتبريرات متناسقة مع متطلبات الجودة.'
              : 'ينصح بمعالجة المفارقات الحرجة قبل الانتقال للاعتماد النهائي.'}
          </p>
        </div>
      </div>

      {/* 3. Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          backgroundColor: '#F1F5F9',
          padding: '6px',
          borderRadius: '10px',
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedCaseId('all')}
          style={{
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            backgroundColor: selectedCaseId === 'all' ? '#FFFFFF' : 'transparent',
            color: selectedCaseId === 'all' ? '#0F172A' : '#64748B',
            boxShadow: selectedCaseId === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          كافة الحالات ({summary?.totalDiscrepancies ?? 0})
        </button>

        {cases.map((c) => {
          const isSelected = selectedCaseId === c.caseId;
          const badgeBg = c.severity === 'critical' ? '#FEE2E2' : c.severity === 'medium' ? '#FEF3C7' : '#E0E7FF';
          const badgeColor = c.severity === 'critical' ? '#991B1B' : c.severity === 'medium' ? '#92400E' : '#3730A3';

          return (
            <button
              key={c.caseId}
              type="button"
              onClick={() => setSelectedCaseId(c.caseId)}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                color: isSelected ? '#0F172A' : '#64748B',
                boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{c.title}</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: badgeBg,
                  color: badgeColor,
                }}
              >
                {c.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Discrepancy Cases List */}
      {summary?.auditPassed ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #A7F3D0',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ShieldCheck size={36} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#065F46', margin: 0 }}>
            تهانينا! لم يُسفر التدقيق المنطقي عن أي مفارقات أو تناقضات
          </h3>
          <p style={{ fontSize: '13.5px', color: '#047857', maxWidth: '520px', margin: '8px auto 0' }}>
            بيانات التقييم الذاتي للمدرسة مدعومة بشواهد كاملة ومبررات مستوفاة ومتطابقة تماماً مع متطلبات المعايير الوطنية.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredCases.map((c: DiscrepancyCase) => {
            const isCrit = c.severity === 'critical';
            const isMed = c.severity === 'medium';
            const headerBorder = isCrit ? '#FECACA' : isMed ? '#FED7AA' : '#E0E7FF';
            const headerBg = isCrit ? '#FEF2F2' : isMed ? '#FFFBEB' : '#EEF2FF';
            const headerTextColor = isCrit ? '#991B1B' : isMed ? '#9A3412' : '#3730A3';

            if (c.count === 0 && selectedCaseId === 'all') {
              return null;
            }

            return (
              <div
                key={c.caseId}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  border: `1px solid ${headerBorder}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                }}
              >
                {/* Case Header */}
                <div
                  style={{
                    padding: '16px 20px',
                    backgroundColor: headerBg,
                    borderBottom: `1px solid ${headerBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isCrit ? (
                      <AlertTriangle size={20} color="#DC2626" />
                    ) : (
                      <Info size={20} color={isMed ? '#D97706' : '#4F46E5'} />
                    )}
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: headerTextColor, margin: 0 }}>
                        {c.title} ({c.count})
                      </h3>
                      <p style={{ fontSize: '12px', color: headerTextColor, margin: '2px 0 0 0', opacity: 0.85 }}>
                        {c.description}
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      backgroundColor: isCrit ? '#DC2626' : isMed ? '#D97706' : '#4F46E5',
                      color: '#FFFFFF',
                    }}
                  >
                    مستوى الخطورة: {c.severityLabel}
                  </span>
                </div>

                {/* Case Items */}
                {c.items.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    لا توجد أي مفارقات مرصودة ضمن هذه الفئة.
                  </div>
                ) : (
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {c.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '10px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '14px',
                        }}
                      >
                        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {item.code && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  backgroundColor: '#EDE9FE',
                                  color: '#5B21B6',
                                }}
                              >
                                {item.code}
                              </span>
                            )}
                            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                              {item.name || item.documentTitle}
                            </span>
                            {item.standardName && (
                              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                                ({item.standardName})
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>
                            ⚠️ {item.issue}
                          </div>

                          <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 500 }}>
                            💡 <strong>التوجيه:</strong> {item.recommendation}
                          </div>
                        </div>

                        {/* Direct Navigation Button */}
                        {item.indicatorId && onNavigateToIndicator && (
                          <button
                            type="button"
                            onClick={() => onNavigateToIndicator(item.standardId, item.indicatorId)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '7px 14px',
                              borderRadius: '8px',
                              backgroundColor: '#EEF2FF',
                              color: '#4338CA',
                              border: '1px solid #C7D2FE',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span>الانتقال للمؤشر بالاستمارة</span>
                            <ExternalLink size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
