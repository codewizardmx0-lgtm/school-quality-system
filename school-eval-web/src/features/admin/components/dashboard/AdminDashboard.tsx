import React, { useState, useMemo } from 'react';
import {
  School as SchoolIcon,
  Users,
  ShieldCheck,
  Database,
  UserPlus,
  PlusCircle,
  MapPin,
  RefreshCw,
  FileDown,
  AlertTriangle,
  Server,
} from 'lucide-react';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { schoolsApi } from '../../api/schoolsApi';
import type { AdminScreen, School, BackupRecord } from '../../types/admin.types';
import { AdminUrgentSchoolsWidget } from './AdminUrgentSchoolsWidget';
import { AdminSystemHealthWidget } from './AdminSystemHealthWidget';
import { AdminAuditStreamCard } from './AdminAuditStreamCard';

// Modals for Zero Dead Buttons
import { TriggerBackupModal } from '../backup/TriggerBackupModal';
import { LinkEvaluatorModal } from '../schools/LinkEvaluatorModal';
import { AssignPrincipalModal } from '../schools/AssignPrincipalModal';
import { CreateUserModal } from '../users/CreateUserModal';
import { RegisterSchoolModal } from '../schools/RegisterSchoolModal';
import { AddDirectorateModal } from '../schools/AddDirectorateModal';

