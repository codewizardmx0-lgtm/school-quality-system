/**
 * Component: StandardVersionWorkspacePage
 * الشاشة الموحدة لبيئة عمل وتطوير إصدار المعايير
 * تجمع التبويبات الثلاثة الأساسية في بيئة واحدة متكاملة:
 * 1. بناء وهيكلة الشجرة (Tree Builder)
 * 2. معايرة وتوزيع الأوزان (Weights Calibration)
 * 3. تدقيق وقفل الإقرار الرسمي (Audit & Lock Seal)
 *
 * تتضمن محدد إصدار علوي مع قائمة منسدلة وزر بارز لإنشاء مسودة إصدار جديد
 */

import React, { useState, useEffect } from 'react';
import {
  GitFork,
  Scale,
  ShieldCheck,
  PlusCircle,
  BookOpen,
  ChevronDown,
  Edit3,
  Archive,
  ArrowRight,
} from 'lucide-react';
import { useStandardsVersions } from '../../hooks/useStandardsVersions';
import { StandardsTreeBuilderPage } from '../tree-builder/StandardsTreeBuilderPage';
import { StandardsWeightsRubricsPage } from '../weights-rubrics/StandardsWeightsRubricsPage';
import { VersionAuditLockPage } from '../audit-lock/VersionAuditLockPage';
import { CreateDraftModal } from '../versions/CreateDraftModal';

export type WorkspaceTabKey = 'tree' | 'weights' | 'audit-lock';

interface StandardVersionWorkspacePageProps {
  initialVersionId?: number;
  initialTab?: WorkspaceTabKey;
  onNavigateToVersions: () => void;
}

