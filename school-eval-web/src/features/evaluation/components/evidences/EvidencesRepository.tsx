import { exportMultiSheetExcel, formatExportFilename } from '../../../admin/utils/exportUtils';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEvidences } from '../../hooks/useEvidences';
import { evaluatorApi } from '../../api/evaluatorApi';
import { EvidencePresentationSection } from './EvidencePresentationSection';
import { EvidenceVaultStatsCards } from './EvidenceVaultStatsCards';
import { LinkEvidenceModal } from './LinkEvidenceModal';
import { EditEvidenceMetadataModal } from './EditEvidenceMetadataModal';
import { EvidenceInventoryPage } from './EvidenceInventoryPage';
import { useToast } from '../../../admin/components/common/useToast';
import { ToastNotification } from '../../../admin/components/common/ToastNotification';
import { UploadEvidenceModal } from './UploadEvidenceModal';
import { DocumentVersionsModal } from './DocumentVersionsModal';
import { OldEvidenceVersionsView } from './OldEvidenceVersionsView';
import { useAuth } from '../../../auth/AuthContext';
import { extractApiErrorMessage } from '../../../../api/apiTypes';
import type { EvidenceItem, EvaluatorScreen } from '../../api/evaluationTypes';
import {
  FolderLock,
  Lock,
  UploadCloud,
  Search,
  Download,
  FileText,
  Table as TableIcon,
  LayoutGrid,
  RefreshCw,
  RotateCcw,
  History,
  ArrowUpDown,
  Filter,
  ChevronDown,
  X,
} from 'lucide-react';

const STANDARD_OPTIONS = [
  { id: 1, code: 'STD-01', label: 'STD-01: القيادة والإدارة المدرسية' },
  { id: 2, code: 'STD-02', label: 'STD-02: التعليم والتعلم' },
  { id: 3, code: 'STD-03', label: 'STD-03: نواتج التعلم وسلوك الطلبة' },
  { id: 4, code: 'STD-04', label: 'STD-04: البيئة المدرسية والصحة والسلامة' },
  { id: 5, code: 'STD-05', label: 'STD-05: رعاية الطلبة وخدمات الدعم' },
  { id: 6, code: 'STD-06', label: 'STD-06: المشاركة المجتمعية والشراكات' },
  { id: 7, code: 'STD-07', label: 'STD-07: التطوير المدرسي المستمر والتخطيط' },
];

const FORMAT_OPTIONS = [
  { key: 'pdf', label: 'ملفات PDF', extensions: ['.pdf'], mimeSnippet: 'pdf' },
  { key: 'sheet', label: 'جداول Excel', extensions: ['.xlsx', '.xls', '.csv'], mimeSnippet: 'spreadsheet' },
  { key: 'word', label: 'مستندات Word', extensions: ['.docx', '.doc'], mimeSnippet: 'word' },
  { key: 'image', label: 'صور ميدانية', extensions: ['.png', '.jpg', '.jpeg', '.webp'], mimeSnippet: 'image' },
];

const DOC_TYPE_OPTIONS = [
  { key: 'evidence', label: 'شاهد توثيقي' },
  { key: 'minutes', label: 'محضر اجتماع' },
  { key: 'plan', label: 'خطة عمل' },
  { key: 'record', label: 'سجل رسمي' },
  { key: 'report', label: 'تقرير وإحصائية' },
  { key: 'board', label: 'لوحة إعلانات' },
  { key: 'image', label: 'صورة فوتوغرافية' },
  { key: 'other', label: 'أخرى / عام' },
];

