import { exportToExcel, formatExportFilename } from '../../../admin/utils/exportUtils';
import React, { useState, useEffect } from 'react';
import { useEvidences } from '../../hooks/useEvidences';
import { evaluatorApi } from '../../api/evaluatorApi';
import { EvidenceCard } from './EvidenceCard';
import { LinkEvidenceModal } from './LinkEvidenceModal';
import { EditEvidenceMetadataModal } from './EditEvidenceMetadataModal';
import { EvidenceInventoryPage } from './EvidenceInventoryPage';
import { useToast } from '../../../admin/components/common/useToast';
import { ToastNotification } from '../../../admin/components/common/ToastNotification';
import { UploadEvidenceModal } from './UploadEvidenceModal';
import { DocumentVersionsModal } from './DocumentVersionsModal';
import { OldEvidenceVersionsView } from './OldEvidenceVersionsView';
import { useAuth } from '../../../auth/AuthContext';
import type { EvidenceItem, EvaluatorScreen } from '../../api/evaluationTypes';
import {
  FolderLock,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  UploadCloud,
  Search,
  Download,
  FileText,
  Table as TableIcon,
  LayoutGrid,
  Link2,
  Pencil,
  RefreshCw,
  ExternalLink,
  History,
} from 'lucide-react';

interface EvidencesRepositoryProps {
  onNavigate?: (screen: EvaluatorScreen, param?: number) => void;
  readOnly?: boolean;
}

