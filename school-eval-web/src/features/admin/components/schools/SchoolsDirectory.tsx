import React, { useState, useEffect } from 'react';
import {
  School as SchoolIcon,
  Building2,
  Building,
  MapPin,
  Plus,
  Download,
  Search,

  Edit,
  ArrowRight,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { theme } from '../../theme';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { DirectorateSidebar } from './DirectorateSidebar';
import { RefreshButton } from '../common/RefreshButton';
import { RegisterSchoolModal } from './RegisterSchoolModal';
import { LinkEvaluatorModal } from './LinkEvaluatorModal';
import { AssignPrincipalModal } from './AssignPrincipalModal';
import { EditSchoolModal } from './EditSchoolModal';
import { exportToExcel } from '../../utils/exportUtils';
import { UserCheck, FileSpreadsheet } from 'lucide-react';
import { AddDirectorateModal } from './AddDirectorateModal';
import { useAdminSchools } from '../../hooks/useAdminSchools';
import { downloadCsv } from '../../utils/exportUtils';
import type { School, AdminScreen } from '../../types/admin.types';

interface SchoolsDirectoryProps {
  onNavigate: (screen: AdminScreen) => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
  isMobile?: boolean;
}

export const SchoolsDirectory: React.FC<SchoolsDirectoryProps> = ({ onNavigate, addToast, isMobile }) => {
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    return new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
  });
  const [internalIsMobile, setInternalIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 1024;
    return false;
  });

  useEffect(() => {
    const handleResize = () => setInternalIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeIsMobile = isMobile !== undefined ? isMobile : internalIsMobile;
  const {
    schools,
    filteredSchools,
    directorates,
    users,
    loading,
    error,
    selectedDirectorateId,
    setSelectedDirectorateId,
    typeFilter,
    setTypeFilter,
    searchQuery,
    setSearchQuery,
    fetchData,
  } = useAdminSchools();

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isAddDirOpen, setIsAddDirOpen] = useState(false);
  const [linkingSchool, setLinkingSchool] = useState<School | null>(null);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [assigningPrincipalSchool, setAssigningPrincipalSchool] = useState<School | null>(null);

  const handleRefresh = async () => {
    await fetchData();
    setLastUpdated(new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }));
  };

  const selectedDirName = selectedDirectorateId
    ? directorates.find((d) => d.directorateId === selectedDirectorateId)?.directorateName || ''
    : 'كافة المديريات';

  // Dynamic statistics
  const totalGov = schools.filter((s) => s.schoolType === 'government').length;
  const totalPrivate = schools.filter((s) => s.schoolType === 'private').length;
  const govPercentage = schools.length > 0 ? Math.round((totalGov / schools.length) * 100) : 0;
  const privatePercentage = schools.length > 0 ? Math.round((totalPrivate / schools.length) * 100) : 0;

  // Build rows for export
  const buildExportRows = () => {
    const headers = [
      'كود المدرسة',
      'اسم المدرسة',
      'المحافظة',
      'المديرية',
      'نوع المدرسة',
      'المرحلة التعليمية',
      'حالة المدرسة',
      'مدير المدرسة المرتبط',
      'المقيمون المرتبطون',
      'حالة الجاهزية',
    ];
    const rows = filteredSchools.map((s) => {
      const schoolEvaluators = (users || []).filter(
        (u) => u.schoolId === s.schoolId && (u.roleName === 'school_evaluator' || u.roleCode === 'S1' || u.roleId === 2)
      );
      const schoolPrincipal = s.principal || (users || []).find(
        (u) => u.schoolId === s.schoolId && (u.roleName === 'school_principal' || u.roleCode === 'P1' || u.roleId === 3)
      );
      const evalNames =
        (s.evaluators && s.evaluators.length > 0 ? s.evaluators.map(e => e.fullName).join('، ') : null) ||
        schoolEvaluators.map((e) => e.fullName || e.username).join('، ') ||
        s.evaluatorName ||
        'غير مسند';
      const princName = schoolPrincipal?.fullName || (schoolPrincipal as any)?.username || 'غير مسند';
      const isReady = (schoolEvaluators.length > 0 || (s.evaluators && s.evaluators.length > 0) || !!s.evaluatorName) && !!schoolPrincipal;

      return [
        s.schoolCode,
        s.schoolName,
        s.governorate,
        s.directorate || s.educationalDistrict || '---',
        s.schoolType === 'private' ? 'أهلية / خاصة' : 'حكومية (رسمية)',
        s.educationalStage,
        s.status === 'Active' ? 'نشطة' : 'معطلة',
        princName,
        evalNames,
        isReady ? 'مكتملة الجاهزية' : 'غير مكتملة الجاهزية',
      ];
    });
    return { headers, rows };
  };

  // Export to Excel (.xlsx) with RTL layout
  const handleExportExcel = () => {
    const { headers, rows } = buildExportRows();
    exportToExcel('erteqa_schools_directory.xlsx', 'دليل المدارس', headers, rows);
    addToast('success', 'تم تصدير دليل المدارس بنجاح إلى ملف Excel (.xlsx) حقيقي.');
  };

  // Export to CSV with UTF-8 BOM
  const handleExportCsv = () => {
    const { headers, rows } = buildExportRows();
    downloadCsv('erteqa_schools_directory.csv', headers, rows);
    addToast('success', 'تم تصدير دليل المدارس بصيغة CSV');
  };

  return (
    <div style={{ padding: '24px 20px', direction: 'rtl', fontFamily: theme.typography.fontFamily.sans, boxSizing: 'border-box' }}>
      {/* Header & Primary Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: theme.colors.neutral[900],
              margin: 0,
            }}
          >
            دليل المدارس المسجلة والربط الإداري الميداني
          </h1>
          <p
            style={{
              fontSize: theme.typography.fontSizes.sm,
              color: theme.colors.neutral[500],
              marginTop: '4px',
            }}
          >
            تسجيل وتسكين المدارس في المديريات وتعيين الحسابات المسؤولة • تهيئة النطاقات لدورات التقييم
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <RefreshButton onRefresh={handleRefresh} loading={loading} lastUpdated={lastUpdated} />
          <button
            onClick={handleExportExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: theme.radii.lg,
              border: '1px solid #10B981',
              backgroundColor: '#ECFDF5',
              color: '#065F46',
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: theme.typography.fontFamily.sans,
              boxShadow: theme.shadows.sm,
            }}
          >
            <FileSpreadsheet size={16} color="#059669" />
            تصدير Excel (.xlsx)
          </button>
          <button
            onClick={handleExportCsv}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: theme.radii.lg,
              border: `1px solid ${theme.colors.neutral[200]}`,
              backgroundColor: theme.colors.neutral.white,
              color: theme.colors.neutral[600],
              fontSize: theme.typography.fontSizes.xs,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: theme.typography.fontFamily.sans,
            }}
          >
            <Download size={14} />
            CSV
          </button>
          <button
            onClick={() => setIsRegisterOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: theme.radii.lg,
              border: 'none',
              background: 'linear-gradient(90deg, #4F46E5, #6366F1)',
              color: '#fff',
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
              fontFamily: theme.typography.fontFamily.sans,
            }}
          >
            <Plus size={18} />
            + تسجيل مدرسة جديدة
          </button>
        </div>
      </div>

      {/* 4 Dynamic Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <StatCard
          title="إجمالي المدارس بالنظام"
          value={`${schools.length} مدرسة`}
          subtitle="المسجلة في قاعدة البيانات"
          icon={<SchoolIcon size={24} />}
          iconBgColor="#EFF6FF"
          iconColor="#2563EB"
        />
        <StatCard
          title="المدارس الحكومية"
          value={`${totalGov} مدرسة`}
          subtitle={`نسبة ${govPercentage}% من الإجمالي`}
          icon={<Building2 size={24} />}
          iconBgColor="#ECFDF5"
          iconColor="#059669"
        />
        <StatCard
          title="المدارس الأهلية / الخاصة"
          value={`${totalPrivate} مدرسة`}
          subtitle={`نسبة ${privatePercentage}% من الإجمالي`}
          icon={<Building size={24} />}
          iconBgColor="#FEF3C7"
          iconColor="#D97706"
        />
        <StatCard
          title="المديريات التعليمية النشطة"
          value={`${directorates.length} مديريات`}
          subtitle="المتاحة بالنظام"
          icon={<MapPin size={24} />}
          iconBgColor="#EDE9FE"
          iconColor="#7C3AED"
        />
      </div>

      {/* Split View Layout: Directorate Selector (Top on mobile, Right on desktop) + Schools Table (Below on mobile, Left on desktop) */}
      <div
        style={{
          display: 'flex',
          flexDirection: activeIsMobile ? 'column' : 'row',
          gap: '20px',
          alignItems: 'stretch',
          marginBottom: '24px',
          width: '100%',
        }}
      >
        {/* Directorate Sidebar */}
        <DirectorateSidebar
          directorates={directorates}
          selectedDirectorateId={selectedDirectorateId}
          onSelect={setSelectedDirectorateId}
          onAddDirectorate={() => setIsAddDirOpen(true)}
          isMobile={activeIsMobile}
        />

        {/* Schools Table & Filter Container */}
        <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
          {/* Header & Type Filter */}
          <div
            style={{
              backgroundColor: theme.colors.neutral.white,
              borderRadius: theme.radii.xl,
              padding: '16px 20px',
              border: `1px solid ${theme.colors.neutral[200]}`,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: theme.colors.neutral[800] }}>
                المدارس المسجلة في نطاق: {selectedDirName}
              </div>
              <div style={{ fontSize: '0.75rem', color: theme.colors.neutral[400], marginTop: '2px' }}>
                عرض {filteredSchools.length} مدرسة
              </div>
            </div>

            {/* Type Filter Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: '1 1 auto', maxWidth: '100%', justifyContent: 'flex-end' }}>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: theme.colors.neutral[100],
                  padding: '3px',
                  borderRadius: theme.radii.lg,
                  gap: '2px',
                }}
              >
                {(['all', 'government', 'private'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: theme.radii.md,
                      border: 'none',
                      backgroundColor: typeFilter === type ? theme.colors.neutral.white : 'transparent',
                      color: typeFilter === type ? theme.colors.neutral[900] : theme.colors.neutral[500],
                      fontSize: theme.typography.fontSizes.xs,
                      fontWeight: typeFilter === type ? 700 : 500,
                      cursor: 'pointer',
                      boxShadow: typeFilter === type ? theme.shadows.sm : 'none',
                      fontFamily: theme.typography.fontFamily.sans,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {type === 'all' ? 'الكل' : type === 'government' ? 'حكومية' : 'أهلية'}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '150px', maxWidth: '100%', boxSizing: 'border-box' }}>
                <Search
                  size={15}
                  color={theme.colors.neutral[400]}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="بحث بالمدرسة أو الكود..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 30px 6px 10px',
                    borderRadius: theme.radii.lg,
                    border: `1px solid ${theme.colors.neutral[200]}`,
                    fontSize: theme.typography.fontSizes.xs,
                    backgroundColor: theme.colors.neutral[50],
                    outline: 'none',
                    fontFamily: theme.typography.fontFamily.sans,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                onClick={handleRefresh}
                title="تحديث البيانات"
                style={{
                  padding: '7px 10px',
                  borderRadius: theme.radii.md,
                  border: `1px solid ${theme.colors.neutral[200]}`,
                  backgroundColor: theme.colors.neutral.white,
                  cursor: 'pointer',
                  color: theme.colors.neutral[600],
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>

              <span style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[400] }}>
                عرض {filteredSchools.length} من {schools.length}
              </span>
            </div>
          </div>

          {/* Error Fallback Prompt */}
          {error && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: theme.radii.lg,
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991B1B', fontSize: theme.typography.fontSizes.sm }}>
                <ShieldAlert size={18} />
                <span>{error}</span>
              </div>
              <button
                onClick={() => void fetchData()}
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: theme.radii.md,
                  padding: '6px 14px',
                  fontSize: theme.typography.fontSizes.xs,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* Schools Table */}
          <div
            style={{
              backgroundColor: theme.colors.neutral.white,
              borderRadius: theme.radii.xl,
              border: `1px solid ${theme.colors.neutral[200]}`,
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              boxShadow: theme.shadows.sm,
              maxWidth: '100%',
            }}
          >
            <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: theme.colors.neutral[50], borderBottom: `1px solid ${theme.colors.neutral[200]}` }}>
                  <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                    المدرسة والكود
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                    المحافظة والمديرية
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                    نوع المدرسة
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                    مدير المدرسة
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                    فريق التقييم المدرسي
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                    الجاهزية
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600], textAlign: 'center' }}>
                    إجراءات المدرسة
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`school-skel-${i}`} className="animate-pulse" style={{ borderBottom: `1px solid ${theme.colors.neutral[100]}` }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '60px', height: '20px', backgroundColor: '#E5E7EB', borderRadius: '4px' }} />
                          <div style={{ width: '140px', height: '16px', backgroundColor: '#E5E7EB', borderRadius: '4px' }} />
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ width: '100px', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px', marginBottom: '4px' }} />
                        <div style={{ width: '70px', height: '12px', backgroundColor: '#F3F4F6', borderRadius: '4px' }} />
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ width: '110px', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px' }} />
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ width: '110px', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px' }} />
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ width: '80px', height: '22px', backgroundColor: '#E5E7EB', borderRadius: '12px' }} />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ width: '60px', height: '26px', backgroundColor: '#E5E7EB', borderRadius: '6px', margin: '0 auto' }} />
                      </td>
                    </tr>
                  ))
                ) : filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: theme.colors.neutral[400] }}>
                      لا توجد مدارس مسجلة في هذا النطاق بالمعايير المحددة
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((school, idx) => {
                    const schoolEvaluators = school.evaluators && school.evaluators.length > 0
                      ? school.evaluators
                      : (users || []).filter(
                          (u) =>
                            u.schoolId === school.schoolId &&
                            (u.roleName === 'school_evaluator' || u.roleCode === 'S1' || u.roleId === 2)
                        );
                    const schoolPrincipal = school.principal || (users || []).find(
                      (u) =>
                        u.schoolId === school.schoolId &&
                        (u.roleName === 'school_principal' || u.roleCode === 'P1' || u.roleId === 3)
                    );
                    const hasEvaluator = schoolEvaluators.length > 0 || !!school.evaluatorName;
                    const hasPrincipal = !!schoolPrincipal;
                    const isFullyReady = hasEvaluator && hasPrincipal;

                    return (
                      <tr
                        key={school.schoolId}
                        style={{
                          borderBottom: idx < filteredSchools.length - 1 ? `1px solid ${theme.colors.neutral[100]}` : 'none',
                          backgroundColor: idx % 2 === 0 ? theme.colors.neutral.white : '#FAFAFA',
                        }}
                      >
                        {/* 1. School Name & Code */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: theme.colors.neutral[900], lineHeight: 1.4 }}>
                              {school.schoolName}
                            </span>
                            <span
                              style={{
                                display: 'inline-block',
                                width: 'fit-content',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#F1F5F9',
                                color: '#475569',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                              }}
                            >
                              {school.schoolCode}
                            </span>
                          </div>
                        </td>

                        {/* 2. Governorate & Directorate */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 600, color: theme.colors.neutral[800] }}>
                            {school.directorate || school.educationalDistrict || '---'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: theme.colors.neutral[500] }}>
                            {school.governorate}
                          </div>
                        </td>

                        {/* 3. School Type & Stage */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: school.schoolType === 'private' ? '#FEF3C7' : '#EFF6FF',
                              color: school.schoolType === 'private' ? '#92400E' : '#1D4ED8',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              border: `1px solid ${school.schoolType === 'private' ? '#FDE68A' : '#DBEAFE'}`,
                            }}
                          >
                            {school.schoolType === 'private' ? 'مدرسة أهلية' : 'مدرسة حكومية'}
                          </span>
                          <div style={{ fontSize: '0.7rem', color: theme.colors.neutral[400], marginTop: '3px' }}>
                            {school.educationalStage}
                          </div>
                        </td>

                        {/* 4. Principal Column */}
                        <td style={{ padding: '14px 16px' }}>
                          {hasPrincipal ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <div>
                                <span style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: '#065F46', display: 'block' }}>
                                  {schoolPrincipal.fullName || (schoolPrincipal as any).username}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: theme.colors.neutral[400] }}>
                                  {schoolPrincipal.email}
                                </span>
                              </div>
                              <button
                                onClick={() => setAssigningPrincipalSchool(school)}
                                title="تغيير مدير المدرسة"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: theme.radii.md,
                                  border: '1px solid #BBF7D0',
                                  backgroundColor: '#F0FDF4',
                                  color: '#15803D',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                تغيير
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAssigningPrincipalSchool(school)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: theme.radii.md,
                                border: '1px dashed #F59E0B',
                                backgroundColor: '#FFFBEB',
                                color: '#B45309',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <UserCheck size={13} />
                              + إسناد مدير
                            </button>
                          )}
                        </td>

                        {/* 5. Evaluators Column */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {schoolEvaluators.length > 0 ? (
                                schoolEvaluators.map((ev) => (
                                  <span key={ev.userId} style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.colors.neutral[800] }}>
                                    • {ev.fullName}
                                  </span>
                                ))
                              ) : school.evaluatorName ? (
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.colors.neutral[800] }}>
                                  • {school.evaluatorName}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600 }}>
                                  لا يوجد مقيم
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => setLinkingSchool(school)}
                              title="إدارة فريق التقييم"
                              style={{
                                padding: '4px 8px',
                                borderRadius: theme.radii.md,
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#F8FAFC',
                                color: '#475569',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                            >
                              إدارة ({schoolEvaluators.length})
                            </button>
                          </div>
                        </td>

                        {/* 6. Readiness Badge */}
                        <td style={{ padding: '14px 16px' }}>
                          <StatusBadge
                            variant={isFullyReady ? 'linked' : 'unlinked'}
                            label={isFullyReady ? 'مكتملة الجاهزية ✓' : 'غير مكتملة ⚠'}
                            size="md"
                          />
                        </td>

                        {/* 7. Action: Edit School Button */}
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => setEditingSchool(school)}
                            title="تعديل بيانات المدرسة الرسمية"
                            style={{
                              padding: '6px 12px',
                              borderRadius: theme.radii.md,
                              border: `1px solid ${theme.colors.neutral[300]}`,
                              backgroundColor: theme.colors.neutral.white,
                              color: theme.colors.neutral[800],
                              fontSize: theme.typography.fontSizes.xs,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontFamily: theme.typography.fontFamily.sans,
                              boxShadow: theme.shadows.sm,
                            }}
                          >
                            <Edit size={13} color="#4F46E5" />
                            تعديل المدرسة
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mandatory Assignment Callout Box */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#F8FAFC',
          borderRadius: theme.radii.xl,
          border: '1px solid #E2E8F0',
          borderRight: '4px solid #10B981',
          marginBottom: '28px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}
      >
        <ShieldAlert size={20} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
            قاعدة التسكين الجغرافي والكادر المدرسي
          </div>
          <div style={{ fontSize: theme.typography.fontSizes.xs, color: '#64748B', lineHeight: 1.6 }}>
            تُسكن كل مدرسة تحت مديرية ومحافظة محددة. لتمكين المدرسة من استكمال دورات التقييم، يجب أن تشتمل على مدير مدرسة واحد على الأقل، ومقيم مدرسي واحد على الأقل. كل مقيم ينتمي لمدرسة واحدة فقط، بينما يمكن للمدرسة أن تحتضن أكثر من مقيم في فريق التقييم الداخلي.
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingTop: '8px',
        }}
      >
        <button
          onClick={handleExportExcel}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: theme.radii.lg,
            border: `1px solid ${theme.colors.neutral[300]}`,
            backgroundColor: theme.colors.neutral.white,
            color: theme.colors.neutral[700],
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: theme.typography.fontFamily.sans,
          }}
        >
          <Download size={16} />
          تصدير دليل المدارس (CSV) ↓
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onNavigate('users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: theme.radii.lg,
              border: `1px solid ${theme.colors.neutral[200]}`,
              backgroundColor: theme.colors.neutral.white,
              color: theme.colors.neutral[700],
              fontSize: theme.typography.fontSizes.sm,
              cursor: 'pointer',
              fontFamily: theme.typography.fontFamily.sans,
            }}
          >
            إدارة المستخدمين
          </button>
          <button
            onClick={() => onNavigate('audit')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: theme.radii.lg,
              border: 'none',
              backgroundColor: '#0F172A',
              color: '#fff',
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: theme.typography.fontFamily.sans,
            }}
          >
            سجل الأمان والتدقيق العام
            <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>
      </div>

      {/* Modals */}
      <RegisterSchoolModal
        isOpen={isRegisterOpen}
        directorates={directorates}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={fetchData}
        addToast={addToast}
      />

      <LinkEvaluatorModal
        isOpen={!!linkingSchool}
        school={linkingSchool}
        onClose={() => setLinkingSchool(null)}
        onSuccess={fetchData}
        addToast={addToast}
      />

      <AssignPrincipalModal
        isOpen={!!assigningPrincipalSchool}
        school={assigningPrincipalSchool}
        onClose={() => setAssigningPrincipalSchool(null)}
        onSuccess={fetchData}
        addToast={addToast}
      />

      <EditSchoolModal
        isOpen={!!editingSchool}
        school={editingSchool}
        directorates={directorates}
        onClose={() => setEditingSchool(null)}
        onSuccess={fetchData}
        addToast={addToast}
      />

      <AddDirectorateModal
        isOpen={isAddDirOpen}
        onClose={() => setIsAddDirOpen(false)}
        onSuccess={fetchData}
        addToast={addToast}
      />
    </div>
  );
};
