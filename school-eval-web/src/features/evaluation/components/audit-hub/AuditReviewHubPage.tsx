import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck2,
  Target,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  PlusCircle,
  RefreshCw,
  X,
  MessageSquare,
  ShieldAlert,
  Send,
  BookOpen,
} from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';
import type {
  AuditHubData,
  AuditHubIndicator,
  EvaluatorScreen,
} from '../../api/evaluationTypes';

interface AuditReviewHubPageProps {
  onNavigate: (screen: EvaluatorScreen, param?: number, fromHub?: boolean) => void;
  isPrincipal?: boolean;
}

type IndicatorSortKey = 'code' | 'standard' | 'score' | 'requirementsCoverage' | 'reviewStatus';
type SortDirection = 'asc' | 'desc';

export const AuditReviewHubPage: React.FC<AuditReviewHubPageProps> = ({
  onNavigate,
  isPrincipal = false,
}) => {
  const [data, setData] = useState<AuditHubData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'indicators' | 'plans' | 'completion' | 'final-signoff'>('indicators');

  // Filters state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStandard, setSelectedStandard] = useState<string>('all');
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<'all' | 'reviewed' | 'pending'>('all');
  const [selectedScore, setSelectedScore] = useState<string>('all');

  // Sorting state
  const [sortKey, setSortKey] = useState<IndicatorSortKey>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Quick Review Modal state (Principal only)
  const [selectedIndicatorForReview, setSelectedIndicatorForReview] = useState<AuditHubIndicator | null>(null);
  const [quickReviewNoteText, setQuickReviewNoteText] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const [noteSuccessMessage, setNoteSuccessMessage] = useState<string | null>(null);
  const [noteErrorMessage, setNoteErrorMessage] = useState<string | null>(null);

  // Expanded Notes View modal / popover
  const [viewingNotesIndicator, setViewingNotesIndicator] = useState<AuditHubIndicator | null>(null);

  const fetchHubData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await evaluatorApi.getAuditHub();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل بيانات مركز التدقيق والمراجعة.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHubData();
  }, []);

  // Filter and Sort Indicators
  const filteredAndSortedIndicators = useMemo(() => {
    if (!data?.indicators) return [];

    let list = [...data.indicators];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (ind) =>
          ind.indicatorCode.toLowerCase().includes(q) ||
          ind.indicatorName.toLowerCase().includes(q) ||
          ind.standardName.toLowerCase().includes(q) ||
          ind.subStandardName.toLowerCase().includes(q)
      );
    }

    // Standard filter
    if (selectedStandard !== 'all') {
      list = list.filter((ind) => ind.standardCode === selectedStandard);
    }

    // Review status filter
    if (selectedReviewStatus === 'reviewed') {
      list = list.filter((ind) => ind.hasPrincipalReview);
    } else if (selectedReviewStatus === 'pending') {
      list = list.filter((ind) => !ind.hasPrincipalReview);
    }

    // Score filter
    if (selectedScore !== 'all') {
      if (selectedScore === 'unscored') {
        list = list.filter((ind) => ind.score === null || ind.score === undefined);
      } else {
        const targetScore = parseInt(selectedScore, 10);
        list = list.filter((ind) => ind.score === targetScore);
      }
    }

    // Sorting
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'code':
          comparison = a.indicatorCode.localeCompare(b.indicatorCode, undefined, { numeric: true });
          break;
        case 'standard':
          comparison = a.standardCode.localeCompare(b.standardCode);
          break;
        case 'score': {
          const scoreA = a.score ?? -1;
          const scoreB = b.score ?? -1;
          comparison = scoreA - scoreB;
          break;
        }
        case 'requirementsCoverage': {
          const ratioA = a.mandatoryRequirementsCount > 0 ? (a.coveredRequirementsCount / a.mandatoryRequirementsCount) : (a.evidenceCount > 0 ? 1 : 0);
          const ratioB = b.mandatoryRequirementsCount > 0 ? (b.coveredRequirementsCount / b.mandatoryRequirementsCount) : (b.evidenceCount > 0 ? 1 : 0);
          comparison = ratioA - ratioB;
          break;
        }
        case 'reviewStatus': {
          const valA = a.hasPrincipalReview ? 1 : 0;
          const valB = b.hasPrincipalReview ? 1 : 0;
          comparison = valA - valB;
          break;
        }
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [data?.indicators, searchTerm, selectedStandard, selectedReviewStatus, selectedScore, sortKey, sortDirection]);

  const handleSort = (key: IndicatorSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleOpenQuickReview = (ind: AuditHubIndicator) => {
    setSelectedIndicatorForReview(ind);
    setQuickReviewNoteText('');
    setNoteSuccessMessage(null);
    setNoteErrorMessage(null);
  };

  const handleSubmitQuickReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIndicatorForReview || !quickReviewNoteText.trim()) return;

    setIsSubmittingNote(true);
    setNoteErrorMessage(null);
    setNoteSuccessMessage(null);

    try {
      await evaluatorApi.addAuditIndicatorReviewNote(
        selectedIndicatorForReview.indicatorId,
        quickReviewNoteText.trim()
      );

      setNoteSuccessMessage('تم تدوين وحفظ الملاحظة الإدارية بنجاح.');
      // Refresh data
      await fetchHubData();

      setTimeout(() => {
        setSelectedIndicatorForReview(null);
        setQuickReviewNoteText('');
        setNoteSuccessMessage(null);
      }, 900);
    } catch (err: any) {
      setNoteErrorMessage(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء حفظ الملاحظة.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const renderSortArrow = (key: IndicatorSortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown size={13} style={{ opacity: 0.4 }} />;
    }
    return sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
  };

  const getScoreBadge = (score: number | null) => {
    switch (score) {
      case 3:
        return (
          <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
            متقدم (3)
          </span>
        );
      case 2:
        return (
          <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
            كافٍ (2)
          </span>
        );
      case 1:
        return (
          <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
            محدود (1)
          </span>
        );
      case 0:
        return (
          <span style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
            غير متوفر (0)
          </span>
        );
      default:
        return (
          <span style={{ backgroundColor: '#F1F5F9', color: '#64748B', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
            غير مرصود
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '360px', gap: '14px' }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: '#0284C7' }} />
        <p style={{ color: '#64748B', fontSize: '15px', fontWeight: 600 }}>جاري تحميل مركز التدقيق والمراجعة الشاملة...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
        <AlertCircle size={36} style={{ color: '#DC2626', margin: '0 auto 12px' }} />
        <h3 style={{ color: '#991B1B', fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>تعذر استرجاع البيانات</h3>
        <p style={{ color: '#7F1D1D', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
        <button
          onClick={fetchHubData}
          style={{ backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '8px 20px', cursor: 'pointer', fontWeight: 600 }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const { summary, indicators, plans, completionRequest, finalReview } = data;

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '24px', direction: 'rtl' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: '#FFFFFF',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.15)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div
              style={{
                backgroundColor: isPrincipal ? 'rgba(2, 132, 199, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                padding: '8px',
                borderRadius: '10px',
                display: 'inline-flex',
              }}
            >
              <ClipboardCheck size={24} style={{ color: isPrincipal ? '#38BDF8' : '#34D399' }} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>
              {isPrincipal ? 'مركز التدقيق والمراجعة الإدارية الشاملة' : 'سجل تدقيق ومراجعات مدير المدرسة'}
            </h1>
            <span
              style={{
                backgroundColor: isPrincipal ? '#0284C7' : '#059669',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px',
              }}
            >
              {isPrincipal ? 'صلاحيات الإشراف الإداري' : 'سجل المراجعة والاعتماد'}
            </span>
          </div>
          <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0, maxWidth: '780px', lineHeight: 1.6 }}>
            {isPrincipal
              ? 'نافذة القيادة الموحدة لمراجعة وتدقيق كافة مؤشرات الأداء المدرسي الـ 109، ومتابعة خطط التحسين المعتمدة، وطلبات الاستكمال، والاعتماد الإداري الشامل.'
              : 'استعراض تدقيقات وملاحظات الإدارة المدرسية على مؤشرات التقييم الذاتي وخطط التطوير والاعتماد قبل الاعتماد النهائي.'}
          </p>
        </div>

        <button
          onClick={fetchHubData}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          title="تحديث البيانات فورياً"
        >
          <RefreshCw size={15} />
          <span>تحديث السجل</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Total Indicators */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>المؤشرات الوطنية</span>
            <BookOpen size={18} style={{ color: '#0284C7' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>{summary.totalIndicators}</div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>موزعة عبر 4 معايير وطنية</div>
        </div>

        {/* Card 2: Reviewed Indicators */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>تمت مراجعتها</span>
            <CheckCircle2 size={18} style={{ color: '#10B981' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 800, color: '#10B981' }}>{summary.reviewedIndicatorsCount}</span>
            <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
              {summary.reviewCoveragePercentage}% تغطية
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>تحتوي على ملاحظات مراجعة إدارية</div>
        </div>

        {/* Card 3: Pending Review */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>بانتظار المراجعة</span>
            <Clock size={18} style={{ color: '#F59E0B' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: summary.pendingIndicatorsCount > 0 ? '#D97706' : '#10B981' }}>
            {summary.pendingIndicatorsCount}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>مؤشرات بحاجة لتدقيق المدير</div>
        </div>

        {/* Card 4: Plans Status */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>خطط التحسين</span>
            <Target size={18} style={{ color: '#2563EB' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 800, color: '#2563EB' }}>{summary.plansCount}</span>
            <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
              {summary.reviewedPlansCount} مراجعة
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>الخطط الثلاث الأساسية</div>
        </div>

        {/* Card 5: Completion Requests */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>طلبات الاستكمال</span>
            <AlertCircle size={18} style={{ color: summary.hasOpenCompletionRequest ? '#EF4444' : '#10B981' }} />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: summary.hasOpenCompletionRequest ? '#DC2626' : '#10B981' }}>
            {summary.hasOpenCompletionRequest ? 'يوجد طلب مفتوح' : 'لا توجد طلبات'}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
            {completionRequest ? `${completionRequest.pendingItems} بنود غير مكتملة` : 'كافة المتطلبات مستوفاة'}
          </div>
        </div>

        {/* Card 6: Final Signoff */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>الإقرار الإداري</span>
            <FileCheck2 size={18} style={{ color: summary.finalReviewAcknowledged ? '#10B981' : '#F59E0B' }} />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: summary.finalReviewAcknowledged ? '#10B981' : '#D97706' }}>
            {summary.finalReviewAcknowledged ? 'تم الإقرار الإداري' : 'بانتظار الإقرار'}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
            {finalReview.isLocked ? 'التقرير مقفل ومختوم' : 'المراجعة قيد التنفيذ'}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ borderBottom: '1px solid #E2E8F0', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('indicators')}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 700,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: activeTab === 'indicators' ? '#0284C7' : '#64748B',
            borderBottom: activeTab === 'indicators' ? '3px solid #0284C7' : '3px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <BookOpen size={16} />
          <span>مؤشرات التقييم الذاتي ({indicators.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 700,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: activeTab === 'plans' ? '#0284C7' : '#64748B',
            borderBottom: activeTab === 'plans' ? '3px solid #0284C7' : '3px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <Target size={16} />
          <span>متابعة خطط التحسين ({plans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('completion')}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 700,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: activeTab === 'completion' ? '#0284C7' : '#64748B',
            borderBottom: activeTab === 'completion' ? '3px solid #0284C7' : '3px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <AlertCircle size={16} />
          <span>طلبات الاستكمال الوزارية</span>
          {completionRequest && completionRequest.status === 'Pending' && (
            <span style={{ backgroundColor: '#EF4444', color: '#FFFFFF', fontSize: '10px', padding: '2px 6px', borderRadius: '999px' }}>
              مفتوح
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('final-signoff')}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 700,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: activeTab === 'final-signoff' ? '#0284C7' : '#64748B',
            borderBottom: activeTab === 'final-signoff' ? '3px solid #0284C7' : '3px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <FileCheck2 size={16} />
          <span>المراجعة والإقرار الإداري</span>
        </button>
      </div>

      {/* TAB 1: INDICATORS TABLE WITH FILTERS & SORT */}
      {activeTab === 'indicators' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filter Bar */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
                <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="ابحث بالرمز أو اسم المؤشر أو المعيار..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 36px 8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Standard Filter */}
              <select
                value={selectedStandard}
                onChange={(e) => setSelectedStandard(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  color: '#1E293B',
                  fontWeight: 600,
                }}
              >
                <option value="all">كافة المعايير (4)</option>
                <option value="STD-01">القيادة المدرسية (STD-01)</option>
                <option value="STD-02">التعليم والتعلم (STD-02)</option>
                <option value="STD-03">نواتج التعلم (STD-03)</option>
                <option value="STD-04">البيئة المدرسية (STD-04)</option>
              </select>

              {/* Review Status Filter */}
              <select
                value={selectedReviewStatus}
                onChange={(e) => setSelectedReviewStatus(e.target.value as any)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  color: '#1E293B',
                  fontWeight: 600,
                }}
              >
                <option value="all">كافة حالات المراجعة</option>
                <option value="reviewed">✓ تمت مراجعته فقط</option>
                <option value="pending">⏳ بانتظار المراجعة فقط</option>
              </select>

              {/* Score Filter */}
              <select
                value={selectedScore}
                onChange={(e) => setSelectedScore(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  color: '#1E293B',
                  fontWeight: 600,
                }}
              >
                <option value="all">كافة التقديرات</option>
                <option value="3">متقدم (3)</option>
                <option value="2">كافٍ (2)</option>
                <option value="1">محدود (1)</option>
                <option value="0">غير متوفر (0)</option>
                <option value="unscored">غير مرصود</option>
              </select>

              {/* Reset button */}
              {(searchTerm || selectedStandard !== 'all' || selectedReviewStatus !== 'all' || selectedScore !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedStandard('all');
                    setSelectedReviewStatus('all');
                    setSelectedScore('all');
                  }}
                  style={{
                    backgroundColor: '#F1F5F9',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  إلغاء الفلاتر
                </button>
              )}
            </div>

            {/* Filter Count & Active Chips */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748B', paddingTop: '4px' }}>
              <span>
                عرض <strong>{filteredAndSortedIndicators.length}</strong> من إجمالي <strong>{indicators.length}</strong> مؤشراً
              </span>
            </div>
          </div>

          {/* Indicators Table */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 700 }}>
                    <th
                      onClick={() => handleSort('code')}
                      style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none', width: '130px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>رمز المؤشر</span>
                        {renderSortArrow('code')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('standard')}
                      style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none', minWidth: '200px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>المؤشر والمعيار</span>
                        {renderSortArrow('standard')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('score')}
                      style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none', width: '130px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>التقدير المرصود</span>
                        {renderSortArrow('score')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('requirementsCoverage')}
                      style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none', width: '150px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>تغطية المتطلبات</span>
                        {renderSortArrow('requirementsCoverage')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('reviewStatus')}
                      style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none', minWidth: '220px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>حالة مراجعة المدير</span>
                        {renderSortArrow('reviewStatus')}
                      </div>
                    </th>
                    <th style={{ padding: '12px 16px', width: '190px', textAlign: 'center' }}>
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedIndicators.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                        لا توجد مؤشرات تطابق الفلاتر المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedIndicators.map((ind) => (
                      <tr
                        key={ind.indicatorId}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          transition: 'background-color 0.1s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Column 1: Code */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                          <span
                            style={{
                              backgroundColor: '#F1F5F9',
                              color: '#334155',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                            }}
                          >
                            {ind.indicatorCode}
                          </span>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                            {ind.subStandardCode}
                          </div>
                        </td>

                        {/* Column 2: Name & Standard */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 600, color: '#1E293B', marginBottom: '4px', lineHeight: 1.4 }}>
                            {ind.indicatorName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{ind.standardName}</span>
                            <span>•</span>
                            <span>{ind.subStandardName}</span>
                          </div>
                        </td>

                        {/* Column 3: Score */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                          {getScoreBadge(ind.score)}
                        </td>

                        {/* Column 4: Requirements Coverage */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                          {ind.mandatoryRequirementsCount > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  backgroundColor: ind.isRequirementFullyCovered ? '#DCFCE7' : ind.coveredRequirementsCount > 0 ? '#FEF3C7' : '#FEE2E2',
                                  color: ind.isRequirementFullyCovered ? '#15803D' : ind.coveredRequirementsCount > 0 ? '#92400E' : '#991B1B',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                }}
                              >
                                <span>{ind.coveredRequirementsCount} / {ind.mandatoryRequirementsCount} متطلبات</span>
                              </span>
                              <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                                {ind.isRequirementFullyCovered ? '✓ مستوفٍ للشواهد' : ind.coveredRequirementsCount > 0 ? 'مستوفٍ جزئياً' : 'غير مستوفٍ'}
                              </span>
                            </div>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: ind.evidenceCount > 0 ? '#EFF6FF' : '#F1F5F9',
                                color: ind.evidenceCount > 0 ? '#1D4ED8' : '#94A3B8',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                            >
                              {ind.evidenceCount > 0 ? `مرفق (${ind.evidenceCount} شواهد)` : 'لا يتطلب شواهد'}
                            </span>
                          )}
                        </td>

                        {/* Column 5: Review Status */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                          {ind.hasPrincipalReview ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    backgroundColor: '#DCFCE7',
                                    color: '#15803D',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <CheckCircle2 size={12} />
                                  <span>تمت المراجعة ({ind.principalNotesCount})</span>
                                </span>
                              </div>
                              {ind.latestPrincipalNote && (
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: '#475569',
                                    backgroundColor: '#F8FAFC',
                                    border: '1px dashed #CBD5E1',
                                    borderRadius: '6px',
                                    padding: '6px 8px',
                                    lineHeight: 1.4,
                                    maxWidth: '280px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => setViewingNotesIndicator(ind)}
                                  title="اضغط لعرض كافة الملاحظات"
                                >
                                  <strong>{ind.latestPrincipalNote.authorName}:</strong> "{ind.latestPrincipalNote.text}"
                                </div>
                              )}
                            </div>
                          ) : (
                            <span
                              style={{
                                backgroundColor: '#FEF3C7',
                                color: '#92400E',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Clock size={12} />
                              <span>بانتظار مراجعة المدير</span>
                            </span>
                          )}
                        </td>

                        {/* Column 6: Actions */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            {/* الانتقال إلى المؤشر (Available for both Principal and Evaluator) */}
                            <button
                              onClick={() => onNavigate('rubric-assessment', ind.indicatorId, true)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: '#F1F5F9',
                                color: '#0284C7',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.1s ease',
                              }}
                              title="الانتقال إلى شاشة رصد المؤشر مع تمكين زر العودة السريع"
                            >
                              <span>استعراض</span>
                              <ExternalLink size={12} />
                            </button>

                            {/* المراجعة السريعة (Principal ONLY) */}
                            {isPrincipal && (
                              <button
                                onClick={() => handleOpenQuickReview(ind)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  backgroundColor: ind.hasPrincipalReview ? '#EFF6FF' : '#0284C7',
                                  color: ind.hasPrincipalReview ? '#1D4ED8' : '#FFFFFF',
                                  border: ind.hasPrincipalReview ? '1px solid #BFDBFE' : 'none',
                                  borderRadius: '6px',
                                  padding: '5px 10px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                title="تدوين ملاحظة مراجعة إدارية سريعة"
                              >
                                <PlusCircle size={12} />
                                <span>{ind.hasPrincipalReview ? 'ملاحظة' : 'مراجعة'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IMPROVEMENT PLANS */}
      {activeTab === 'plans' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {plans.map((p) => (
              <div
                key={p.planId}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <span
                      style={{
                        backgroundColor: '#EFF6FF',
                        color: '#2563EB',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {p.versionTag || `الإصدار ${p.versionNumber}`}
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginTop: '6px', marginBottom: '2px' }}>
                      {p.title}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      النوع: {p.planType === 'quality' ? 'خطة الجودة والاعتماد' : p.planType === 'operational' ? 'الخطة التشغيلية' : 'خطة التطوير المهني'}
                    </div>
                  </div>

                  <span
                    style={{
                      backgroundColor: p.status === 'Active' ? '#DCFCE7' : '#F1F5F9',
                      color: p.status === 'Active' ? '#15803D' : '#64748B',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {p.status === 'Active' ? 'نشطة' : p.status}
                  </span>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                  <span>عدد الأنشطة والإجراءات: <strong>{p.actionsCount}</strong></span>
                  <span>ملاحظات المدير: <strong>{p.principalNotesCount}</strong></span>
                </div>

                {/* Review Notes Section */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    آخر ملاحظة تدقيق إداري:
                  </div>
                  {p.latestNote ? (
                    <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#166534', lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 700, marginBottom: '2px' }}>{p.latestNote.authorName} ({p.latestNote.role}):</div>
                      <div>"{p.latestNote.text}"</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                      لم تدون ملاحظات مراجعة إدارية لهذه الخطة بعد.
                    </div>
                  )}
                </div>

                {/* Navigation Button */}
                <button
                  onClick={() => onNavigate('improvement-plan', undefined, true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: 'auto',
                  }}
                >
                  <span>الانتقال لمتابعة الخطة وإجراءاتها</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: COMPLETION REQUESTS */}
      {activeTab === 'completion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {completionRequest ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #FCA5A5',
                borderRadius: '14px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldAlert size={24} style={{ color: '#DC2626' }} />
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                      طلب استكمال وزاري رقم #{completionRequest.requestId}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      المشرف: {completionRequest.supervisorName}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    backgroundColor: completionRequest.status === 'Pending' ? '#FEE2E2' : '#DCFCE7',
                    color: completionRequest.status === 'Pending' ? '#991B1B' : '#15803D',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                  }}
                >
                  {completionRequest.status === 'Pending' ? 'بانتظار المعالجة' : 'مكتمل'}
                </span>
              </div>

              {completionRequest.notes && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '14px', fontSize: '13px', color: '#7F1D1D', lineHeight: 1.6 }}>
                  <strong>توجيهات المشرف الوزاري:</strong>
                  <div style={{ marginTop: '4px' }}>{completionRequest.notes}</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#475569' }}>
                <div>إجمالي البنود: <strong>{completionRequest.totalItems}</strong></div>
                <div>البنود المتبقية: <strong style={{ color: '#DC2626' }}>{completionRequest.pendingItems}</strong></div>
                <div>البنود المنجزة: <strong style={{ color: '#16A34A' }}>{completionRequest.completedItems}</strong></div>
              </div>

              <button
                onClick={() => onNavigate('completion-request', undefined, true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                }}
              >
                <span>الانتقال إلى شاشة معالجة طلب الاستكمال</span>
                <ExternalLink size={14} />
              </button>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '40px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <CheckCircle2 size={44} style={{ color: '#10B981' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                لا توجد طلبات استكمال وزارية مفتوحة
              </h3>
              <p style={{ color: '#64748B', fontSize: '13px', margin: 0, maxWidth: '480px' }}>
                لم يتم إرسال طلب استكمال من المشرف الوزاري، أو تم استيفاء ومعالجة كافة الملاحظات السابقة بنجاح.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FINAL SIGNOFF & ADMINISTRATIVE APPROVAL */}
      {activeTab === 'final-signoff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileCheck2 size={24} style={{ color: '#0284C7' }} />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    حالة الإقرار الإداري والختم الرقمي للتقرير
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    اعتماد مدير المدرسة لنتائج التقييم الذاتي قبل الإقفال والرفع النهائي
                  </div>
                </div>
              </div>

              <span
                style={{
                  backgroundColor: finalReview.hasPrincipalAcknowledgment ? '#DCFCE7' : '#FEF3C7',
                  color: finalReview.hasPrincipalAcknowledgment ? '#15803D' : '#92400E',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                }}
              >
                {finalReview.hasPrincipalAcknowledgment ? '✓ تم الإقرار الإداري' : '⏳ بانتظار الإقرار'}
              </span>
            </div>

            {finalReview.hasPrincipalAcknowledgment ? (
              <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                  نص الإقرار الإداري المعتمد:
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#14532D', lineHeight: 1.6 }}>
                  "{finalReview.acknowledgmentText || 'أقر أنا مدير المدرسة بصفتي المسؤول الإداري والتربوي الأول عن دقة البيانات والشواهد المرفقة.'}"
                </p>
                {finalReview.acknowledgedAt && (
                  <div style={{ fontSize: '11px', color: '#15803D', marginTop: '4px' }}>
                    تاريخ الاعتماد: {new Date(finalReview.acknowledgedAt).toLocaleString('ar-SA')}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '16px', fontSize: '13px', color: '#92400E', lineHeight: 1.6 }}>
                <strong>تنبيه إداري:</strong> لم يقم مدير المدرسة بتسجيل الإقرار الداخلي بعد. يجب مراجعة النتائج والاطلاع على التقرير قبل التثبيت والإقفال.
              </div>
            )}

            <button
              onClick={() => onNavigate('final-review', undefined, true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              <span>الانتقال لشاشة المراجعة والاعتماد الداخلي والختم</span>
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      )}

      {/* QUICK REVIEW MODAL (PRINCIPAL ONLY) */}
      {selectedIndicatorForReview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => !isSubmittingNote && setSelectedIndicatorForReview(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              direction: 'rtl',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={20} style={{ color: '#0284C7' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  تدوين مراجعة إدارية سريعة
                </h3>
              </div>
              <button
                onClick={() => setSelectedIndicatorForReview(null)}
                disabled={isSubmittingNote}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ backgroundColor: '#0284C7', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                  {selectedIndicatorForReview.indicatorCode}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                  {selectedIndicatorForReview.indicatorName}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                {selectedIndicatorForReview.standardName} • التقدير الحالي: {selectedIndicatorForReview.scoreLabel}
              </div>
            </div>

            {/* Previous Notes preview if any */}
            {selectedIndicatorForReview.allNotes && selectedIndicatorForReview.allNotes.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  الملاحظات السابقة ({selectedIndicatorForReview.allNotes.length}):
                </div>
                <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedIndicatorForReview.allNotes.map((n) => (
                    <div
                      key={n.noteId}
                      style={{
                        backgroundColor: n.isPrincipal ? '#F0FDF4' : '#F8FAFC',
                        border: n.isPrincipal ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        color: '#334155',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '2px' }}>
                        <span>{n.authorName} ({n.authorRole})</span>
                        {n.createdAt && <span style={{ color: '#94A3B8', fontSize: '10px' }}>{new Date(n.createdAt).toLocaleDateString('ar-SA')}</span>}
                      </div>
                      <div>{n.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {noteSuccessMessage && (
              <div style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
                {noteSuccessMessage}
              </div>
            )}

            {noteErrorMessage && (
              <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
                {noteErrorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitQuickReview}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  نص ملاحظة أو توجيه مدير المدرسة:
                </label>
                <textarea
                  rows={4}
                  value={quickReviewNoteText}
                  onChange={(e) => setQuickReviewNoteText(e.target.value)}
                  placeholder="اكتب التوجيه الإداري أو الملاحظة الخاصة بهذا المؤشر (مثل: الشواهد المرفقة كافية وتدعم التقدير، يرجى تعزيز التوثيق...)"
                  disabled={isSubmittingNote}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedIndicatorForReview(null)}
                  disabled={isSubmittingNote}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#64748B',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNote || !quickReviewNoteText.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0284C7',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isSubmittingNote || !quickReviewNoteText.trim() ? 'not-allowed' : 'pointer',
                    opacity: isSubmittingNote || !quickReviewNoteText.trim() ? 0.6 : 1,
                  }}
                >
                  {isSubmittingNote ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>حفظ الملاحظة الإدارية</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEWING ALL NOTES MODAL */}
      {viewingNotesIndicator && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setViewingNotesIndicator(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              direction: 'rtl',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} style={{ color: '#0284C7' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  سجل مراجعات المؤشر [{viewingNotesIndicator.indicatorCode}]
                </h3>
              </div>
              <button
                onClick={() => setViewingNotesIndicator(null)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '12px' }}>
              {viewingNotesIndicator.indicatorName}
            </p>

            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {viewingNotesIndicator.allNotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8', fontSize: '13px' }}>
                  لا توجد ملاحظات مدونة لهذا المؤشر.
                </div>
              ) : (
                viewingNotesIndicator.allNotes.map((n) => (
                  <div
                    key={n.noteId}
                    style={{
                      backgroundColor: n.isPrincipal ? '#F0FDF4' : '#F8FAFC',
                      border: n.isPrincipal ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '10px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '12px', color: n.isPrincipal ? '#166534' : '#1E293B' }}>
                        {n.authorName} ({n.authorRole})
                      </span>
                      {n.createdAt && (
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                          {new Date(n.createdAt).toLocaleDateString('ar-SA')}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                      {n.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => setViewingNotesIndicator(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
