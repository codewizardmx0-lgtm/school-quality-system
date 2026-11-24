/**
 * Screen 2: Standards Tree Builder
 * بناء وهيكلة الشجرة المعيارية والمؤشرات وعناصر التقييم
 * يدعم إضافة وتعديل وحذف المعايير الرئيسية والفرعية، وفتح نافذة تحرير المؤشر التفاعلية
 */

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  BookmarkPlus,
  Lock,
  FileCheck,
} from 'lucide-react';
import type { StandardNode, SubStandardNode, IndicatorNode, RubricLevelInfo } from '../../api/standardsTypes';
import { standardsApi } from '../../api/standardsApi';
import { StandardsTreeView } from './StandardsTreeView';
import { IndicatorEditorModal } from './IndicatorEditorModal';
import { AddStandardModal } from './AddStandardModal';
import { EditStandardModal } from './EditStandardModal';
import { AddSubStandardModal } from './AddSubStandardModal';
import { EditSubStandardModal } from './EditSubStandardModal';
import { AddIndicatorModal } from './AddIndicatorModal';
import { VerificationToolsManagerModal } from './VerificationToolsManagerModal';
import { RubricLevelsGuide } from '../weights-rubrics/RubricLevelsGuide';
import { useStandardsTree } from '../../hooks/useStandardsTree';
import { exportStandardsTreeToExcel } from '../../utils/standardsExportUtils';
import { countAllIndicators, countAllSubStandards } from '../../utils/treeCalculators';

interface StandardsTreeBuilderPageProps {
  versionId?: number | string;
  onNavigateToVersions: () => void;
  onNavigateToWeights: (versionId?: number | string) => void;
}

