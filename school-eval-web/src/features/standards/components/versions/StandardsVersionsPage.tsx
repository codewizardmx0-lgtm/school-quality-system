/**
 * Screen 1: Standards Versions Registry
 * إدارة إصدارات وثيقة معايير التقييم والاعتماد المدرسي
 * متوافقة مع كافة بنود UI_STANDARDS.md وتصميم Figma المعتمد
 */

import React, { useState } from 'react';
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
} from 'lucide-react';
import type { StandardVersionSummary } from '../../api/standardsTypes';
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
  onNavigateToTree: (versionId?: number) => void;
  onNavigateToWeights: (versionId?: number) => void;
  onNavigateToLock: (versionId?: number) => void;
}

export const StandardsVersionsPage: React.FC<StandardsVersionsPageProps> = ({
  versions,
  activeVersion,
  isLoading,
  error,
  onRefresh,
  onCreateDraft,
  onNavigateToTree,
  onNavigateToWeights,
  onNavigateToLock,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const draftVersionsCount = versions.filter((v) => v.status === 'Draft' || v.status === 'draft').length;

  const filteredVersions = versions.filter((v) => {
    if (filterStatus === 'all') return true;
    return v.status.toLowerCase() === filterStatus.toLowerCase();
  });

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
          نشط وحاكم للدورات
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
              أمانة المعايير ومجلس الاعتماد الأكاديمي
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
              إصدار رسمي نشط ومقفل
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
                الإصدار المعتمد الحاكم للدورات الحالية
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {activeVersion?.versionNo ? `الإصدار الوطني (${activeVersion.versionNo})` : 'الإصدار الوطني (2026.1)'}
              </h3>
              <p style={{ fontSize: '12px', color: '#047857', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <ShieldCheck size={14} color="#059669" />
                <span>مقفل برقم اعتماد رسمي • مرتبط بـ {activeVersion?.activeSchoolsCount || 48} مدرسة</span>
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
                <span>غير مفعلة للمدارس حتى اعتماد القفل النهائي</span>
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
        {/* Table Filter Tabs Bar */}
        <div className="std-table-filter-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginLeft: '6px' }}>
              تصفية السجل:
            </span>
            {[
              { key: 'all', label: 'كافة الإصدارات' },
              { key: 'active', label: 'الإصدار المعتمد' },
              { key: 'draft', label: 'المسودات' },
              { key: 'archived', label: 'الأرشيف' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: filterStatus === tab.key ? 'none' : '1px solid #CBD5E1',
                  backgroundColor: filterStatus === tab.key ? '#D97706' : '#FFFFFF',
                  color: filterStatus === tab.key ? '#FFFFFF' : '#475569',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
            إجمالي السجلات: <span style={{ fontWeight: 800, color: '#0F172A' }}>{filteredVersions.length}</span>
          </div>
        </div>

        {/* Table Scroll Containment Wrapper (§4 UI_STANDARDS) */}
        <div className="std-table-wrapper">
          <table className="std-data-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>عنوان وكود الإصدار</th>
                <th style={{ width: '16%' }}>تاريخ القفل والاعتماد</th>
                <th style={{ width: '16%' }}>حالة الإصدار</th>
                <th style={{ width: '18%' }}>الهيكل التنظيمي</th>
                <th style={{ width: '12%' }}>الدورات المرتبطة</th>
                <th style={{ width: '10%', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {filteredVersions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center' }}>
                    <EmptyStandardsState
                      title="لا توجد إصدارات مطابقة للتصفية"
                      description="لم يتم العثور على وثائق معايير تطابق معيار التصفية المحدد."
                      onAction={onRefresh}
                      actionText="إعادة تحميل القائمة"
                    />
                  </td>
                </tr>
              ) : (
                filteredVersions.map((v) => {
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
                        {isCurrentActive ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#047857', fontWeight: 600, fontSize: '12px' }}>
                            <Building2 size={14} />
                            <span>{v.activeSchoolsCount || 48} مدرسة نشطة</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12px' }}>غير مرتبطة</span>
                        )}
                      </td>

                      {/* الإجراءات المتاحة */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
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
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={async (payload) => {
            await onCreateDraft(payload);
            setIsCreateModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
