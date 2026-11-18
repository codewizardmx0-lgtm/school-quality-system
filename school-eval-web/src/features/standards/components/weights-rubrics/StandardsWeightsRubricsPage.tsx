/**
 * Screen 3: Standards Weights Calibration & Rubrics (0-3)
 * معايرة توزيع الأوزان النسبية وفرض شرط التوازن الحتمي 100.0%
 */

import React, { useEffect } from 'react';
import {
  Save,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
} from 'lucide-react';
import { WeightsBalanceBanner } from './WeightsBalanceBanner';
import { WeightsDistributionTable } from './WeightsDistributionTable';
import { useWeightsRubrics } from '../../hooks/useWeightsRubrics';
import { exportWeightsTableToExcel } from '../../utils/standardsExportUtils';

interface StandardsWeightsRubricsPageProps {
  versionId?: number | string;
  onNavigateToTree: (versionId?: number | string) => void;
  onNavigateToLock: (versionId?: number | string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export const StandardsWeightsRubricsPage: React.FC<StandardsWeightsRubricsPageProps> = ({
  versionId = 1,
  onNavigateToTree,
  onNavigateToLock,
  onDirtyChange,
}) => {
  const {
    weights,
    versionNo,
    isDraft,
    totalWeight,
    isBalanced,
    isMainBalanced,
    isAllSubStandardsBalanced,
    subStandardsBalanceMap,
    isSaving,
    saveSuccess,
    isDirty,
    error,
    handleWeightChange,
    handleSubStandardWeightChange,
    resetToEqualWeights,
    saveWeights,
  } = useWeightsRubrics(versionId);

  const handleExportExcel = () => {
    exportWeightsTableToExcel(weights, totalWeight, versionNo || '2026.1', {
      versionNo: versionNo || '2026.1',
      status: isDraft ? 'Draft' : 'Approved',
    });
  };

  // حماية التعديلات غير المحفوظة عند محاولة مغادرة الصفحة أو إغلاق المتصفح (الملاحظة 8)
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isDirty);
    }
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, onDirtyChange]);

  const confirmNavigation = (navigateCallback: () => void) => {
    if (isDirty) {
      const proceed = window.confirm(
        'تنبيه: لديك تعديلات غير محفوظة في أوزان المعايير والمؤشرات.\nهل تريد المتابعة دون حفظ؟\n\n(موافق = المتابعة دون حفظ، إلغاء = البقاء لحفظ التعديلات)'
      );
      if (!proceed) return;
    }
    navigateCallback();
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
            معايرة الأوزان النسبية وسلالم التقدير
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            ضبط التوزيع الرياضي لأوزان المعايير السبعة وضمان استيفاء شرط المجموع 100.0% قبل القفل
          </p>
        </div>

        {/* Quick Save Button in Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isDraft ? (
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
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#FEF3C7',
                borderRadius: '8px',
                border: '1px solid #FCD34D',
                fontSize: '12px',
                fontWeight: 700,
                color: '#92400E',
              }}
            >
              <Lock size={14} />
              <span>إصدار مُقرّ ونافذ (عرض فقط)</span>
            </div>
          )}
        </div>
      </div>

      {/* Immutability Banner if not Draft */}
      {!isDraft && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            backgroundColor: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: '12px',
            color: '#78350F',
          }}
        >
          <Lock size={20} color="#B45309" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px' }}>هذا الإصدار مُقرّ ونافذ — وضع القراءة والاطلاع فقط</div>
            <div style={{ fontSize: '12px', marginTop: '2px' }}>
              تم إقرار هذه الوثيقة وتجميد أوزانها النسبية رسمياً، ولا يمكن إعادة معايرة الأوزان إلا في مسودة جديدة.
            </div>
          </div>
        </div>
      )}

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
        isMainBalanced={isMainBalanced}
        isAllSubStandardsBalanced={isAllSubStandardsBalanced}
      />

      {/* 2. Standards Weights Distribution Table */}
      <div className="std-table-card">
        <WeightsDistributionTable
          weights={weights}
          totalWeight={totalWeight}
          isBalanced={isBalanced}
          isDraft={isDraft}
          subStandardsBalanceMap={subStandardsBalanceMap}
          onWeightChange={handleWeightChange}
          onSubStandardWeightChange={handleSubStandardWeightChange}
          onResetEqual={resetToEqualWeights}
        />
      </div>

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
            onClick={() => confirmNavigation(() => onNavigateToTree(versionId))}
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
            onClick={() => confirmNavigation(() => onNavigateToLock(versionId))}
            className="std-btn-primary"
          >
            <span>الانتقال لتدقيق القفل والاعتماد</span>
            <ArrowLeft size={14} />
          </button>
        </div>
      </div>

      {/* 5. Sticky Prominent Save Footer (§7 UX Standards) */}
      {isDraft && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 30,
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(8px)',
            borderTop: '2px solid #10B981',
            padding: '14px 24px',
            borderRadius: '16px 16px 0 0',
            boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: isBalanced ? '#10B981' : '#EF4444',
                boxShadow: isBalanced ? '0 0 0 3px rgba(16, 185, 129, 0.2)' : '0 0 0 3px rgba(239, 68, 68, 0.2)',
              }}
            />
            <div>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'block' }}>
                حالة اتزان الأوزان: {isBalanced ? 'متزن 100.0% — جاهز للحفظ' : `غير متزن حالياً (المجموع: ${totalWeight}%)`}
              </span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                {isBalanced
                  ? 'يمكنك حفظ توزيع الأوزان النسبية وتثبيته في قاعدة بيانات وثيقة المعايير.'
                  : 'يلزم أن يكون مجموع الأوزان 100.0% تماماً وتطابق فروع المعايير لتفعيل زر الحفظ.'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={saveWeights}
            disabled={!isBalanced || isSaving}
            style={{
              padding: '12px 28px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 800,
              backgroundColor: isBalanced && !isSaving ? '#059669' : '#94A3B8',
              color: '#FFFFFF',
              border: 'none',
              boxShadow: isBalanced && !isSaving ? '0 4px 14px rgba(5, 150, 105, 0.35)' : 'none',
              cursor: isBalanced && !isSaving ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>جارٍ حفظ توزيع الأوزان...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>حفظ وتثبيت الأوزان في الوثيقة</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
