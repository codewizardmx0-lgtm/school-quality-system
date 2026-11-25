import React from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  ExternalLink,
  Plus,
  User,
} from 'lucide-react';
import type {
  EvaluatorScreen,
  ImprovementAreaBrief,
  ImprovementPlanAction,
  ImprovementPlanData,
} from '../../api/evaluationTypes';

export interface RemainingDaysInfo {
  text: string;
  isOverdue: boolean;
  isToday: boolean;
  days: number;
}

interface PlanActionsTableProps {
  actions: ImprovementPlanAction[];
  sortedActions: ImprovementPlanAction[];
  areasWithoutActions: ImprovementAreaBrief[];
  planData: ImprovementPlanData | null;
  isPlanReadOnly: boolean;
  formatArabicDateWithDay: (dateStr?: string | null) => string;
  getRemainingDaysInfo: (dueDateStr?: string | null, status?: string) => RemainingDaysInfo | null;
  isActionOverdue: (act: ImprovementPlanAction) => boolean;
  onSortColumn: (columnKey: string) => void;
  renderSortIcon: (columnKey: string) => React.ReactNode;
  onSelectFirstAreaForAction: (areaId: number | null) => void;
  onEditAction: (action: ImprovementPlanAction) => void;
  onNavigate?: (screen: EvaluatorScreen, param?: number) => void;
}

/**
 * جدول مصفوفة الإجراءات التنفيذية والمسؤوليات الميدانية مع الفرز ومؤشرات الفجوة والمهل.
 */
