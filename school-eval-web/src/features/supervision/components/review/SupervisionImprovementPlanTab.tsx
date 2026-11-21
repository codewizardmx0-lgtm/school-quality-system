import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Target,
  User,
  Layers,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Briefcase,
  GraduationCap,
  CalendarClock,
} from 'lucide-react';
import type {
  SupervisionPlanDetails,
  LowIndicatorMatrixItem,
} from '../../api/supervisionTypes';
import { supervisionApi } from '../../api/supervisionApi';

interface SupervisionImprovementPlanTabProps {
  planDetails?: SupervisionPlanDetails | null;
  plans?: SupervisionPlanDetails[];
  lowIndicatorsMatrix?: LowIndicatorMatrixItem[];
  indicatorsAudit?: any[];
}

export const SupervisionImprovementPlanTab: React.FC<SupervisionImprovementPlanTabProps> = ({
  planDetails,
  plans = [],
  lowIndicatorsMatrix = [],
  indicatorsAudit: _indicatorsAudit = [],
}) => {
  const allPlans = useMemo(() => {
    if (plans && plans.length > 0) return plans;
    if (planDetails) return [planDetails];
    return [];
  }, [plans, planDetails]);

  // الخطة النشطة المختارة
  const [activePlanId, setActivePlanId] = useState<number>(() => {
    return allPlans[0]?.planId || planDetails?.planId || 0;
  });

  // التبويب الفرعي: الخطة المختارة أو مصفوفة تغطية المؤشرات المنخفضة
  const [viewMode, setViewMode] = useState<'plans' | 'gap_matrix'>('plans');

  // فلتر الأولوية وحالة الإجراء
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [matrixFilter, setMatrixFilter] = useState<'all' | 'unaddressed' | 'covered'>('all');

  const currentPlan = useMemo(() => {
    return allPlans.find((p) => p.planId === activePlanId) || allPlans[0] || planDetails;
  }, [allPlans, activePlanId, planDetails]);

  // إحصائيات المؤشرات المنخفضة
  const matrixStats = useMemo(() => {
    const totalLow = lowIndicatorsMatrix.length;
    const coveredCount = lowIndicatorsMatrix.filter((i) => i.isCovered).length;
    const unaddressedCount = totalLow - coveredCount;
    return {
      totalLow,
      coveredCount,
      unaddressedCount,
      coveragePct: totalLow > 0 ? Math.round((coveredCount / totalLow) * 100) : 100,
    };
  }, [lowIndicatorsMatrix]);

  // فلترة مصفوفة المؤشرات المنخفضة
  const filteredMatrix = useMemo(() => {
    return lowIndicatorsMatrix.filter((item) => {
      if (matrixFilter === 'unaddressed') return !item.isCovered;
      if (matrixFilter === 'covered') return item.isCovered;
      return true;
    });
  }, [lowIndicatorsMatrix, matrixFilter]);

  if (!currentPlan && allPlans.length === 0) {
    return (
      <div
        style={{
          padding: '48px',
          textAlign: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <Target size={40} color="#94A3B8" style={{ marginBottom: '12px' }} />
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: '#334155' }}>
          لم يتم إرفاق خطة تحسين مدرسية مع هذا المخرج بعد
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748B', maxWidth: '480px', marginInline: 'auto' }}>
          وفق ضوابط الإشراف (FR-SUP-08)، يتطلب اكتمال مخرج التقييم إرفاق خطة تحسين تشغيلية تتضمن مجالات التطوير المستهدفة والإجراءات التنفيذية المسندة بمسؤوليات وجداول زمنية.
        </p>
      </div>
    );
  }

  const areas = currentPlan?.areas || [];
  const actions = currentPlan?.actions || [];
  const stats = currentPlan?.stats || {
    totalAreas: areas.length,
    totalActions: actions.length,
    completedActions: 0,
    inProgressActions: 0,
    averageProgress: 0,
  };

  // فلترة الإجراءات التنفيذية
  const filteredActions = actions.filter((act) => {
    if (filterStatus !== 'all' && act.status !== filterStatus) return false;
    return true;
  });

  // فلترة مجالات التحسين
  const filteredAreas = areas.filter((area) => {
    if (filterPriority !== 'all' && area.priority !== filterPriority) return false;
    return true;
  });

  // أيقونة نوع الخطة
  const getPlanIcon = (type?: string) => {
    switch (type) {
      case 'StaffProfessionalDevelopment':
        return <GraduationCap size={16} />;
      case 'AnnualOperational':
        return <CalendarClock size={16} />;
      default:
        return <Briefcase size={16} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. شريط التنقل بين الخطط الثلاث ومصفوفة الفجوات المعيارية */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          borderBottom: '2px solid #E2E8F0',
          paddingBottom: '2px',
        }}
      >
        {/* أزرار التبديل بين الخطط المدرسية الثلاث */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          {allPlans.map((p) => {
            const isSelected = viewMode === 'plans' && p.planId === currentPlan?.planId;

            return (
              <button
                key={p.planId}
                type="button"
                onClick={() => {
                  setActivePlanId(p.planId);
                  setViewMode('plans');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '8px 8px 0 0',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: isSelected ? '#2563EB' : '#475569',
                  backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                  borderBottom: isSelected ? '2px solid #2563EB' : 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {getPlanIcon(p.planType)}
                <span>{p.planTypeLabel}</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? '#DBEAFE' : '#E2E8F0',
                    color: isSelected ? '#1D4ED8' : '#64748B',
                  }}
                >
                  {p.stats.averageProgress}%
                </span>
              </button>
            );
          })}
        </div>

        {/* زر التبديل إلى مصفوفة تغطية المؤشرات المنخفضة (0، 1، 2) */}
        {matrixStats.totalLow > 0 && (
          <button
            type="button"
            onClick={() => setViewMode('gap_matrix')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px 8px 0 0',
              fontSize: '13px',
              fontWeight: 700,
              color: viewMode === 'gap_matrix' ? '#EA580C' : '#475569',
              backgroundColor: viewMode === 'gap_matrix' ? '#FFF7ED' : 'transparent',
              borderBottom: viewMode === 'gap_matrix' ? '2px solid #EA580C' : 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            <Layers size={16} color={viewMode === 'gap_matrix' ? '#EA580C' : '#64748B'} />
            <span>مصفوفة تغطية المؤشرات المنخفضة (0-2)</span>
            {matrixStats.unaddressedCount > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                }}
              >
                {matrixStats.unaddressedCount} فجوة غير مغطاة
              </span>
            )}
          </button>
        )}
      </div>

      {/* 2. استعراض مصفوفة تغطية المؤشرات المنخفضة (0، 1، 2) */}
      {viewMode === 'gap_matrix' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* البطاقات الإحصائية للمصفوفة */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
            }}
          >
            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>المؤشرات ذات الدرجات المنخفضة (0-2)</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
                {matrixStats.totalLow} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>مؤشراً</span>
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#166534' }}>فجوات معيارية مغطاة بالخطط</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803D', marginTop: '2px' }}>
                {matrixStats.coveredCount} <span style={{ fontSize: '11px', fontWeight: 500, color: '#166534' }}>مؤشراً</span>
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#991B1B' }}>فجوات غير مغطاة في أي خطة</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
                {matrixStats.unaddressedCount} <span style={{ fontSize: '11px', fontWeight: 500, color: '#991B1B' }}>مؤشراً</span>
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#1E40AF' }}>نسبة شمول خطط التحسين للفجوات</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
                {matrixStats.coveragePct}%
              </div>
            </div>
          </div>

          {/* شريط الفلترة وجدول المصفوفة */}
          <div
            style={{
              padding: '12px 18px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setMatrixFilter('all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: matrixFilter === 'all' ? '#EFF6FF' : '#FFFFFF',
                  color: matrixFilter === 'all' ? '#1D4ED8' : '#64748B',
                  border: matrixFilter === 'all' ? '1px solid #2563EB' : '1px solid #CBD5E1',
                  cursor: 'pointer',
                }}
              >
                كافة المؤشرات المنخفضة ({matrixStats.totalLow})
              </button>
              <button
                type="button"
                onClick={() => setMatrixFilter('unaddressed')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: matrixFilter === 'unaddressed' ? '#FEF2F2' : '#FFFFFF',
                  color: matrixFilter === 'unaddressed' ? '#DC2626' : '#64748B',
                  border: matrixFilter === 'unaddressed' ? '1px solid #DC2626' : '1px solid #CBD5E1',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <AlertTriangle size={13} />
                فجوات غير مغطاة ({matrixStats.unaddressedCount})
              </button>
              <button
                type="button"
                onClick={() => setMatrixFilter('covered')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: matrixFilter === 'covered' ? '#F0FDF4' : '#FFFFFF',
                  color: matrixFilter === 'covered' ? '#15803D' : '#64748B',
                  border: matrixFilter === 'covered' ? '1px solid #16A34A' : '1px solid #CBD5E1',
                  cursor: 'pointer',
                }}
              >
                فجوات مغطاة ({matrixStats.coveredCount})
              </button>
            </div>

            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              عرض {filteredMatrix.length} من أصل {matrixStats.totalLow} فجوة
            </div>
          </div>

          {/* جدول مصفوفة الفجوات المعيارية */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      المؤشر الوطني
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      الدرجة الوطنية المرصودة
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      المعيار والمجال
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      حالة التغطية في الخطط
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      الخطة ومجال التحسين المغطي
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatrix.map((item, idx) => (
                    <tr
                      key={item.indicatorId}
                      style={{
                        borderBottom: idx === filteredMatrix.length - 1 ? 'none' : '1px solid #F1F5F9',
                        backgroundColor: item.isCovered ? '#FFFFFF' : '#FFFDFD',
                      }}
                    >
                      <td style={{ padding: '14px 16px', maxWidth: '300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#0F172A',
                              color: '#FFFFFF',
                              fontSize: '11px',
                              fontWeight: 800,
                            }}
                          >
                            {item.code}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                            {item.title}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor:
                              item.schoolScore === 2 ? '#DBEAFE' : item.schoolScore === 1 ? '#FEF3C7' : '#FEE2E2',
                            color:
                              item.schoolScore === 2 ? '#1D4ED8' : item.schoolScore === 1 ? '#B45309' : '#B91C1C',
                          }}
                        >
                          {item.scoreLevelName}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748B' }}>
                        <div>{item.standardName}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.subStandardName}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: item.isCovered ? '#DCFCE7' : '#FEF2F2',
                            color: item.isCovered ? '#15803D' : '#DC2626',
                            border: `1px solid ${item.isCovered ? '#BBF7D0' : '#FECACA'}`,
                          }}
                        >
                          {item.isCovered ? (
                            <>
                              <CheckCircle2 size={12} />
                              مغطاة بالخطة
                            </>
                          ) : (
                            <>
                              <AlertCircle size={12} />
                              فجوة غير مغطاة ⚠
                            </>
                          )}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {item.coveringPlans && item.coveringPlans.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {item.coveringPlans.map((cp) => (
                              <div
                                key={cp.areaId}
                                style={{
                                  fontSize: '11px',
                                  color: '#334155',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <span style={{ fontWeight: 700, color: '#2563EB' }}>
                                  [{cp.planTitle}]:
                                </span>
                                <span>{cp.areaTitle}</span>
                                <span style={{ color: '#64748B' }}>
                                  ({cp.actionsCount} إجراءات - إنجاز {cp.averageProgress}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>
                            {item.unaddressedReason || 'لم يتم إدراج هذا المؤشر في أي خطة'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* 3. استعراض تفاصيل الخطة المحددة وإجراءاتها */
        currentPlan && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* الترويسة الرئيسية والبطاقة الإحصائية للخطة المختارة */}
            <div
              style={{
                padding: '24px',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  borderBottom: '1px solid #F1F5F9',
                  paddingBottom: '16px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: '#EFF6FF',
                        color: '#2563EB',
                      }}
                    >
                      {currentPlan.planTypeLabel}
                    </span>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                      {currentPlan.title}
                    </h2>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                      }}
                    >
                      {currentPlan.statusArabic}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#64748B',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>العام الدراسي: <strong>{currentPlan.academicYear}</strong></span>
                    <span>الإصدار: <strong>v{currentPlan.versionNumber}</strong></span>
                    {currentPlan.startDate && (
                      <span>
                        الفترة: من <strong>{currentPlan.startDate}</strong> إلى <strong>{currentPlan.endDate || 'نهاية العام'}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* مؤشر الإنجاز الكلي للخطة */}
                <div style={{ minWidth: '180px', textAlign: 'left' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textAlign: 'right' }}>
                    متوسط نسبة إنجاز الخطة: {stats.averageProgress}%
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#E2E8F0',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginTop: '6px',
                    }}
                  >
                    <div
                      style={{
                        width: `${stats.averageProgress}%`,
                        height: '100%',
                        backgroundColor:
                          stats.averageProgress >= 70 ? '#10B981' : stats.averageProgress >= 40 ? '#2563EB' : '#F59E0B',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 4 بطاقات إحصائية موجزة */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                }}
              >
                <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>مجالات التحسين المستهدفة</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
                    {stats.totalAreas} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>مجالاً</span>
                  </div>
                </div>

                <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>إجمالي الإجراءات التنفيذية</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
                    {stats.totalActions} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>إجراءً</span>
                  </div>
                </div>

                <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>الإجراءات المكتملة</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803D', marginTop: '2px' }}>
                    {stats.completedActions} <span style={{ fontSize: '11px', fontWeight: 500, color: '#166534' }}>إجراءً</span>
                  </div>
                </div>

                <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 600 }}>الإجراءات قيد التنفيذ</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
                    {stats.inProgressActions} <span style={{ fontSize: '11px', fontWeight: 500, color: '#1E40AF' }}>إجراءً</span>
                  </div>
                </div>
              </div>
            </div>

            {/* القسم الأول: مجالات التحسين ذات الأولوية والفجوة المعيارية */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={18} color="#2563EB" />
                  مجالات التحسين المستهدفة وتحليل الفجوة المعيارية ({areas.length})
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>أولوية المجال:</span>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="all">كافة الأولويات</option>
                    <option value="high">أولوية قصوى</option>
                    <option value="medium">أولوية متوسطة</option>
                  </select>
                </div>
              </div>

              {filteredAreas.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', color: '#64748B' }}>
                  لا توجد مجالات تحسين مسجلة لهذه الخطة
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                  {filteredAreas.map((area) => (
                    <div
                      key={area.areaId}
                      style={{
                        padding: '16px',
                        borderRadius: '10px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              backgroundColor: '#0F172A',
                              color: '#FFFFFF',
                              fontSize: '11px',
                              fontWeight: 800,
                            }}
                          >
                            {area.indicatorCode}
                          </span>
                          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                            {area.name}
                          </h4>
                        </div>

                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: area.priority === 'high' ? '#FEE2E2' : '#FEF3C7',
                            color: area.priority === 'high' ? '#B91C1C' : '#B45309',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {area.priorityLabel}
                        </span>
                      </div>

                      {/* بطاقة الفجوة المعيارية بالسلم الوطني */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '8px',
                          padding: '10px',
                          borderRadius: '8px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          textAlign: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>الدرجة الحالية</div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#EF4444', marginTop: '2px' }}>
                            {area.currentScore}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>الدرجة المستهدفة</div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                            {area.targetScore}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>الفجوة المعيارية</div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
                            +{area.gap}
                          </div>
                        </div>
                      </div>

                      {area.description && (
                        <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.5', color: '#64748B' }}>
                          {area.description}
                        </p>
                      )}

                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                        الإجراءات المرتبطة بهذا المجال (1:N): {area.actionsCount} إجراء
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* القسم الثاني: جدول الإجراءات التنفيذية وشواهد التنفيذ الميداني */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={18} color="#2563EB" />
                  جدول الإجراءات التنفيذية وشواهد الإنجاز الميداني ({actions.length})
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>حالة الإجراء:</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="all">كافة الحالات</option>
                    <option value="completed">مكتمل</option>
                    <option value="in_progress">قيد التنفيذ</option>
                    <option value="pending_action">معلق / لم يبدأ</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                          #
                        </th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                          الإجراء التنفيذي المستهدف
                        </th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                          مجال التحسين
                        </th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                          المسؤول والجدول الزمني
                        </th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                          نسبة الإنجاز
                        </th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                          شواهد التنفيذ الميداني
                        </th>
                        <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                          الحالة
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActions.map((act, idx) => (
                        <tr
                          key={act.actionId}
                          style={{
                            borderBottom: idx === filteredActions.length - 1 ? 'none' : '1px solid #F1F5F9',
                          }}
                        >
                          <td style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                            {idx + 1}
                          </td>

                          <td style={{ padding: '14px 16px', maxWidth: '280px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                              {act.title}
                            </div>
                            {act.progressDescription && (
                              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                                {act.progressDescription}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '14px 16px', fontSize: '12px', color: '#475569' }}>
                            {act.areaTitle}
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155' }}>
                              <User size={13} color="#64748B" />
                              {act.responsible}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                              {act.startDate || '—'} ➔ {act.dueDate || '—'}
                            </div>
                          </td>

                          <td style={{ padding: '14px 16px', minWidth: '120px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{
                                  flex: 1,
                                  height: '6px',
                                  backgroundColor: '#E2E8F0',
                                  borderRadius: '3px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${act.completionPercentage}%`,
                                    height: '100%',
                                    backgroundColor: act.completionPercentage === 100 ? '#10B981' : '#2563EB',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                                {act.completionPercentage}%
                              </span>
                            </div>
                          </td>

                          {/* شواهد التنفيذ الميداني */}
                          <td style={{ padding: '14px 16px', maxWidth: '220px' }}>
                            {act.evidenceLinks && act.evidenceLinks.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {act.evidenceLinks.map((ev) => (
                                  <button
                                    key={ev.id}
                                    type="button"
                                    onClick={() => supervisionApi.previewDocumentVersion(ev.id)}
                                    title={`معاينة شاهد التنفيذ: ${ev.fileName}`}
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      backgroundColor: '#ECFDF5',
                                      border: '1px solid #A7F3D0',
                                      color: '#059669',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <FileCheck size={12} />
                                    <span>{ev.documentTitle || ev.fileName}</span>
                                    <ExternalLink size={10} />
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94A3B8' }}>لم يُرفق شاهد تنفيذ</span>
                            )}
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor:
                                  act.status === 'completed' || act.status === 'Done'
                                    ? '#DCFCE7'
                                    : act.status === 'in_progress' || act.status === 'InProgress'
                                    ? '#EFF6FF'
                                    : '#F1F5F9',
                                color:
                                  act.status === 'completed' || act.status === 'Done'
                                    ? '#15803D'
                                    : act.status === 'in_progress' || act.status === 'InProgress'
                                    ? '#2563EB'
                                    : '#64748B',
                              }}
                            >
                              {act.statusArabic}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