type SortField = 'standard' | 'title' | 'version' | 'size' | 'date' | 'links';
type SortDirection = 'asc' | 'desc';

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
  const [selectedStandardIds, setSelectedStandardIds] = useState<number[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState<string[]>([]);
  const [needsReplacementOnly, setNeedsReplacementOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('standard');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [activeDropdown, setActiveDropdown] = useState<'standards' | 'formats' | 'types' | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [replaceDocId, setReplaceDocId] = useState<number | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [activeTab, setActiveTab] = useState<'repository' | 'inventory' | 'versions'>('repository');
  const [selectedEvidenceForLinking, setSelectedEvidenceForLinking] = useState<EvidenceItem | null>(null);
  const [editModalEvidence, setEditModalEvidence] = useState<EvidenceItem | null>(null);
  const [versionsModalEvidence, setVersionsModalEvidence] = useState<EvidenceItem | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toasts, addToast, dismissToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (activeTab === 'versions') {
      fetchVersionsArchive();
    }
  }, [activeTab, fetchVersionsArchive]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeDropdown]);

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
    totalEvidences: 0,
    compliantEvidences: 0,
    needsReplacement: 0,
    storageUsedMb: 0,
    storageLimitMb: 500,
    storagePercentage: 0,
    coveredIndicatorsCount: 0,
    totalIndicatorsCount: 109,
  };

  // حساب إجمالي المؤشرات الوطنية المغطاة بهذه الشواهد ديناميكياً
  const uniqueCoveredIndicatorsCount = useMemo(() => {
    const indicatorIds = new Set<number>();
    evidences.forEach((ev) => {
      if (ev.linkedIndicators && ev.linkedIndicators.length > 0) {
        ev.linkedIndicators.forEach((li) => {
          if (li.indicatorId) indicatorIds.add(li.indicatorId);
        });
      } else if (ev.indicatorId && !ev.isUnlinked) {
        indicatorIds.add(ev.indicatorId);
      }
    });
    return indicatorIds.size;
  }, [evidences]);

  const coveredIndicators = stats.coveredIndicatorsCount ?? (uniqueCoveredIndicatorsCount || 109);
  const totalIndicators = stats.totalIndicatorsCount ?? 109;

  const filteredEvidences = useMemo(() => {
    return evidences.filter((item) => {
      // 1. Search term
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchesMain =
          item.title.toLowerCase().includes(term) ||
          item.fileName.toLowerCase().includes(term) ||
          item.standardName.toLowerCase().includes(term) ||
          item.indicatorCode.toLowerCase().includes(term);
        const matchesLinked = Boolean(
          item.linkedIndicators &&
            item.linkedIndicators.some(
              (li) =>
                li.indicatorCode.toLowerCase().includes(term) ||
                li.indicatorTitle.toLowerCase().includes(term)
            )
        );
        if (!matchesMain && !matchesLinked) return false;
      }

      // 2. Standards multi-select
      if (selectedStandardIds.length > 0) {
        let hasMatchingStandard = false;
        if (item.linkedIndicators && item.linkedIndicators.length > 0) {
          hasMatchingStandard = item.linkedIndicators.some((li) => {
            if (li.standardId && selectedStandardIds.includes(li.standardId)) return true;
            if (li.standardCode) {
              const num = parseInt(li.standardCode.replace(/\D/g, ''), 10);
              if (!isNaN(num) && selectedStandardIds.includes(num)) return true;
            }
            return false;
          });
        }
        if (!hasMatchingStandard && item.standardCode) {
          const num = parseInt(item.standardCode.replace(/\D/g, ''), 10);
          if (!isNaN(num) && selectedStandardIds.includes(num)) {
            hasMatchingStandard = true;
          }
        }
        if (!hasMatchingStandard) return false;
      }

      // 3. Formats multi-select
      if (selectedFormats.length > 0) {
        const fileNameLower = (item.fileName || '').toLowerCase();
        const mimeLower = (item.mimeType || '').toLowerCase();
        const matchesFormat = selectedFormats.some((fmt) => {
          const opt = FORMAT_OPTIONS.find((o) => o.key === fmt);
          if (!opt) return false;
          const matchesExt = opt.extensions.some((ext) => fileNameLower.endsWith(ext));
          const matchesMime = mimeLower.includes(opt.mimeSnippet);
          return matchesExt || matchesMime;
        });
        if (!matchesFormat) return false;
      }

      // 4. Document Types multi-select
      if (selectedDocumentTypes.length > 0) {
        if (!selectedDocumentTypes.includes(item.documentType || 'other')) {
          return false;
        }
      }

      // 5. Link Status filter
      const isUnlinked = Boolean(item.isUnlinked || !item.indicatorId);
      if (linkFilter === 'linked' && isUnlinked) return false;
      if (linkFilter === 'unlinked' && !isUnlinked) return false;

      // 6. Replacement / Flagged filter
      if (needsReplacementOnly) {
        const needsRep = Boolean(item.needsReplacement || item.versionNumber > 1);
        if (!needsRep) return false;
      }

      return true;
    });
  }, [
    evidences,
    searchTerm,
    selectedStandardIds,
    selectedFormats,
    selectedDocumentTypes,
    linkFilter,
    needsReplacementOnly,
  ]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'title' || field === 'standard' ? 'asc' : 'desc');
    }
  };

  const sortedEvidences = React.useMemo(() => {
    return [...filteredEvidences].sort((a, b) => {
      let comparison: number;
      if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title, 'ar');
      } else if (sortField === 'version') {
        comparison = (a.versionNumber || 1) - (b.versionNumber || 1);
      } else if (sortField === 'size') {
        comparison = (a.fileSize || 0) - (b.fileSize || 0);
      } else if (sortField === 'date') {
        comparison = new Date(a.uploadedAt || 0).getTime() - new Date(b.uploadedAt || 0).getTime();
      } else if (sortField === 'links') {
        const aLinks = a.linkedIndicators?.length || (a.indicatorId ? 1 : 0);
        const bLinks = b.linkedIndicators?.length || (b.indicatorId ? 1 : 0);
        comparison = aLinks - bLinks;
      } else {
        // 'standard' default: RTL indicator code numeric parsing
        const parseCodeNumeric = (code?: string): [number, number, number] => {
          if (!code) return [999, 999, 999];
          const parts = code.split(/[-._]/).map((p) => parseInt(p.replace(/\D/g, ''), 10)).filter((n) => !isNaN(n));
          if (parts.length >= 3) {
            return [parts[2] ?? 999, parts[1] ?? 999, parts[0] ?? 999];
          }
          return [parts[0] ?? 999, parts[1] ?? 999, parts[2] ?? 999];
        };
        const [sA, subA, iA] = parseCodeNumeric(a.indicatorCode);
        const [sB, subB, iB] = parseCodeNumeric(b.indicatorCode);
        if (sA !== sB) comparison = sA - sB;
        else if (subA !== subB) comparison = subA - subB;
        else if (iA !== iB) comparison = iA - iB;
        else comparison = a.id - b.id;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredEvidences, sortField, sortDirection]);

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

  const handleDeleteUnlinked = async (evidence: EvidenceItem) => {
    if (readOnly) return;
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الشاهد غير المرتبط «${evidence.title}» نهائياً من مستودع المدرسة؟\nلا يمكن التراجع عن هذا الإجراء.`
    );
    if (!confirmed) return;

    try {
      await evaluatorApi.deleteUnlinkedDocument(evidence.documentId);
      addToast('success', `تم حذف الشاهد «${evidence.title}» نهائياً بنجاح.`);
      await fetchEvidences();
    } catch (err: unknown) {
      console.error('Failed to delete unlinked evidence:', err);
      addToast('error', extractApiErrorMessage(err, 'فشل حذف الشاهد.'));
    }
  };

  const handleExportExcel = () => {
    const schoolName = user?.school?.schoolName || 'المدرسة';
    const schoolCode = user?.school?.schoolCode || (user?.school?.schoolId ? `SCH-${user.school.schoolId}` : 'SCH-OFFICIAL');

    // الورقة 1: الشواهد السارية الفعالة في المستودع
    const sheet1Headers = ['معرف المستند', 'عنوان الشاهد', 'اسم الملف', 'المعيار', 'المؤشر', 'الإصدار', 'الحالة', 'الحجم', 'تاريخ الرفع'];
    const sheet1Rows = sortedEvidences.map((e) => [
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

    // الورقة 2: سجل الإصدارات والأرشيف التاريخي للشواهد (القرار 1 المعتمد)
    const sheet2Headers = ['معرف المستند', 'عنوان الشاهد', 'رقم الإصدار', 'الصفة', 'اسم الملف', 'حالة الملف التخزيني', 'الحجم', 'الملاحظات الأرشيفية', 'تاريخ الإيداع'];
    const sheet2Rows: (string | number | null | undefined)[][] = [];

    const archiveDocs = versionsArchive?.documents || [];
    archiveDocs.forEach((doc) => {
      // النسخة الحالية
      if (doc.currentVersion) {
        sheet2Rows.push([
          doc.documentId,
          doc.title,
          `v${doc.currentVersion.versionNo}`,
          'النسخة الحالية الفعالة',
          doc.currentVersion.fileName,
          doc.currentVersion.isFilePruned ? 'مشطوب فيزيائياً (الأرشيف محفوظ)' : 'مخزن بالقرص',
          doc.currentVersion.formattedSize,
          doc.currentVersion.notes || 'الإصدار المعتمد للشاهد',
          doc.currentVersion.createdAt,
        ]);
      }
      // النسخ التاريخية السابقة
      doc.historicalVersions.forEach((ver) => {
        sheet2Rows.push([
          doc.documentId,
          doc.title,
          `v${ver.versionNo}`,
          'نسخة أرشيفية سابقة',
          ver.fileName,
          ver.isFilePruned ? 'مشطوب فيزيائياً (الأرشيف محفوظ)' : 'مخزن بالقرص',
          ver.formattedSize,
          ver.notes || 'نسخة قديمة مؤرشفة',
          ver.createdAt,
        ]);
      });
    });

    const filename = formatExportFilename('مستودع_الشواهد_وسجل_الإصدارات', 'xlsx');

    exportMultiSheetExcel(
      filename,
      [
        {
          sheetName: 'مستودع الشواهد الحالية',
          headers: sheet1Headers,
          rows: sheet1Rows,
        },
        {
          sheetName: 'سجل الإصدارات والأرشيف',
          headers: sheet2Headers,
          rows: sheet2Rows.length > 0 ? sheet2Rows : [['-', 'لا توجد إصدارات مؤرشفة', '-', '-', '-', '-', '-', '-', '-']],
        },
      ],
      {
        schoolName,
        schoolCode,
        reportTitle: 'سجل مستودع الشواهد والأدلة والأرشيف المدرسي',
      }
    );
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
      <EvidenceVaultStatsCards
        stats={stats}
        coveredIndicators={coveredIndicators}
        totalIndicators={totalIndicators}
      />

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
        <div ref={filterDropdownRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minWidth: '300px' }}>
          {/* Row 1: Search & Multi-Select Filter Popovers & Link Filter & Grid Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '240px' }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '10px' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث في الشواهد أو المؤشرات..."
                style={{
                  width: '100%',
                  padding: '7px 32px 7px 10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchTerm && (
                <X
                  size={14}
                  color="#94A3B8"
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', left: '8px', top: '10px', cursor: 'pointer' }}
                />
              )}
            </div>

            {/* Standards Multi-Select Popover */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setActiveDropdown((prev) => (prev === 'standards' ? null : 'standards'))}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${selectedStandardIds.length > 0 ? '#10B981' : '#CBD5E1'}`,
                  backgroundColor: selectedStandardIds.length > 0 ? '#ECFDF5' : '#FFFFFF',
                  color: selectedStandardIds.length > 0 ? '#065F46' : '#334155',
                  fontSize: '12.5px',
                  fontWeight: selectedStandardIds.length > 0 ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Filter size={13} color={selectedStandardIds.length > 0 ? '#059669' : '#64748B'} />
                <span>
                  {selectedStandardIds.length === 0
                    ? 'المعايير الوطنية'
                    : selectedStandardIds.length === 1
                    ? STANDARD_OPTIONS.find((s) => s.id === selectedStandardIds[0])?.code || 'معيار محدد'
                    : `${selectedStandardIds.length} معايير محددة`}
                </span>
                <ChevronDown size={13} />
              </button>

              {activeDropdown === 'standards' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    zIndex: 100,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                    padding: '8px',
                    width: '280px',
                    maxHeight: '320px',
                    overflowY: 'auto',
                    textAlign: 'right',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px 8px', borderBottom: '1px solid #F1F5F9', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>تصفية المعايير الوطنية</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedStandardIds(STANDARD_OPTIONS.map((s) => s.id))}
                        style={{ border: 'none', background: 'none', color: '#059669', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        الكل
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStandardIds([])}
                        style={{ border: 'none', background: 'none', color: '#EF4444', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        مسح
                      </button>
                    </div>
                  </div>
                  {STANDARD_OPTIONS.map((opt) => {
                    const isChecked = selectedStandardIds.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: isChecked ? '#F0FDF4' : 'transparent',
                          fontSize: '11.5px',
                          color: '#334155',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedStandardIds((prev) =>
                              prev.includes(opt.id) ? prev.filter((id) => id !== opt.id) : [...prev, opt.id]
                            );
                          }}
                        />
                        <span style={{ fontWeight: 700, color: '#059669' }}>{opt.code}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label.split(':')[1] || opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Formats Multi-Select Popover */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setActiveDropdown((prev) => (prev === 'formats' ? null : 'formats'))}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${selectedFormats.length > 0 ? '#2563EB' : '#CBD5E1'}`,
                  backgroundColor: selectedFormats.length > 0 ? '#EFF6FF' : '#FFFFFF',
                  color: selectedFormats.length > 0 ? '#1E40AF' : '#334155',
                  fontSize: '12.5px',
                  fontWeight: selectedFormats.length > 0 ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>
                  {selectedFormats.length === 0
                    ? 'صيغ الملفات'
                    : selectedFormats.length === 1
                    ? FORMAT_OPTIONS.find((f) => f.key === selectedFormats[0])?.label || selectedFormats[0]
                    : `${selectedFormats.length} صيغ محددة`}
                </span>
                <ChevronDown size={13} />
              </button>

              {activeDropdown === 'formats' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    zIndex: 100,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                    padding: '8px',
                    width: '200px',
                    textAlign: 'right',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px 8px', borderBottom: '1px solid #F1F5F9', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>الصيغ المتاحة</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFormats([])}
                      style={{ border: 'none', background: 'none', color: '#EF4444', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      مسح
                    </button>
                  </div>
                  {FORMAT_OPTIONS.map((opt) => {
                    const isChecked = selectedFormats.includes(opt.key);
                    return (
                      <label
                        key={opt.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: isChecked ? '#EFF6FF' : 'transparent',
                          fontSize: '11.5px',
                          color: '#334155',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedFormats((prev) =>
                              prev.includes(opt.key) ? prev.filter((k) => k !== opt.key) : [...prev, opt.key]
                            );
                          }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Document Types Multi-Select Popover */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setActiveDropdown((prev) => (prev === 'types' ? null : 'types'))}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${selectedDocumentTypes.length > 0 ? '#7C3AED' : '#CBD5E1'}`,
                  backgroundColor: selectedDocumentTypes.length > 0 ? '#F5F3FF' : '#FFFFFF',
                  color: selectedDocumentTypes.length > 0 ? '#6D28D9' : '#334155',
                  fontSize: '12.5px',
                  fontWeight: selectedDocumentTypes.length > 0 ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>
                  {selectedDocumentTypes.length === 0
                    ? 'أنواع الوثائق'
                    : selectedDocumentTypes.length === 1
                    ? DOC_TYPE_OPTIONS.find((t) => t.key === selectedDocumentTypes[0])?.label || selectedDocumentTypes[0]
                    : `${selectedDocumentTypes.length} أنواع محددة`}
                </span>
                <ChevronDown size={13} />
              </button>

              {activeDropdown === 'types' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    zIndex: 100,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                    padding: '8px',
                    width: '210px',
                    maxHeight: '280px',
                    overflowY: 'auto',
                    textAlign: 'right',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px 8px', borderBottom: '1px solid #F1F5F9', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>أنواع الوثائق</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDocumentTypes([])}
                      style={{ border: 'none', background: 'none', color: '#EF4444', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      مسح
                    </button>
                  </div>
                  {DOC_TYPE_OPTIONS.map((opt) => {
                    const isChecked = selectedDocumentTypes.includes(opt.key);
                    return (
                      <label
                        key={opt.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: isChecked ? '#F5F3FF' : 'transparent',
                          fontSize: '11.5px',
                          color: '#334155',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedDocumentTypes((prev) =>
                              prev.includes(opt.key) ? prev.filter((k) => k !== opt.key) : [...prev, opt.key]
                            );
                          }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Link Status Select */}
            <select
              value={linkFilter}
              onChange={(e) => setLinkFilter(e.target.value as 'all' | 'linked' | 'unlinked')}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12.5px',
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

            {/* Sort Dropdown (Visible in Grid View) */}
            {viewMode === 'grid' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowUpDown size={14} color="#64748B" />
                <select
                  value={`${sortField}_${sortDirection}`}
                  onChange={(e) => {
                    const [f, d] = e.target.value.split('_') as [SortField, SortDirection];
                    setSortField(f);
                    setSortDirection(d);
                  }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12.5px',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    outline: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                  title="ترتيب وفرز الشواهد"
                >
                  <option value="standard_asc">الترتيب المعياري</option>
                  <option value="date_desc">الأحدث رفعاً</option>
                  <option value="date_asc">الأقدم رفعاً</option>
                  <option value="size_desc">حجم الملف (الأكبر أولاً)</option>
                  <option value="size_asc">حجم الملف (الأصغر أولاً)</option>
                  <option value="title_asc">أبجدياً (أ-ي)</option>
                  <option value="version_desc">رقم الإصدار (الأحدث)</option>
                </select>
              </div>
            )}
          </div>

          {/* Row 2: Quick Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>مرشحات سريعة:</span>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedStandardIds([]);
                setSelectedFormats([]);
                setSelectedDocumentTypes([]);
                setLinkFilter('all');
                setNeedsReplacementOnly(false);
              }}
              style={{
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                border: selectedStandardIds.length === 0 && selectedFormats.length === 0 && selectedDocumentTypes.length === 0 && linkFilter === 'all' && !needsReplacementOnly && !searchTerm ? '1px solid #059669' : '1px solid #E2E8F0',
                backgroundColor: selectedStandardIds.length === 0 && selectedFormats.length === 0 && selectedDocumentTypes.length === 0 && linkFilter === 'all' && !needsReplacementOnly && !searchTerm ? '#ECFDF5' : '#FFFFFF',
                color: selectedStandardIds.length === 0 && selectedFormats.length === 0 && selectedDocumentTypes.length === 0 && linkFilter === 'all' && !needsReplacementOnly && !searchTerm ? '#065F46' : '#64748B',
              }}
            >
              الكل ({evidences.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedStandardIds([]);
                setSelectedFormats([]);
                setSelectedDocumentTypes([]);
                setNeedsReplacementOnly(false);
                setLinkFilter('unlinked');
              }}
              style={{
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                border: linkFilter === 'unlinked' ? '1px solid #D97706' : '1px solid #E2E8F0',
                backgroundColor: linkFilter === 'unlinked' ? '#FFFBEB' : '#FFFFFF',
                color: linkFilter === 'unlinked' ? '#92400E' : '#64748B',
              }}
            >
              غير مرتبطة بأي مؤشر
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedStandardIds([]);
                setSelectedDocumentTypes([]);
                setLinkFilter('all');
                setNeedsReplacementOnly(false);
                setSelectedFormats(['pdf']);
              }}
              style={{
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                border: selectedFormats.length === 1 && selectedFormats[0] === 'pdf' ? '1px solid #DC2626' : '1px solid #E2E8F0',
                backgroundColor: selectedFormats.length === 1 && selectedFormats[0] === 'pdf' ? '#FEF2F2' : '#FFFFFF',
                color: selectedFormats.length === 1 && selectedFormats[0] === 'pdf' ? '#991B1B' : '#64748B',
              }}
            >
              ملفات PDF
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedStandardIds([]);
                setSelectedFormats([]);
                setSelectedDocumentTypes([]);
                setLinkFilter('all');
                setNeedsReplacementOnly(true);
              }}
              style={{
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                border: needsReplacementOnly ? '1px solid #D97706' : '1px solid #E2E8F0',
                backgroundColor: needsReplacementOnly ? '#FEF3C7' : '#FFFFFF',
                color: needsReplacementOnly ? '#92400E' : '#64748B',
              }}
            >
              بحاجة لتحديث / استبدال ({stats.needsReplacement})
            </button>
          </div>

          {/* Row 3: Active Filter Chips */}
          {(searchTerm || selectedStandardIds.length > 0 || selectedFormats.length > 0 || selectedDocumentTypes.length > 0 || linkFilter !== 'all' || needsReplacementOnly) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px dashed #E2E8F0' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>الفلاتر النشطة:</span>
              {searchTerm && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', fontSize: '11px', color: '#334155' }}>
                  بحث: &quot;{searchTerm}&quot;
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
                </span>
              )}
              {selectedStandardIds.map((sid) => (
                <span key={sid} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', fontSize: '11px', color: '#065F46', fontWeight: 700 }}>
                  {STANDARD_OPTIONS.find((s) => s.id === sid)?.code || `STD-${sid}`}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSelectedStandardIds((prev) => prev.filter((id) => id !== sid))} />
                </span>
              ))}
              {selectedFormats.map((fmt) => (
                <span key={fmt} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '11px', color: '#1E40AF', fontWeight: 700 }}>
                  {FORMAT_OPTIONS.find((f) => f.key === fmt)?.label || fmt}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSelectedFormats((prev) => prev.filter((k) => k !== fmt))} />
                </span>
              ))}
              {selectedDocumentTypes.map((type) => (
                <span key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', fontSize: '11px', color: '#6D28D9', fontWeight: 700 }}>
                  {DOC_TYPE_OPTIONS.find((t) => t.key === type)?.label || type}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSelectedDocumentTypes((prev) => prev.filter((t) => t !== type))} />
                </span>
              ))}
              {linkFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', fontSize: '11px', color: '#92400E', fontWeight: 700 }}>
                  {linkFilter === 'unlinked' ? 'غير مرتبطة' : 'مرتبطة'}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setLinkFilter('all')} />
                </span>
              )}
              {needsReplacementOnly && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', fontSize: '11px', color: '#92400E', fontWeight: 700 }}>
                  بحاجة لتحديث
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setNeedsReplacementOnly(false)} />
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStandardIds([]);
                  setSelectedFormats([]);
                  setSelectedDocumentTypes([]);
                  setLinkFilter('all');
                  setNeedsReplacementOnly(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="مسح كافة الفلاتر"
              >
                <RotateCcw size={11} />
                مسح الكل
              </button>
            </div>
          )}
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

          {!readOnly ? (
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
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FCD34D',
                color: '#92400E',
                fontSize: '12px',
                fontWeight: 700,
              }}
              title="رفع وتعديل الشواهد محصور بمقيم المدرسة المعتمد"
            >
              <Lock size={13} />
              <span>وضع استعراض الشواهد</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Evidences Presentation (Table or Grid) */}
      <EvidencePresentationSection
        viewMode={viewMode}
        filteredEvidences={filteredEvidences}
        sortedEvidences={sortedEvidences}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        readOnly={readOnly}
        onNavigate={onNavigate}
        onDownload={handleDownloadEvidence}
        onManageLinks={handleOpenLinkModal}
        onEditMetadata={handleOpenEditMetadata}
        onReplaceVersion={(docId) => handleOpenUpload(docId)}
        onViewVersions={(evidence) => setVersionsModalEvidence(evidence)}
        onDeleteUnlinked={handleDeleteUnlinked}
      />

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
