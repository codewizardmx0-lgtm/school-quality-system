/**
 * Screen: StandardsDiffLogPage
 * شاشة رئيسية مستقلة لسجل الفروقات والتدقيق المنهجي بين الإصدارات المعيارية
 * تتيح المقارنة الثنائية بين أي إصدارين معتمدين أو مسودة معيارية
 * وبيانات إحصائية حقيقية من الباك إند (Zero Mock Policy)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRightLeft,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronDown,
  ChevronLeft,
  Sparkles,
  CheckSquare,
  FileCheck2,
  Info,
} from 'lucide-react';
import { standardsApi } from '../../api/standardsApi';
import type {
  StandardVersionSummary,
  DiffLogResponse,
} from '../../api/standardsTypes';
import * as XLSX from 'xlsx';
import { getStandardTimestamp } from '../../utils/standardsExportUtils';

interface StandardsDiffLogPageProps {
  initialTargetVersionId?: number;
  initialBaseVersionId?: number;
  onNavigateToWorkspace?: (versionId: number) => void;
}

type DiffTabKey = 'standards' | 'indicators' | 'rubrics' | 'timeline';

export const StandardsDiffLogPage: React.FC<StandardsDiffLogPageProps> = ({
  initialTargetVersionId,
  initialBaseVersionId,
}) => {
  const [versions, setVersions] = useState<StandardVersionSummary[]>([]);
  const [isVersionsLoading, setIsVersionsLoading] = useState<boolean>(true);

  const [baseVersionId, setBaseVersionId] = useState<number | undefined>(initialBaseVersionId);
  const [targetVersionId, setTargetVersionId] = useState<number | undefined>(initialTargetVersionId);

  const [diffData, setDiffData] = useState<DiffLogResponse | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<DiffTabKey>('standards');
  const [copiedHash, setCopiedHash] = useState(false);
  const [expandedIndicators, setExpandedIndicators] = useState<Record<string, boolean>>({});

  const toggleIndicator = (code: string) => {
    setExpandedIndicators((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const expandAllIndicators = () => {
    const all: Record<string, boolean> = {};
    (diffData?.indicatorsComparison || []).forEach((ind) => {
      all[ind.code] = true;
    });
    setExpandedIndicators(all);
  };

  const collapseAllIndicators = () => {
    setExpandedIndicators({});
  };

  // 1. جلب قائمة الإصدارات المتاحة
  useEffect(() => {
    let isMounted = true;
    const fetchVersionsList = async () => {
      setIsVersionsLoading(true);
      try {
        const list = await standardsApi.getVersions();
        if (isMounted) {
          setVersions(list);
          if (list.length > 0) {
            const activeVer = list.find((v) => v.status === 'Active' || v.status === 'active') || list[0];
            const otherVer = list.find((v) => v.versionId !== activeVer.versionId) || activeVer;

            if (!targetVersionId) {
              setTargetVersionId(otherVer.versionId);
            }
            if (!baseVersionId) {
              setBaseVersionId(activeVer.versionId);
            }
          }
        }
      } catch (err: unknown) {
        if (isMounted) setError(err instanceof Error ? err.message : 'تعذر تحميل قائمة الإصدارات.');
      } finally {
        if (isMounted) setIsVersionsLoading(false);
      }
    };
    fetchVersionsList();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. جلب سجل الفروقات عند تغيير الإصدارين
  const fetchDiff = useCallback(async () => {
    if (!targetVersionId) return;
    setIsLoadingDiff(true);
    setError(null);
    try {
      const data = await standardsApi.getDiffLog(targetVersionId, baseVersionId);
      setDiffData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل جلب بيانات سجل الفروقات من الخادم.');
    } finally {
      setIsLoadingDiff(false);
    }
  }, [targetVersionId, baseVersionId]);

  useEffect(() => {
    if (targetVersionId) {
      void Promise.resolve().then(() => fetchDiff());
    }
  }, [fetchDiff, targetVersionId, baseVersionId]);

  // تبديل اتجاه المقارنة
  const handleSwapVersions = () => {
    if (!baseVersionId || !targetVersionId) return;
    const temp = baseVersionId;
    setBaseVersionId(targetVersionId);
    setTargetVersionId(temp);
  };

  const handleCopyHash = () => {
    if (!diffData?.integrityHash) return;
    navigator.clipboard.writeText(diffData.integrityHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  // تصدير جدول المقارنة إلى ملف Excel
  const handleExportExcel = () => {
    if (!diffData) return;

    const workbook = XLSX.utils.book_new();

    // ورقة المعايير
    if (diffData.standardsComparison && diffData.standardsComparison.length > 0) {
      const stdRows = diffData.standardsComparison.map((s, idx) => ({
        '#': idx + 1,
        'كود المعيار': s.code,
        'اسم المعيار في الإصدار المقارن': s.name,
        'اسم المعيار في إصدار الأساس': s.baselineName,
        'الوزن في المقارن (%)': s.weight,
        'الوزن في الأساس (%)': s.baselineWeight,
        'الفارق في الوزن (%)': s.weightDiff > 0 ? `+${s.weightDiff}` : s.weightDiff,
        'عدد المؤشرات': s.indicatorsCount,
        'حالة المعيار': s.status === 'same' ? 'متطابق' : s.status === 'reweighted' ? 'معاد معايرة الوزن' : s.status === 'added' ? 'مضاف' : 'معدل',
      }));
      const wsStd = XLSX.utils.json_to_sheet(stdRows);
      wsStd['!dir'] = 'rtl';
      XLSX.utils.book_append_sheet(workbook, wsStd, 'مقارنة المعايير الرئيسية');
    }

    // ورقة المؤشرات
    if (diffData.indicatorsComparison && diffData.indicatorsComparison.length > 0) {
      const indRows = diffData.indicatorsComparison.map((i, idx) => ({
        '#': idx + 1,
        'كود المؤشر': i.code,
        'المعيار التابع': i.standardCode,
        'نص المؤشر في الجديد': i.name,
        'نص المؤشر في القديم (الأساس)': i.baselineName,
        [`الوزن في الجديد (${diffData.versionNo}) (%)`]: i.weight,
        [`الوزن في القديم (${diffData.baselineVersionNo || 'الأساس'}) (%)`]: i.baselineWeight,
        'الفارق في الوزن (%)': i.weightDiff > 0 ? `+${i.weightDiff}` : i.weightDiff,
        'أدوات التحقق (الجديد)': (i.tools || []).join('، '),
        'أدوات التحقق (القديم)': (i.baselineTools || []).join('، '),
        'الشواهد (الجديد)': (i.evidence || []).map((e) => e.title).join('، '),
        'الشواهد (القديم)': (i.baselineEvidence || []).map((e) => e.title).join('، '),
        'الحالة المنهجية':
          i.status === 'same'
            ? 'متطابق'
            : i.status === 'reweighted'
            ? 'معاد معايرة الوزن'
            : i.status === 'added'
            ? 'مضاف حديثاً'
            : i.status === 'removed'
            ? 'محذوف'
            : 'معدل',
      }));
      const wsInd = XLSX.utils.json_to_sheet(indRows);
      wsInd['!dir'] = 'rtl';
      XLSX.utils.book_append_sheet(workbook, wsInd, 'مقارنة المؤشرات التفصيلية');
    }

    const filename = `standards_diff_${diffData.versionNo}_vs_${diffData.baselineVersionNo || 'base'}_${getStandardTimestamp()}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const rs = diffData?.realStats;
  const targetVerObj = versions.find((v) => v.versionId === targetVersionId);
  const baseVerObj = versions.find((v) => v.versionId === baseVersionId);

  const targetVerName = diffData?.versionNo ? `وثيقة ${diffData.versionNo}` : 'النسخة المقارنة';
  const baselineVerName = diffData?.baselineVersionNo ? `وثيقة ${diffData.baselineVersionNo}` : 'خط الأساس';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header & Version Selection Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          paddingBottom: '20px',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
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
                التدقيق الرقابي والمقارنة المنهجية
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                شاشة مستقلة لفحص التغييرات والأثر المعياري
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
              سجل الفروقات والتدقيق بين الإصدارات المعيارية
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
              تحليل شامل للفروقات في المعايير، المؤشرات، الأوزان، وسلالم التقدير اللفظي بين أي نسختين في المنظومة
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={fetchDiff}
              disabled={isLoadingDiff}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
              title="تحديث بيانات المقارنة"
            >
              <RefreshCw size={14} className={isLoadingDiff ? 'animate-spin' : ''} />
              <span>تحديث</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!diffData || isLoadingDiff}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#065F46',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '10px',
                cursor: !diffData || isLoadingDiff ? 'not-allowed' : 'pointer',
              }}
              title="تصدير جدول الفروقات إلى Excel"
            >
              <FileSpreadsheet size={15} />
              <span>تصدير الفروقات (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Dual Version Dropdowns Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Base Version Dropdown */}
          <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
              إصدار الأساس (خط المرجع):
            </label>
            <select
              value={baseVersionId || ''}
              onChange={(e) => setBaseVersionId(Number(e.target.value))}
              disabled={isVersionsLoading || isLoadingDiff}
              style={{
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                backgroundColor: '#F8FAFC',
                border: '1.5px solid #CBD5E1',
                borderRadius: '10px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {versions.map((v) => (
                <option key={`base-${v.versionId}`} value={v.versionId}>
                  وثيقة ({v.versionNo}) — {v.status === 'Active' ? 'نافذ حالياً (Active)' : v.status === 'Approved' ? 'مُقرّ (Approved)' : v.status}
                </option>
              ))}
            </select>
            {baseVerObj && (
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                {baseVerObj.standardsCount || 7} معايير • {baseVerObj.indicatorsCount || 109} مؤشراً • وزن {baseVerObj.totalWeight || 100}%
              </span>
            )}
          </div>

          {/* Swap Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '18px' }}>
            <button
              type="button"
              onClick={handleSwapVersions}
              disabled={isLoadingDiff || baseVersionId === targetVersionId}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#F1F5F9',
                color: '#334155',
                border: '1px solid #CBD5E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="تبديل اتجاه المقارنة"
            >
              <ArrowRightLeft size={16} />
            </button>
          </div>

          {/* Target Version Dropdown */}
          <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
              الإصدار المقارن (النسخة المستهدفة):
            </label>
            <select
              value={targetVersionId || ''}
              onChange={(e) => setTargetVersionId(Number(e.target.value))}
              disabled={isVersionsLoading || isLoadingDiff}
              style={{
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                backgroundColor: '#F8FAFC',
                border: '1.5px solid #F59E0B',
                borderRadius: '10px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {versions.map((v) => (
                <option key={`target-${v.versionId}`} value={v.versionId}>
                  وثيقة ({v.versionNo}) — {v.status === 'Active' ? 'نافذ حالياً (Active)' : v.status === 'Approved' ? 'مُقرّ (Approved)' : v.status === 'Draft' ? 'مسودة (Draft)' : v.status}
                </option>
              ))}
            </select>
            {targetVerObj && (
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                {targetVerObj.standardsCount || 7} معايير • {targetVerObj.indicatorsCount || 109} مؤشراً • وزن {targetVerObj.totalWeight || 100}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Loading / Error States */}
      {isLoadingDiff && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#B45309', fontWeight: 700 }}>
            <Loader2 size={24} className="animate-spin" />
            <span>جارٍ حساب الفروقات المنهجية بدقة من قاعدة البيانات...</span>
          </div>
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#991B1B', fontSize: '13px', fontWeight: 700 }}>
          <AlertCircle size={18} color="#DC2626" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Real Statistical KPI Cards (When loaded) */}
      {!isLoadingDiff && diffData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {/* KPI 1: Standards Diff */}
            <div className="std-kpi-card">
              <div className="std-kpi-card-stripe" style={{ backgroundColor: '#059669' }} />
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                  المعايير الرئيسية
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {rs?.standardsCount ?? 7} معايير
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', marginTop: '6px', fontWeight: 700 }}>
                  {rs && rs.standardsDiff !== 0 ? (
                    <span style={{ color: rs.standardsDiff > 0 ? '#059669' : '#DC2626', display: 'flex', alignItems: 'center' }}>
                      {rs.standardsDiff > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {rs.standardsDiff > 0 ? `+${rs.standardsDiff}` : rs.standardsDiff} مقارنة بالأساس ({rs.baselineStandardsCount})
                    </span>
                  ) : (
                    <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Minus size={14} /> متطابق في العدد مع الأساس
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KPI 2: Indicators Diff */}
            <div className="std-kpi-card">
              <div className="std-kpi-card-stripe" style={{ backgroundColor: '#F59E0B' }} />
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                  المؤشرات التفصيلية
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {rs?.indicatorsCount ?? 109} مؤشراً
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', marginTop: '6px', fontWeight: 700 }}>
                  {rs && rs.indicatorsDiff !== 0 ? (
                    <span style={{ color: rs.indicatorsDiff > 0 ? '#059669' : '#DC2626', display: 'flex', alignItems: 'center' }}>
                      {rs.indicatorsDiff > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {rs.indicatorsDiff > 0 ? `+${rs.indicatorsDiff}` : rs.indicatorsDiff} عن الأساس ({rs.baselineIndicatorsCount})
                    </span>
                  ) : (
                    <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Minus size={14} /> متطابق مع النسخة المرجعية
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KPI 3: Weights Balance Comparison */}
            <div className="std-kpi-card">
              <div className="std-kpi-card-stripe" style={{ backgroundColor: '#2563EB' }} />
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                  مجموع الأوزان الموزعة
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {rs?.totalWeight ?? 100}%
                </h3>
                <div style={{ fontSize: '12px', marginTop: '6px', fontWeight: 600, color: '#2563EB' }}>
                  <span>الأساس: {rs?.baselineTotalWeight ?? 100}% • {rs?.isWeightBalanced ? 'متزن 100.0% ✓' : 'غير متزن ⚠'}</span>
                </div>
              </div>
            </div>

            {/* KPI 4: Digital Integrity Hash */}
            <div className="std-kpi-card">
              <div className="std-kpi-card-stripe" style={{ backgroundColor: '#7C3AED' }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                    بصمة النزاهة الرقمية (SHA-256)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: copiedHash ? '#059669' : '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                    }}
                  >
                    {copiedHash ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedHash ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#334155',
                    backgroundColor: '#F8FAFC',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    marginTop: '8px',
                    direction: 'ltr',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={diffData.integrityHash}
                >
                  {diffData.integrityHash}
                </div>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                  بصمة رقمية معتمدة وموثقة ✓
                </span>
              </div>
            </div>
          </div>

          {/* 4. Comparison Tabs Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #E2E8F0', paddingBottom: '0' }}>
            <button
              type="button"
              onClick={() => setActiveTab('standards')}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 800,
                color: activeTab === 'standards' ? '#B45309' : '#64748B',
                borderBottom: activeTab === 'standards' ? '3px solid #F59E0B' : '3px solid transparent',
                marginBottom: '-2px',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
              }}
            >
              مقارنة المعايير الرئيسية ({diffData.standardsComparison?.length || 7})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('indicators')}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 800,
                color: activeTab === 'indicators' ? '#B45309' : '#64748B',
                borderBottom: activeTab === 'indicators' ? '3px solid #F59E0B' : '3px solid transparent',
                marginBottom: '-2px',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
              }}
            >
              مقارنة المؤشرات التفصيلية ({diffData.indicatorsComparison?.length || 109})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rubrics')}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 800,
                color: activeTab === 'rubrics' ? '#B45309' : '#64748B',
                borderBottom: activeTab === 'rubrics' ? '3px solid #F59E0B' : '3px solid transparent',
                marginBottom: '-2px',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
              }}
            >
              سلالم التقدير اللفظي (4 مستويات)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 800,
                color: activeTab === 'timeline' ? '#B45309' : '#64748B',
                borderBottom: activeTab === 'timeline' ? '3px solid #F59E0B' : '3px solid transparent',
                marginBottom: '-2px',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
              }}
            >
              سجل التغييرات الزمني ({diffData.diffs?.length || 0})
            </button>
          </div>

          {/* 5. Tab Content Views */}

          {/* Tab 1: Standards Comparison */}
          {activeTab === 'standards' && (
            <div className="std-table-card">
              <div className="std-table-wrapper">
                <table className="std-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '6%', textAlign: 'center' }}>#</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>كود المعيار</th>
                      <th style={{ width: '32%' }}>اسم المعيار الرئيسي</th>
                      <th style={{ width: '14%', textAlign: 'center' }}>
                        الوزن في الجديد
                        <span style={{ display: 'block', fontSize: '10px', color: '#B45309' }}>({targetVerName})</span>
                      </th>
                      <th style={{ width: '14%', textAlign: 'center' }}>
                        الوزن في القديم
                        <span style={{ display: 'block', fontSize: '10px', color: '#64748B' }}>({baselineVerName})</span>
                      </th>
                      <th style={{ width: '10%', textAlign: 'center' }}>الفارق (%)</th>
                      <th style={{ width: '14%', textAlign: 'center' }}>الحالة المنهجية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(diffData.standardsComparison || []).map((std, idx) => (
                      <tr key={`diff-std-${std.code}`}>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#64748B' }}>{idx + 1}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800 }}>{std.code}</td>
                        <td>
                          <span style={{ fontWeight: 800, color: '#0F172A', display: 'block' }}>{std.name}</span>
                          {std.baselineName !== std.name && std.baselineName !== '—' && (
                            <span style={{ fontSize: '11px', color: '#B45309', display: 'block', marginTop: '2px' }}>
                              كان في القديم ({baselineVerName}): {std.baselineName}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: '#0F172A' }}>{std.weight}%</td>
                        <td style={{ textAlign: 'center', color: '#64748B' }}>{std.baselineWeight}%</td>
                        <td style={{ textAlign: 'center', fontWeight: 800 }}>
                          {std.weightDiff !== 0 ? (
                            <span style={{ color: std.weightDiff > 0 ? '#059669' : '#DC2626' }}>
                              {std.weightDiff > 0 ? `+${std.weightDiff}%` : `${std.weightDiff}%`}
                            </span>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>0%</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor:
                                std.status === 'same'
                                  ? '#F1F5F9'
                                  : std.status === 'reweighted'
                                  ? '#FEF3C7'
                                  : std.status === 'added'
                                  ? '#ECFDF5'
                                  : '#EFF6FF',
                              color:
                                std.status === 'same'
                                  ? '#475569'
                                  : std.status === 'reweighted'
                                  ? '#B45309'
                                  : std.status === 'added'
                                  ? '#047857'
                                  : '#1D4ED8',
                            }}
                          >
                            {std.status === 'same'
                              ? 'متطابق'
                              : std.status === 'reweighted'
                              ? 'إعادة معايرة'
                              : std.status === 'added'
                              ? 'مضاف حديثاً'
                              : 'معدل'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Indicators Comparison */}
          {activeTab === 'indicators' && (
            <div className="std-table-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'block' }}>
                    مقارنة المؤشرات التفصيلية: كيف كانت في القديم ({baselineVerName}) vs كيف أصبحت في الجديد ({targetVerName})
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    فحص مقارن مباشر لنصوص المؤشرات، الأوزان، أدوات التحقق، متطلبات الشواهد، وواصفات سلم التقدير
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
                  <button
                    type="button"
                    onClick={expandAllIndicators}
                    style={{
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#B45309',
                      backgroundColor: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    توسيع كافة المؤشرات (سلالم • شواهد • أدوات)
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllIndicators}
                    style={{
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    طي التفاصيل
                  </button>
                </div>
              </div>

              <div className="std-table-wrapper" style={{ maxHeight: '680px', overflowY: 'auto' }}>
                <table className="std-data-table">
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ width: '4%', textAlign: 'center' }}>#</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>كود المؤشر</th>
                      <th style={{ width: '32%' }}>مقارنة نص المؤشر (كيف كان ← كيف أصبح)</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>
                        الوزن في الجديد
                        <span style={{ display: 'block', fontSize: '10px', color: '#B45309' }}>({targetVerName})</span>
                      </th>
                      <th style={{ width: '10%', textAlign: 'center' }}>
                        الوزن في القديم
                        <span style={{ display: 'block', fontSize: '10px', color: '#64748B' }}>({baselineVerName})</span>
                      </th>
                      <th style={{ width: '8%', textAlign: 'center' }}>الفارق (%)</th>
                      <th style={{ width: '14%', textAlign: 'center' }}>
                        الأدوات والشواهد
                        <span style={{ display: 'block', fontSize: '10px', color: '#64748B' }}>(جديد / قديم)</span>
                      </th>
                      <th style={{ width: '12%', textAlign: 'center' }}>الحالة المنهجية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(diffData.indicatorsComparison || []).map((ind, idx) => {
                      const isExpanded = !!expandedIndicators[ind.code];
                      const rubricLevels = [
                        { val: 3, label: 'متميز (3)', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
                        { val: 2, label: 'متحقق (2)', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
                        { val: 1, label: 'متحقق جزئياً (1)', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
                        { val: 0, label: 'غير متحقق (0)', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                      ];

                      const newTools = ind.tools || [];
                      const oldTools = ind.baselineTools || [];
                      const toolsMatch =
                        newTools.length === oldTools.length &&
                        newTools.every((t) => oldTools.includes(t));

                      const newEvidence = ind.evidence || [];
                      const oldEvidence = ind.baselineEvidence || [];
                      const evidenceMatch =
                        newEvidence.length === oldEvidence.length &&
                        newEvidence.every((e) => oldEvidence.some((oe) => oe.title === e.title));

                      const isTextSame =
                        ind.status !== 'added' &&
                        ind.status !== 'removed' &&
                        (ind.baselineName === ind.name || ind.baselineName === '—');

                      return (
                        <React.Fragment key={`diff-ind-${ind.code}`}>
                          <tr className={isExpanded ? 'bg-amber-50/20' : ''}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#64748B' }}>{idx + 1}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => toggleIndicator(ind.code)}
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '6px',
                                    border: '1px solid #CBD5E1',
                                    backgroundColor: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#475569',
                                  }}
                                  title={isExpanded ? 'طي تفاصيل المقارنة' : 'عرض المقارنة التفصيلية (كيف كان vs كيف أصبح)'}
                                >
                                  {isExpanded ? <ChevronDown size={13} /> : <ChevronLeft size={13} />}
                                </button>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0F172A' }}>
                                  {ind.code}
                                </span>
                              </div>
                            </td>
                            <td>
                              {isTextSame ? (
                                <div>
                                  <span style={{ fontWeight: 700, color: '#0F172A', display: 'block', fontSize: '12px' }}>
                                    {ind.name}
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                    <span style={{ fontSize: '10px', color: '#64748B' }}>المعيار: {ind.standardCode}</span>
                                    <span style={{ fontSize: '10px', color: '#059669', backgroundColor: '#ECFDF5', padding: '1px 6px', borderRadius: '4px' }}>
                                      الصياغة متطابقة في النسختين ✓
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#065F46', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                      كيف أصبح ({targetVerName}):
                                    </span>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                                      {ind.name}
                                    </span>
                                  </div>
                                  {ind.baselineName && ind.baselineName !== '—' && (
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#B45309', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                        كيف كان ({baselineVerName}):
                                      </span>
                                      <span style={{ fontSize: '11px', color: '#64748B', textDecoration: ind.status === 'removed' ? 'line-through' : 'none' }}>
                                        {ind.baselineName}
                                      </span>
                                    </div>
                                  )}
                                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>المعيار: {ind.standardCode}</span>
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 800, color: '#0F172A' }}>{ind.weight}%</td>
                            <td style={{ textAlign: 'center', color: '#64748B' }}>{ind.baselineWeight}%</td>
                            <td style={{ textAlign: 'center', fontWeight: 800 }}>
                              {ind.weightDiff !== 0 ? (
                                <span style={{ color: ind.weightDiff > 0 ? '#059669' : '#DC2626' }}>
                                  {ind.weightDiff > 0 ? `+${ind.weightDiff}%` : `${ind.weightDiff}%`}
                                </span>
                              ) : (
                                <span style={{ color: '#94A3B8' }}>0%</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: toolsMatch ? '#047857' : '#B45309',
                                    backgroundColor: toolsMatch ? '#ECFDF5' : '#FEF3C7',
                                    border: `1px solid ${toolsMatch ? '#A7F3D0' : '#FDE68A'}`,
                                    padding: '1px 6px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                  title={`أدوات التحقق: ${newTools.length} في الجديد مقابل ${oldTools.length} في القديم`}
                                >
                                  <span>الأدوات:</span>
                                  <strong>{newTools.length}</strong>
                                  <span style={{ color: '#94A3B8' }}>/</span>
                                  <span style={{ color: '#64748B' }}>{oldTools.length}</span>
                                </span>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: evidenceMatch ? '#1D4ED8' : '#7C3AED',
                                    backgroundColor: evidenceMatch ? '#EFF6FF' : '#F5F3FF',
                                    border: `1px solid ${evidenceMatch ? '#BFDBFE' : '#DDD6FE'}`,
                                    padding: '1px 6px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                  title={`متطلبات الشواهد: ${newEvidence.length} في الجديد مقابل ${oldEvidence.length} في القديم`}
                                >
                                  <span>الشواهد:</span>
                                  <strong>{newEvidence.length}</strong>
                                  <span style={{ color: '#94A3B8' }}>/</span>
                                  <span style={{ color: '#64748B' }}>{oldEvidence.length}</span>
                                </span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor:
                                    ind.status === 'same'
                                      ? '#F1F5F9'
                                      : ind.status === 'reweighted'
                                      ? '#FEF3C7'
                                      : ind.status === 'added'
                                      ? '#ECFDF5'
                                      : ind.status === 'removed'
                                      ? '#FEF2F2'
                                      : '#EFF6FF',
                                  color:
                                    ind.status === 'same'
                                      ? '#475569'
                                      : ind.status === 'reweighted'
                                      ? '#B45309'
                                      : ind.status === 'added'
                                      ? '#047857'
                                      : ind.status === 'removed'
                                      ? '#DC2626'
                                      : '#1D4ED8',
                                }}
                              >
                                {ind.status === 'same'
                                  ? 'متطابق'
                                  : ind.status === 'reweighted'
                                  ? 'معايرة وزن'
                                  : ind.status === 'added'
                                  ? 'مؤشر جديد'
                                  : ind.status === 'removed'
                                  ? 'محذوف'
                                  : 'معدل'}
                              </span>
                            </td>
                          </tr>

                          {/* Expanded Rich Details Comparison: كيف كان vs كيف أصبح */}
                          {isExpanded && (
                            <tr style={{ backgroundColor: '#F8FAFC' }}>
                              <td colSpan={8} style={{ padding: '20px 24px', borderBottom: '2px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                  
                                  {/* Banner: Indicator Summary */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>
                                        المقارنة المنهجية الشاملة للمؤشر ({ind.code}):
                                      </span>
                                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                                        مقارنة مباشرة بين {targetVerName} (الجديد) و {baselineVerName} (القديم)
                                      </span>
                                    </div>
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '2px 10px',
                                        borderRadius: '9999px',
                                        backgroundColor: ind.status === 'same' ? '#ECFDF5' : '#FEF3C7',
                                        color: ind.status === 'same' ? '#047857' : '#B45309',
                                        border: `1px solid ${ind.status === 'same' ? '#A7F3D0' : '#FDE68A'}`,
                                      }}
                                    >
                                      {ind.status === 'same' ? 'المؤشر متطابق 100% في كافة المكونات ✓' : 'تم رصد فروقات منهجية في هذا المؤشر ✍'}
                                    </span>
                                  </div>

                                  {/* 1. Comparison of Verification Tools: كيف كانت vs كيف أصبحت */}
                                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '14px 18px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <CheckSquare size={15} color="#059669" />
                                        <strong style={{ fontSize: '12px', color: '#0F172A' }}>
                                          أدوات التحقق (Verification Tools): كيف كانت في القديم vs كيف أصبحت في الجديد
                                        </strong>
                                      </div>
                                      {toolsMatch ? (
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
                                          أدوات متطابقة بالكامل ✓
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#B45309', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '6px' }}>
                                          تعديل في قائمة الأدوات ✍
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                                      {/* New Tools */}
                                      <div style={{ backgroundColor: '#F0FDF4', padding: '12px 14px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534' }}>
                                            أدوات الإصدار الجديد ({targetVerName})
                                          </span>
                                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#15803D', backgroundColor: '#DCFCE7', padding: '1px 6px', borderRadius: '4px' }}>
                                            {newTools.length} أدوات
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                          {newTools.length > 0 ? (
                                            newTools.map((t) => {
                                              const isNewTool = !oldTools.includes(t);
                                              return (
                                                <span
                                                  key={`tool-target-${t}`}
                                                  style={{
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    color: '#065F46',
                                                    backgroundColor: '#FFFFFF',
                                                    border: `1.5px solid ${isNewTool ? '#059669' : '#A7F3D0'}`,
                                                    padding: '3px 10px',
                                                    borderRadius: '8px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                  }}
                                                >
                                                  {isNewTool && <span style={{ color: '#059669', fontWeight: 900 }}>+</span>}
                                                  <span>{t}</span>
                                                  {isNewTool && <span style={{ fontSize: '9px', color: '#059669', backgroundColor: '#ECFDF5', padding: '0 4px', borderRadius: '3px' }}>جديدة</span>}
                                                </span>
                                              );
                                            })
                                          ) : (
                                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>لم تُحدد أدوات في النسخة الجديدة</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Old Tools */}
                                      <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>
                                            أدوات الإصدار القديم ({baselineVerName})
                                          </span>
                                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569', backgroundColor: '#E2E8F0', padding: '1px 6px', borderRadius: '4px' }}>
                                            {oldTools.length} أدوات
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                          {oldTools.length > 0 ? (
                                            oldTools.map((t) => {
                                              const isDropped = !newTools.includes(t);
                                              return (
                                                <span
                                                  key={`tool-base-${t}`}
                                                  style={{
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    color: isDropped ? '#DC2626' : '#475569',
                                                    backgroundColor: '#FFFFFF',
                                                    border: `1.5px solid ${isDropped ? '#FECACA' : '#CBD5E1'}`,
                                                    padding: '3px 10px',
                                                    borderRadius: '8px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    textDecoration: isDropped ? 'line-through' : 'none',
                                                  }}
                                                >
                                                  {isDropped && <span style={{ color: '#DC2626', fontWeight: 900 }}>✕</span>}
                                                  <span>{t}</span>
                                                  {isDropped && <span style={{ fontSize: '9px', color: '#DC2626', backgroundColor: '#FEF2F2', padding: '0 4px', borderRadius: '3px' }}>ملغاة</span>}
                                                </span>
                                              );
                                            })
                                          ) : (
                                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>لم تكن هناك أدوات مسجلة في القديم</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 2. Comparison of Evidence Requirements: كيف كانت vs كيف أصبحت */}
                                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '14px 18px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FileCheck2 size={15} color="#2563EB" />
                                        <strong style={{ fontSize: '12px', color: '#0F172A' }}>
                                          متطلبات الشواهد والوثائق (Evidence): كيف كانت في القديم vs كيف أصبحت في الجديد
                                        </strong>
                                      </div>
                                      {evidenceMatch ? (
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
                                          الشواهد متطابقة بالكامل ✓
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#B45309', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '6px' }}>
                                          تعديل في متطلبات الشواهد ✍
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                                      {/* New Evidence */}
                                      <div style={{ backgroundColor: '#EFF6FF', padding: '12px 14px', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#1E40AF' }}>
                                            شواهد الإصدار الجديد ({targetVerName})
                                          </span>
                                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#1D4ED8', backgroundColor: '#DBEAFE', padding: '1px 6px', borderRadius: '4px' }}>
                                            {newEvidence.length} متطلبات
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                          {newEvidence.length > 0 ? (
                                            newEvidence.map((e, eIdx) => (
                                              <span
                                                key={`ev-target-${eIdx}`}
                                                style={{
                                                  fontSize: '11px',
                                                  fontWeight: 600,
                                                  color: '#1E3A8A',
                                                  backgroundColor: '#FFFFFF',
                                                  border: '1px solid #93C5FD',
                                                  padding: '3px 10px',
                                                  borderRadius: '8px',
                                                }}
                                              >
                                                {e.title} {e.required && <strong style={{ color: '#DC2626' }}>* (إلزامي)</strong>}
                                              </span>
                                            ))
                                          ) : (
                                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>لم تُحدد شواهد في النسخة الجديدة</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Old Evidence */}
                                      <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>
                                            شواهد الإصدار القديم ({baselineVerName})
                                          </span>
                                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569', backgroundColor: '#E2E8F0', padding: '1px 6px', borderRadius: '4px' }}>
                                            {oldEvidence.length} متطلبات
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                          {oldEvidence.length > 0 ? (
                                            oldEvidence.map((e, eIdx) => (
                                              <span
                                                key={`ev-base-${eIdx}`}
                                                style={{
                                                  fontSize: '11px',
                                                  fontWeight: 500,
                                                  color: '#475569',
                                                  backgroundColor: '#FFFFFF',
                                                  border: '1px solid #CBD5E1',
                                                  padding: '3px 10px',
                                                  borderRadius: '8px',
                                                }}
                                              >
                                                {e.title} {e.required && <span style={{ color: '#64748B' }}>* (إلزامي)</span>}
                                              </span>
                                            ))
                                          ) : (
                                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>لم تكن هناك شواهد مسجلة في القديم</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 3. Description & Evaluator Guidance: كيف كان vs كيف أصبح */}
                                  {(ind.description || ind.baselineDescription) && (
                                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '14px 18px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <Info size={15} color="#475569" />
                                          <strong style={{ fontSize: '12px', color: '#0F172A' }}>
                                            الوصف وإرشادات المقيم الميداني: كيف كان في القديم vs كيف أصبح في الجديد
                                          </strong>
                                        </div>
                                        {ind.description === ind.baselineDescription ? (
                                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
                                            إرشادات المقيم متطابقة ✓
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#B45309', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '6px' }}>
                                            تم تحديث إرشادات المقيم ✍
                                          </span>
                                        )}
                                      </div>

                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                                        <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                                            في الإصدار الجديد ({targetVerName}):
                                          </span>
                                          <p style={{ fontSize: '11px', color: '#334155', margin: 0, lineHeight: 1.6 }}>
                                            {ind.description || 'لا يوجد وصف أو إرشادات مدخلة.'}
                                          </p>
                                        </div>

                                        <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                                            في الإصدار القديم ({baselineVerName}):
                                          </span>
                                          <p style={{ fontSize: '11px', color: '#64748B', margin: 0, lineHeight: 1.6 }}>
                                            {ind.baselineDescription || 'لم يكن هناك وصف أو إرشادات سابقة.'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* 4. Rubric Descriptors (0-3): كيف كانت vs كيف أصبحت */}
                                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '14px 18px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                      <Sparkles size={15} color="#D97706" />
                                      <strong style={{ fontSize: '12px', color: '#0F172A' }}>
                                        واصفات سلم التقدير اللفظي (المستويات 0 - 3): كيف كانت في القديم vs كيف أصبحت في الجديد
                                      </strong>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                                      {rubricLevels.map((lvl) => {
                                        const vText = ind.descriptors?.[lvl.val] || '—';
                                        const bText = ind.baselineDescriptors?.[lvl.val] || '—';
                                        const isChanged = vText !== bText && bText !== '—';

                                        return (
                                          <div
                                            key={`rubric-diff-${ind.code}-${lvl.val}`}
                                            style={{
                                              padding: '12px 14px',
                                              borderRadius: '10px',
                                              border: `1.5px solid ${lvl.border}`,
                                              backgroundColor: '#FFFFFF',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: '8px',
                                            }}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                              <span style={{ fontSize: '11px', fontWeight: 800, color: lvl.color }}>
                                                {lvl.label}
                                              </span>
                                              <span
                                                style={{
                                                  fontSize: '9px',
                                                  fontWeight: 800,
                                                  color: isChanged ? '#B45309' : '#047857',
                                                  backgroundColor: isChanged ? '#FEF3C7' : '#ECFDF5',
                                                  padding: '1px 6px',
                                                  borderRadius: '4px',
                                                }}
                                              >
                                                {isChanged ? 'تم تعديل الصياغة' : 'صياغة متطابقة ✓'}
                                              </span>
                                            </div>

                                            {/* New Descriptor */}
                                            <div>
                                              <span style={{ fontSize: '10px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '2px' }}>
                                                الجديد ({targetVerName}):
                                              </span>
                                              <p style={{ fontSize: '11px', color: '#1E293B', margin: 0, lineHeight: 1.45 }}>
                                                {vText}
                                              </p>
                                            </div>

                                            {/* Old Descriptor */}
                                            <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '6px' }}>
                                              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '2px' }}>
                                                القديم ({baselineVerName}):
                                              </span>
                                              <p style={{ fontSize: '10px', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                                                {bText}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Rubrics Comparison */}
          {activeTab === 'rubrics' && (
            <div className="std-table-card">
              <div className="std-table-wrapper">
                <table className="std-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '10%', textAlign: 'center' }}>قيمة المستوى</th>
                      <th style={{ width: '18%' }}>
                        التسمية في الجديد
                        <span style={{ display: 'block', fontSize: '10px', color: '#B45309' }}>({targetVerName})</span>
                      </th>
                      <th style={{ width: '18%' }}>
                        التسمية في القديم
                        <span style={{ display: 'block', fontSize: '10px', color: '#64748B' }}>({baselineVerName})</span>
                      </th>
                      <th style={{ width: '22%' }}>
                        الوصف في الجديد
                        <span style={{ display: 'block', fontSize: '10px', color: '#B45309' }}>({targetVerName})</span>
                      </th>
                      <th style={{ width: '22%' }}>
                        الوصف في القديم
                        <span style={{ display: 'block', fontSize: '10px', color: '#64748B' }}>({baselineVerName})</span>
                      </th>
                      <th style={{ width: '10%', textAlign: 'center' }}>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(diffData.rubricsComparison || []).map((r) => (
                      <tr key={`rubric-${r.scoreValue}`}>
                        <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>
                          المستوى {r.scoreValue}
                        </td>
                        <td style={{ fontWeight: 800, color: '#0F172A' }}>{r.label}</td>
                        <td style={{ color: '#64748B' }}>{r.baselineLabel}</td>
                        <td style={{ fontSize: '12px', color: '#0F172A', lineHeight: 1.5 }}>
                          {r.description || 'واصف المستوى اللفظي المعتمد'}
                        </td>
                        <td style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                          {r.baselineDescription || '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: r.status === 'same' ? '#ECFDF5' : '#FEF3C7',
                              color: r.status === 'same' ? '#047857' : '#B45309',
                            }}
                          >
                            {r.status === 'same' ? 'متطابق 4 مستويات ✓' : 'معدل'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Timeline Log */}
          {activeTab === 'timeline' && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {diffData.diffs && diffData.diffs.length > 0 ? (
                  diffData.diffs.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px 16px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          marginTop: '6px',
                          backgroundColor:
                            d.type === 'added' ? '#10B981' : d.type === 'reweighted' ? '#F59E0B' : '#64748B',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#B45309' }}>{d.category}</span>
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B' }}>{d.code}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{d.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                    <CheckCircle2 size={32} color="#059669" style={{ margin: '0 auto 8px auto' }} />
                    <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, color: '#0F172A' }}>
                      لا توجد فروقات منهجية مرصودة بين النسختين
                    </p>
                    <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>
                      النسختان متطابقتان تماماً في المعايير والمؤشرات والأوزان وسلالم التقدير.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