export const StandardVersionWorkspacePage: React.FC<StandardVersionWorkspacePageProps> = ({
  initialVersionId,
  initialTab = 'tree',
  onNavigateToVersions,
}) => {
  const {
    versions,
    activeVersion,
    isLoading: isVersionsLoading,
    refetch: refetchVersions,
    createDraft,
  } = useStandardsVersions();

  const [activeTab, setActiveTab] = useState<WorkspaceTabKey>(initialTab);
  const [selectedVersionId, setSelectedVersionId] = useState<number | undefined>(
    initialVersionId || activeVersion?.versionId
  );
  const [isCreateDraftOpen, setIsCreateDraftOpen] = useState(false);
  const [isWeightsDirty, setIsWeightsDirty] = useState(false);

  // Sync selectedVersionId when activeVersion loads if not yet set
  useEffect(() => {
    if (!selectedVersionId && activeVersion) {
      setSelectedVersionId(activeVersion.versionId);
    } else if (!selectedVersionId && versions.length > 0) {
      setSelectedVersionId(versions[0].versionId);
    }
  }, [activeVersion, versions, selectedVersionId]);

  // Find currently selected version details
  const currentVersion = versions.find((v) => v.versionId === selectedVersionId) || activeVersion || versions[0];
  const currentStatus = currentVersion?.status?.toLowerCase() || '';
  const isActive = currentStatus === 'active';
  const isApproved = currentStatus === 'approved';
  const isDraft = currentStatus === 'draft';
  const isArchived = currentStatus === 'archived' || (!isActive && !isApproved && !isDraft);

  const handleSelectVersionSafe = (versionId: number) => {
    if (isWeightsDirty) {
      const proceed = window.confirm(
        'تنبيه: لديك تعديلات غير محفوظة في أوزان المعايير والمؤشرات.\nهل تريد المتابعة دون حفظ؟\n\n(موافق = المتابعة دون حفظ، إلغاء = البقاء لحفظ التعديلات)'
      );
      if (!proceed) return;
      setIsWeightsDirty(false);
    }
    setSelectedVersionId(versionId);
  };

  const handleTabSwitch = (newTab: WorkspaceTabKey) => {
    if (activeTab === 'weights' && isWeightsDirty && newTab !== 'weights') {
      const proceed = window.confirm(
        'تنبيه: لديك تعديلات غير محفوظة في أوزان المعايير والمؤشرات.\nهل تريد المتابعة دون حفظ؟\n\n(موافق = المتابعة دون حفظ، إلغاء = البقاء لحفظ التعديلات)'
      );
      if (!proceed) return;
      setIsWeightsDirty(false);
    }
    setActiveTab(newTab);
  };

  const handleNavigateToVersionsSafe = () => {
    if (isWeightsDirty) {
      const proceed = window.confirm(
        'تنبيه: لديك تعديلات غير محفوظة في أوزان المعايير والمؤشرات.\nهل تريد المتابعة دون حفظ؟\n\n(موافق = المتابعة دون حفظ، إلغاء = البقاء لحفظ التعديلات)'
      );
      if (!proceed) return;
      setIsWeightsDirty(false);
    }
    onNavigateToVersions();
  };

  const handleCreateDraftSuccess = async (payload: any) => {
    const created = await createDraft(payload);
    await refetchVersions();
    if (created?.versionId) {
      setSelectedVersionId(created.versionId);
    }
    setIsCreateDraftOpen(false);
    setActiveTab('tree');
  };

  return (
    <div className="w-full max-w-[1360px] mx-auto space-y-6 text-right">
      {/* 1. Master Workspace Top Bar (Version Selector + Create CTA + Quick Switch) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Breadcrumbs & Version Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <button
                type="button"
                onClick={handleNavigateToVersionsSafe}
                className="hover:text-amber-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>سجل وثائق المعايير</span>
              </button>
              <span>/</span>
              <span className="text-amber-800 font-bold">بيئة عمل الإصدار الموحدة</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-extrabold text-slate-900">
                الإصدار المختار في بيئة العمل:
              </span>

              {/* Version Selector Dropdown */}
              <div className="relative inline-block">
                <select
                  value={currentVersion?.versionId || ''}
                  onChange={(e) => handleSelectVersionSafe(Number(e.target.value))}
                  disabled={isVersionsLoading || versions.length === 0}
                  className="appearance-none bg-amber-50/70 hover:bg-amber-100/70 text-amber-950 font-black text-sm px-4 py-2 pl-9 rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer transition-all shadow-sm"
                >
                  {versions.map((ver) => {
                    const st = ver.status?.toLowerCase();
                    const label =
                      st === 'active'
                        ? 'مُقرّ ونافذ حاكم للدورة الجارية'
                        : st === 'approved'
                        ? 'مُقرّ ومجدول للدورة القادمة'
                        : st === 'draft'
                        ? 'مسودة قيد التطوير'
                        : 'إصدار سابق مؤرشف';
                    return (
                      <option key={ver.versionId} value={ver.versionId}>
                        الإصدار {ver.versionNo} — {label}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-4 h-4 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Status Pill Badge */}
              {isActive && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>مُقرّ ونافذ حاكم للدورة الجارية (للقراءة فقط)</span>
                </span>
              )}

              {isApproved && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>مُقرّ ومجدول للدورة القادمة (للقراءة فقط)</span>
                </span>
              )}

              {isDraft && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>مسودة قيد التعديل والتطوير</span>
                </span>
              )}

              {isArchived && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <Archive className="w-3.5 h-3.5" />
                  <span>نسخة سابقة مؤرشفة</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Primary Action Button ("+ إنشاء مسودة إصدار جديد") */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleNavigateToVersionsSafe}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            title="الانتقال لعرض خط الزمن والمقارنات"
          >
            <ArrowRight className="w-4 h-4" />
            <span>عرض سجل الإصدارات</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateDraftOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-xl shadow-md shadow-amber-600/20 transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ إنشاء مسودة إصدار جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Workspace Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-1.5 flex items-center justify-between gap-1 overflow-x-auto text-xs font-bold">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Tab 1: Tree Builder */}
          <button
            type="button"
            onClick={() => handleTabSwitch('tree')}
            className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl transition-all cursor-pointer flex-1 whitespace-nowrap ${
              activeTab === 'tree'
                ? 'bg-amber-600 text-white font-black shadow-md shadow-amber-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <GitFork className="w-4 h-4" />
            <span>1. بناء وهيكلة الشجرة (Tree Builder)</span>
          </button>

          {/* Tab 2: Weights Calibration */}
          <button
            type="button"
            onClick={() => handleTabSwitch('weights')}
            className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl transition-all cursor-pointer flex-1 whitespace-nowrap ${
              activeTab === 'weights'
                ? 'bg-amber-600 text-white font-black shadow-md shadow-amber-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>2. معايرة وتوزيع الأوزان (Weights Calibration)</span>
            {isWeightsDirty && (
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse mr-1" title="تعديلات غير محفوظة" />
            )}
          </button>

          {/* Tab 3: Audit & Lock Seal */}
          <button
            type="button"
            onClick={() => handleTabSwitch('audit-lock')}
            className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl transition-all cursor-pointer flex-1 whitespace-nowrap ${
              activeTab === 'audit-lock'
                ? 'bg-amber-600 text-white font-black shadow-md shadow-amber-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>3. تدقيق وقفل الإقرار (Audit & Lock Seal)</span>
          </button>
        </div>
      </div>

      {/* 3. Tab Contents with Dynamic Version Binding */}
      <div className="pt-2">
        {activeTab === 'tree' && (
          <StandardsTreeBuilderPage
            key={`tree-${currentVersion?.versionId}`}
            versionId={currentVersion?.versionId}
            onNavigateToVersions={handleNavigateToVersionsSafe}
            onNavigateToWeights={() => handleTabSwitch('weights')}
          />
        )}

        {activeTab === 'weights' && (
          <StandardsWeightsRubricsPage
            key={`weights-${currentVersion?.versionId}`}
            versionId={currentVersion?.versionId}
            onNavigateToTree={() => handleTabSwitch('tree')}
            onNavigateToLock={() => handleTabSwitch('audit-lock')}
            onDirtyChange={setIsWeightsDirty}
          />
        )}

        {activeTab === 'audit-lock' && (
          <VersionAuditLockPage
            key={`lock-${currentVersion?.versionId}`}
            versionId={currentVersion?.versionId}
            onNavigateToWeights={() => handleTabSwitch('weights')}
            onNavigateToVersions={handleNavigateToVersionsSafe}
          />
        )}
      </div>

      {/* Create Draft Modal */}
      {isCreateDraftOpen && (
        <CreateDraftModal
          isOpen={isCreateDraftOpen}
          activeVersions={versions}
          onClose={() => setIsCreateDraftOpen(false)}
          onSubmit={handleCreateDraftSuccess}
        />
      )}
    </div>
  );
};
