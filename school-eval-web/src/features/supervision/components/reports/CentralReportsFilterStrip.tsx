/**
 * Component: CentralReportsFilterStrip
 * شريط التصفية العلوي لصفحة التحليلات والتقارير المركزية
 * يتضمن: محدد الدورة التقييمية، محدد المرحلة الدراسية، محدد المدارس متعدد الخيارات (بحد أقصى 10)، وأزرار التصدير المزدوج
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Layers,
  School as SchoolIcon,
  FileSpreadsheet,
  Download,
  RotateCcw,
  Check,
  ChevronDown,
  Search,
  X,
  Loader2,
} from 'lucide-react';

interface CentralReportsFilterStripProps {
  cycles?: Array<{
    cycleId: number;
    name: string;
    academicYear: string;
    status: string;
  }>;
  selectedCycleId?: number | string;
  onSelectCycleId: (id: number | string | undefined) => void;

  selectedStage: string;
  onSelectStage: (stage: string) => void;

  availableSchools?: Array<{
    schoolId: number;
    schoolCode: string;
    schoolName: string;
    stage?: string;
    directorate?: string;
  }>;
  selectedSchoolIds: number[];
  onSelectSchoolIds: (ids: number[]) => void;

  onExportExcel: () => void;
  onExportPdf: () => void;
  isExportingPdf?: boolean;
  onResetFilters: () => void;
}

const STAGE_OPTIONS = [
  { value: '', label: 'كافة المراحل الدراسية' },
  { value: 'أساسي (1-9)', label: 'أساسي (1-9)' },
  { value: 'ثانوي (10-12)', label: 'ثانوي (10-12)' },
  { value: 'أساسي وثانوي (1-12)', label: 'أساسي وثانوي (1-12)' },
];

export const CentralReportsFilterStrip: React.FC<CentralReportsFilterStripProps> = ({
  cycles = [],
  selectedCycleId,
  onSelectCycleId,
  selectedStage,
  onSelectStage,
  availableSchools = [],
  selectedSchoolIds,
  onSelectSchoolIds,
  onExportExcel,
  onExportPdf,
  isExportingPdf = false,
  onResetFilters,
}) => {
  const [isSchoolsOpen, setIsSchoolsOpen] = useState(false);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // إغلاق القائمة عند النقر بالخارج
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSchoolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSchools = availableSchools.filter((s) => {
    const q = schoolSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.schoolName?.toLowerCase().includes(q) ||
      s.schoolCode?.toLowerCase().includes(q) ||
      s.directorate?.toLowerCase().includes(q)
    );
  });

  const handleToggleSchool = (schoolId: number) => {
    if (selectedSchoolIds.includes(schoolId)) {
      onSelectSchoolIds(selectedSchoolIds.filter((id) => id !== schoolId));
    } else {
      if (selectedSchoolIds.length >= 10) {
        return; // سقف أقصى 10 مدارس
      }
      onSelectSchoolIds([...selectedSchoolIds, schoolId]);
    }
  };

  const handleClearSchools = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectSchoolIds([]);
  };

  const hasActiveFilters =
    Boolean(selectedStage) ||
    selectedSchoolIds.length > 0;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
      }}
    >
      {/* قسم الفلاتر */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          flex: '1 1 auto',
        }}
      >
        {/* 1. محدد الدورة التقييمية */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label
            htmlFor="cycle-select"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#475569',
              whiteSpace: 'nowrap',
            }}
          >
            <Calendar size={15} color="#0F766E" />
            <span>الدورة التقييمية:</span>
          </label>
          <select
            id="cycle-select"
            value={selectedCycleId ?? ''}
            onChange={(e) => onSelectCycleId(e.target.value ? Number(e.target.value) : undefined)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              fontSize: '13px',
              fontWeight: 600,
              color: '#0F172A',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '180px',
            }}
          >
            {cycles.map((cycle) => (
              <option key={cycle.cycleId} value={cycle.cycleId}>
                {cycle.name} ({cycle.academicYear}) {cycle.status === 'Active' ? '— نشطة' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 2. محدد المرحلة الدراسية */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label
            htmlFor="stage-select"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#475569',
              whiteSpace: 'nowrap',
            }}
          >
            <Layers size={15} color="#0F766E" />
            <span>المرحلة:</span>
          </label>
          <select
            id="stage-select"
            value={selectedStage}
            onChange={(e) => onSelectStage(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              fontSize: '13px',
              fontWeight: 600,
              color: '#0F172A',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '160px',
            }}
          >
            {STAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 3. محدد المدارس متعدد الخيارات (سقف 10 مدارس) */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsSchoolsOpen(!isSchoolsOpen)}
            onKeyDown={(e) => e.key === 'Enter' && setIsSchoolsOpen(!isSchoolsOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 12px',
              borderRadius: '8px',
              border: `1px solid ${selectedSchoolIds.length > 0 ? '#0D9488' : '#CBD5E1'}`,
              backgroundColor: selectedSchoolIds.length > 0 ? '#F0FDFA' : '#F8FAFC',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              color: '#0F172A',
              minWidth: '220px',
              userSelect: 'none',
            }}
          >
            <SchoolIcon size={15} color={selectedSchoolIds.length > 0 ? '#0D9488' : '#64748B'} />
            <span style={{ flex: 1, textAlign: 'right' }}>
              {selectedSchoolIds.length === 0 ? (
                'كافة مدارس النطاق'
              ) : (
                <span style={{ color: '#0F766E', fontWeight: 700 }}>
                  محدد: {selectedSchoolIds.length} من 10 (الحد الأقصى)
                </span>
              )}
            </span>
            {selectedSchoolIds.length > 0 && (
              <button
                type="button"
                onClick={handleClearSchools}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="إلغاء التحديد"
              >
                <X size={14} />
              </button>
            )}
            <ChevronDown size={14} color="#64748B" />
          </div>

          {/* القائمة المنسدلة */}
          {isSchoolsOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                width: '320px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                zIndex: 50,
                overflow: 'hidden',
              }}
            >
              {/* شريط البحث داخل القائمة */}
              <div
                style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid #F1F5F9',
                  backgroundColor: '#F8FAFC',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Search size={14} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="بحث باسم المدرسة أو الكود..."
                  value={schoolSearchQuery}
                  onChange={(e) => setSchoolSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '12px',
                    width: '100%',
                    color: '#0F172A',
                  }}
                />
              </div>

              {/* شريط التنبيه عند سقف 10 مدارس */}
              <div
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: selectedSchoolIds.length >= 10 ? '#FEF2F2' : '#F0FDFA',
                  color: selectedSchoolIds.length >= 10 ? '#991B1B' : '#0D9488',
                  borderBottom: '1px solid #F1F5F9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  {selectedSchoolIds.length >= 10
                    ? 'تم بلوغ الحد الأقصى (10 مدارس)'
                    : `يمكنك اختيار حتى ${10 - selectedSchoolIds.length} مدارس إضافية`}
                </span>
                {selectedSchoolIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectSchoolIds([])}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0F766E',
                      cursor: 'pointer',
                      fontSize: '11px',
                      textDecoration: 'underline',
                    }}
                  >
                    تفريغ الكل
                  </button>
                )}
              </div>

              {/* عناصر القائمة */}
              <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                {filteredSchools.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#94A3B8' }}>
                    لا توجد مدارس مطابقة
                  </div>
                ) : (
                  filteredSchools.map((school) => {
                    const isSelected = selectedSchoolIds.includes(school.schoolId);
                    const isDisabled = !isSelected && selectedSchoolIds.length >= 10;

                    return (
                      <div
                        key={school.schoolId}
                        role="button"
                        tabIndex={0}
                        onClick={() => !isDisabled && handleToggleSchool(school.schoolId)}
                        onKeyDown={(e) => e.key === 'Enter' && !isDisabled && handleToggleSchool(school.schoolId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          backgroundColor: isSelected ? '#F0FDFA' : '#FFFFFF',
                          opacity: isDisabled ? 0.5 : 1,
                          borderBottom: '1px solid #F8FAFC',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            border: `1.5px solid ${isSelected ? '#0D9488' : '#CBD5E1'}`,
                            backgroundColor: isSelected ? '#0D9488' : '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '12.5px',
                              fontWeight: isSelected ? 700 : 500,
                              color: '#0F172A',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {school.schoolName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {school.schoolCode} • {school.directorate || school.stage || '—'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. زر إعادة التعيين السريع */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              backgroundColor: '#F1F5F9',
              color: '#475569',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="إعادة تعيين الفلاتر"
          >
            <RotateCcw size={13} />
            <span>إعادة تعيين</span>
          </button>
        )}
      </div>

      {/* أزرار التصدير المزدوج */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          onClick={onExportExcel}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: '#FFFFFF',
            color: '#059669',
            border: '1px solid #A7F3D0',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="تصدير مصنف Excel متكامل (3 أوراق عمل RTL)"
        >
          <FileSpreadsheet size={15} />
          <span>تصدير المصنف (XLSX)</span>
        </button>

        <button
          type="button"
          onClick={onExportPdf}
          disabled={isExportingPdf}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: isExportingPdf ? '#94A3B8' : '#0F766E',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: isExportingPdf ? 'wait' : 'pointer',
            border: 'none',
            boxShadow: '0 2px 8px rgba(15, 118, 110, 0.25)',
            transition: 'all 0.15s ease',
          }}
          title="تنزيل التقرير التحليلي الرسمي بصيغة PDF عبر محرك mPDF"
        >
          {isExportingPdf ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          <span>{isExportingPdf ? 'جارِ التوليد...' : 'تصدير التقرير (PDF)'}</span>
        </button>
      </div>
    </div>
  );
};