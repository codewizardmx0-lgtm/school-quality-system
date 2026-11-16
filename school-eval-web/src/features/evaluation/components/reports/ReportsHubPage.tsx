import React, { useState, useEffect } from 'react';
import { evaluatorApi } from '../../api/evaluatorApi';
import type { EvaluatorScreen, EvaluatorDashboardData } from '../../api/evaluationTypes';
import {
  FileText,
  Table,
  Archive,
  TrendingUp,
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  FolderArchive,
  FileCheck2,
  BarChart3,
} from 'lucide-react';

interface ReportsHubPageProps {
  onNavigate?: (screen: EvaluatorScreen, param?: number) => void;
}

export const ReportsHubPage: React.FC<ReportsHubPageProps> = ({ onNavigate }) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<EvaluatorDashboardData | null>(null);

  useEffect(() => {
    let isMounted = true;
    evaluatorApi.getDashboardStats()
      .then((data) => {
        if (isMounted) setDashboardData(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const totalIndicators = dashboardData?.kpis?.totalIndicators ?? 109;
  const scoredIndicators = dashboardData?.kpis?.scoredIndicators ?? 0;
  const hasDigitalHash = Boolean(dashboardData?.schoolInfo?.digitalHash);

  const handleDownload = async (id: string, exportFn: () => Promise<void>, name: string) => {
    try {
      setDownloadingId(id);
      setErrorMessage(null);
      await exportFn();
      setSuccessMessage(`تم تصدير وتحميل ${name} بنجاح.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || `تعذر تصدير ${name}. يرجى التحقق من الصلاحيات والمحاولة لاحقاً.`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {/* 1. Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F766E 0%, #115E59 50%, #134E4A 100%)',
          borderRadius: '16px',
          padding: '28px 32px',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 8px 24px rgba(15, 118, 110, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Archive size={30} color="#CCFBF1" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>
                مركز التقارير وحزم الوثائق الرسمية
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                }}
              >
                4 أقسام معتمدة
              </span>
            </div>
            <p style={{ fontSize: '13.5px', color: '#CCFBF1', margin: '6px 0 0 0', maxWidth: '680px', lineHeight: 1.5 }}>
              المنصة المركزية الشاملة لتصدير مخرجات التقويم المدرسي المعتمدة، وسجلات جرد الشواهد، ومصنفات خطط التحسين، وحزم الأرشيف الرقمي الموثقة بالبصمة والختم الوطني.
            </p>
          </div>
        </div>

        {/* Dynamic Quick Stats Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backgroundColor: 'rgba(0, 0, 0, 0.22)',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '17px', fontWeight: 800 }}>
              {scoredIndicators} / {totalIndicators}
            </div>
            <div style={{ fontSize: '11px', color: '#CCFBF1' }}>مؤشرات مرصودة</div>
          </div>
          <div style={{ width: '1px', height: '26px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '17px', fontWeight: 800 }}>7</div>
            <div style={{ fontSize: '11px', color: '#CCFBF1' }}>معايير وطنية</div>
          </div>
          <div style={{ width: '1px', height: '26px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '17px', fontWeight: 800 }}>
              {hasDigitalHash ? 'SHA-256' : 'قيد التدقيق'}
            </div>
            <div style={{ fontSize: '11px', color: '#CCFBF1' }}>
              {hasDigitalHash ? 'بصمة مشفرة' : 'بصمة الختم'}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: '10px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            fontSize: '13.5px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: '10px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            fontSize: '13.5px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={20} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* القسم الأول: تقارير ومصفوفات التقييم الذاتي الرسمية */}
      {/* ============================================================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '4px', height: '18px', backgroundColor: '#059669', borderRadius: '2px' }} />
          <h2 style={{ fontSize: '16.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            القسم الأول: تقارير ومصفوفات التقييم الذاتي الرسمية
          </h2>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            (الوثائق الأساسية المعتمدة لنتائج التقييم والمؤشرات)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
          {/* Card 1: Comprehensive PDF Dossier */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={22} color="#DC2626" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      التقرير التقييمي الشامل للمدرسة (PDF Dossier)
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', display: 'inline-block', marginTop: '3px' }}>
                      PDF • استمارة التقرير المفصلة
                    </span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '12.8px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                وثيقة التقرير المفصلة لنتائج التقويم المدرسي المعتمدة، تشمل بطاقة الأداء، نتائج المعايير السبعة الموزونة، رصد الـ 109 مؤشرات، وتحليل مواطن القوة وأولويات التطوير.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
              <button
                onClick={() => handleDownload('dossier-pdf', () => evaluatorApi.exportDetailedReportPdf(), 'التقرير التقييمي الشامل (PDF)')}
                disabled={Boolean(downloadingId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontSize: '12.8px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: downloadingId ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                }}
              >
                <Download size={15} />
                <span>{downloadingId === 'dossier-pdf' ? 'جاري تجهيز التقرير...' : 'تحميل التقرير الشامل (PDF)'}</span>
              </button>

              <button
                onClick={() => handleDownload('card-pdf', () => evaluatorApi.exportReportPdf(), 'بطاقة الأداء المختصرة (PDF)')}
                disabled={Boolean(downloadingId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#F8FAFC',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid #E2E8F0',
                  cursor: downloadingId ? 'not-allowed' : 'pointer',
                }}
              >
                <FileCheck2 size={14} />
                <span>{downloadingId === 'card-pdf' ? 'جاري التحميل...' : 'تحميل بطاقة الأداء المختصرة (PDF)'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Assessment Results Matrix Excel */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Table size={22} color="#059669" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      مصفوفة نتائج التقييم وجدول المؤشرات (Excel)
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', backgroundColor: '#ECFDF5', color: '#065F46', display: 'inline-block', marginTop: '3px' }}>
                      Excel • مصفوفة تحليلية رقمية
                    </span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '12.8px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                مصنف عمل إلكتروني تفصيلي يحتوي جدول رصد كافة المؤشرات الـ 109، والدرجات الموزونة، ونسب التغطية مع المعادلات الحسابية المعتمدة للتحليل الإحصائي والفرز المتقدم.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
              <button
                onClick={() => handleDownload('matrix-excel', () => evaluatorApi.exportDetailedReportExcel(), 'مصفوفة التقييم الشاملة (Excel)')}
                disabled={Boolean(downloadingId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontSize: '12.8px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: downloadingId ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                }}
              >
                <Download size={15} />
                <span>{downloadingId === 'matrix-excel' ? 'جاري تصدير المصنف...' : 'تحميل مصفوفة المؤشرات (Excel)'}</span>
              </button>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('standards-tree')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: '#059669',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span>استعراض دليل المعايير في النظام</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* القسم الثاني: حزم وسجلات وثائق الشواهد والأدلة */}
      {/* ============================================================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '4px', height: '18px', backgroundColor: '#059669', borderRadius: '2px' }} />
          <h2 style={{ fontSize: '16.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            القسم الثاني: حزم وسجلات وثائق الشواهد والأدلة
          </h2>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            (أرشيف الملفات المرفوعة وسجل جرد المطابقة المعيارية)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
          {/* Card 3: Evidence Dossier ZIP with 2 Options */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FolderArchive size={22} color="#D97706" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      حزمة وثائق الشواهد المعتمدة (ZIP Archive)
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', display: 'inline-block', marginTop: '3px' }}>
                      ZIP • خياران للتنزيل + فهرس إجرائي (MANIFEST)
                    </span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '12.8px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                أرشيف ملفات الشواهد المرفوعة مقسمة داخل مجلدات وفق المجالات والمعايير الوطنية السبعة ومصحوبة بفهرس توثيقي معتمد. يمكنك اختيار تحميل الإصدار الأخير فقط أو كامل النسخ التاريخية.
              </p>
            </div>

            {/* Two Distinct ZIP Download Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
              <button
                onClick={() => handleDownload('evidence-zip-latest', () => evaluatorApi.exportEvidenceZip('latest'), 'حزمة الشواهد (الإصدار الأخير فقط)')}
                disabled={Boolean(downloadingId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontSize: '12.8px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: downloadingId ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                }}
              >
                <Download size={15} />
                <span>{downloadingId === 'evidence-zip-latest' ? 'جاري ضغط وتنزيل الحزمة...' : 'تحميل حزمة الشواهد (الإصدار الأخير فقط)'}</span>
              </button>

              <button
                onClick={() => handleDownload('evidence-zip-all', () => evaluatorApi.exportEvidenceZip('all'), 'حزمة الشواهد الكاملة (كافة الإصدارات)')}
                disabled={Boolean(downloadingId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#F8FAFC',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid #CBD5E1',
                  cursor: downloadingId ? 'not-allowed' : 'pointer',
                }}
              >
                <Archive size={14} />
                <span>{downloadingId === 'evidence-zip-all' ? 'جاري ضغط كافة النسخ...' : 'تحميل حزمة الشواهد الشاملة (كافة الإصدارات التاريخية)'}</span>
              </button>
            </div>
          </div>

          {/* Card 4: Evidence Inventory & Compliance Excel (إكسل الشواهد) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileCheck2 size={22} color="#059669" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      إكسل الشواهد — سجل جرد ومطابقة الشواهد (Excel)
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', display: 'inline-block', marginTop: '3px' }}>
                      Excel • تقرير جرد الوثائق والمطابقة
                    </span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '12.8px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                مصنف إكسل رسمي لجرد وحصر كافة الشواهد والوثائق المرفوعة؛ يوضح لكل مؤشر ومعيار أسماء المستندات، أرقام النسخ، التبرير، وتاريخ الرفع، مع مطابقتها لمتطلبات التحقق الإلزامية.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
              <button
                onClick={() => handleDownload('evidence-excel', () => evaluatorApi.exportEvidenceInventoryExcel(), 'إكسل جرد ومطابقة الشواهد')}
                disabled={Boolean(downloadingId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontSize: '12.8px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: downloadingId ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                }}
              >
                <Download size={15} />
                <span>{downloadingId === 'evidence-excel' ? 'جاري تصدير سجل الشواهد...' : 'تحميل إكسل جرد الشواهد (Excel)'}</span>
              </button>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('evidences')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: '#0F766E',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span>استعراض مستودع الشواهد في النظام</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* القسم الثالث: الخطط التطويرية ووثائق الحوكمة والاعتماد */}
      {/* ============================================================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '4px', height: '18px', backgroundColor: '#059669', borderRadius: '2px' }} />
          <h2 style={{ fontSize: '16.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            القسم الثالث: الخطط التطويرية ووثائق الحوكمة والاعتماد
          </h2>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            (خطة التحسين المعتمدة وشهادة الختم الرقمي الملزمة)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
          {/* Card 5: Improvement Plan Workbook */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={22} color="#059669" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      وثيقة خطة التحسين والتطوير المعتمدة (Excel)
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', display: 'inline-block', marginTop: '3px' }}>
                      Excel • 3 أوراق عمل تنفيذية
                    </span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '12.8px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                مصنف عمل موحد يتضمن 3 أوراق تفصيلية: بنك مقترحات التحسين ومعالجة الفجوات، الخطط المدرسية المعتمدة، ومصفوفة الإجراءات والمسؤوليات والمدد الزمنية والمؤشرات المستهدفة.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
              <button
                onClick={() => handleDownload('improvement-workbook', () => evaluatorApi.exportImprovementWorkbook(), 'خطة التحسين والتطوير (Excel)')}
                disabled={Boolean(downloadingId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontSize: '12.8px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: downloadingId ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                }}
              >
                <Download size={15} />
                <span>{downloadingId === 'improvement-workbook' ? 'جاري التصدير...' : 'تحميل خطة التحسين والتطوير (Excel)'}</span>
              </button>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('improvement-plan')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: '#059669',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span>استعراض الخطة في النظام</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Card 6: Official Digital Seal Certificate */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={22} color="#DC2626" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      شهادة الختم الرقمي وإشعار التسليم الرسمي (PDF)
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', display: 'inline-block', marginTop: '3px' }}>
                      PDF + Barcode • وثيقة حوكمة ملزمة
                    </span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '12.8px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                الوثيقة الرسمية لإثبات سلامة المحتوى وعدم الإنكار، متضمنة رمز التتبع الوطني المعتمد، البصمة المشفرة (SHA-256)، ورمز الباركود الوطني المشفر للتحقق الميداني والاعتماد.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
              <button
                onClick={() => handleDownload('seal-certificate', () => evaluatorApi.exportSealCertificatePdf(), 'شهادة الختم الرقمي (PDF)')}
                disabled={Boolean(downloadingId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontSize: '12.8px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: downloadingId ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                }}
              >
                <Download size={15} />
                <span>{downloadingId === 'seal-certificate' ? 'جاري إصدار الشهادة...' : 'تحميل شهادة الختم الرقمي (PDF)'}</span>
              </button>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('final-review')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: '#059669',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span>عرض المراجعة والختم في النظام</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* القسم الرابع: مسار التطور والمقارنة التاريخية للدورات */}
      {/* ============================================================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '4px', height: '18px', backgroundColor: '#059669', borderRadius: '2px' }} />
          <h2 style={{ fontSize: '16.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            القسم الرابع: مسار التطور والمقارنة التاريخية للدورات
          </h2>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            (تحليل التغير والنمو المقارن بالدورة التقييمية السابقة)
          </span>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap',
            boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '300px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BarChart3 size={24} color="#2563EB" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '15.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  مقارنة الأداء التاريخي ومصفوفة حركة المؤشرات
                </h3>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                  تحليل دورات متتالية
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0', lineHeight: 1.5 }}>
                استعراض مسار نمو المدرسة مقارنة بالدورة السابقة، مع تصنيف دقيق لحركة المؤشرات (📈 تحسن صاعد، ➖ استقرار، 📉 تراجع يتطلب تدخلاً، 🆕 مؤشرات مقيمة لأول مرة).
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onNavigate && (
              <button
                onClick={() => onNavigate('historical')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 22px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                }}
              >
                <span>الانتقال لشاشة مقارنة الأداء التاريخي</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Governance & Compliance Footer Card */}
      <div
        style={{
          backgroundColor: '#F8FAFC',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: '#EDE9FE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Lock size={20} color="#6D28D9" />
        </div>
        <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.6 }}>
          <strong>ضمان النزاهة التوثيقية وعدم الإنكار:</strong> كافة الوثائق والملفات المصدرة من هذا المركز صادرة مباشرة من قاعدة بيانات النظام المعتمدة، ومربوطة بختم زمني وبصمة رقمية مشفرة (SHA-256). يُعتد بهذه الحزم كوثائق رسمية في التدقيق الوزاري والمراجعة الخارجية.
        </div>
      </div>
    </div>
  );
};
