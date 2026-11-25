import React from 'react';
import { ArrowUpDown, Filter, RotateCcw, Search, X } from 'lucide-react';
import type { ImprovementAreaBrief, ImprovementPlanAction } from '../../api/evaluationTypes';

export interface PlanFilterAreaOption {
  areaId: number;
  name: string;
  indicatorCode?: string;
  standardCode?: string;
}

interface PlanActionFilterBarProps {
  actions: ImprovementPlanAction[];
  sortedCount: number;
  availableAreasForFilter: PlanFilterAreaOption[];
  planAreas?: ImprovementAreaBrief[];
  searchActionTerm: string;
  onSearchActionTermChange: (value: string) => void;
  filterAreaId: string;
  onFilterAreaIdChange: (value: string) => void;
  filterPriority: string;
  onFilterPriorityChange: (value: string) => void;
  filterGap: string;
  onFilterGapChange: (value: string) => void;
  filterTimeRemaining: string;
  onFilterTimeRemainingChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  onResetAll: () => void;
}

/**
 * شريط البحث والفلاتر المتعددة وشارات التصفية النشطة لجدول الإجراءات التنفيذية.
 */
export const PlanActionFilterBar: React.FC<PlanActionFilterBarProps> = ({
  actions,
  sortedCount,
  availableAreasForFilter,
  planAreas,
  searchActionTerm,
  onSearchActionTermChange,
  filterAreaId,
  onFilterAreaIdChange,
  filterPriority,
  onFilterPriorityChange,
  filterGap,
  onFilterGapChange,
  filterTimeRemaining,
  onFilterTimeRemainingChange,
  filterStatus,
  onFilterStatusChange,
  sortBy,
  onSortByChange,
  onResetAll,
}) => {
  const hasAnyFilter =
    Boolean(searchActionTerm) ||
    filterAreaId !== 'ALL' ||
    filterPriority !== 'ALL' ||
    filterGap !== 'ALL' ||
    filterTimeRemaining !== 'ALL' ||
    filterStatus !== 'ALL';

  return (
    <>
      {/* شريط أدوات البحث وتصفية الإجراءات */}
      <div
        style={{
          padding: '12px 20px',
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          {/* حقل البحث النصي */}
          <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 240px' }}>
            <Search
              size={14}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
            />
            <input
              type="text"
              placeholder="بحث في الإجراءات، المسؤولين، المعايير..."
              value={searchActionTerm}
              onChange={(e) => onSearchActionTermChange(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 32px 7px 28px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12.5px',
                outline: 'none',
                backgroundColor: '#FFFFFF',
              }}
            />
            {searchActionTerm && (
              <button
                type="button"
                onClick={() => onSearchActionTermChange('')}
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '2px',
                }}
                title="مسح البحث"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* فلتر المجال */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={13} style={{ color: '#64748B' }} />
            <select
              value={filterAreaId}
              onChange={(e) => onFilterAreaIdChange(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: filterAreaId !== 'ALL' ? 700 : 500,
                maxWidth: '240px',
              }}
            >
              <option value="ALL">كافة المؤشرات والمجالات ({actions.length})</option>
              {availableAreasForFilter.map((area) => (
                <option key={area.areaId} value={String(area.areaId)}>
                  {area.indicatorCode ? `[${area.indicatorCode}] ` : ''}
                  {area.name}
                  {area.standardCode ? ` — (${area.standardCode})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* فلتر الأولوية */}
          <select
            value={filterPriority}
            onChange={(e) => onFilterPriorityChange(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
              fontWeight: filterPriority !== 'ALL' ? 700 : 500,
            }}
          >
            <option value="ALL">كافة الأولويات</option>
            <option value="High">أولوية عالية</option>
            <option value="Medium">أولوية متوسطة</option>
            <option value="Low">أولوية منخفضة</option>
          </select>

          {/* فلتر الفجوة */}
          <select
            value={filterGap}
            onChange={(e) => onFilterGapChange(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
              fontWeight: filterGap !== 'ALL' ? 700 : 500,
            }}
          >
            <option value="ALL">كافة الفجوات</option>
            <option value="has_gap">توجد فجوة (&gt;0)</option>
            <option value="gap_1">فجوة بمقدار 1</option>
            <option value="gap_2">فجوة بمقدار 2</option>
            <option value="gap_3">فجوة بمقدار 3★</option>
          </select>

          {/* فلتر المهلة المتبقية */}
          <select
            value={filterTimeRemaining}
            onChange={(e) => onFilterTimeRemainingChange(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
              fontWeight: filterTimeRemaining !== 'ALL' ? 700 : 500,
            }}
          >
            <option value="ALL">كافة المهل والآجال</option>
            <option value="overdue">متأخر عن الموعد</option>
            <option value="today">يستحق اليوم</option>
            <option value="this_week">خلال أسبوع (≤ 7 أيام)</option>
            <option value="this_month">خلال شهر (≤ 30 يوم)</option>
            <option value="more">أكثر من شهر (&gt; 30 يوم)</option>
          </select>

          {/* فلتر الحالة */}
          <select
            value={filterStatus}
            onChange={(e) => onFilterStatusChange(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
              fontWeight: filterStatus !== 'ALL' ? 700 : 500,
            }}
          >
            <option value="ALL">كافة الحالات ({actions.length})</option>
            <option value="InProgress">قيد التنفيذ ({actions.filter((a) => a.status === 'InProgress').length})</option>
            <option value="Done">مكتمل ({actions.filter((a) => a.status === 'Done').length})</option>
            <option value="Pending">معلق ({actions.filter((a) => a.status === 'Pending').length})</option>
          </select>

          {/* الفرز */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpDown size={13} style={{ color: '#64748B' }} />
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: sortBy !== 'default' ? 700 : 500,
              }}
            >
              <option value="default">الترتيب الافتراضي</option>
              <option value="priority_desc">الأولوية (الأعلى أولاً)</option>
              <option value="priority_asc">الأولوية (الأقل أولاً)</option>
              <option value="gap_desc">الفجوة (الأكبر أولاً)</option>
              <option value="gap_asc">الفجوة (الأصغر أولاً)</option>
              <option value="start_date_asc">تاريخ البدء (الأقدم أولاً)</option>
              <option value="start_date_desc">تاريخ البدء (الأحدث أولاً)</option>
              <option value="time_remaining_asc">المهلة المتبقية (الأقرب استحقاقاً)</option>
              <option value="time_remaining_desc">المهلة المتبقية (الأبعد)</option>
            </select>
          </div>

          {/* زر تفريغ الفلاتر إن كانت نشطة */}
          {(hasAnyFilter || sortBy !== 'default') && (
            <button
              type="button"
              onClick={onResetAll}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RotateCcw size={12} />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>

        <div style={{ fontSize: '12px', color: '#64748B' }}>
          عرض <strong>{sortedCount}</strong> من إجمالي <strong>{actions.length}</strong> إجراء
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {hasAnyFilter && (
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={12} />
            الفلاتر النشطة:
          </span>

          {searchActionTerm.trim() && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1E40AF',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
            >
              <span>البحث: &quot;{searchActionTerm}&quot;</span>
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => onSearchActionTermChange('')} />
            </span>
          )}

          {filterAreaId !== 'ALL' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
            >
              <span>
                المجال:{' '}
                {(() => {
                  const found = planAreas?.find((a) => a.areaId === Number(filterAreaId));
                  return found ? `${found.indicatorCode || ''} ${found.name}` : filterAreaId;
                })()}
              </span>
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => onFilterAreaIdChange('ALL')} />
            </span>
          )}

          {filterPriority !== 'ALL' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                color: '#92400E',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
            >
              <span>
                الأولوية: {filterPriority === 'High' ? 'عالية' : filterPriority === 'Medium' ? 'متوسطة' : 'منخفضة'}
              </span>
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => onFilterPriorityChange('ALL')} />
            </span>
          )}

          {filterGap !== 'ALL' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
            >
              <span>
                الفجوة: {filterGap === 'critical' ? 'حرجة (3)' : filterGap === 'large' ? 'كبيرة (2)' : 'طفيفة (1)'}
              </span>
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => onFilterGapChange('ALL')} />
            </span>
          )}

          {filterTimeRemaining !== 'ALL' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#F1F5F9',
                border: '1px solid #CBD5E1',
                color: '#334155',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
            >
              <span>
                المهلة:{' '}
                {filterTimeRemaining === 'overdue'
                  ? 'متأخر'
                  : filterTimeRemaining === 'today'
                  ? 'اليوم'
                  : filterTimeRemaining === 'this_week'
                  ? 'خلال أسبوع'
                  : filterTimeRemaining === 'this_month'
                  ? 'خلال شهر'
                  : 'أكثر من شهر'}
              </span>
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => onFilterTimeRemainingChange('ALL')} />
            </span>
          )}

          {filterStatus !== 'ALL' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1E40AF',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
            >
              <span>
                الحالة: {filterStatus === 'InProgress' ? 'قيد التنفيذ' : filterStatus === 'Done' ? 'مكتمل' : 'معلق'}
              </span>
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => onFilterStatusChange('ALL')} />
            </span>
          )}

          <button
            type="button"
            onClick={onResetAll}
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginRight: 'auto',
            }}
          >
            <RotateCcw size={11} />
            <span>مسح كافة الفلاتر</span>
          </button>
        </div>
      )}
    </>
  );
};
