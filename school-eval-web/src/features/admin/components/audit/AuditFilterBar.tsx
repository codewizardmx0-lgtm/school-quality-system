import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Filter, User, Clock, RefreshCw, Search, ChevronDown, Check, X } from 'lucide-react';
import { theme } from '../../theme';
import { AUDIT_EVENT_OPTIONS } from '../../hooks/useAdminAudit';
import type { AuditEventOption } from '../../hooks/useAdminAudit';

interface AuditFilterBarProps {
  selectedActions?: string[];
  onSelectedActionsChange?: (actions: string[]) => void;
  actionType: string;
  onActionTypeChange: (val: string) => void;
  actor: string;
  onActorChange: (val: string) => void;
  timeScope: string;
  onTimeScopeChange: (val: string) => void;
  searchQuery?: string;
  onSearchQueryChange?: (val: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  totalFiltered: number;
  totalLogs: number;
  currentPage?: number;
  perPage?: number;
  availableEventOptions?: AuditEventOption[];
  availableEventTypes?: string[];
  availableActors?: string[];
}

const TIME_OPTIONS = [
  { label: 'آخر 24 ساعة', value: '24h' },
  { label: 'آخر 7 أيام', value: '7d' },
  { label: 'كل السجلات', value: 'all' },
];

export const AuditFilterBar: React.FC<AuditFilterBarProps> = ({
  selectedActions = [],
  onSelectedActionsChange,
  actionType: _actionType,
  onActionTypeChange,
  actor,
  onActorChange,
  timeScope,
  onTimeScopeChange,
  searchQuery = '',
  onSearchQueryChange,
  onRefresh,
  isLoading,
  totalFiltered: _totalFiltered,
  totalLogs,
  currentPage = 1,
  perPage = 15,
  availableEventOptions,
  availableEventTypes: _availableEventTypes = [],
  availableActors = [],
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [actionSearchTerm, setActionSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isDropdownOpen]);

  const allOptions = useMemo(() => {
    return availableEventOptions && availableEventOptions.length > 0
      ? availableEventOptions
      : AUDIT_EVENT_OPTIONS;
  }, [availableEventOptions]);

  const filteredOptions = useMemo(() => {
    if (!actionSearchTerm.trim()) return allOptions;
    const term = actionSearchTerm.trim().toLowerCase();
    return allOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) || opt.key.toLowerCase().includes(term)
    );
  }, [allOptions, actionSearchTerm]);

  const toggleAction = (key: string) => {
    let next: string[];
    if (selectedActions.includes(key)) {
      next = selectedActions.filter((k) => k !== key);
    } else {
      next = [...selectedActions, key];
    }
    onSelectedActionsChange?.(next);
    onActionTypeChange(
      next.length === 1 ? next[0] : next.length === 0 ? 'الكل' : next.join(',')
    );
  };

  const handleSelectAll = () => {
    onSelectedActionsChange?.([]);
    onActionTypeChange('الكل');
  };

  const handleClearAll = () => {
    onSelectedActionsChange?.([]);
    onActionTypeChange('الكل');
  };

  const triggerLabel = useMemo(() => {
    if (selectedActions.length === 0) {
      return 'الكل (جميع العمليات)';
    }
    if (selectedActions.length === 1) {
      const match = allOptions.find((o) => o.key === selectedActions[0]);
      return match ? match.label : selectedActions[0];
    }
    return `${selectedActions.length} عمليات محددة`;
  }, [selectedActions, allOptions]);

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: theme.radii.lg,
    border: `1px solid ${theme.colors.neutral[200]}`,
    fontSize: theme.typography.fontSizes.xs,
    backgroundColor: theme.colors.neutral.white,
    color: theme.colors.neutral[800],
    outline: 'none',
    fontFamily: theme.typography.fontFamily.sans,
    cursor: 'pointer',
  };

  return (
    <div
      style={{
        backgroundColor: theme.colors.neutral.white,
        borderRadius: theme.radii.xl,
        padding: '16px 20px',
        border: `1px solid ${theme.colors.neutral[200]}`,
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      {/* Live Text Search */}
      {onSearchQueryChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px', flex: '1 1 220px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="بحث بالفاعل، العملية، الشرح، أو عنوان IP..."
              style={{
                width: '100%',
                padding: '8px 32px 8px 12px',
                borderRadius: theme.radii.lg,
                border: `1px solid ${theme.colors.neutral[200]}`,
                fontSize: theme.typography.fontSizes.xs,
                backgroundColor: theme.colors.neutral.white,
                color: theme.colors.neutral[800],
                outline: 'none',
                fontFamily: theme.typography.fontFamily.sans,
                boxSizing: 'border-box',
              }}
            />
            <Search
              size={14}
              color={theme.colors.neutral[400]}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>
        </div>
      )}

      {/* Multi-Select Action Types Dropdown */}
      <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Filter size={15} color={theme.colors.neutral[400]} />
        <span style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[600], fontWeight: 600 }}>
          نوع الحدث / العمليات:
        </span>
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          style={{
            ...selectStyle,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: selectedActions.length > 0 ? '#EEF2FF' : '#FFFFFF',
            borderColor: selectedActions.length > 0 ? '#818CF8' : theme.colors.neutral[200],
            color: selectedActions.length > 0 ? '#3730A3' : theme.colors.neutral[800],
            fontWeight: selectedActions.length > 0 ? 700 : 500,
          }}
          title="اختر العمليات التي ترغب في عرضها"
        >
          <span>{triggerLabel}</span>
          {selectedActions.length > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#C7D2FE',
                color: '#3730A3',
                fontSize: '10px',
                cursor: 'pointer',
              }}
              title="إلغاء التحديد واستعراض الكل"
            >
              <X size={10} />
            </span>
          )}
          <ChevronDown size={14} color={selectedActions.length > 0 ? '#4F46E5' : theme.colors.neutral[400]} />
        </button>

        {/* Dropdown Floating Panel */}
        {isDropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '6px',
              width: '320px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #E2E8F0',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              direction: 'rtl',
            }}
          >
            {/* Dropdown Header: Search & Quick Actions */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', backgroundColor: '#F8FAFC' }}>
              <div style={{ position: 'relative', width: '100%', marginBottom: '8px' }}>
                <Search
                  size={13}
                  color="#94A3B8"
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  value={actionSearchTerm}
                  onChange={(e) => setActionSearchTerm(e.target.value)}
                  placeholder="ابحث في العمليات..."
                  style={{
                    width: '100%',
                    padding: '6px 26px 6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '11.5px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                  {selectedActions.length > 0
                    ? `محدد (${selectedActions.length}) من أصل ${allOptions.length}`
                    : 'معروض جميع العمليات (الكل)'}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '11px',
                      color: '#4F46E5',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '2px 4px',
                    }}
                  >
                    عرض الكل
                  </button>
                  {selectedActions.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '11px',
                        color: '#DC2626',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '2px 4px',
                      }}
                    >
                      إلغاء التحديد
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Dropdown Options List */}
            <div
              style={{
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                scrollbarWidth: 'thin',
              }}
            >
              {filteredOptions.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                  لا توجد عمليات مطابقة لبحثك
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isChecked = selectedActions.includes(opt.key);
                  return (
                    <div
                      key={opt.key}
                      onClick={() => toggleAction(opt.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: isChecked ? '#EEF2FF' : 'transparent',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isChecked) e.currentTarget.style.backgroundColor = '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            border: isChecked ? '1.5px solid #4F46E5' : '1.5px solid #CBD5E1',
                            backgroundColor: isChecked ? '#4F46E5' : '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            flexShrink: 0,
                          }}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: isChecked ? 700 : 500,
                            color: isChecked ? '#3730A3' : '#1E293B',
                          }}
                        >
                          {opt.label}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          color: isChecked ? '#6366F1' : '#94A3B8',
                          direction: 'ltr',
                          fontFamily: 'monospace',
                        }}
                      >
                        {opt.key.split('.')[1] || opt.key}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Dropdown Footer */}
            <div
              style={{
                padding: '8px 12px',
                borderTop: '1px solid #F1F5F9',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                {selectedActions.length === 0
                  ? 'عرض شامل لكافة العمليات'
                  : `تم تفعيل تصفية بـ ${selectedActions.length} عملية`}
              </span>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(false)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                تم
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actor Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <User size={15} color={theme.colors.neutral[400]} />
        <span style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[600], fontWeight: 600 }}>
          الفاعل / الحساب:
        </span>
        <select value={actor} onChange={(e) => onActorChange(e.target.value)} style={selectStyle}>
          <option value="الكل">الكل (جميع الحسابات)</option>
          {availableActors.map((act) => (
            <option key={act} value={act}>
              {act}
            </option>
          ))}
        </select>
      </div>

      {/* Time Scope Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Clock size={15} color={theme.colors.neutral[400]} />
        <span style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[600], fontWeight: 600 }}>
          النطاق الزمني:
        </span>
        <select value={timeScope} onChange={(e) => onTimeScopeChange(e.target.value)} style={selectStyle}>
          {TIME_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        title="تحديث السجلات"
        style={{
          padding: '7px 12px',
          borderRadius: theme.radii.lg,
          border: `1px solid ${theme.colors.neutral[200]}`,
          backgroundColor: theme.colors.neutral.white,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: theme.colors.neutral[600],
          fontSize: theme.typography.fontSizes.xs,
          fontFamily: theme.typography.fontFamily.sans,
        }}
      >
        <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        تحديث
      </button>

      <span style={{ marginRight: 'auto', fontSize: '0.75rem', color: theme.colors.neutral[400] }}>
        {totalLogs > 0
          ? `عرض ${(currentPage - 1) * perPage + 1}-${Math.min(currentPage * perPage, totalLogs)} من أصل ${totalLogs} سجلاً موثقاً`
          : 'لا توجد سجلات موثقة'}
      </span>
    </div>
  );
};
