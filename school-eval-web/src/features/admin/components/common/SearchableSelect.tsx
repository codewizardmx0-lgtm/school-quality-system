import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check, School as SchoolIcon } from 'lucide-react';
import { theme } from '../../theme';

export interface SearchableOption {
  value: number | string;
  label: string;
  code?: string;
  sublabel?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: number | string | null;
  onChange: (value: number | string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'ابحث باسم المدرسة أو الكود...',
  searchPlaceholder = 'اكتب للبحث الفوري...',
  emptyText = 'لا توجد نتائج مطابقة للبحث',
  disabled = false,
  error,
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Selected Option
  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value)) || null;
  }, [options, value]);

  // Filtered Options
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(term);
      const matchCode = opt.code ? opt.code.toLowerCase().includes(term) : false;
      const matchSub = opt.sublabel ? opt.sublabel.toLowerCase().includes(term) : false;
      const matchVal = String(opt.value).includes(term);
      return matchLabel || matchCode || matchSub || matchVal;
    });
  }, [options, searchTerm]);

  const handleSelect = (opt: SearchableOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm('');
  };

  const defaultIcon = <SchoolIcon size={16} color={selectedOption ? '#4F46E5' : theme.colors.neutral[400]} style={{ flexShrink: 0 }} />;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', fontFamily: theme.typography.fontFamily.sans }}>
      {/* Trigger Button */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        style={{
          width: '100%',
          minHeight: '44px',
          padding: '8px 12px',
          borderRadius: theme.radii.lg,
          border: `1px solid ${error ? '#EF4444' : isOpen ? '#4F46E5' : theme.colors.neutral[200]}`,
          backgroundColor: disabled ? theme.colors.neutral[100] : theme.colors.neutral.white,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxSizing: 'border-box',
          boxShadow: isOpen ? '0 0 0 3px rgba(79, 70, 229, 0.12)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          {icon ?? defaultIcon}
          {selectedOption ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
              <span
                style={{
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: 600,
                  color: theme.colors.neutral[900],
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedOption.label}
              </span>
              {selectedOption.code && (
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: '#EEF2FF',
                    color: '#4338CA',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    fontFamily: theme.typography.fontFamily.mono,
                    flexShrink: 0,
                  }}
                >
                  {selectedOption.code}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: theme.typography.fontSizes.sm, color: theme.colors.neutral[400] }}>
              {placeholder}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="إلغاء التحديد"
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: theme.colors.neutral[400],
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.colors.neutral[400])}
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={16}
            color={theme.colors.neutral[400]}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: theme.colors.neutral.white,
            borderRadius: theme.radii.xl,
            border: `1px solid ${theme.colors.neutral[200]}`,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 1050,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '280px',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Live Search Input inside Popover */}
          <div
            style={{
              padding: '8px 10px',
              borderBottom: `1px solid ${theme.colors.neutral[100]}`,
              backgroundColor: theme.colors.neutral[50],
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Search size={15} color={theme.colors.neutral[400]} style={{ flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                backgroundColor: 'transparent',
                outline: 'none',
                fontSize: theme.typography.fontSizes.sm,
                fontFamily: theme.typography.fontFamily.sans,
                color: theme.colors.neutral[800],
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  cursor: 'pointer',
                  color: theme.colors.neutral[400],
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              padding: '4px',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: theme.typography.fontSizes.xs,
                  color: theme.colors.neutral[500],
                }}
              >
                {emptyText} «{searchTerm}»
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                const isOptDisabled = Boolean(opt.disabled);

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: theme.radii.md,
                      backgroundColor: isSelected ? '#EEF2FF' : isOptDisabled ? '#F8FAFC' : 'transparent',
                      color: isOptDisabled ? '#94A3B8' : isSelected ? '#4338CA' : theme.colors.neutral[800],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: isOptDisabled ? 'not-allowed' : 'pointer',
                      opacity: isOptDisabled ? 0.65 : 1,
                      gap: '8px',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !isOptDisabled) e.currentTarget.style.backgroundColor = theme.colors.neutral[50];
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !isOptDisabled) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: theme.typography.fontSizes.sm,
                          fontWeight: isSelected ? 700 : 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {opt.label}
                      </span>
                      {opt.code && (
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: isSelected ? '#C7D2FE' : '#F1F5F9',
                            color: isSelected ? '#3730A3' : '#64748B',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            fontFamily: theme.typography.fontFamily.mono,
                            flexShrink: 0,
                          }}
                        >
                          {opt.code}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {opt.sublabel && (
                        <span style={{ fontSize: '0.7rem', color: isOptDisabled ? '#94A3B8' : theme.colors.neutral[400] }}>
                          {opt.sublabel}
                        </span>
                      )}
                      {isSelected && <Check size={14} color="#4F46E5" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
