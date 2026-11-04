import React, { useState } from 'react';
import {
  School as SchoolIcon,
  Building2,
  Building,
  MapPin,
  Plus,
  Download,
  Search,
  Link as LinkIcon,
  Edit,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { theme } from '../../theme';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { DirectorateSidebar } from './DirectorateSidebar';
import { RegisterSchoolModal } from './RegisterSchoolModal';
import { LinkEvaluatorModal } from './LinkEvaluatorModal';
import { AddDirectorateModal } from './AddDirectorateModal';
import { useAdminSchools } from '../../hooks/useAdminSchools';
import { downloadCsv } from '../../utils/exportUtils';
import type { School, AdminScreen } from '../../types/admin.types';

interface SchoolsDirectoryProps {
  onNavigate: (screen: AdminScreen) => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
}

export const SchoolsDirectory: React.FC<SchoolsDirectoryProps> = ({ onNavigate, addToast }) => {
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

  const handleRefresh = () => {
    void fetchData();
  };

  const selectedDirName = selectedDirectorateId
    ? directorates.find((d) => d.directorateId === selectedDirectorateId)?.directorateName || ''
    : 'كافة المديريات';

  // Dynamic statistics
  const totalGov = schools.filter((s) => s.schoolType === 'government').length;
  const totalPrivate = schools.filter((s) => s.schoolType === 'private').length;
  const govPercentage = schools.length > 0 ? Math.round((totalGov / schools.length) * 100) : 0;
  const privatePercentage = schools.length > 0 ? Math.round((totalPrivate / schools.length) * 100) : 0;

  // Export to CSV with real users and roles
  const handleExport = () => {
    const headers = [
      'كود المدرسة',
      'اسم المدرسة',
      'النوع',
      'المرحلة',
      'المديرية',
      'المحافظة',
      'حالة الجاهزية',
      'مدير المدرسة',
      'مسؤولو التقييم',
    ];
    const rows = filteredSchools.map((s) => {
      const schoolEvaluators = (users || []).filter(
        (u) => u.schoolId === s.schoolId && (u.roleName === 'school_evaluator' || u.roleCode === 'S1' || u.roleId === 2)
      );
      const schoolPrincipal = (users || []).find(
        (u) => u.schoolId === s.schoolId && (u.roleName === 'school_principal' || u.roleCode === 'S2' || u.roleId === 3)
      );
      const evalNames =
        schoolEvaluators.map((e) => e.fullName || e.username).join(' - ') || s.evaluatorName || 'لم يُعين';
      const princName = schoolPrincipal?.fullName || schoolPrincipal?.username || 'لم يُعين';
      const isReady = schoolEvaluators.length > 0 || !!s.evaluatorName;

      return [
        s.schoolCode,
        s.schoolName,
        s.schoolType === 'government' ? 'حكومية' : 'أهلية / خاصة',
        s.educationalStage,
        s.directorate,
        s.governorate,
        isReady ? 'جاهزة ومرتبطة' : 'غير مهيأة',
        princName,
        evalNames,
      ];
    });
    downloadCsv('erteqa_schools_directory.csv', headers, rows);
    addToast('success', 'تم تصدير دليل المدارس بنجاح بصيغة CSV');
  };

  return (
    <div style={{ padding: '32px', direction: 'rtl', fontFamily: theme.typography.fontFamily.sans }}>
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

      {/* Split View Layout: Directorate Selector (Right) + Schools Table (Left) */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '24px' }}>
        {/* Directorate Sidebar (Right in RTL) */}
        <DirectorateSidebar
          directorates={directorates}
          selectedDirectorateId={selectedDirectorateId}
          onSelect={setSelectedDirectorateId}
          onAddDirectorate={() => setIsAddDirOpen(true)}
        />

        {/* Schools Table & Filter Container (Left in RTL) */}
        <div style={{ flex: 1, minWidth: 0 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <div style={{ position: 'relative', minWidth: '180px' }}>
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
              overflow: 'hidden',
              boxShadow: theme.shadows.sm,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: theme.colors.neutral[50], borderBottom: `1px solid ${theme.colors.neutral[200]}` }}>
                  <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                    اسم المدرسة / الكود
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                    المرحلة والنوع
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                    مدير المدرسة
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                    مسؤول/فريق التقييم
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                    حالة الجاهزية
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600], textAlign: 'center' }}>
                    إجراء
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
                    const schoolEvaluators = (users || []).filter(
                      (u) =>
                        u.schoolId === school.schoolId &&
                        (u.roleName === 'school_evaluator' || u.roleCode === 'S1' || u.roleId === 2)
                    );
                    const schoolPrincipal = (users || []).find(
                      (u) =>
                        u.schoolId === school.schoolId &&
                        (u.roleName === 'school_principal' || u.roleCode === 'S2' || u.roleId === 3)
                    );
                    const hasEvaluator = schoolEvaluators.length > 0 || !!school.evaluatorName;

                    return (
                      <tr
                        key={school.schoolId}
                        style={{
                          borderBottom: idx < filteredSchools.length - 1 ? `1px solid ${theme.colors.neutral[100]}` : 'none',
                          backgroundColor: idx % 2 === 0 ? theme.colors.neutral.white : '#FAFAFA',
                        }}
                      >
                        {/* Name & Code */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                backgroundColor: school.schoolType === 'government' ? '#EFF6FF' : '#FEF3C7',
                                color: school.schoolType === 'government' ? '#1D4ED8' : '#92400E',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                              }}
                            >
                              {school.schoolCode}
                            </span>
                            <span style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: theme.colors.neutral[900] }}>
                              {school.schoolName}
                            </span>
                          </div>
                        </td>

                        {/* Stage & Type */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: theme.typography.fontSizes.sm, color: theme.colors.neutral[700] }}>
                            {school.educationalStage}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: theme.colors.neutral[400] }}>
                            {school.schoolType === 'government' ? 'مدرسة حكومية' : 'مدرسة أهلية'}
                          </div>
                        </td>

                        {/* Principal */}
                        <td style={{ padding: '14px 16px' }}>
                          {schoolPrincipal ? (
                            <div>
                              <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 600, color: theme.colors.neutral[800] }}>
                                {schoolPrincipal.fullName || schoolPrincipal.username}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: theme.colors.neutral[400], direction: 'ltr', textAlign: 'right' }}>
                                {schoolPrincipal.email}
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#D97706', fontSize: '0.75rem', fontWeight: 600 }}>
                              <AlertTriangle size={14} />
                              غير مرتبط بمدير
                            </div>
                          )}
                        </td>

                        {/* Evaluators */}
                        <td style={{ padding: '14px 16px' }}>
                          {schoolEvaluators.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {schoolEvaluators.map((ev) => (
                                <div key={ev.userId} style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 600, color: theme.colors.neutral[800] }}>
                                  {ev.fullName || ev.username}
                                  <span style={{ fontSize: '0.7rem', color: theme.colors.neutral[400], marginRight: '4px' }}>
                                    ({ev.email})
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : school.evaluatorName ? (
                            <div>
                              <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 600, color: theme.colors.neutral[800] }}>
                                {school.evaluatorName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: theme.colors.neutral[400], direction: 'ltr', textAlign: 'right' }}>
                                {school.evaluatorEmail || '---'}
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '0.75rem', fontWeight: 600 }}>
                              <AlertTriangle size={14} />
                              غير مرتبط بمقيم
                            </div>
                          )}
                        </td>

                        {/* Link Status */}
                        <td style={{ padding: '14px 16px' }}>
                          <StatusBadge
                            variant={hasEvaluator ? 'linked' : 'unlinked'}
                            label={hasEvaluator ? 'جاهزة ومرتبطة ✓' : 'غير مهيأة ⚠'}
                            size="md"
                          />
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => setLinkingSchool(school)}
                            title={hasEvaluator ? 'إسناد / تغيير مسؤول التقييم' : 'ربط مسؤول تقييم بالمدرسة'}
                            style={{
                              padding: '6px 14px',
                              borderRadius: theme.radii.md,
                              border: hasEvaluator ? `1px solid ${theme.colors.neutral[200]}` : 'none',
                              background: hasEvaluator
                                ? theme.colors.neutral.white
                                : 'linear-gradient(90deg, #7C3AED, #8B5CF6)',
                              color: hasEvaluator ? theme.colors.neutral[700] : '#fff',
                              fontSize: theme.typography.fontSizes.xs,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: hasEvaluator ? 'none' : '0 2px 6px rgba(124, 58, 237, 0.3)',
                              fontFamily: theme.typography.fontFamily.sans,
                            }}
                          >
                            {hasEvaluator ? <Edit size={12} /> : <LinkIcon size={12} />}
                            {hasEvaluator ? 'تعديل / إضافة' : 'ربط مقيم'}
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
          onClick={handleExport}
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

      <AddDirectorateModal
        isOpen={isAddDirOpen}
        onClose={() => setIsAddDirOpen(false)}
        onSuccess={fetchData}
        addToast={addToast}
      />
    </div>
  );
};
