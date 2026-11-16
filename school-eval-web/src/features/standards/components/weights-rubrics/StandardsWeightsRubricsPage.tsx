/**
 * Screen 3: Standards Weights Calibration & Rubrics (0-3)
 * معايرة توزيع الأوزان النسبية وفرض شرط التوازن الحتمي 100.0%
 */

import React from 'react';
import {
  Save,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { WeightsBalanceBanner } from './WeightsBalanceBanner';
import { WeightsDistributionTable } from './WeightsDistributionTable';
import { RubricLevelsGuide } from './RubricLevelsGuide';
import { useWeightsRubrics } from '../../hooks/useWeightsRubrics';
import { exportWeightsTableToExcel } from '../../utils/standardsExportUtils';

interface StandardsWeightsRubricsPageProps {
  versionId?: number | string;
  onNavigateToTree: (versionId?: number | string) => void;
  onNavigateToLock: (versionId?: number | string) => void;
}

export const StandardsWeightsRubricsPage: React.FC<StandardsWeightsRubricsPageProps> = ({
  versionId = 1,
  onNavigateToTree,
  onNavigateToLock,
}) => {
  const {
    weights,
    rubricLevels,
    versionNo,
    totalWeight,
    isBalanced,
    isSaving,
    saveSuccess,
    error,
    handleWeightChange,
    resetToEqualWeights,
    saveWeights,
  } = useWeightsRubrics(versionId);

  const handleExportExcel = () => {
    exportWeightsTableToExcel(weights, totalWeight, versionNo || '2026.1');
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
              معايرة أوزان وثيقة المعايير
            </span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              {versionNo ? `الإصدار: ${versionNo}` : 'وثيقة المعايير الوطنية'}
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            معايرة الأوزان النسبية وسلالم التقدير اللفظي (0-3)
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            ضبط التوزيع الرياضي لأوزان المعايير السبعة وضمان استيفاء شرط المجموع 100.0% قبل القفل
          </p>
        </div>

        {/* Quick Save Button in Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={saveWeights}
            disabled={!isBalanced || isSaving}
            className="std-btn-primary"
            style={{
              opacity: !isBalanced || isSaving ? 0.6 : 1,
              cursor: !isBalanced || isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>حفظ الأوزان في الوثيقة</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {saveSuccess && (
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
          <span>تم حفظ توزيع الأوزان النسبية بنجاح وتحديث قاعدة بيانات وثيقة المعايير.</span>
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

      {/* 1. Live Mathematical Balance Banner (100.0% validation) */}
      <WeightsBalanceBanner
        totalWeight={totalWeight}
        isBalanced={isBalanced}
      />

      {/* 2. Standards Weights Distribution Table */}
      <div className="std-table-card">
        <WeightsDistributionTable
          weights={weights}
          totalWeight={totalWeight}
          isBalanced={isBalanced}
          onWeightChange={handleWeightChange}
          onResetEqual={resetToEqualWeights}
        />
      </div>

      {/* 3. Rubric Scale Levels Guide (0-3) */}
      <RubricLevelsGuide levels={rubricLevels} />

      {/* 4. Bottom Actions Bar */}
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
            onClick={() => onNavigateToTree(versionId)}
            className="std-btn-secondary"
          >
            <ArrowRight size={14} />
            <span>العودة للشجرة المعيارية</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#065F46',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            <FileSpreadsheet size={15} />
            <span>تصدير جدول الأوزان (.xlsx)</span>
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => onNavigateToLock(versionId)}
            className="std-btn-primary"
          >
            <span>الانتقال لتدقيق القفل والاعتماد</span>
            <ArrowLeft size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