export const EvidencesRepository: React.FC<EvidencesRepositoryProps> = ({
  readOnly = false,
  onNavigate,
}) => {
  const {
    evidences,
    vaultStats,
    selectedStandardFilter,
    setSelectedStandardFilter,
    selectedFormatFilter,
    setSelectedFormatFilter,
    isUploading,
    uploadProgress,
    fetchEvidences,
    uploadEvidenceFile,
    versionsArchive,
    isLoadingArchive,
    fetchVersionsArchive,
    pruneVersionFile,
  } = useEvidences();

  const [searchTerm, setSearchTerm] = useState('');
  const [linkFilter, setLinkFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [replaceDocId, setReplaceDocId] = useState<number | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [activeTab, setActiveTab] = useState<'repository' | 'inventory' | 'versions'>('repository');
  const [selectedEvidenceForLinking, setSelectedEvidenceForLinking] = useState<EvidenceItem | null>(null);
  const [editModalEvidence, setEditModalEvidence] = useState<EvidenceItem | null>(null);
  const [versionsModalEvidence, setVersionsModalEvidence] = useState<EvidenceItem | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [navPopoverEvidenceId, setNavPopoverEvidenceId] = useState<number | null>(null);
  const { toasts, addToast, dismissToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (activeTab === 'versions') {
      fetchVersionsArchive();
    }
  }, [activeTab, fetchVersionsArchive]);

  const handleOpenLinkModal = (evidence: EvidenceItem) => {
    setSelectedEvidenceForLinking(evidence);
    setIsLinkModalOpen(true);
  };

  const handleOpenEditMetadata = (evidence: EvidenceItem) => {
    setEditModalEvidence(evidence);
  };

  const handleSaveMetadata = async (payload: {
    documentId: number;
    title: string;
    documentType: string;
    description: string;
    justification: string;
    linkId?: number;
  }) => {
    await evaluatorApi.updateDocumentMetadata(payload.documentId, payload);
    await fetchEvidences();
    addToast('success', 'تم تحديث بيانات الشاهد بنجاح.');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchEvidences();
      addToast('success', 'تم تحديث بيانات مستودع الشواهد بنجاح.');
    } catch {
      addToast('error', 'تعذر تحديث البيانات من الخادم.');
    } finally {
      setIsRefreshing(false);
    }
  };


  const stats = vaultStats || {
    totalEvidences: 38,
    compliantEvidences: 36,
    needsReplacement: 2,
    storageUsedMb: 38.7,
    storageLimitMb: 500,
    storagePercentage: 7.7,
  };

  const filteredEvidences = evidences.filter((item) => {
    const matchesSearch =
      item.title.includes(searchTerm) ||
      item.fileName.includes(searchTerm) ||
      item.standardName.includes(searchTerm) ||
      item.indicatorCode.includes(searchTerm);
    const isUnlinked = Boolean(item.isUnlinked || !item.indicatorId);
    const matchesLink = linkFilter === 'all' || (linkFilter === 'unlinked' ? isUnlinked : !isUnlinked);
    const matchesType = documentTypeFilter === 'all' || item.documentType === documentTypeFilter;
    return matchesSearch && matchesLink && matchesType;
  });

  const handleOpenUpload = (docId?: number) => {
    if (readOnly) return;
    setReplaceDocId(docId);
    setIsUploadModalOpen(true);
  };

  const handleDownloadEvidence = async (evidence: EvidenceItem) => {
    try {
      await evaluatorApi.downloadEvidence(evidence.id, evidence.fileName);
      addToast('success', `تم بدء تحميل الملف: ${evidence.fileName}`);
    } catch (err: unknown) {
      addToast('error', (err as Error)?.message || 'تعذر تحميل الملف من الخادم.');
    }
  };

  const handleExportExcel = () => {
    const headers = ['معرف المستند', 'عنوان الشاهد', 'اسم الملف', 'المعيار', 'المؤشر', 'الإصدار', 'الحالة', 'الحجم', 'تاريخ الرفع'];
    const rows = filteredEvidences.map((e) => [
      e.id,
      e.title,
      e.fileName,
      e.standardName,
      e.indicatorCode,
      `v${e.versionNumber}`,
      e.verificationStatusArabic,
      e.formattedSize,
      e.uploadedAt,
    ]);
    const filename = formatExportFilename('مستودع_الشواهد_والأدلة', 'xlsx');
    const schoolName = user?.school?.schoolName || 'مدرسة الفاروق النموذجية';
    const schoolCode = String(user?.school?.schoolId || 'SCH-104');
    exportToExcel(filename, 'مستودع الشواهد', headers, rows, {
      schoolName,
      schoolCode,
      reportTitle: 'سجل مستودع الشواهد والأدلة المدرسية',
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* View Switcher: Repository vs Inventory */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '2px solid #E2E8F0',
          paddingBottom: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('repository')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'repository' ? '2px solid #059669' : '1px solid #E2E8F0',
            backgroundColor: activeTab === 'repository' ? '#ECFDF5' : '#FFFFFF',
            color: activeTab === 'repository' ? '#065F46' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FolderLock size={16} />
          مستودع وخزانة الشواهد
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'inventory' ? '2px solid #2563EB' : '1px solid #E2E8F0',
            backgroundColor: activeTab === 'inventory' ? '#EFF6FF' : '#FFFFFF',
            color: activeTab === 'inventory' ? '#1E40AF' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FileText size={16} />
          📊 جرد وحصر الشواهد (109 مؤشرات)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('versions')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'versions' ? '2px solid #D97706' : '1px solid #E2E8F0',
            backgroundColor: activeTab === 'versions' ? '#FEF3C7' : '#FFFFFF',
            color: activeTab === 'versions' ? '#92400E' : '#64748B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <History size={16} />
          🕒 الإصدارات والنسخ القديمة
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <EvidenceInventoryPage
          readOnly={readOnly}
          onNavigate={onNavigate}
          onSuccessToast={(msg) => addToast('success', msg)}
          onErrorToast={(err) => addToast('error', err)}
        />
      ) : activeTab === 'versions' ? (
        <OldEvidenceVersionsView
          archiveData={versionsArchive}
          isLoading={isLoadingArchive}
          onRefresh={fetchVersionsArchive}
          onPruneFile={async (versionId) => {
            await pruneVersionFile(versionId);
            addToast('success', 'تم شطب وتفريغ الملف الفيزيائي بنجاح مع إبقاء السجل في الأرشيف.');
          }}
          readOnly={readOnly}
        />
      ) : (
        <>

      {/* 1. Four Vault Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: إجمالي الشواهد المفهرسة */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
              إجمالي الشواهد المفهرسة
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderLock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '10px' }}>
            {stats.totalEvidences}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>وثيقة</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
            مربوطة بـ 42 مؤشراً معيارياً
          </div>
        </div>

        {/* Card 2: شواهد مطابقة ومعتمدة داخلياً */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
              شواهد مطابقة ومعتمدة داخلياً
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#ECFDF5',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#059669', marginTop: '10px' }}>
            {stats.compliantEvidences}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>وثيقة</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
            مستوفية لشروط التوثيق
          </div>
        </div>

        {/* Card 3: شواهد تتطلب استبدال / استكمال */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
              شواهد تتطلب استبدال / استكمال
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#FFFBEB',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#D97706', marginTop: '10px' }}>
            {stats.needsReplacement}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>وثيقتان</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#B45309', marginTop: '4px', fontWeight: 600 }}>
            بحاجة لتحديث النسخة أو اعتمادها
          </div>
        </div>

        {/* Card 4: المساحة التخزينية للمستودع */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
              المساحة التخزينية للمستودع
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HardDrive size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '10px' }}>
            {stats.storageUsedMb}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
              MB من {stats.storageLimitMb} MB
            </span>
          </div>
          <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden', marginTop: '8px' }}>
            <div style={{ height: '100%', width: `${stats.storagePercentage}%`, backgroundColor: '#2563EB', borderRadius: '4px' }} />
          </div>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '20px 24px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '11px' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث في الشواهد أو المؤشرات..."
              style={{
                width: '100%',
                padding: '8px 36px 8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Standard Filter */}
          <select
            value={selectedStandardFilter || ''}
            onChange={(e) => setSelectedStandardFilter(e.target.value ? Number(e.target.value) : undefined)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">كافة المعايير الوطنية</option>
            <option value="1">STD-01: القيادة والإدارة</option>
            <option value="2">STD-02: التعليم والتعلم</option>
            <option value="3">STD-03: نواتج التعلم</option>
            <option value="4">STD-04: البيئة المدرسية</option>
            <option value="5">STD-05: رعاية الطلبة</option>
            <option value="6">STD-06: المشاركة المجتمعية</option>
            <option value="7">STD-07: التطوير المستمر</option>
          </select>

          {/* Format Filter */}
          <select
            value={selectedFormatFilter}
            onChange={(e) => setSelectedFormatFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">كافة الصيغ (PDF, Word, Excel, صور)</option>
            <option value="pdf">ملفات PDF</option>
            <option value="sheet">جداول Excel</option>
            <option value="word">مستندات Word</option>
            <option value="image">صور ميدانية</option>
          </select>

          <select
            value={linkFilter}
            onChange={(e) => setLinkFilter(e.target.value as 'all' | 'linked' | 'unlinked')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">كافة حالات الربط</option>
            <option value="linked">مرتبطة بمؤشرات</option>
            <option value="unlinked">غير مرتبطة بأي مؤشر</option>
          </select>

          <select
            value={documentTypeFilter}
            onChange={(e) => setDocumentTypeFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">كافة أنواع الوثائق</option>
            <option value="evidence">شاهد توثيقي</option>
            <option value="minutes">محضر اجتماع</option>
            <option value="plan">خطة عمل</option>
            <option value="record">سجل رسمي</option>
            <option value="report">تقرير وإحصائية</option>
            <option value="board">لوحة إعلانات</option>
            <option value="image">صورة فوتوغرافية</option>
            <option value="other">أخرى / عام</option>
          </select>
        </div>

        {/* View Mode & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Switch Grid/Table */}
          <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '8px', padding: '3px' }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: viewMode === 'table' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'table' ? '#059669' : '#64748B',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="عرض كجدول"
            >
              <TableIcon size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'grid' ? '#059669' : '#64748B',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="عرض كبطاقات"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: isRefreshing ? 'wait' : 'pointer',
            }}
            title="تحديث قائمة الشواهد والأدلة"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            تحديث
          </button>

          <button
            onClick={handleExportExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} />
            تصدير Excel (.xlsx)
          </button>

          {!readOnly && (
            <button
              onClick={() => handleOpenUpload()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
              }}
            >
              <UploadCloud size={16} />
              رفع شاهد جديد
            </button>
          )}
        </div>
      </div>

      {/* 3. Evidences Presentation (Table or Grid) */}
      {viewMode === 'table' ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '920px', width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #F1F5F9' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>عنوان الشاهد</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>المعيار الوطني</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>المؤشر</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>الإصدار</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>الحجم والصيغة</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>نوع الوثيقة</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
              {filteredEvidences.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                      لا توجد شواهد مطابقة لمعايير البحث والتصفية
                    </div>
                    <div style={{ fontSize: '12.5px' }}>
                      يمكنك تعديل كلمات البحث أو تصفية المعايير لإظهار المزيد من الوثائق.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEvidences.map((ev) => (
                
                  <tr
                    key={ev.id}
                    style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            backgroundColor: '#EFF6FF',
                            color: '#2563EB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <FileText size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{ev.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{ev.fileName}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#334155' }}>
                      {(() => {
                        const uniqueStds: { code: string; name: string }[] = [];
                        const seenCodes = new Set<string>();
                        if (ev.linkedIndicators && ev.linkedIndicators.length > 0) {
                          for (const li of ev.linkedIndicators) {
                            if (li.standardCode && !seenCodes.has(li.standardCode)) {
                              seenCodes.add(li.standardCode);
                              uniqueStds.push({ code: li.standardCode, name: li.standardName || '' });
                            }
                          }
                        }
                        if (uniqueStds.length === 0 && ev.standardCode && !seenCodes.has(ev.standardCode)) {
                          uniqueStds.push({ code: ev.standardCode, name: ev.standardName || '' });
                        }

                        if (uniqueStds.length === 0 || ev.isUnlinked) {
                          return (
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#B45309', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', padding: '3px 8px', borderRadius: '6px' }}>
                              غير مرتبط بأي مؤشر
                            </span>
                          );
                        }

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {uniqueStds.map((std, sIdx) => (
                              <div key={sIdx} style={{ fontSize: '12px' }}>
                                <span style={{ fontWeight: 700, color: '#059669' }}>{std.code}:</span> {std.name}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {ev.isUnlinked || (!ev.indicatorId && (!ev.linkedIndicators || ev.linkedIndicators.length === 0)) ? (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', backgroundColor: '#FEF3C7', padding: '2px 6px', borderRadius: '4px' }}>
                          بانتظار الربط
                        </span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {(ev.linkedIndicators && ev.linkedIndicators.length > 0
                            ? ev.linkedIndicators
                            : [{ indicatorId: ev.indicatorId, indicatorCode: ev.indicatorCode, indicatorTitle: ev.indicatorTitle }]
                          ).map((li, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                {li.indicatorCode}
                              </span>
                              {li.indicatorTitle && (
                                <span style={{ fontSize: '11.5px', color: '#334155', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={li.indicatorTitle}>
                                  {li.indicatorTitle}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', backgroundColor: '#F1F5F9', color: '#475569' }}>
                        v{ev.versionNumber}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748B' }}>
                      {ev.formattedSize}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {(() => {
                        const typeMap: Record<string, { label: string; bg: string; text: string; border: string }> = {
                          minutes: { label: 'محضر اجتماع', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
                          plan: { label: 'خطة عمل', bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
                          record: { label: 'سجل رسمي', bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
                          report: { label: 'تقرير وإحصائية', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
                          board: { label: 'لوحة إعلانات', bg: '#FDF2F8', text: '#BE185D', border: '#FBCFE8' },
                          image: { label: 'صورة فوتوغرافية', bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4' },
                          evidence: { label: 'شاهد توثيقي', bg: '#F8FAFC', text: '#334155', border: '#CBD5E1' },
                          other: { label: 'أخرى / عام', bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' },
                        };
                        const conf = typeMap[ev.documentType || 'other'] || typeMap.other;
                        return (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: conf.bg,
                              color: conf.text,
                              border: `1px solid ${conf.border}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {conf.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', position: 'relative' }}>
                        {onNavigate && (ev.indicatorId || (ev.linkedIndicators && ev.linkedIndicators.length > 0)) && (
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={() => {
                                const count = ev.linkedIndicators?.length || (ev.indicatorId ? 1 : 0);
                                if (count > 1) {
                                  setNavPopoverEvidenceId((prev) => (prev === ev.id ? null : ev.id));
                                } else {
                                  const targetId = ev.indicatorId || ev.linkedIndicators?.[0]?.indicatorId;
                                  if (targetId) onNavigate('rubric-assessment', targetId);
                                }
                              }}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#F0FDF4',
                                border: '1px solid #BBF7D0',
                                color: '#15803D',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="الانتقال المباشر لاستمارة تقييم هذا المؤشر"
                            >
                              <ExternalLink size={12} />
                              <span>الانتقال للمؤشر</span>
                              {ev.linkedIndicators && ev.linkedIndicators.length > 1 && (
                                <span style={{ fontSize: '10px', padding: '0 4px', borderRadius: '10px', backgroundColor: '#DCFCE7', color: '#166534' }}>
                                  ({ev.linkedIndicators.length})
                                </span>
                              )}
                            </button>

                            {/* Indicator Navigation Popover when multiple indicators are linked */}
                            {navPopoverEvidenceId === ev.id && ev.linkedIndicators && ev.linkedIndicators.length > 1 && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 'calc(100% + 4px)',
                                  right: 0,
                                  zIndex: 50,
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '8px',
                                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                                  padding: '8px',
                                  minWidth: '220px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                  textAlign: 'right',
                                }}
                              >
                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', padding: '2px 4px', borderBottom: '1px solid #F1F5F9' }}>
                                  اختر المؤشر المستهدف:
                                </div>
                                {ev.linkedIndicators.map((li) => (
                                  <button
                                    key={li.indicatorId}
                                    type="button"
                                    onClick={() => {
                                      setNavPopoverEvidenceId(null);
                                      onNavigate('rubric-assessment', li.indicatorId);
                                    }}
                                    style={{
                                      padding: '6px 8px',
                                      borderRadius: '6px',
                                      border: 'none',
                                      backgroundColor: '#F8FAFC',
                                      textAlign: 'right',
                                      cursor: 'pointer',
                                      fontSize: '11.5px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '6px',
                                    }}
                                  >
                                    <span style={{ fontWeight: 800, color: '#2563EB' }}>{li.indicatorCode}</span>
                                    <span style={{ color: '#334155', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={li.indicatorTitle}>
                                      {li.indicatorTitle}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {!readOnly && (
                          <button
                            onClick={() => handleOpenEditMetadata(ev)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              color: '#475569',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="تعديل بيانات الشاهد والنوع والوصف"
                          >
                            <Pencil size={12} />
                            تعديل
                          </button>
                        )}
                        {!readOnly && (
                          <button
                            onClick={() => handleOpenUpload(ev.documentId)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              color: '#475569',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="رفع نسخة بديلة دون حذف النسخ السابقة"
                          >
                            استبدال
                          </button>
                        )}
                        {!readOnly && (
                          <button
                            onClick={() => handleOpenLinkModal(ev)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              color: '#1D4ED8',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="إدارة علاقات الشاهد (نقل / ربط متعدد / فك ارتباط)"
                          >
                            <Link2 size={13} />
                            إدارة الشواهد
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadEvidence(ev)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            color: '#059669',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          تحميل
                        </button>
                        <button
                          onClick={() => setVersionsModalEvidence(ev)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #CBD5E1',
                            color: '#4F46E5',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="استعراض سجل الإصدارات التاريخية للشاهد"
                        >
                          <History size={12} />
                          الإصدارات
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filteredEvidences.map((ev) => (
            <EvidenceCard
              key={ev.id}
              evidence={ev}
              onReplaceVersion={(docId) => handleOpenUpload(docId)}
              onDownload={handleDownloadEvidence}
              readOnly={readOnly}
              onManageLinks={handleOpenLinkModal}
              onEditMetadata={handleOpenEditMetadata}
              onViewVersions={(evidence) => setVersionsModalEvidence(evidence)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}

        </>
      )}

      {/* Document Versions History Modal */}
      <DocumentVersionsModal
        isOpen={Boolean(versionsModalEvidence)}
        onClose={() => setVersionsModalEvidence(null)}
        documentId={versionsModalEvidence?.documentId || versionsModalEvidence?.id || null}
        documentTitle={versionsModalEvidence?.title}
      />

      {/* Edit Evidence Metadata Modal */}
      <EditEvidenceMetadataModal
        isOpen={Boolean(editModalEvidence)}
        onClose={() => setEditModalEvidence(null)}
        evidence={editModalEvidence}
        onSave={handleSaveMetadata}
      />

      {/* Link Evidence Modal */}
      <LinkEvidenceModal
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setSelectedEvidenceForLinking(null);
        }}
        evidence={selectedEvidenceForLinking}
        onSuccess={(msg) => { addToast('success', msg); fetchEvidences(); }}
        onError={(err) => addToast('error', err)}
      />

      {/* Toasts */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />

      {/* Modal for upload / replace */}
      <UploadEvidenceModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={async (data) => {
          await uploadEvidenceFile(data);
          addToast('success', replaceDocId ? 'تم استبدال الشاهد بنسخة أحدث ونقل كافة الروابط بنجاح.' : 'تم رفع الشاهد وتوثيقه بنجاح.');
        }}
        documentIdToReplace={replaceDocId}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
      />
    </div>
  );
};