export const PlanActionsTable: React.FC<PlanActionsTableProps> = ({
  actions,
  sortedActions,
  areasWithoutActions,
  planData,
  isPlanReadOnly,
  formatArabicDateWithDay,
  getRemainingDaysInfo,
  isActionOverdue,
  onSortColumn,
  renderSortIcon,
  onSelectFirstAreaForAction,
  onEditAction,
  onNavigate,
}) => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ minWidth: '1150px', width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #F1F5F9' }}>
            <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '45px', textAlign: 'center' }}>#</th>
            <th
              onClick={() => onSortColumn('indicator')}
              style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '250px', cursor: 'pointer', userSelect: 'none' }}
              title="انقر للفرز حسب المؤشر والمعيار"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <span>المؤشر والمعيار المستهدف</span>
                {renderSortIcon('indicator')}
              </div>
            </th>
            <th
              onClick={() => onSortColumn('title')}
              style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', minWidth: '200px', cursor: 'pointer', userSelect: 'none' }}
              title="انقر للفرز حسب عنوان الإجراء"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <span>عنوان الإجراء التنفيذي</span>
                {renderSortIcon('title')}
              </div>
            </th>
            <th
              onClick={() => onSortColumn('priority')}
              style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '90px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
              title="انقر للفرز حسب الأولوية"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <span>الأولوية</span>
                {renderSortIcon('priority')}
              </div>
            </th>
            <th
              onClick={() => onSortColumn('gap')}
              style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '135px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
              title="انقر للفرز حسب حجم الفجوة"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <span>الدرجة ومسار الفجوة</span>
                {renderSortIcon('gap')}
              </div>
            </th>
            <th
              onClick={() => onSortColumn('owner')}
              style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '120px', cursor: 'pointer', userSelect: 'none' }}
              title="انقر للفرز حسب المسؤول"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <span>المسؤول</span>
                {renderSortIcon('owner')}
              </div>
            </th>
            <th
              onClick={() => onSortColumn('start_date')}
              style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '135px', cursor: 'pointer', userSelect: 'none' }}
              title="انقر للفرز حسب تاريخ البدء"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                <span>تاريخ البدء</span>
                {renderSortIcon('start_date')}
              </div>
            </th>
            <th
              onClick={() => onSortColumn('time_remaining')}
              style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '155px', cursor: 'pointer', userSelect: 'none' }}
              title="انقر للفرز حسب تاريخ الاستحقاق والمهلة"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                <span>تاريخ الاستحقاق والمهلة</span>
                {renderSortIcon('time_remaining')}
              </div>
            </th>
            <th
              onClick={() => onSortColumn('progress')}
              style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '90px', cursor: 'pointer', userSelect: 'none' }}
              title="انقر للفرز حسب نسبة الإنجاز"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <span>الإنجاز</span>
                {renderSortIcon('progress')}
              </div>
            </th>
            <th
              onClick={() => onSortColumn('status')}
              style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '95px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
              title="انقر للفرز حسب الحالة"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <span>الحالة</span>
                {renderSortIcon('status')}
              </div>
            </th>
            <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'center', width: '90px' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {sortedActions.length === 0 ? (
            <tr>
              <td colSpan={11} style={{ padding: '48px 20px', textAlign: 'center', color: '#64748B' }}>
                {actions.length === 0 && areasWithoutActions.length > 0 ? (
                  <div data-testid="empty-actions-unscheduled-hint">
                    <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                      الخطة لا تتضمن أي إجراءات تنفيذية مجدولة بعد
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748B', maxWidth: '520px', margin: '0 auto 16px', lineHeight: 1.6 }}>
                      يوجد ({areasWithoutActions.length}) مجالات تحسين متبناة في هذه الخطة بانتظار صياغة مهامها ومسؤوليها في الشريط التنبيهي أعلاه.
                    </div>
                    {!isPlanReadOnly && (
                      <button
                        type="button"
                        onClick={() => onSelectFirstAreaForAction(areasWithoutActions[0]?.areaId || null)}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          backgroundColor: '#059669',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Plus size={14} />
                        <span>صياغة أول إجراء تنفيذي الآن</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                      لا توجد إجراءات مطابقة لشروط البحث أو التصفية الحالية
                    </div>
                    <div style={{ fontSize: '12.5px' }}>
                      يمكنك إعادة تعيين الفلاتر أو النقر على «إضافة إجراء تنفيذي جديد».
                    </div>
                  </div>
                )}
              </td>
            </tr>
          ) : (
            sortedActions.map((action, idx) => {
              const overdue = isActionOverdue(action);
              const remInfo = getRemainingDaysInfo(action.dueDate, action.status);
              const gapVal = action.gap !== undefined && action.gap !== null
                ? action.gap
                : (action.targetScore !== undefined && action.score !== undefined && action.score !== null
                    ? Math.max(0, action.targetScore - action.score)
                    : null);
              const isGapZero = gapVal !== null && gapVal === 0;
              const p = action.priority || 'Medium';
              const isHigh = p === 'High';
              const isMedium = p === 'Medium';
              return (
                <tr
                  key={action.actionId}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    backgroundColor: overdue ? '#FFFBFB' : 'transparent',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = overdue ? '#FEF2F2' : '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = overdue ? '#FFFBFB' : 'transparent')}
                >
                  {/* 1. الرقم التسلسلي */}
                  <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                    {idx + 1}
                  </td>

                  {/* 2. المؤشر والمعيار المستهدف (مع زر الانتقال إلى استمارة الرصد والتقييم) */}
                  <td style={{ padding: '14px 14px', maxWidth: '260px' }}>
                    {action.indicatorCode ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {action.indicatorId && (
                            <button
                              type="button"
                              onClick={() => {
                                sessionStorage.setItem('navigated_from_improvement_plan', 'true');
                                sessionStorage.setItem('navigated_from_improvement_plan_indicator_id', String(action.indicatorId));
                                onNavigate?.('rubric-assessment', action.indicatorId);
                              }}
                              title="الانتقال إلى تقييم هذا المؤشر في استمارة الرصد والتقييم"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 7px',
                                borderRadius: '5px',
                                border: '1px solid #BFDBFE',
                                backgroundColor: '#EFF6FF',
                                color: '#1D4ED8',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#DBEAFE';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#EFF6FF';
                              }}
                            >
                              <ExternalLink size={11} />
                              <span>استمارة الرصد</span>
                            </button>
                          )}
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '11px',
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: '1px solid #BFDBFE',
                            }}
                          >
                            {action.indicatorCode}
                          </span>
                          {action.standardCode && (
                            <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>
                              ({action.standardCode})
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>
                          {action.indicatorName || action.areaName}
                        </div>
                        {action.standardName && (
                          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                            {action.standardName}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                        {action.areaName || 'مجال عام'}
                      </div>
                    )}
                  </td>

                  {/* 3. عنوان الإجراء والوصف */}
                  <td style={{ padding: '14px 14px', maxWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        {action.title}
                      </span>
                      {action.isNewInVersion && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            border: '1px solid #FDE68A',
                            fontSize: '10.5px',
                            fontWeight: 800,
                          }}
                          title="إجراء تمت إضافته على الخطة بعد استنساخ الإصدار استجابة لطلب الاستكمال"
                        >
                          ✨ مضاف بعد الاستكمال (v{planData?.versionNumber || 2})
                        </span>
                      )}
                    </div>
                    {action.progressDescription && (
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px', lineHeight: 1.4 }}>
                        {action.progressDescription}
                      </div>
                    )}
                  </td>

                  {/* 4. الأولوية */}
                  <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: isHigh ? '#FEE2E2' : isMedium ? '#FEF3C7' : '#F1F5F9',
                        color: isHigh ? '#991B1B' : isMedium ? '#92400E' : '#475569',
                        border: `1px solid ${isHigh ? '#FECACA' : isMedium ? '#FDE68A' : '#E2E8F0'}`,
                      }}
                    >
                      {action.priorityArabic || (isHigh ? 'عالية' : isMedium ? 'متوسطة' : 'منخفضة')}
                    </span>
                  </td>

                  {/* 5. الدرجات وتتبع مسار الفجوة (الأساس vs الحالي) */}
                  <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      {/* الدرجة الحالية والمستهدفة */}
                      <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                        <span style={{ color: '#64748B' }} title="الدرجة الحالية">
                          {action.score !== undefined && action.score !== null ? `${action.score}★` : '-'}
                        </span>
                        <span style={{ margin: '0 3px', color: '#94A3B8' }}>←</span>
                        <span style={{ color: '#059669', fontWeight: 800 }} title="الدرجة المستهدفة">
                          {action.targetScore ? `${action.targetScore}★` : '3★'}
                        </span>
                      </div>

                      {/* مسار التحسن من خط الأساس عند التبني إن وُجد */}
                      {action.baselineScore !== undefined && action.baselineScore !== null && action.score !== undefined && action.score !== null && (
                        <div style={{ fontSize: '10px', color: '#64748B' }}>
                          <span>الأساس: </span>
                          <strong style={{ color: '#475569' }}>{action.baselineScore}★</strong>
                          {action.score > action.baselineScore && (
                            <span style={{ color: '#059669', fontWeight: 800, marginRight: '3px' }}>
                              (+{action.score - action.baselineScore}★)
                            </span>
                          )}
                        </div>
                      )}

                      {/* شارة الفجوة الحالية */}
                      {action.gap !== undefined && action.gap !== null && (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: isGapZero ? '#ECFDF5' : '#FFFBEB',
                            color: isGapZero ? '#059669' : '#D97706',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            border: isGapZero ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                          }}
                        >
                          {isGapZero ? 'فجوة: 0 (تم سد الفجوة)' : `فجوة: ${action.gap}`}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 6. المسؤول */}
                  <td style={{ padding: '14px 14px', fontSize: '12.5px', color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="#64748B" />
                      <span>{action.leader}</span>
                    </div>
                  </td>

                  {/* 7. تاريخ البدء (مع اسم اليوم) */}
                  <td style={{ padding: '14px 12px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#334155' }}>
                      <Calendar size={13} style={{ color: '#0284C7', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{formatArabicDateWithDay(action.startDate)}</span>
                    </div>
                  </td>

                  {/* 8. تاريخ الاستحقاق والمهلة المتبقية (مع اسم اليوم) */}
                  <td style={{ padding: '14px 12px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {/* علامة خضراء فوق التاريخ إذا أصبحت الفجوة 0 للعلم فقط دون تغيير حالة التنفيذ */}
                      {isGapZero && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 7px',
                            borderRadius: '5px',
                            backgroundColor: '#ECFDF5',
                            color: '#047857',
                            border: '1px solid #A7F3D0',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            width: 'fit-content',
                          }}
                          title="الدرجة المستهدفة للمؤشر محققة بالكامل في التقييم الذاتي (الفجوة = 0) — إشعار إنجاز للمعلومة دون تغيير حالة التنفيذ الميداني للإجراء"
                        >
                          <CheckCircle2 size={11} style={{ color: '#059669' }} />
                          <span>مكتمل (الفجوة 0)</span>
                        </span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: overdue ? '#DC2626' : '#334155' }}>
                        <Calendar size={13} style={{ color: overdue ? '#DC2626' : '#D97706', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600 }}>{formatArabicDateWithDay(action.dueDate)}</span>
                      </div>
                      {remInfo && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: remInfo.isOverdue ? '#FEF2F2' : remInfo.isToday ? '#FFFBEB' : '#F0FDF4',
                            color: remInfo.isOverdue ? '#DC2626' : remInfo.isToday ? '#B45309' : '#15803D',
                            border: `1px solid ${remInfo.isOverdue ? '#FECACA' : remInfo.isToday ? '#FDE68A' : '#BBF7D0'}`,
                            fontSize: '10.5px',
                            fontWeight: 700,
                            width: 'fit-content',
                          }}
                        >
                          <Clock size={11} />
                          {remInfo.text}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 9. نسبة الإنجاز */}
                  <td style={{ padding: '14px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ flex: 1, minWidth: '55px', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${action.completionPercentage}%`,
                            backgroundColor: action.status === 'Done' ? '#059669' : '#2563EB',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                        {action.completionPercentage}%
                      </span>
                    </div>
                  </td>

                  {/* 10. الحالة المعتمدة */}
                  <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor:
                          action.status === 'Done'
                            ? '#ECFDF5'
                            : action.status === 'InProgress'
                            ? '#EFF6FF'
                            : '#FFFBEB',
                        color:
                          action.status === 'Done'
                            ? '#059669'
                            : action.status === 'InProgress'
                            ? '#2563EB'
                            : '#D97706',
                        border:
                          action.status === 'Done'
                            ? '1px solid #A7F3D0'
                            : action.status === 'InProgress'
                            ? '1px solid #BFDBFE'
                            : '1px solid #FDE68A',
                      }}
                    >
                      {action.status === 'Done' ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>مكتمل</span>
                        </>
                      ) : action.status === 'InProgress' ? (
                        <>
                          <Clock size={12} />
                          <span>قيد التنفيذ</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={12} />
                          <span>معلق</span>
                        </>
                      )}
                    </span>
                  </td>

                  {/* 11. الإجراءات */}
                  <td style={{ padding: '14px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => onEditAction(action)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#F1F5F9',
                        color: '#334155',
                        border: '1px solid #CBD5E1',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title={isPlanReadOnly ? 'استعراض تفاصيل الإجراء (للقراءة فقط)' : 'تعديل كافة بيانات الإجراء والمتابعة الميدانية'}
                    >
                      <Edit2 size={12} />
                      {isPlanReadOnly ? 'استعراض' : 'تعديل'}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