export const StandardsTreeBuilderPage: React.FC<StandardsTreeBuilderPageProps> = ({
  versionId = 1,
  onNavigateToVersions,
  onNavigateToWeights,
}) => {
  const {
    treeData,
    isDraft,
    selectedStandard,
    selectedSubStandard,
    selectedIndicator,
    isSaving,
    refetch,
    selectIndicator,
    addStandard,
    updateStandard,
    deleteStandard,
    addSubStandard,
    updateSubStandard,
    deleteSubStandard,
    addIndicator,
    updateIndicator,
    deleteIndicator,
    addEvidenceRequirement,
    updateEvidenceRequirement,
    deleteEvidenceRequirement,
    updateScoreDescriptors,
  } = useStandardsTree(versionId);

  // Modals state
  const [isAddStdModalOpen, setIsAddStdModalOpen] = useState(false);
  const [isEditStdModalOpen, setIsEditStdModalOpen] = useState(false);
  const [editingStandard, setEditingStandard] = useState<StandardNode | null>(null);

  const [isAddSubModalOpen, setIsAddSubModalOpen] = useState(false);
  const [isEditSubModalOpen, setIsEditSubModalOpen] = useState(false);
  const [editingSubStandard, setEditingSubStandard] = useState<SubStandardNode | null>(null);
  const [editingSubParentName, setEditingSubParentName] = useState<string>('');

  const [isAddIndModalOpen, setIsAddIndModalOpen] = useState(false);
  const [modalTargetStd, setModalTargetStd] = useState<StandardNode | null>(null);
  const [modalTargetSub, setModalTargetSub] = useState<SubStandardNode | null>(null);

  const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);
  const [isToolsManagerOpen, setIsToolsManagerOpen] = useState(false);
  const [rubricLevels, setRubricLevels] = useState<RubricLevelInfo[]>([]);

  useEffect(() => {
    if (versionId) {
      standardsApi.getScoreLevels(versionId).then((levels) => {
        if (levels && levels.length > 0) {
          setRubricLevels(levels);
        }
      }).catch(() => {});
    }
  }, [versionId]);

  const standards = treeData?.standards || [];
  const totalSubStandards = countAllSubStandards(standards);
  const totalIndicators = countAllIndicators(standards);

  const handleOpenAddSub = (std?: StandardNode) => {
    const target = std || selectedStandard || standards[0];
    if (target) {
      setModalTargetStd(target);
      setIsAddSubModalOpen(true);
    }
  };

  const handleOpenAddIndicator = (sub?: SubStandardNode, std?: StandardNode) => {
    const targetStd = std || selectedStandard || standards[0];
    const targetSub = sub || selectedSubStandard || targetStd?.subStandards?.[0];
    if (targetSub && targetStd) {
      setModalTargetStd(targetStd);
      setModalTargetSub(targetSub);
      setIsAddIndModalOpen(true);
    }
  };

  const handleOpenEditStandard = (std: StandardNode) => {
    setEditingStandard(std);
    setIsEditStdModalOpen(true);
  };

  const handleOpenEditSubStandard = (sub: SubStandardNode, std: StandardNode) => {
    setEditingSubStandard(sub);
    setEditingSubParentName(std.name);
    setIsEditSubModalOpen(true);
  };

  const handleSelectIndicator = (
    ind: IndicatorNode,
    sub: SubStandardNode,
    std: StandardNode
  ) => {
    selectIndicator(ind, sub, std);
    setIsIndicatorModalOpen(true);
  };

  const handleExportExcel = () => {
    if (treeData) {
      exportStandardsTreeToExcel(treeData, {
        versionNo: treeData.versionNo,
        versionName: treeData.versionName,
        status: treeData.status,
      });
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 1. Context Bar */}
      <div
        style={{
          background: 'linear-gradient(135deg, #D97706, #92400E)',
          color: '#FFFFFF',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 4px 14px rgba(217, 119, 6, 0.2)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              بيئة تحرير وهيكلة المعايير
            </span>
            <span style={{ fontSize: '12px', color: '#FDE68A' }}>
              {treeData?.versionNo ? `الإصدار: ${treeData.versionNo}` : 'وثيقة المعايير الوطنية'}
            </span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
            {isDraft
              ? `المسودة المستهدفة: وثيقة المعايير الوطنية لتقويم الجودة المدرسية (${treeData?.versionNo || 'مسودة'})`
              : `${treeData?.versionName || 'وثيقة المعايير الوطنية لتقويم الجودة المدرسية'} (${treeData?.versionNo || ''})`}
          </h2>
          <p style={{ fontSize: '12px', color: '#FEF3C7', margin: '4px 0 0' }}>
            ({standards.length} معايير رئيسية • {totalSubStandards || 14} معياراً فرعياً • {totalIndicators || 109} مؤشراً معتمداً بأدوات تحقق ملزمة)
          </p>
        </div>

        {/* Toolbar Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {isDraft && (
            <button
              type="button"
              onClick={() => setIsAddStdModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#92400E',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                transition: 'all 0.15s ease',
              }}
            >
              <BookmarkPlus size={15} color="#92400E" />
              <span>+ إضافة معيار رئيسي</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsToolsManagerOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#FFFFFF',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <FileCheck size={15} color="#FEF3C7" />
            <span>إدارة أدوات التحقق</span>
          </button>
          {!isDraft && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: 'rgba(0,0,0,0.15)',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#FEF3C7',
              }}
            >
              <Lock size={14} />
              <span>إصدار مُقرّ ونافذ (عرض فقط)</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive Standards Tree View */}
      <StandardsTreeView
        standards={standards}
        selectedIndicatorId={selectedIndicator?.indicatorId}
        isDraft={isDraft}
        onSelectIndicator={handleSelectIndicator}
        onAddSubStandard={handleOpenAddSub}
        onAddIndicator={handleOpenAddIndicator}
        onEditStandard={handleOpenEditStandard}
        onDeleteStandard={(std) => deleteStandard(std.standardId)}
        onEditSubStandard={handleOpenEditSubStandard}
        onDeleteSubStandard={(sub) => deleteSubStandard(sub.subStandardId)}
      />


      {/* Rubric Levels Guide (0-3) */}
      <RubricLevelsGuide levels={rubricLevels} />

      {/* 3. Bottom Actions Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onNavigateToVersions}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#475569',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            <ArrowRight size={14} />
            <span>العودة لسجل الإصدارات</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#065F46',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            <FileSpreadsheet size={14} />
            <span>تصدير الشجرة (.xlsx)</span>
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => onNavigateToWeights(versionId)}
            className="std-btn-primary"
          >
            <span>الانتقال لمعايرة الأوزان (100%)</span>
            <ArrowLeft size={14} />
          </button>
        </div>
      </div>

      {/* Indicator Modal */}
      {isIndicatorModalOpen && selectedIndicator && (
        <IndicatorEditorModal
          isOpen={isIndicatorModalOpen}
          indicator={selectedIndicator}
          standardName={selectedStandard?.name}
          subStandardName={selectedSubStandard?.name}
          isDraft={isDraft}
          isSaving={isSaving}
          onClose={() => setIsIndicatorModalOpen(false)}
          onSave={async (id, payload) => {
            await updateIndicator(id, payload);
          }}
          onDelete={async (id) => {
            await deleteIndicator(id);
            setIsIndicatorModalOpen(false);
          }}
          onAddEvidenceRequirement={addEvidenceRequirement}
          onUpdateEvidenceRequirement={updateEvidenceRequirement}
          onDeleteEvidenceRequirement={deleteEvidenceRequirement}
          onUpdateScoreDescriptors={updateScoreDescriptors}
        />
      )}

      {/* Main Standard Modals */}
      {isAddStdModalOpen && (
        <AddStandardModal
          isOpen={isAddStdModalOpen}
          onClose={() => setIsAddStdModalOpen(false)}
          onSubmit={async (payload) => {
            await addStandard(payload);
            setIsAddStdModalOpen(false);
          }}
        />
      )}

      {isEditStdModalOpen && editingStandard && (
        <EditStandardModal
          isOpen={isEditStdModalOpen}
          standard={editingStandard}
          onClose={() => {
            setIsEditStdModalOpen(false);
            setEditingStandard(null);
          }}
          onSubmit={async (stdId, payload) => {
            await updateStandard(stdId, payload);
            setIsEditStdModalOpen(false);
            setEditingStandard(null);
          }}
        />
      )}

      {/* SubStandard Modals */}
      {isAddSubModalOpen && modalTargetStd && (
        <AddSubStandardModal
          isOpen={isAddSubModalOpen}
          standardName={modalTargetStd.name}
          standardId={modalTargetStd.standardId}
          onClose={() => setIsAddSubModalOpen(false)}
          onSubmit={async (stdId, payload) => {
            await addSubStandard(stdId, payload);
            setIsAddSubModalOpen(false);
          }}
        />
      )}

      {isEditSubModalOpen && editingSubStandard && (
        <EditSubStandardModal
          isOpen={isEditSubModalOpen}
          subStandard={editingSubStandard}
          standardName={editingSubParentName}
          onClose={() => {
            setIsEditSubModalOpen(false);
            setEditingSubStandard(null);
          }}
          onSubmit={async (subId, payload) => {
            await updateSubStandard(subId, payload);
            setIsEditSubModalOpen(false);
            setEditingSubStandard(null);
          }}
        />
      )}

      {/* Indicator Add Modal */}
      {isAddIndModalOpen && modalTargetSub && (
        <AddIndicatorModal
          isOpen={isAddIndModalOpen}
          subStandardName={modalTargetSub.name}
          subStandardId={modalTargetSub.subStandardId}
          onClose={() => setIsAddIndModalOpen(false)}
          onSubmit={async (subId, payload) => {
            await addIndicator(subId, payload);
            setIsAddIndModalOpen(false);
          }}
        />
      )}

      {/* Verification Tools Manager Modal */}
      {isToolsManagerOpen && (
        <VerificationToolsManagerModal
          isOpen={isToolsManagerOpen}
          onClose={() => setIsToolsManagerOpen(false)}
          onToolsUpdated={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
};
