import React, { useState } from 'react';
import type { VersionsArchiveData, ArchivedDocumentItem, ArchivedVersionItem } from '../../api/evaluationTypes';
import {
  History,
  Download,
  Trash2,
  FileText,
  Search,
  Layers,
  HardDrive,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';

interface OldEvidenceVersionsViewProps {
  archiveData: VersionsArchiveData | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onPruneFile: (versionId: number) => Promise<void>;
  readOnly?: boolean;
}

export const OldEvidenceVersionsView: React.FC<OldEvidenceVersionsViewProps> = ({
  archiveData,
  isLoading,
  onRefresh,
  onPruneFile,
  readOnly = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [pruningId, setPruningId] = useState<number | null>(null);
  const [expandedDocIds, setExpandedDocIds] = useState<Record<number, boolean>>({});
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const toggleExpand = (docId: number) => {
    setExpandedDocIds((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  const handleDownload = async (version: ArchivedVersionItem) => {
    if (version.isFilePruned) return;
    try {
      setDownloadingId(version.versionId);
      await evaluatorApi.downloadEvidence(version.versionId, version.fileName);
    } catch (err) {
      console.error('Failed to download version:', err);
      alert('تعذر تنزيل ملف الإصدار من الخادم.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrune = async (doc: ArchivedDocumentItem, ver: ArchivedVersionItem) => {
    if (readOnly) return;
    const confirmMsg = `هل أنت متأكد من حذف الملف الفيزيائي للنسخة (الإصدار ${ver.versionNo}) للشاهد «${doc.title}» من الخادم؟\n\nتنبيه: سيتم مسح الملف الفعلي لتوفير مساحة التخزين مع الإبقاء التام على اسم الملف وسجل الإصدار وتاريخه وملاحظاته في الأرشيف للتوثيق المعتمد.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setPruningId(ver.versionId);
      await onPruneFile(ver.versionId);
    } catch (err: any) {
      console.error('Failed to prune version file:', err);
      alert(err?.response?.data?.message || 'تعذر شطب الملف الفيزيائي.');
    } finally {
      setPruningId(null);
    }
  };

  const stats = archiveData?.archiveStats || {
    totalDocuments: 0,
    totalVersions: 0,
    historicalVersionsCount: 0,
    prunedVersionsCount: 0,
  };

  const documents = archiveData?.documents || [];

  const filteredDocs = documents.filter((doc) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      doc.title.toLowerCase().includes(term) ||
      doc.description.toLowerCase().includes(term) ||
      doc.currentVersion?.fileName.toLowerCase().includes(term) ||
      doc.historicalVersions.some((v) => v.fileName.toLowerCase().includes(term));

    const matchesType = filterType === 'all' || doc.documentType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>إجمالي الوثائق المعتمدة</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>{stats.totalDocuments}</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <History size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>إجمالي الإصدارات الكلية</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>{stats.totalVersions}</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>النسخ الأرشيفية السابقة</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>{stats.historicalVersionsCount}</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#F1F5F9',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HardDrive size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>الملفات الفيزيائية المفرغة</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>{stats.prunedVersionsCount}</div>
          </div>
        </div>
      </div>

      {/* 2. Toolbar & Filters */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          backgroundColor: '#FFFFFF',
          padding: '14px 18px',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '11px' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم الشاهد أو اسم الملف أو الملاحظات..."
              style={{
                width: '100%',
                padding: '9px 36px 9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#334155',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">كافة أنواع الوثائق</option>
            <option value="minutes">محاضر اجتماعات</option>
            <option value="plan">خطط تشغيلية</option>
            <option value="record">سجلات توثيقية</option>
            <option value="report">تقارير إنجاز</option>
            <option value="board">لوحات بيانية</option>
            <option value="image">صور ميدانية</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 16px',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#F8FAFC',
            color: '#475569',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>تحديث السجل</span>
        </button>
      </div>

      {/* 3. Document Versions List */}
      {isLoading && documents.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: '140px', backgroundColor: '#F1F5F9', borderRadius: '12px' }} className="animate-pulse" />
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
          }}
        >
          <History size={48} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>لا توجد وثائق مطابقة</h3>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '6px 0 0' }}>
            لم يتم العثور على أي شواهد أو إصدارات مطابقة لمعايير البحث الحالية.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredDocs.map((doc) => {
            const isExpanded = expandedDocIds[doc.documentId] ?? true;
            const hasHistory = doc.historicalVersions.length > 0;

            return (
              <div
                key={doc.documentId}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                }}
              >
                {/* Document Header */}
                <div
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        fontSize: '11px',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {doc.documentTypeArabic}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        {doc.title}
                      </h4>
                      {doc.description && (
                        <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0' }}>
                          {doc.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        backgroundColor: '#ECFDF5',
                        color: '#065F46',
                        border: '1px solid #A7F3D0',
                      }}
                      title="المؤشرات المرتبطة بالنسخة الحالية"
                    >
                      مربوط بـ {doc.activeLinksCount} مؤشر(ات)
                    </span>

                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                      }}
                    >
                      {doc.totalVersionsCount} إصدار(ات)
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleExpand(doc.documentId)}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#64748B',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={isExpanded ? 'طي تفاصيل الإصدارات' : 'توسيع تفاصيل الإصدارات'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Current Version Card */}
                    {doc.currentVersion && (
                      <div
                        style={{
                          backgroundColor: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          borderRadius: '10px',
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '14px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <ShieldCheck size={24} color="#16A34A" style={{ flexShrink: 0 }} />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  backgroundColor: '#16A34A',
                                  color: '#FFFFFF',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                }}
                              >
                                النسخة الحالية المعتمدة (v{doc.currentVersion.versionNo})
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#14532D' }}>
                                {doc.currentVersion.fileName}
                              </span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#166534', margin: '4px 0 0' }}>
                              {doc.currentVersion.notes} • الحجم: {doc.currentVersion.formattedSize} • تاريخ الاعتماد: {doc.currentVersion.createdAt.split('T')[0]}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownload(doc.currentVersion!)}
                          disabled={downloadingId === doc.currentVersion.versionId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            backgroundColor: '#16A34A',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <Download size={13} />
                          <span>تنزيل النسخة الحالية</span>
                        </button>
                      </div>
                    )}

                    {/* Historical Versions Table */}
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#475569', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <History size={14} />
                        <span>النسخ الأرشيفية السابقة (تاريخ التعديلات والاستبدال)</span>
                      </div>

                      {!hasHistory ? (
                        <div
                          style={{
                            padding: '16px',
                            borderRadius: '8px',
                            backgroundColor: '#F8FAFC',
                            border: '1px dashed #CBD5E1',
                            fontSize: '12px',
                            color: '#64748B',
                            textAlign: 'center',
                          }}
                        >
                          لا توجد نسخ سابقة لهذا الشاهد (الإصدار الحالي v1 هو الإصدار الأول).
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                                <th style={{ padding: '10px 14px', fontWeight: 700 }}>الإصدار</th>
                                <th style={{ padding: '10px 14px', fontWeight: 700 }}>اسم الملف القديم</th>
                                <th style={{ padding: '10px 14px', fontWeight: 700 }}>الحجم</th>
                                <th style={{ padding: '10px 14px', fontWeight: 700 }}>تاريخ الرفع</th>
                                <th style={{ padding: '10px 14px', fontWeight: 700 }}>بيان الاستبدال / الملاحظات</th>
                                <th style={{ padding: '10px 14px', fontWeight: 700 }}>حالة الملف الفيزيائي</th>
                                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {doc.historicalVersions.map((ver) => (
                                <tr key={ver.versionId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                  <td style={{ padding: '12px 14px', fontWeight: 800, color: '#334155' }}>
                                    v{ver.versionNo}
                                  </td>
                                  <td style={{ padding: '12px 14px', color: '#1E293B', fontWeight: 600 }}>
                                    {ver.fileName}
                                  </td>
                                  <td style={{ padding: '12px 14px', color: '#64748B' }}>
                                    {ver.isFilePruned ? '0.00 MB' : ver.formattedSize}
                                  </td>
                                  <td style={{ padding: '12px 14px', color: '#64748B' }}>
                                    {ver.createdAt.split('T')[0]}
                                  </td>
                                  <td style={{ padding: '12px 14px', color: '#475569', maxWidth: '280px' }}>
                                    {ver.notes}
                                  </td>
                                  <td style={{ padding: '12px 14px' }}>
                                    {ver.isFilePruned ? (
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          backgroundColor: '#F1F5F9',
                                          color: '#64748B',
                                          border: '1px solid #E2E8F0',
                                        }}
                                      >
                                        محذوف فيزيائيًا (أرشيف فقط)
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          backgroundColor: '#FEF3C7',
                                          color: '#B45309',
                                          border: '1px solid #FDE68A',
                                        }}
                                      >
                                        مخزن بالقرص
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleDownload(ver)}
                                        disabled={ver.isFilePruned || downloadingId === ver.versionId}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '5px 10px',
                                          borderRadius: '6px',
                                          border: '1px solid #CBD5E1',
                                          backgroundColor: ver.isFilePruned ? '#F8FAFC' : '#FFFFFF',
                                          color: ver.isFilePruned ? '#94A3B8' : '#2563EB',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          cursor: ver.isFilePruned ? 'not-allowed' : 'pointer',
                                        }}
                                        title={ver.isFilePruned ? 'الملف الفيزيائي محذوف' : 'تحميل النسخة الأرشيفية'}
                                      >
                                        <Download size={12} />
                                        <span>تنزيل</span>
                                      </button>

                                      {!readOnly && !ver.isFilePruned && (
                                        <button
                                          type="button"
                                          onClick={() => handlePrune(doc, ver)}
                                          disabled={pruningId === ver.versionId}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '5px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid #FECACA',
                                            backgroundColor: '#FEF2F2',
                                            color: '#DC2626',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                          }}
                                          title="شطب وتفريغ الملف الفيزيائي من السيرفر مع إبقاء السجل في الأرشيف"
                                        >
                                          <Trash2 size={12} />
                                          <span>{pruningId === ver.versionId ? 'جاري الشطب...' : 'شطب الملف'}</span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
