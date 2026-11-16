import React from 'react';
import { MapPin, Plus, Check, Edit2, Trash2 } from 'lucide-react';
import { theme } from '../../theme';
import type { Directorate } from '../../types/admin.types';

interface DirectorateSidebarProps {
  directorates: Directorate[];
  selectedDirectorateId: number | null;
  onSelect: (id: number | null) => void;
  onAddDirectorate: () => void;
  onEditDirectorate?: (directorate: Directorate) => void;
  onDeleteDirectorate?: (directorate: Directorate) => void;
  isMobile?: boolean;
}

export const DirectorateSidebar: React.FC<DirectorateSidebarProps> = ({
  directorates,
  selectedDirectorateId,
  onSelect,
  onAddDirectorate,
  onEditDirectorate,
  onDeleteDirectorate,
  isMobile = false,
}) => {
  const totalSchools = directorates.reduce((acc, d) => acc + d.schoolCount, 0);

  return (
    <div
      style={{
        width: isMobile ? '100%' : '300px',
        maxWidth: isMobile ? '100%' : '300px',
        flexShrink: 0,
        backgroundColor: theme.colors.neutral.white,
        borderRadius: theme.radii.xl,
        border: `1px solid ${theme.colors.neutral[200]}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: theme.shadows.sm,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${theme.colors.neutral[200]}`,
          backgroundColor: theme.colors.neutral[50],
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.colors.neutral[800], fontWeight: 700, fontSize: theme.typography.fontSizes.sm }}>
          <MapPin size={16} color="#4F46E5" />
          <span>التوزيع الجغرافي والمديريات</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: theme.colors.neutral[500], marginTop: '4px' }}>
          إدارة وتصفية المدارس بحسب المديرية:
        </p>
      </div>

      {/* Directorate List */}
      <div style={{ flex: 1, maxHeight: isMobile ? '220px' : '520px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '8px' }}>
        {/* All Directorates item */}
        <button
          onClick={() => onSelect(null)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: theme.radii.lg,
            border: 'none',
            backgroundColor: selectedDirectorateId === null ? '#EEF2FF' : 'transparent',
            color: selectedDirectorateId === null ? '#4338CA' : theme.colors.neutral[700],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            marginBottom: '4px',
            fontFamily: theme.typography.fontFamily.sans,
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: selectedDirectorateId === null ? 700 : 500,
            transition: 'background-color 0.15s ease',
            textAlign: 'right',
          }}
        >
          <span>كافة المديريات (الكل)</span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: selectedDirectorateId === null ? '#C7D2FE' : theme.colors.neutral[100],
              color: selectedDirectorateId === null ? '#3730A3' : theme.colors.neutral[600],
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            {totalSchools} مدرسة
          </span>
        </button>

        {directorates.map((d) => {
          const isSelected = selectedDirectorateId === d.directorateId;
          return (
            <div
              key={d.directorateId}
              onClick={() => onSelect(d.directorateId)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: theme.radii.lg,
                border: 'none',
                backgroundColor: isSelected ? '#EEF2FF' : 'transparent',
                color: isSelected ? '#4338CA' : theme.colors.neutral[700],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                marginBottom: '4px',
                fontFamily: theme.typography.fontFamily.sans,
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: isSelected ? 700 : 500,
                transition: 'background-color 0.15s ease',
                textAlign: 'right',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                {isSelected && <Check size={14} color="#4F46E5" style={{ flexShrink: 0 }} />}
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.directorateName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '9999px',
                    backgroundColor: isSelected ? '#C7D2FE' : theme.colors.neutral[100],
                    color: isSelected ? '#3730A3' : theme.colors.neutral[600],
                    fontSize: '0.65rem',
                    fontWeight: 600,
                  }}
                >
                  {d.schoolCount}
                </span>

                {onEditDirectorate && (
                  <button
                    type="button"
                    title="تعديل المديرية"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditDirectorate(d);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: '3px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#4F46E5')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                  >
                    <Edit2 size={13} />
                  </button>
                )}

                {onDeleteDirectorate && (
                  <button
                    type="button"
                    title="حذف المديرية"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDirectorate(d);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: '3px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: `1px solid ${theme.colors.neutral[200]}`,
          backgroundColor: theme.colors.neutral[50],
        }}
      >
        <button
          onClick={onAddDirectorate}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '9px 12px',
            borderRadius: theme.radii.lg,
            border: `1px dashed ${theme.colors.neutral[300]}`,
            backgroundColor: theme.colors.neutral.white,
            color: '#4F46E5',
            fontSize: theme.typography.fontSizes.xs,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: theme.typography.fontFamily.sans,
            transition: 'all 0.15s ease',
          }}
        >
          <Plus size={14} />
          + تهيئة مديرية أو نطاق جغرافي جديد
        </button>
      </div>
    </div>
  );
};
