import React from 'react';
import { MapPin, Plus, Edit2, Trash2, Layers } from 'lucide-react';
import { theme } from '../../theme';
import type { Directorate, Governorate } from '../../types/admin.types';

interface DirectorateTopSectionProps {
  governorates: Governorate[];
  selectedGovernorateId: number | null;
  onSelectGovernorate: (id: number | null) => void;
  directorates: Directorate[];
  selectedDirectorateId: number | null;
  onSelectDirectorate: (id: number | null) => void;
  onAddDirectorate: () => void;
  onEditDirectorate?: (directorate: Directorate) => void;
  onDeleteDirectorate?: (directorate: Directorate) => void;
  isMobile?: boolean;
}

export const DirectorateTopSection: React.FC<DirectorateTopSectionProps> = ({
  governorates,
  selectedGovernorateId,
  onSelectGovernorate,
  directorates,
  selectedDirectorateId,
  onSelectDirectorate,
  onAddDirectorate,
  onEditDirectorate,
  onDeleteDirectorate,
  isMobile = false,
}) => {
  // Filter directorates belonging to the selected governorate
  const visibleDirectorates = selectedGovernorateId === null
    ? directorates
    : directorates.filter((d) => d.governorateId === selectedGovernorateId);

  const selectedGovName = selectedGovernorateId !== null
    ? governorates.find((g) => g.governorateId === selectedGovernorateId)?.nameAr || 'المحافظة المختارة'
    : 'كافة المحافظات';

  const totalSchoolsInScope = visibleDirectorates.reduce((acc, d) => acc + (d.schoolCount || 0), 0);

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: theme.colors.neutral.white,
        borderRadius: theme.radii.xl,
        border: `1px solid ${theme.colors.neutral[200]}`,
        boxShadow: theme.shadows.sm,
        marginBottom: '20px',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${theme.colors.neutral[100]}`,
          backgroundColor: '#FAFAFA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#EEF2FF',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MapPin size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: theme.colors.neutral[900] }}>
              التوزيع الجغرافي والمديريات التعليمية
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: theme.colors.neutral[500] }}>
              تصفية المدارس بحسب المحافظة والمديرية مع إمكانية إدارة النطاقات
            </p>
          </div>
        </div>

        <button
          onClick={onAddDirectorate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: theme.radii.lg,
            border: 'none',
            backgroundColor: '#4F46E5',
            color: '#FFFFFF',
            fontSize: theme.typography.fontSizes.xs,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
            fontFamily: theme.typography.fontFamily.sans,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4338CA')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4F46E5')}
        >
          <Plus size={15} />
          <span>إضافة مديرية جديدة</span>
        </button>
      </div>

      {/* Filter Body */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Row 1: Governorate Filter */}
        <div
          style={{
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '130px' }}>
            <Layers size={16} color="#64748B" />
            <label style={{ fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[700] }}>
              المحافظة:
            </label>
          </div>

          <div style={{ flex: 1, width: isMobile ? '100%' : 'auto', maxWidth: isMobile ? '100%' : '380px' }}>
            <select
              value={selectedGovernorateId ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                onSelectGovernorate(val);
                onSelectDirectorate(null); // Reset directorate filter
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: theme.radii.lg,
                border: `1px solid ${theme.colors.neutral[300]}`,
                fontSize: theme.typography.fontSizes.xs,
                fontFamily: theme.typography.fontFamily.sans,
                backgroundColor: '#FFFFFF',
                color: theme.colors.neutral[900],
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">-- كافة المحافظات (عرض جميع المدارس) --</option>
              {governorates.map((g) => (
                <option key={g.governorateId} value={g.governorateId}>
                  {g.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '0.75rem', color: theme.colors.neutral[500] }}>
            النطاق الحالي: <strong>{selectedGovName}</strong> • {visibleDirectorates.length} مديرية مسجلة
          </div>
        </div>

        {/* Row 2: Directorate Pills / Chips */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.colors.neutral[600], marginBottom: '8px' }}>
            المديريات التابعة:
          </div>

          {selectedGovernorateId !== null && visibleDirectorates.length === 0 ? (
            <div
              style={{
                padding: '16px 20px',
                borderRadius: theme.radii.lg,
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: '#92400E', fontWeight: 600 }}>
                ⚠️ لا توجد مديريات بعد لهذه المحافظة ({selectedGovName}).
              </span>
              <button
                type="button"
                onClick={onAddDirectorate}
                style={{
                  padding: '5px 12px',
                  borderRadius: theme.radii.md,
                  border: '1px solid #F59E0B',
                  backgroundColor: '#FFFFFF',
                  color: '#B45309',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                + تهيئة أول مديرية
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                maxHeight: '130px',
                overflowY: 'auto',
                padding: '2px',
              }}
            >
              {/* All directorates chip */}
              <button
                type="button"
                onClick={() => onSelectDirectorate(null)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: `1px solid ${selectedDirectorateId === null ? '#4F46E5' : theme.colors.neutral[200]}`,
                  backgroundColor: selectedDirectorateId === null ? '#EEF2FF' : '#FAFAFA',
                  color: selectedDirectorateId === null ? '#4338CA' : theme.colors.neutral[700],
                  fontSize: theme.typography.fontSizes.xs,
                  fontWeight: selectedDirectorateId === null ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>كافة مديريات {selectedGovName}</span>
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    backgroundColor: selectedDirectorateId === null ? '#C7D2FE' : '#E2E8F0',
                    color: selectedDirectorateId === null ? '#312E81' : '#475569',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  {totalSchoolsInScope}
                </span>
              </button>

              {/* Individual directorate chips */}
              {visibleDirectorates.map((d) => {
                const isSelected = selectedDirectorateId === d.directorateId;

                return (
                  <div
                    key={d.directorateId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: '9999px',
                      border: `1px solid ${isSelected ? '#4F46E5' : theme.colors.neutral[200]}`,
                      backgroundColor: isSelected ? '#EEF2FF' : '#FFFFFF',
                      padding: '2px 4px 2px 10px',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      onClick={() => onSelectDirectorate(d.directorateId)}
                      style={{
                        cursor: 'pointer',
                        fontSize: theme.typography.fontSizes.xs,
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#4338CA' : theme.colors.neutral[800],
                      }}
                    >
                      {d.directorateName}
                    </span>

                    <span
                      onClick={() => onSelectDirectorate(d.directorateId)}
                      style={{
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        backgroundColor: isSelected ? '#C7D2FE' : '#F1F5F9',
                        color: isSelected ? '#312E81' : '#64748B',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {d.schoolCount}
                    </span>

                    {/* Edit button */}
                    {onEditDirectorate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditDirectorate(d);
                        }}
                        title="تعديل اسم المديرية"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '3px',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          display: 'flex',
                          borderRadius: '50%',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#4F46E5')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                      >
                        <Edit2 size={12} />
                      </button>
                    )}

                    {/* Delete button */}
                    {onDeleteDirectorate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDirectorate(d);
                        }}
                        title="حذف المديرية"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '3px',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          display: 'flex',
                          borderRadius: '50%',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default DirectorateTopSection;
