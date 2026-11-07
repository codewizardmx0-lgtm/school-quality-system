/**
 * Screen 2: Standards Tree Builder (Stacked Vertical Layout - تحت بعض)
 * بناء وهيكلة الشجرة المعيارية والمؤشرات وعناصر التقييم
 * تم التنسيق عمودياً (تحت بعض) ليتسع العرض الكامل لكل من الشجرة والمحرر
 */

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  FolderPlus,
  PlusCircle,
  Layers,
  Edit3,
} from 'lucide-react';
import type { StandardNode, SubStandardNode } from '../../api/standardsTypes';
import { StandardsTreeView } from './StandardsTreeView';
import { IndicatorEditorPanel } from './IndicatorEditorPanel';
import { AddSubStandardModal } from './AddSubStandardModal';
import { AddIndicatorModal } from './AddIndicatorModal';
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
    selectedStandard,
    selectedSubStandard,
    selectedIndicator,
    isSaving,
    saveStatus,
    selectIndicator,
    updateIndicator,
    addSubStandard,
    addIndicator,
    deleteIndicator,
  } = useStandardsTree(versionId);

  // Modals state
  const [isAddSubModalOpen, setIsAddSubModalOpen] = useState(false);
  const [isAddIndModalOpen, setIsAddIndModalOpen] = useState(false);
  const [modalTargetStd, setModalTargetStd] = useState<StandardNode | null>(null);
  const [modalTargetSub, setModalTargetSub] = useState<SubStandardNode | null>(null);

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

  const handleExportExcel = () => {
    if (treeData) {
      exportStandardsTreeToExcel(treeData);
    }
  };

  const handleSelectIndicatorAndScroll = (
    ind: any,
    sub: SubStandardNode,
    std: StandardNode
  ) => {
    selectIndicator(ind, sub, std);
    // Smooth scroll down to the editor panel
    const editorEl = document.getElementById('indicator-editor-section');
    if (editorEl) {
      editorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            المسودة المستهدفة: وثيقة معايير التقييم والاعتماد المدرسي المطورة
          </h2>
          <p style={{ fontSize: '12px', color: '#FEF3C7', margin: '4px 0 0' }}>
            (7 معايير رئيسية • {totalSubStandards || 24} مجالاً فرعياً • {totalIndicators || 109} مؤشرات معتمدة بأدوات تحقق ملزمة)
          </p>
        </div>

        {/* Toolbar Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => handleOpenAddSub()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#451A03',
              backgroundColor: '#FEF3C7',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <FolderPlus size={15} color="#92400E" />
            <span>+ إضافة معيار فرعي</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddIndicator()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#451A03',
              backgroundColor: '#FEF3C7',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <PlusCircle size={15} color="#92400E" />
            <span>+ إضافة مؤشر رسمي</span>
          </button>
        </div>
      </div>

      {/* 2. القسم الأول (في الأعلى): شجرة المعايير بكامل العرض */}
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: '#FFFBEB',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                1. الشجرة الهرمية للمعايير والمؤشرات (اختر مؤشراً لتعديله في الأسفل)
              </h3>
            </div>
          </div>

          {selectedIndicator && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#B45309',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                padding: '4px 12px',
                borderRadius: '8px',
              }}
            >
              <Edit3 size={13} />
              <span>المؤشر المحدد حالياً: {selectedIndicator.code}</span>
            </div>
          )}
        </div>

        <StandardsTreeView
          standards={standards}
          selectedIndicatorId={selectedIndicator?.indicatorId}
          onSelectIndicator={handleSelectIndicatorAndScroll}
          onAddSubStandard={(std) => handleOpenAddSub(std)}
          onAddIndicator={(sub, std) => handleOpenAddIndicator(sub, std)}
        />
      </div>

      {/* 3. القسم الثاني (في الأسفل): لوحة محرر بيانات المؤشر المختار بكامل العرض */}
      <div id="indicator-editor-section" style={{ width: '100%', scrollMarginTop: '80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Edit3 size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              2. لوحة تحرير وتفصيل المؤشر المختار
            </h3>
          </div>
        </div>

        <IndicatorEditorPanel
          indicator={selectedIndicator}
          standardName={selectedStandard?.name}
          subStandardName={selectedSubStandard?.name}
          isSaving={isSaving}
          saveStatus={saveStatus}
          onSave={updateIndicator}
          onDelete={deleteIndicator}
        />
      </div>

      {/* 4. Bottom Actions Bar */}
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

      {/* Modals */}
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
    </div>
  );
};
