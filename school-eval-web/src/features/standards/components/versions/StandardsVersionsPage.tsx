/**
 * Screen 1: Standards Versions Registry
 * إدارة إصدارات وثيقة معايير التقييم والاعتماد المدرسي
 * متوافقة مع كافة بنود UI_STANDARDS.md وتصميم Figma المعتمد
 */

import React, { useState, useMemo } from 'react';
import {
  FilePlus,
  ShieldCheck,
  GitFork,
  Scale,
  Calendar,
  Layers,
  Building2,
  Lock,
  Clock,
  ArrowRight,
  History,
  Search,
  X,
  Filter,
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { StandardVersionSummary } from '../../api/standardsTypes';
import { standardsApi } from '../../api/standardsApi';
import { CreateDraftModal } from './CreateDraftModal';
import { VersionRuleCallout } from './VersionRuleCallout';
import { EmptyStandardsState } from '../common/EmptyStandardsState';

interface StandardsVersionsPageProps {
  versions: StandardVersionSummary[];
  activeVersion: StandardVersionSummary | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onCreateDraft: (payload: any) => Promise<any>;
  onDuplicateVersion?: (sourceId: number, newNo: string) => Promise<any>;
  onDeleteVersion?: (versionId: number) => Promise<any>;
  onNavigateToTree: (versionId?: number) => void;
  onNavigateToWeights: (versionId?: number) => void;
  onNavigateToLock: (versionId?: number) => void;
}

type VersionSortKey =
  | 'versionNo'
  | 'issueDate'
  | 'status'
  | 'standardsCount'
  | 'activeSchoolsCount';
type SortDirection = 'asc' | 'desc';

export const StandardsVersionsPage: React.FC<StandardsVersionsPageProps> = ({
  versions,
  activeVersion,
  isLoading,
  error,
  onRefresh,
  onCreateDraft,
  onDeleteVersion,
  onNavigateToTree,
  onNavigateToWeights,
  onNavigateToLock,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState<number | undefined>(undefined);
  const [deleteTargetVersion, setDeleteTargetVersion] = useState<StandardVersionSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortKey, setSortKey] = useState<VersionSortKey>('versionNo');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleConfirmDelete = async () => {
    if (!deleteTargetVersion) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (onDeleteVersion) {
        await onDeleteVersion(deleteTargetVersion.versionId);
      } else {
        await standardsApi.deleteVersion(deleteTargetVersion.versionId);
        onRefresh();
      }
      setDeleteTargetVersion(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'حدث خطأ أثناء حذف مسودة الإصدار.');
    } finally {
      setIsDeleting(false);
    }
  };

  const draftVersionsCount = versions.filter((v) => v.status === 'Draft' || v.status === 'draft').length;

  const statusCounts = useMemo(() => {
    return {
      all: versions.length,
      active: versions.filter((v) => v.status?.toLowerCase() === 'active').length,
      approved: versions.filter((v) => v.status?.toLowerCase() === 'approved').length,
      draft: versions.filter((v) => v.status?.toLowerCase() === 'draft').length,
      archived: versions.filter((v) => v.status?.toLowerCase() === 'archived').length,
    };
  }, [versions]);

  const hasActiveFilters = searchTerm.trim() !== '' || filterStatus !== 'all';

  const handleSort = (key: VersionSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'versionNo' || key === 'issueDate' ? 'desc' : 'asc');
    }
  };

  const renderSortIndicator = (key: VersionSortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown size={13} style={{ opacity: 0.35, flexShrink: 0 }} />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={13} style={{ color: '#D97706', flexShrink: 0 }} />
    ) : (
      <ArrowDown size={13} style={{ color: '#D97706', flexShrink: 0 }} />
    );
  };

  const filteredAndSortedVersions = useMemo(() => {
    const list = versions.filter((v) => {
      // Status filter
      if (filterStatus !== 'all' && v.status?.toLowerCase() !== filterStatus.toLowerCase()) {
        return false;
      }
      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchNo = String(v.versionNo || '').toLowerCase().includes(q);
        const matchOrg = String(v.sourceOrganization || '').toLowerCase().includes(q);
        const matchNum = String(v.sourceNumber || '').toLowerCase().includes(q);
        const matchDesc = String(v.sourceDescription || '').toLowerCase().includes(q);
        if (!matchNo && !matchOrg && !matchNum && !matchDesc) {
          return false;
        }
      }
      return true;
    });

    return list.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortKey) {
        case 'versionNo':
          valA = a.versionNo;
          valB = b.versionNo;
          break;
        case 'issueDate':
          valA = a.issueDate || '';
          valB = b.issueDate || '';
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        case 'standardsCount':
          valA = a.standardsCount ?? 7;
          valB = b.standardsCount ?? 7;
          break;
        case 'activeSchoolsCount':
          valA = a.activeSchoolsCount ?? 0;
          valB = b.activeSchoolsCount ?? 0;
          break;
        default:
          return 0;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA || '');
      const strB = String(valB || '');
      return sortDirection === 'asc'
        ? strA.localeCompare(strB, 'ar')
        : strB.localeCompare(strA, 'ar');
    });
  }, [versions, filterStatus, searchTerm, sortKey, sortDirection]);

  if (isLoading && versions.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }}>
        <EmptyStandardsState
          title="جاري استرجاع سجل الإصدارات..."
          description="يتم الاتصال بقاعدة البيانات لجلب وثائق المعايير المعتمدة والمسودات."
        />
      </div>
    );
  }

  if (error && versions.length === 0) {
    return (
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <EmptyStandardsState
          title="تعذر تحميل سجل الإصدارات"
          description={error}
          isError={true}
          actionText="إعادة المحاولة"
          onAction={onRefresh}
        />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: '#ECFDF5',
            color: '#047857',
            border: '1px solid #A7F3D0',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
            }}
          />
          مُقرّ ونافذ للدورة الحالية
        </span>
      );
    }
    if (s === 'approved') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE',
          }}
        >
          <ShieldCheck size={12} color="#2563EB" />
          مُقرّ ومجدول للدورة القادمة
        </span>
      );
    }
    if (s === 'draft') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: '#FFFBEB',
            color: '#B45309',
            border: '1px solid #FDE68A',
          }}
        >
          <Clock size={12} color="#D97706" />
          مسودة قيد التحكيم والتطوير
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          backgroundColor: '#F1F5F9',
          color: '#475569',
          border: '1px solid #CBD5E1',
        }}
      >
        <Lock size={12} color="#64748B" />
        إصدار مؤرشف
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 1. Top Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '16px',
          borderBottom: '1px solid #E2E8F0',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#B45309',
                backgroundColor: '#FFFBEB',
                padding: '2px 10px',
                borderRadius: '9999px',
                border: '1px solid #FDE68A',
              }}
            >
              أمانة المعايير والمؤشرات الوطنية
            </span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: '#047857',
                fontWeight: 700,
                backgroundColor: '#ECFDF5',
                padding: '2px 10px',
                borderRadius: '9999px',
                border: '1px solid #A7F3D0',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              إصدار رسمي مُقرّ ونافذ
            </div>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            إدارة إصدارات وثيقة معايير التقييم والاعتماد المدرسي
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            السجل المركزي المعتمد لإصدارات الإطار الوطني المرجعي للتقويم المدرسي وضمان الجودة
          </p>
        </div>

        {/* Primary Action Button */}
        <div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 22px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#FFFFFF',
              background: 'linear-gradient(135deg, #D97706, #B45309)',
              borderRadius: '12px',
              boxShadow: '0 4px 14px rgba(217, 119, 6, 0.25)',
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <FilePlus size={16} />
            <span>+ إنشاء مسودة إصدار جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Three KPI Stat Cards Grid */}
      <div className="std-kpi-grid">
        {/* Card 1: Active Standard Version */}
        <div className="std-kpi-card">
          <div className="std-kpi-card-stripe" style={{ backgroundColor: '#10B981' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                الإصدار المُقرّ الحاكم للدورات الحالية
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {activeVersion?.versionNo ? `الإصدار الوطني (${activeVersion.versionNo})` : 'الإصدار الوطني (2026.1)'}
              </h3>
              <p style={{ fontSize: '12px', color: '#047857', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <ShieldCheck size={14} color="#059669" />
                <span>
                  مقفل برقم إقرار رسمي • مرتبط بـ {activeVersion?.uniqueSchoolsCount ?? activeVersion?.activeSchoolsCount ?? 0} مدرسة ({activeVersion?.evaluationCyclesCount ?? 0} دورة تقويم)
                </span>
              </p>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={24} />
            </div>
          </div>
        </div>

        {/* Card 2: Tree Hierarchy Components */}
        <div className="std-kpi-card">
          <div className="std-kpi-card-stripe" style={{ backgroundColor: '#F59E0B' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                مكونات الشجرة الهرمية النشطة
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                7 معايير • {activeVersion?.indicatorsCount || 109} مؤشراً
              </h3>
              <p style={{ fontSize: '12px', color: '#B45309', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <Layers size={14} color="#D97706" />
                <span>تتفرع إلى 56 عنصر تقييم بأدوات تحقق ملزمة</span>
              </p>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#FFFBEB',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Layers size={24} />
            </div>
          </div>
        </div>

        {/* Card 3: Drafts under review */}
        <div className="std-kpi-card">
          <div className="std-kpi-card-stripe" style={{ backgroundColor: '#3B82F6' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                مسودات قيد المراجعة والتطوير
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {draftVersionsCount > 0 ? `${draftVersionsCount} مسودة نشطة` : 'مسودة واحدة (دورة 2027)'}
              </h3>
              <p style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <Clock size={14} color="#3B82F6" />
                <span>غير مفعلة للمدارس حتى إقرار القفل النهائي</span>
              </p>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <GitFork size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Versions Data Table Card */}
      <div className="std-table-card">
        {/* Table Filter & Search Controls */}
        <div style={{ backgroundColor: '#FDFBF7', borderBottom: '1px solid #E2E8F0', padding: '16px 24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '12px',
            }}
          >
            {/* Search Input with Clear X */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '7px 12px',
                minWidth: '260px',
                flex: 1,
                maxWidth: '400px',
              }}
            >
              <Search size={15} color="#92400E" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="بحث برقم الإصدار، الجهة المصدرة، أو الوصف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  background: 'none',
                  outline: 'none',
                  fontSize: '12px',
                  color: '#0F172A',
                  width: '100%',
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  title="مسح البحث"
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Total Records Counter */}
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
              الإصدارات المعروضة: <span style={{ fontWeight: 800, color: '#92400E' }}>{filteredAndSortedVersions.length}</span> من أصل{' '}
              <span style={{ fontWeight: 800, color: '#0F172A' }}>{versions.length}</span>
            </div>
          </div>

          {/* Filter Status Tabs Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#78350F', marginLeft: '6px' }}>
              تصفية السجل:
            </span>
            {[
              { key: 'all', label: 'كافة الإصدارات', count: statusCounts.all },
              { key: 'active', label: 'النافذ للدورة الجارية', count: statusCounts.active },
              { key: 'approved', label: 'المُقرّ للدورة القادمة', count: statusCounts.approved },
              { key: 'draft', label: 'المسودات قيد التطوير', count: statusCounts.draft },
              { key: 'archived', label: 'الأرشيف', count: statusCounts.archived },
            ].map((tab) => {
              const isSelected = filterStatus === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterStatus(tab.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: isSelected ? 800 : 600,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: isSelected ? '1px solid #B45309' : '1px solid #CBD5E1',
                    backgroundColor: isSelected ? '#D97706' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#475569',
                    boxShadow: isSelected ? '0 2px 6px rgba(217, 119, 6, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '999px',
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.3)' : '#F1F5F9',
                      color: isSelected ? '#FFFFFF' : '#475569',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Filters Chips Bar */}
          {hasActiveFilters && (
            <div
              style={{
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#78350F', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Filter size={12} />
                  فلاتر نشطة:
                </span>
                {searchTerm.trim() && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FDE68A',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#92400E',
                    }}
                  >
                    بحث: "{searchTerm.trim()}"
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#92400E' }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                )}
                {filterStatus !== 'all' && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FDE68A',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#92400E',
                    }}
                  >
                    الحالة:{' '}
                    {filterStatus === 'active'
                      ? 'النافذ للدورة الجارية'
                      : filterStatus === 'approved'
                      ? 'المُقرّ للدورة القادمة'
                      : filterStatus === 'draft'
                      ? 'المسودات قيد التطوير'
                      : 'الأرشيف'}
                    <button
                      type="button"
                      onClick={() => setFilterStatus('all')}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#92400E' }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#DC2626',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                مسح الفلاتر
              </button>
            </div>
          )}
        </div>

        {/* Table Scroll Containment Wrapper (§4 UI_STANDARDS) */}
        <div className="std-table-wrapper">
          <table className="std-data-table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort('versionNo')}
                  style={{
                    width: '28%',
                    cursor: 'pointer',
                    userSelect: 'none',
                    backgroundColor: sortKey === 'versionNo' ? '#FEF3C7' : undefined,
                    color: sortKey === 'versionNo' ? '#92400E' : undefined,
                  }}
                  title="انقر للفرز بحسب كود وعنوان الإصدار"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>عنوان وكود الإصدار</span>
                    {renderSortIndicator('versionNo')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('issueDate')}
                  style={{
                    width: '16%',
                    cursor: 'pointer',
                    userSelect: 'none',
                    backgroundColor: sortKey === 'issueDate' ? '#FEF3C7' : undefined,
                    color: sortKey === 'issueDate' ? '#92400E' : undefined,
                  }}
                  title="انقر للفرز بحسب تاريخ القفل والإقرار"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>تاريخ القفل والإقرار</span>
                    {renderSortIndicator('issueDate')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('status')}
                  style={{
                    width: '16%',
                    cursor: 'pointer',
                    userSelect: 'none',
                    backgroundColor: sortKey === 'status' ? '#FEF3C7' : undefined,
                    color: sortKey === 'status' ? '#92400E' : undefined,
                  }}
                  title="انقر للفرز بحسب حالة الإصدار"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>حالة الإصدار</span>
                    {renderSortIndicator('status')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('standardsCount')}
                  style={{
                    width: '18%',
                    cursor: 'pointer',
                    userSelect: 'none',
                    backgroundColor: sortKey === 'standardsCount' ? '#FEF3C7' : undefined,
                    color: sortKey === 'standardsCount' ? '#92400E' : undefined,
                  }}
                  title="انقر للفرز بحسب عدد المعايير والمؤشرات"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>الهيكل التنظيمي</span>
                    {renderSortIndicator('standardsCount')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('activeSchoolsCount')}
                  style={{
                    width: '12%',
                    cursor: 'pointer',
                    userSelect: 'none',
                    backgroundColor: sortKey === 'activeSchoolsCount' ? '#FEF3C7' : undefined,
                    color: sortKey === 'activeSchoolsCount' ? '#92400E' : undefined,
                  }}
                  title="انقر للفرز بحسب عدد المدارس والدورات المرتبطة"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>الدورات المرتبطة</span>
                    {renderSortIndicator('activeSchoolsCount')}
                  </div>
                </th>

                <th style={{ width: '10%', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {filteredAndSortedVersions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center' }}>
                    <EmptyStandardsState
                      title="لا توجد إصدارات مطابقة للتصفية"
                      description="لم يتم العثور على وثائق معايير تطابق معيار التصفية المحدد."
                      onAction={() => {
                        setSearchTerm('');
                        setFilterStatus('all');
                      }}
                      actionText="إلغاء الفلاتر"
                    />
                  </td>
                </tr>
              ) : (
                filteredAndSortedVersions.map((v) => {
                  const isCurrentActive = v.status === 'Active' || v.status === 'active';
                  const isDraft = v.status === 'Draft' || v.status === 'draft';

                  return (
                    <tr key={v.versionId}>
                      {/* كود واسم الإصدار */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              fontWeight: 800,
                              flexShrink: 0,
                              backgroundColor: isCurrentActive ? '#ECFDF5' : isDraft ? '#FFFBEB' : '#F1F5F9',
                              color: isCurrentActive ? '#047857' : isDraft ? '#B45309' : '#475569',
                              border: isCurrentActive ? '1px solid #A7F3D0' : isDraft ? '1px solid #FDE68A' : '1px solid #CBD5E1',
                            }}
                          >
                            {String(v.versionNo).slice(0, 4)}
                          </div>
                          <div>
                            <span style={{ fontWeight: 800, color: '#0F172A', display: 'block', fontSize: '13px' }}>
                              وثيقة المعايير الوطنية ({v.versionNo})
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                              {v.sourceNumber || v.sourceOrganization || 'مجلس الاعتماد الأكاديمي'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* تاريخ القفل */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '12px' }}>
                          <Calendar size={14} color="#94A3B8" />
                          <span>{v.issueDate ? String(v.issueDate).slice(0, 10) : '2026-01-01'}</span>
                        </div>
                      </td>

                      {/* الحالة */}
                      <td>{getStatusBadge(v.status)}</td>

                      {/* الهيكل التنظيمي */}
                      <td>
                        <div>
                          <span style={{ fontWeight: 700, color: '#1E293B', display: 'block', fontSize: '12px' }}>
                            {v.standardsCount || 7} معايير رئيسية
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            {v.indicatorsCount || 109} مؤشراً • وزن {v.totalWeight || 100}%
                          </span>
                        </div>
                      </td>

                      {/* الدورات المرتبطة */}
                      <td>
                        {(v.evaluationCyclesCount && v.evaluationCyclesCount > 0) || (v.uniqueSchoolsCount && v.uniqueSchoolsCount > 0) || isCurrentActive ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: '#047857', fontWeight: 600, fontSize: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Building2 size={14} />
                              <span>{v.uniqueSchoolsCount ?? v.activeSchoolsCount ?? 0} مدرسة نشطة</span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                              {v.evaluationCyclesCount ?? 0} دورة تقويم
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12px' }}>غير مرتبط بدورات</span>
                        )}
                      </td>

                      {/* الإجراءات المتاحة */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setCloneSourceId(v.versionId);
                              setIsCreateModalOpen(true);
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#F0FDF4',
                              color: '#15803D',
                              border: '1px solid #BBF7D0',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title={`استنساخ مسودة جديدة مبنية على الإصدار (${v.versionNo})`}
                          >
                            <Copy size={13} />
                            <span>استنساخ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onNavigateToTree(v.versionId)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#FFFBEB',
                              color: '#B45309',
                              border: '1px solid #FDE68A',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="استعراض وتعديل الشجرة المعيارية"
                          >
                            <GitFork size={13} />
                            <span>الشجرة</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onNavigateToWeights(v.versionId)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#F8FAFC',
                              color: '#334155',
                              border: '1px solid #CBD5E1',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="معايرة الأوزان وسلالم التقدير"
                          >
                            <Scale size={13} />
                            <span>الأوزان</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onNavigateToLock(v.versionId)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: isCurrentActive ? '#ECFDF5' : '#FEF3C7',
                              color: isCurrentActive ? '#047857' : '#92400E',
                              border: isCurrentActive ? '1px solid #A7F3D0' : '1px solid #FCD34D',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="التدقيق والقفل الرسمي"
                          >
                            <ShieldCheck size={13} />
                            <span>{isCurrentActive ? 'الشهادة' : 'القفل'}</span>
                          </button>

                          {isDraft && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTargetVersion(v);
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title={`حذف مسودة الإصدار (${v.versionNo}) نهائياً`}
                            >
                              <Trash2 size={13} />
                              <span>حذف المسودة</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Immutable Governance Rules Callout (§1 UI_STANDARDS) */}
      <VersionRuleCallout />

      {/* 5. Bottom Actions Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
          <History size={16} color="#D97706" />
          <span>سجل التغييرات وحوكمة الوثائق يخضعان لرقابة مجلس الاعتماد الأكاديمي والوزارة.</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => onNavigateToTree(activeVersion?.versionId)}
            className="std-btn-primary"
          >
            <span>الانتقال لبناء وتعديل الشجرة</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Create Draft Modal */}
      {isCreateModalOpen && (
        <CreateDraftModal
          isOpen={isCreateModalOpen}
          activeVersions={versions}
          initialCloneId={cloneSourceId}
          onClose={() => {
            setIsCreateModalOpen(false);
            setCloneSourceId(undefined);
          }}
          onSubmit={async (payload) => {
            await onCreateDraft(payload);
            setIsCreateModalOpen(false);
            setCloneSourceId(undefined);
          }}
        />
      )}

      {/* Delete Draft Confirmation Modal */}
      {deleteTargetVersion && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              direction: 'rtl',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  تأكيد حذف مسودة الإصدار
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
                  الإصدار رقم: <strong>{deleteTargetVersion.versionNo}</strong>
                </p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '20px' }}>
              هل أنت متأكد من رغبتك في حذف مسودة هذا الإصدار نهائياً؟
              سيؤدي هذا الإجراء إلى حذف جميع المعايير والمؤشرات والواصفات التابعة له ولا يمكن التراجع عن هذا الإجراء.
            </p>

            {deleteError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTargetVersion(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                <span>{isDeleting ? 'جارٍ الحذف...' : 'تأكيد الحذف نهائياً'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
