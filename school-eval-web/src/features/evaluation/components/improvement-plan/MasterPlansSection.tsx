import React from 'react';
import { ChevronDown, ChevronUp, Layers, RefreshCw } from 'lucide-react';
import type {
  ImprovementPlanData,
  ImprovementPlanListItem,
  PlanType,
} from '../../api/evaluationTypes';

interface MasterPlansSectionProps {
  plansList: ImprovementPlanListItem[];
  tabPlansList: ImprovementPlanListItem[];
  planData: ImprovementPlanData | null;
  summary: {
    totalActions: number;
    doneActions: number;
  };
  isMasterTableExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
  onRefreshPlansList: () => void;
  onSwitchPlan: (planType: PlanType, planId: number | null) => void;
}

/**
 * قسم السجل الماستر للخطط المدرسية مع مقارنة الإصدارات والتفاصيل السريعة.
 */
export const MasterPlansSection: React.FC<MasterPlansSectionProps> = ({
  plansList,
  tabPlansList,
  planData,
  summary,
  isMasterTableExpanded,
  onToggleExpand,
  onRefreshPlansList,
  onSwitchPlan,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          backgroundColor: '#F8FAFC',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} style={{ color: '#059669' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            سجل الخطط المدرسية المعتمدة والجارية ({plansList.length} خطة مسجلة)
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            خطة نشطة واحدة لكل نوع في الدورة وفق المعايير الوزارية
          </span>
          <button
            type="button"
            onClick={onRefreshPlansList}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              fontSize: '11.5px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} />
            تحديث السجل
          </button>
          <button
            type="button"
            onClick={() => onToggleExpand(!isMasterTableExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              borderRadius: '6px',
              backgroundColor: isMasterTableExpanded ? '#FFFFFF' : '#ECFDF5',
              border: isMasterTableExpanded ? '1px solid #CBD5E1' : '1px solid #A7F3D0',
              fontSize: '11.5px',
              fontWeight: 700,
              color: isMasterTableExpanded ? '#334155' : '#065F46',
              cursor: 'pointer',
            }}
          >
            {isMasterTableExpanded ? (
              <>
                <ChevronUp size={13} />
                <span>طي السجل الماستر</span>
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                <span>عرض السجل الماستر ({tabPlansList.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isMasterTableExpanded ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                <th style={{ padding: '11px 14px', width: '60px' }}>معرف</th>
                <th style={{ padding: '11px 14px' }}>عنوان الخطة</th>
                <th style={{ padding: '11px 14px', width: '150px' }}>نوع الخطة</th>
                <th style={{ padding: '11px 14px', width: '80px' }}>الإصدار</th>
                <th style={{ padding: '11px 14px', width: '100px' }}>العام الدراسي</th>
                <th style={{ padding: '11px 14px', width: '150px' }}>الفترة الزمنية</th>
                <th style={{ padding: '11px 14px', width: '90px', textAlign: 'center' }}>الحالة</th>
                <th style={{ padding: '11px 14px', width: '110px', textAlign: 'center' }}>نسبة الإنجاز</th>
                <th style={{ padding: '11px 14px', width: '90px', textAlign: 'center' }} title="عدد مجالات ومؤشرات التحسين المستهدفة التي تشتمل على إجراءات معتمدة في الخطة">المجالات المستهدفة</th>
                <th style={{ padding: '11px 14px', width: '80px', textAlign: 'center' }} title="إجمالي عدد الإجراءات التنفيذية المعتمدة في الخطة">الإجراءات</th>
                <th style={{ padding: '11px 14px', width: '70px', textAlign: 'center' }}>المتأخرة</th>
                <th style={{ padding: '11px 14px', width: '110px', textAlign: 'center' }}>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {tabPlansList.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    لا توجد خطط مدرجة لهذا النوع حالياً. يمكنك إنشاء خطة جديدة بالضغط على «إنشاء خطة جديدة».
                  </td>
                </tr>
              ) : (
                tabPlansList.map((p) => {
                  const isCurrent = planData?.planId === p.planId;
                  return (
                    <tr
                      key={p.planId}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: isCurrent ? '#F0FDF4' : '#FFFFFF',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#64748B' }}>
                        #{p.planId}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>
                          {p.title}
                        </div>
                        {p.versionTag && (
                          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                            {p.versionTag}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor:
                              p.planType === 'QualityImprovement'
                                ? '#EFF6FF'
                                : p.planType === 'StaffProfessionalDevelopment'
                                ? '#F5F3FF'
                                : '#F0FDF4',
                            color:
                              p.planType === 'QualityImprovement'
                                ? '#1D4ED8'
                                : p.planType === 'StaffProfessionalDevelopment'
                                ? '#6D28D9'
                                : '#15803D',
                          }}
                        >
                          {p.planTypeLabel}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#F1F5F9',
                            color: '#334155',
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                        >
                          v{p.versionNumber}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {p.academicYear}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748B', fontSize: '11.5px' }}>
                        {p.startDate || '—'} إلى {p.endDate || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor:
                              p.status === 'Active'
                                ? '#ECFDF5'
                                : p.status === 'Submitted'
                                ? '#EFF6FF'
                                : p.status === 'Archived'
                                ? '#F1F5F9'
                                : '#FFFBEB',
                            color:
                              p.status === 'Active'
                                ? '#059669'
                                : p.status === 'Submitted'
                                ? '#2563EB'
                                : p.status === 'Archived'
                                ? '#64748B'
                                : '#D97706',
                          }}
                        >
                          {p.statusArabic}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          <div style={{ width: '45px', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${p.overallProgressPercentage}%`,
                                height: '100%',
                                backgroundColor: p.overallProgressPercentage === 100 ? '#059669' : '#2563EB',
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '11.5px' }}>{p.overallProgressPercentage}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>
                        {p.areasCount}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>
                        {p.doneActions}/{p.totalActions}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {p.delayedActions > 0 ? (
                          <span style={{ color: '#DC2626', fontWeight: 800 }}>{p.delayedActions}</span>
                        ) : (
                          <span style={{ color: '#64748B' }}>0</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onSwitchPlan(p.planType, p.planId)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: isCurrent ? '1px solid #059669' : '1px solid #CBD5E1',
                            backgroundColor: isCurrent ? '#059669' : '#FFFFFF',
                            color: isCurrent ? '#FFFFFF' : '#334155',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {isCurrent ? 'الخطة المعروضة' : 'عرض التفاصيل'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            fontSize: '12.5px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ color: '#64748B', fontWeight: 600 }}>الخطة المعروضة حالياً:</span>
            <strong style={{ color: '#0F172A', fontWeight: 800, fontSize: '13.5px' }}>
              {planData?.title || 'خطة التحسين والتطوير المدرسي'}
            </strong>
            {planData?.versionNumber && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: '#ECFDF5',
                  color: '#065F46',
                  fontWeight: 800,
                  fontSize: '11px',
                  border: '1px solid #A7F3D0',
                }}
              >
                v{planData.versionNumber}
              </span>
            )}
            {planData?.versionTag && (
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: '5px',
                  backgroundColor: '#EFF6FF',
                  color: '#1D4ED8',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {planData.versionTag}
              </span>
            )}
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor:
                  planData?.status === 'Active'
                    ? '#ECFDF5'
                    : planData?.status === 'Submitted'
                    ? '#EFF6FF'
                    : planData?.status === 'Archived'
                    ? '#F1F5F9'
                    : '#FFFBEB',
                color:
                  planData?.status === 'Active'
                    ? '#059669'
                    : planData?.status === 'Submitted'
                    ? '#2563EB'
                    : planData?.status === 'Archived'
                    ? '#64748B'
                    : '#D97706',
              }}
            >
              {planData?.status === 'Active' ? 'نشطة' : planData?.status === 'Submitted' ? 'مرفوعة' : planData?.status === 'Archived' ? 'مؤرشفة' : 'مسودة'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748B', fontSize: '12px' }}>نسبة إنجاز الخطة:</span>
              <div style={{ width: '80px', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${summary.totalActions > 0 ? Math.round((summary.doneActions / summary.totalActions) * 100) : 0}%`,
                    height: '100%',
                    backgroundColor: '#059669',
                  }}
                />
              </div>
              <strong style={{ color: '#059669', fontWeight: 800 }}>
                {summary.totalActions > 0 ? Math.round((summary.doneActions / summary.totalActions) * 100) : 0}%
              </strong>
              <span style={{ color: '#64748B', fontSize: '11.5px' }}>
                ({summary.doneActions}/{summary.totalActions} مكتمل)
              </span>
            </div>

            <button
              type="button"
              onClick={() => onToggleExpand(true)}
              style={{
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              توسيع السجل الماستر لمقارنة كافة الخطط
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