interface AdminDashboardProps {
  onNavigate: (screen: AdminScreen) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

const hasPrincipal = (s: School): boolean => Boolean(s.principal?.userId || s.principal?.fullName);
const hasEvaluator = (s: School): boolean =>
  Boolean((s.evaluators && s.evaluators.length > 0) || (s.evaluatorName && s.evaluatorName.trim() !== ''));
const isCompleteSchool = (s: School): boolean => hasPrincipal(s) && hasEvaluator(s);
const isIncompleteSchool = (s: School): boolean => !isCompleteSchool(s);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, addToast }) => {
  const {
    stats,
    schools,
    auditLogs,
    loading,
    error,
    fetchData,
  } = useAdminDashboard();

  // Modal states
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedSchoolForLink, setSelectedSchoolForLink] = useState<School | null>(null);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isRegisterSchoolModalOpen, setIsRegisterSchoolModalOpen] = useState(false);
  const [isAddDirectorateModalOpen, setIsAddDirectorateModalOpen] = useState(false);

  const refreshData = () => {
    void fetchData().then(() => {
      addToast('info', 'تم تحديث مؤشرات لوحة التحكم بنجاح');
    });
  };

  // Principal modal state
  const [isPrincipalModalOpen, setIsPrincipalModalOpen] = useState(false);
  const [selectedSchoolForPrincipal, setSelectedSchoolForPrincipal] = useState<School | null>(null);

  // Incomplete schools: missing principal OR evaluator
  const incompleteSchools = useMemo(() => {
    return schools.filter(isIncompleteSchool);
  }, [schools]);

  const [urgentSearch, setUrgentSearch] = useState('');
  const filteredUrgentSchools = useMemo(() => {
    if (!urgentSearch.trim()) return incompleteSchools;
    const q = urgentSearch.toLowerCase().trim();
    return incompleteSchools.filter((s: School) =>
      s.schoolName?.toLowerCase().includes(q) ||
      s.schoolCode?.toLowerCase().includes(q) ||
      s.directorate?.toLowerCase().includes(q)
    );
  }, [incompleteSchools, urgentSearch]);

  const handleOpenPrincipalModal = (school: School) => {
    setSelectedSchoolForPrincipal(school);
    setIsPrincipalModalOpen(true);
  };

  const handlePrincipalSuccess = () => {
    setIsPrincipalModalOpen(false);
    setSelectedSchoolForPrincipal(null);
    refreshData();
    addToast('success', 'تم إسناد مدير المدرسة بنجاح');
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Handle Export Official PDF Report
  const handleExportReport = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    addToast('info', 'جاري إنشاء وتصدير التقرير التنفيذي الرسمي بتنسيق PDF...');
    try {
      await schoolsApi.downloadExecutivePdf();
      addToast('success', 'تم استخراج وتنزيل التقرير التنفيذي الشامل (PDF) بنجاح');
    } catch (err: unknown) {
      console.error('Failed to export executive PDF report:', err);
      const message = err instanceof Error ? err.message : undefined;
      addToast('error', message || 'فشل في استخراج التقرير التنفيذي، يرجى المحاولة لاحقاً.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleOpenLinkModal = (school: School) => {
    setSelectedSchoolForLink(school);
    setIsLinkModalOpen(true);
  };

  const handleLinkSuccess = () => {
    setIsLinkModalOpen(false);
    setSelectedSchoolForLink(null);
    refreshData();
    addToast('success', 'تم ربط مسؤول التقييم بالمدرسة بنجاح');
  };

  const handleBackupSuccess = (newBackup: BackupRecord) => {
    setIsBackupModalOpen(false);
    addToast('success', `تم إنجاز النسخة الاحتياطية بنجاح (${newBackup.fileName})`);
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1600px', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* 1. Dashboard Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#0B0F19',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              لوحة التحكم الرئيسية وإدارة العمليات المركزية
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
                }}
              />
              المنظومة متصلة ومستقرة
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
            نظرة تشغيلية شاملة على سلامة المنظومة، جاهزية المدارس، وأنشطة الأمان اللحظية
          </p>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={refreshData}
            title="تحديث البيانات"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#fff',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleExportReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              backgroundColor: '#fff',
              border: '1px solid #CBD5E1',
              color: '#334155',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
            }}
          >
            <FileDown size={16} color="#4F46E5" />
            <span>تصدير التقرير العام (PDF) ↗</span>
          </button>

          <button
            onClick={() => setIsBackupModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              backgroundColor: '#4F46E5',
              border: 'none',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <Database size={16} />
            <span>+ إنشاء نسخة احتياطية فورية</span>
          </button>
        </div>
      </div>

      {/* Error Fallback Prompt */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991B1B', fontSize: '0.875rem' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => void fetchData()}
            style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* 2. Top KPI Metrics Grid (4 Stat Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {/* Metric 1: إجمالي المدارس والجاهزية */}
        <div
          onClick={() => onNavigate('schools')}
          style={{
            backgroundColor: '#fff',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
            e.currentTarget.style.borderColor = '#A5B4FC';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
            e.currentTarget.style.borderColor = '#E2E8F0';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>
              إجمالي المدارس والجاهزية
            </span>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#EEF2FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4F46E5',
              }}
            >
              <SchoolIcon size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0B0F19' }}>
              {loading ? '...' : (stats?.totalSchools ?? schools.length)} مدرسة
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#059669',
                backgroundColor: '#ECFDF5',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              جاهزة {loading ? '...' : `${schools.length > 0 ? Math.round((schools.filter(isCompleteSchool).length / schools.length) * 100) : 0}%`}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#059669', fontWeight: 600 }}>{loading ? '...' : schools.filter(isCompleteSchool).length} مدرسة مكتملة</span><span>•</span><span style={{ color: '#D97706', fontWeight: 600 }}>{loading ? '...' : incompleteSchools.length} بحاجة لإجراءات</span>
          </div>
        </div>

        {/* Metric 2: المستخدمون النشطون الآن */}
        <div
          onClick={() => onNavigate('users')}
          style={{
            backgroundColor: '#fff',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
            e.currentTarget.style.borderColor = '#A5B4FC';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
            e.currentTarget.style.borderColor = '#E2E8F0';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>الحسابات المفعلة والنشطة</span>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <Users size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0B0F19' }}>
              {loading ? '...' : (stats?.totalUsers ?? 0)} حساباً
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#4F46E5',
                backgroundColor: '#EEF2FF',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              {loading ? '...' : (stats?.activeUsers ?? 0)} مفعّل
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
            {loading ? 'جاري التحقق من الحسابات...' : `${stats?.activeUsers ?? 0} حساباً مفعلاً في قاعدة البيانات`}
          </div>
        </div>

        {/* Metric 3: مؤشر النزاهة والأمان */}
        <div
          onClick={() => onNavigate('audit')}
          style={{
            backgroundColor: '#fff',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
            e.currentTarget.style.borderColor = '#A7F3D0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
            e.currentTarget.style.borderColor = '#E2E8F0';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>
              مؤشر النزاهة والأمان
            </span>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
              }}
            >
              <ShieldCheck size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0B0F19' }}>
              قيد التهيئة
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#DC2626',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              غير مفعلة حالياً
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
            مراقبة الحوادث الرقمية ميزة مستقبلية
          </div>
        </div>

        {/* Metric 4: حالة البنية التحتية والنسخ */}
        <div
          onClick={() => onNavigate('backup')}
          style={{
            backgroundColor: '#fff',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
            e.currentTarget.style.borderColor = '#CBD5E1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
            e.currentTarget.style.borderColor = '#E2E8F0';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>
              حالة البنية التحتية والنسخ
            </span>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0B0F19',
              }}
            >
              <Server size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0B0F19' }}>
              {stats?.infrastructureStatus === 'operational' ? 'تعمل بكفاءة' : 'تتطلب متابعة'}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: stats?.infrastructureStatus === 'operational' ? '#059669' : '#DC2626',
                backgroundColor: stats?.infrastructureStatus === 'operational' ? '#ECFDF5' : '#FEF2F2',
                border: stats?.infrastructureStatus === 'operational' ? '1px solid #A7F3D0' : '1px solid #FECACA',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              {stats?.systemHealthDetails ? `${stats.systemHealthDetails.databaseLatencyMs} ms` : 'فحص حي'}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
            التخزين المحلي: {stats?.systemHealthDetails?.storageUsedMb ?? 0} MB • ملفات النسخ: {stats?.systemHealthDetails?.backupFilesCount ?? 0}
          </div>
        </div>
      </div>

      {/* 3. Quick Launchpad (إجراءات سريعة للمسؤول) */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0B0F19', margin: 0 }}>
            منصة الإطلاق والإجراءات السريعة
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
            إجراءات فورية بدون مغادرة لوحة التحكم
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Action 1 */}
          <button
            onClick={() => setIsCreateUserModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '16px 20px',
              borderRadius: '12px',
              backgroundColor: '#fff',
              border: '1px solid #E2E8F0',
              textAlign: 'right',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4F46E5';
              e.currentTarget.style.backgroundColor = '#F8FAFC';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.backgroundColor = '#fff';
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <UserPlus size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0B0F19' }}>إضافة مستخدم جديد</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                تسجيل مسؤول، مدير، أو مقيّم
              </div>
            </div>
          </button>

          {/* Action 2 */}
          <button
            onClick={() => setIsRegisterSchoolModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '16px 20px',
              borderRadius: '12px',
              backgroundColor: '#fff',
              border: '1px solid #E2E8F0',
              textAlign: 'right',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10B981';
              e.currentTarget.style.backgroundColor = '#F8FAFC';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.backgroundColor = '#fff';
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <PlusCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0B0F19' }}>تسجيل مدرسة جديدة</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                إدراج صرح تعليمي بالدليل
              </div>
            </div>
          </button>

          {/* Action 3 */}
          <button
            onClick={() => setIsAddDirectorateModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '16px 20px',
              borderRadius: '12px',
              backgroundColor: '#fff',
              border: '1px solid #E2E8F0',
              textAlign: 'right',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#F59E0B';
              e.currentTarget.style.backgroundColor = '#F8FAFC';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.backgroundColor = '#fff';
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MapPin size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0B0F19' }}>تهيئة نطاق جغرافي</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                إضافة مديرية أو قطاع تربوي
              </div>
            </div>
          </button>

          {/* Action 4 */}
          <button
            onClick={() => onNavigate('backup')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '16px 20px',
              borderRadius: '12px',
              backgroundColor: '#fff',
              border: '1px solid #E2E8F0',
              textAlign: 'right',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0B0F19';
              e.currentTarget.style.backgroundColor = '#F8FAFC';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.backgroundColor = '#fff';
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#F1F5F9',
                color: '#0B0F19',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Database size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0B0F19' }}>فحص النسخ والتهيئة</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                مراجعة الأرشيف وإعدادات النظام
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Two-Column Core Operational Widgets */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {/* Right Widget: المدارس التي تتطلب إجراءات ربط فورية */}
        <AdminUrgentSchoolsWidget
          schoolsCount={schools.length}
          loading={loading}
          incompleteSchoolsCount={incompleteSchools.length}
          filteredUrgentSchools={filteredUrgentSchools}
          urgentSearch={urgentSearch}
          onUrgentSearchChange={setUrgentSearch}
          hasPrincipal={hasPrincipal}
          hasEvaluator={hasEvaluator}
          onOpenPrincipalModal={handleOpenPrincipalModal}
          onOpenLinkModal={handleOpenLinkModal}
          onNavigateSchools={() => onNavigate('schools')}
        />

        {/* Left Widget: سلامة الخدمات والبنية التحتية الحية */}
        <AdminSystemHealthWidget stats={stats} />
      </div>

      {/* 5. Recent Security & Audit Stream (آخر العمليات المنفذة) */}
      <AdminAuditStreamCard
        auditLogs={auditLogs}
        onNavigateAudit={() => onNavigate('audit')}
      />

      {/* Zero Dead Buttons Modals */}
      <TriggerBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onSuccess={handleBackupSuccess}
        addToast={addToast}
      />

      <LinkEvaluatorModal
        isOpen={isLinkModalOpen}
        school={selectedSchoolForLink}
        onClose={() => {
          setIsLinkModalOpen(false);
          setSelectedSchoolForLink(null);
        }}
        onSuccess={handleLinkSuccess}
        addToast={addToast}
      />

      <AssignPrincipalModal
        isOpen={isPrincipalModalOpen}
        school={selectedSchoolForPrincipal}
        onClose={() => {
          setIsPrincipalModalOpen(false);
          setSelectedSchoolForPrincipal(null);
        }}
        onSuccess={handlePrincipalSuccess}
        addToast={addToast}
      />

      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onSuccess={() => {
          setIsCreateUserModalOpen(false);
          refreshData();
          addToast('success', 'تم إنشاء وتفعيل حساب المستخدم بنجاح');
        }}
        addToast={addToast}
      />

      <RegisterSchoolModal
        isOpen={isRegisterSchoolModalOpen}
        onClose={() => setIsRegisterSchoolModalOpen(false)}
        onSuccess={() => {
          setIsRegisterSchoolModalOpen(false);
          refreshData();
          addToast('success', 'تم تسجيل وإدراج المدرسة بالدليل بنجاح');
        }}
        addToast={addToast}
      />

      <AddDirectorateModal
        isOpen={isAddDirectorateModalOpen}
        onClose={() => setIsAddDirectorateModalOpen(false)}
        onSuccess={() => {
          setIsAddDirectorateModalOpen(false);
          refreshData();
          addToast('success', 'تمت إضافة النطاق الجغرافي / المديرية بنجاح');
        }}
        addToast={addToast}
      />
    </div>
  );
};
export default AdminDashboard;
