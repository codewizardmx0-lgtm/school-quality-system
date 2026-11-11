import React, { useState } from 'react';
import { useAiAnalysis } from '../../hooks/useAiAnalysis';
import { AiRecommendationCard } from './AiRecommendationCard';
import { TransferToActionModal } from './TransferToActionModal';
import { FormulaSuggestionsSection } from './FormulaSuggestionsSection';
import { useToast } from '../../../admin/components/common/useToast';
import { ToastNotification } from '../../../admin/components/common/ToastNotification';
import type { AiInitiative, EvaluatorScreen } from '../../api/evaluationTypes';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Target,
  FileCheck2,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';

interface GapAnalysisPageProps {
  onNavigate: (screen: EvaluatorScreen) => void;
  readOnly?: boolean;
}

export const GapAnalysisPage: React.FC<GapAnalysisPageProps> = ({
  onNavigate,
  readOnly = false,
}) => {
  const {
    analysisData,
    recommendations,
    isAnalyzing,
    selectedInitiativeForTransfer,
    setSelectedInitiativeForTransfer,
    transferSuccessNotice,
    runAiAnalysis,
    updateRecommendationStatus,
    transferInitiativeToPlan,
  } = useAiAnalysis();

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'suggestions' | 'ai'>('suggestions');
  const { toasts, addToast, dismissToast } = useToast();


  const handleOpenTransfer = (initiative: AiInitiative) => {
    if (readOnly) return;
    setSelectedInitiativeForTransfer(initiative);
    setIsTransferModalOpen(true);
  };

  const handleBatchTransferAll = async () => {
    if (readOnly || !recommendations?.initiatives) return;
    const pendingInitiatives = recommendations.initiatives.filter((init) => init.status !== 'Ignored');
    for (const init of pendingInitiatives) {
      await transferInitiativeToPlan(
        init,
        'فريق التحسين والجودة',
        '2026-12-31',
        'تم تضمين المبادرة دفعة واحدة من مستكشف التحليل الذكي.'
      );
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Tab Switcher: Formula Suggestions (FR-SCH-16) vs AI Qualitative Analysis */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveView('suggestions')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeView === 'suggestions' ? '2px solid #059669' : '1px solid #e2e8f0',
            backgroundColor: activeView === 'suggestions' ? '#ecfdf5' : '#ffffff',
            color: activeView === 'suggestions' ? '#065f46' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Lightbulb size={16} />
          💡 الاقتراحات ومجالات التحسين (تبني المبادرات والفجوات)
        </button>

        <button
          type="button"
          onClick={() => setActiveView('ai')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeView === 'ai' ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
            backgroundColor: activeView === 'ai' ? '#f5f3ff' : '#ffffff',
            color: activeView === 'ai' ? '#6d28d9' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Sparkles size={16} />
          ✨ المساعد الذكي والتحليل النوعي (AI Analysis)
        </button>
      </div>

      {activeView === 'suggestions' ? (
        <FormulaSuggestionsSection
          readOnly={readOnly}
          onNavigateToPlans={() => onNavigate('improvement-plan')}
          onToast={(type, msg) => addToast(type, msg)}
        />
      ) : (
        <>
          {/* 1. Header with AI Trigger */}
      <div
        style={{
          background: 'linear-gradient(135deg, #064E3B 0%, #065F46 45%, #047857 100%)',
          borderRadius: '16px',
          padding: '24px 30px',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 24px rgba(4, 120, 87, 0.25)',
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
            <Sparkles size={28} color="#A7F3D0" />
          </div>
          <div>
            <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0 }}>
              المساعد الذكي وتحليل الفجوات المعيارية (AI Gap Analysis)
            </h2>
            <p style={{ fontSize: '13px', color: '#D1FAE5', margin: '4px 0 0 0' }}>
              تحليل نتائج التقييم والمبررات واقتراح مبادرات التحسين وفق ضوابط الحوكمة الوطنية (BR-AI-01 / BR-AI-02)
            </p>
          </div>
        </div>

        {!readOnly && (
          <button
            onClick={runAiAnalysis}
            disabled={isAnalyzing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 22px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              color: '#065F46',
              fontWeight: 800,
              fontSize: '13.5px',
              border: 'none',
              cursor: isAnalyzing ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            }}
          >
            <RefreshCw size={16} className={isAnalyzing ? 'animate-spin' : ''} />
            <span>{isAnalyzing ? 'جاري التحليل واستخراج الفجوات...' : 'إعادة تشغيل التحليل الذكي'}</span>
          </button>
        )}
      </div>

      {/* Success Banner if initiative transferred */}
      {transferSuccessNotice && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{transferSuccessNotice}</span>
        </div>
      )}

      {/* 2. Three Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Average Score */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
              متوسط التقدير العام للمدرسة
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '8px' }}>
            {analysisData?.averageScore || 2.1}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>/ 3.0</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
            مستوى أداء متوسط متقدم
          </div>
        </div>

        {/* Card 2: Evaluated Evidences */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
              الشواهد الخاضعة للتحليل والتدقيق
            </span>
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
              }}
            >
              <FileCheck2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '8px' }}>
            {analysisData?.evaluatedEvidences || 18}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
              من {analysisData?.totalEvidences || 20} عينة مدققة
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#2563EB', marginTop: '4px', fontWeight: 600 }}>
            نسبة مطابقة شواهد 90%
          </div>
        </div>

        {/* Card 3: Suggested Initiatives */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
              المبادرات التطويرية المقترحة
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#FFFBEB',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lightbulb size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#D97706', marginTop: '8px' }}>
            {analysisData?.suggestedInitiativesCount || 3}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>مبادرات استراتيجية</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#B45309', marginTop: '4px', fontWeight: 600 }}>
            جاهزة للنقل المباشر إلى خطة التحسين
          </div>
        </div>
      </div>

      {/* 3. Observation Highlights: Strengths Green Card & Weaknesses Pink Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Strengths Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '24px',
            border: '1px solid #A7F3D0',
            boxShadow: '0 2px 8px rgba(5, 150, 105, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#064E3B', margin: 0 }}>
                نقاط القوة التمكينية الموثقة (المستويان 2 و 3)
              </h3>
              <p style={{ fontSize: '12px', color: '#047857', margin: '2px 0 0 0' }}>
                الممارسات القيادية والتربوية التي حققت التميز المؤسسي المستدام
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recommendations?.strengths.map((str) => (
              <div
                key={str.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #DCFCE7',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>
                  {str.title}
                </div>
                <div style={{ fontSize: '12px', color: '#15803D', marginTop: '4px', lineHeight: 1.4 }}>
                  {str.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weaknesses & Opportunities Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '24px',
            border: '1px solid #FECACA',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                فرص التحسين والفجوات المعيارية (المستويان 0 و 1)
              </h3>
              <p style={{ fontSize: '12px', color: '#B91C1C', margin: '2px 0 0 0' }}>
                المؤشرات التي تتطلب تدخلاً عاجلاً وصياغة مبادرات تنفيذية لمعالجتها
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recommendations?.improvements.map((imp) => (
              <div
                key={imp.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FEE2E2',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#991B1B' }}>
                  {imp.title}
                </div>
                <div style={{ fontSize: '12px', color: '#B91C1C', marginTop: '4px', lineHeight: 1.4 }}>
                  {imp.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Suggested Initiatives Section with direct transfer button */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              المبادرات والإجراءات التنفيذية المقترحة للخطة
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>
              راجع المقترحات وعدلها أو انقلها مباشرة لتصبح إجراءات تنفيذية في خطة التحسين المدرسية
            </p>
          </div>

          {!readOnly && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleBatchTransferAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                }}
              >
                <Target size={16} />
                <span>نقل التوصيات المحددة إلى مسودة الخطة</span>
              </button>

              <button
                onClick={() => onNavigate('improvement-plan')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#F8FAFC',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span>استعراض الخطة</span>
                <ArrowLeft size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Initiatives Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
          {recommendations?.initiatives.map((init) => (
            <AiRecommendationCard
              key={init.id}
              initiative={init}
              onUpdateStatus={updateRecommendationStatus}
              onOpenTransferModal={handleOpenTransfer}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>

      {/* Transfer Modal */}
      <TransferToActionModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        initiative={selectedInitiativeForTransfer}
        onConfirmTransfer={transferInitiativeToPlan}
      />
        </>
      )}

      {/* Toasts */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
