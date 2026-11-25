import React, { useState, useMemo } from 'react';
import {
  FolderGit2,
  FileText,
  Search,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  HardDrive,
  Link2,
  Layers,
  ChevronDown,
  ChevronLeft,
} from 'lucide-react';
import type {
  SupervisionVaultDocument,
  SupervisionVaultStats,
  SupervisionStandardItem,
} from '../../api/supervisionTypes';
import { supervisionApi } from '../../api/supervisionApi';

// معجم تعريب تصنيفات الوثائق الرسمية
const translateDocType = (type?: string): string => {
  if (!type) return 'وثيقة أخرى';
  const map: Record<string, string> = {
    plan: 'خطة تشغيلية / إجرائية',
    minutes: 'محضر اجتماع',
    report: 'تقرير دوري / ختامي',
    circular: 'تعميم / قرار إداري',
    decision: 'قرار وزاري / مدرسي',
    schedule: 'جدول دراسي / حصص',
    table: 'جدول إحصائي / بياني',
    list: 'كشف / بيان مدرسي',
    record: 'سجل رسمي',
    form: 'استمارة / نموذج',
    certificate: 'شهادة / إفادة',
    survey: 'استبيان / استطلاع رأي',
    policy: 'سياسة / لائحة تنظيمية',
    handbook: 'دليل إرشادي',
    photo: 'صورة توثيقية ميدانية',
    video: 'مقطع مرئي توثيقي',
    audio: 'تسجيل صوتي',
    other: 'وثيقة أخرى',
  };
  return map[type.toLowerCase()] || type;
};

interface SupervisionEvidenceVaultTabProps {
  vault?: {
    documents: SupervisionVaultDocument[];
    stats: SupervisionVaultStats;
  };
  evidenceInventory?: unknown;
  standards?: SupervisionStandardItem[];
}

export const SupervisionEvidenceVaultTab: React.FC<SupervisionEvidenceVaultTabProps> = ({
  vault,
  evidenceInventory: _evidenceInventory,
  standards = [],
}) => {
  const [subTab, setSubTab] = useState<'vault' | 'inventory'>('vault');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [collapsedInventoryStandards, setCollapsedInventoryStandards] = useState<Record<number, boolean>>({});

  const documents = useMemo(() => vault?.documents || [], [vault?.documents]);
  const stats = vault?.stats || {
    totalDocuments: documents.length,
    totalLinks: 0,
    totalSizeBytes: 0,
    documentTypesCount: 0,
  };

  // تنسيق حجم الملفات
  const formattedTotalSize = useMemo(() => {
    const bytes = stats.totalSizeBytes;
    const mb = (bytes / 1048576).toFixed(1);
    return `${mb} MB`;
  }, [stats.totalSizeBytes]);

  // أنواع المستندات المتاحة للفلترة
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    documents.forEach((d) => {
      if (d.documentType) types.add(d.documentType);
    });
    return Array.from(types);
  }, [documents]);

  // فلترة مستندات الخزانة
  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return documents.filter((doc) => {
      const matchesSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.description.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        doc.linkedIndicators.some(
          (ind) => ind.code.toLowerCase().includes(q) || ind.title.toLowerCase().includes(q)
        );

      if (!matchesSearch) return false;

      if (selectedType !== 'all' && doc.documentType !== selectedType) {
        return false;
      }

      if (selectedFormat !== 'all') {
        const mime = doc.mimeType.toLowerCase();
        if (selectedFormat === 'pdf' && !mime.includes('pdf')) return false;
        if (selectedFormat === 'word' && !mime.includes('word') && !mime.includes('officedocument.wordprocessingml'))
          return false;
        if (selectedFormat === 'excel' && !mime.includes('excel') && !mime.includes('spreadsheetml'))
          return false;
        if (selectedFormat === 'image' && !mime.includes('image')) return false;
      }

      return true;
    });
  }, [documents, searchQuery, selectedType, selectedFormat]);

  // إحصائيات الجرد الميداني الشامل للمؤشرات الـ 109
  const inventoryKpis = useMemo(() => {
    let totalInds = 0;
    let sufficientCount = 0;
    let missingCount = 0;
    let totalReqs = 0;
    let coveredReqs = 0;

    standards.forEach((std) => {
      std.subStandards.forEach((sub) => {
        sub.indicators.forEach((ind) => {
          totalInds++;
          const isSufficient =
            ind.evidenceCount > 0 &&
            ind.coveredRequirementsCount >= ind.mandatoryRequirementsCount;
          if (isSufficient) {
            sufficientCount++;
          } else {
            missingCount++;
          }
          totalReqs += ind.mandatoryRequirementsCount;
          coveredReqs += ind.coveredRequirementsCount;
        });
      });
    });

    const overallPct = totalReqs > 0 ? Math.round((coveredReqs / totalReqs) * 100) : 100;

    return {
      totalIndicators: totalInds || 109,
      sufficientCount,
      missingCount,
      overallCoveragePct: overallPct,
    };
  }, [standards]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. بطاقات الإحصائيات المركزية لمستودع الشواهد */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
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
            <FolderGit2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
              الوثائق المودعة في الخزانة
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
              {stats.totalDocuments}{' '}
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>وثيقة فريدة</span>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#ECFDF5',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Link2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
              إجمالي روابط المؤشرات
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
              {stats.totalLinks}{' '}
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>رابط استدلال</span>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#F5F3FF',
              color: '#8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HardDrive size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
              إجمالي المساحة التخزينية
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
              {formattedTotalSize}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#FFFBEB',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
              تصنيفات الوثائق
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
              {availableTypes.length}{' '}
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>تصنيف نوعي</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. شريط التبويبات الفرعية: خزانة الوثائق المودعة vs جرد وتغطية الشواهد */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '2px solid #E2E8F0',
          paddingBottom: '2px',
        }}
      >
        <button
          type="button"
          onClick={() => setSubTab('vault')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            fontSize: '13px',
            fontWeight: 700,
            color: subTab === 'vault' ? '#2563EB' : '#64748B',
            backgroundColor: subTab === 'vault' ? '#EFF6FF' : 'transparent',
            borderBottom: subTab === 'vault' ? '2px solid #2563EB' : 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <FolderGit2 size={16} />
          خزانة الوثائق المودعة للمدرسة ({documents.length})
        </button>

        <button
          type="button"
          onClick={() => setSubTab('inventory')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            fontSize: '13px',
            fontWeight: 700,
            color: subTab === 'inventory' ? '#2563EB' : '#64748B',
            backgroundColor: subTab === 'inventory' ? '#EFF6FF' : 'transparent',
            borderBottom: subTab === 'inventory' ? '2px solid #2563EB' : 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Layers size={16} />
          جرد وتغطية الشواهد حسب المعايير (109)
        </button>
      </div>

      {/* 3. محتوى التبويب الفرعي الأول: خزانة الوثائق المودعة */}
      {subTab === 'vault' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* شريط أدوات الفلترة والبحث لخزانة الوثائق */}
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', flex: 1 }}>
              {/* البحث */}
              <div style={{ position: 'relative', minWidth: '260px', flex: 1, maxWidth: '400px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                  }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الوثيقة، المؤشر، أو الملف..."
                  style={{
                    width: '100%',
                    padding: '8px 36px 8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* فلتر نوع المستند بتعريب رسمي */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  color: '#334155',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="all">كافة أنواع المستندات</option>
                {availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {translateDocType(t)}
                  </option>
                ))}
              </select>

              {/* فلتر صيغة الملف */}
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  color: '#334155',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="all">كافة الصيغ (PDF, Word, Excel, صور)</option>
                <option value="pdf">ملفات PDF</option>
                <option value="word">مستندات Word</option>
                <option value="excel">جداول Excel</option>
                <option value="image">صور ميدانية</option>
              </select>
            </div>

            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              عرض {filteredDocuments.length} من أصل {documents.length} وثيقة
            </div>
          </div>

          {/* جدول خزانة الوثائق المودعة */}
          {filteredDocuments.length === 0 ? (
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                color: '#64748B',
              }}
            >
              <FolderGit2 size={32} color="#94A3B8" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                لا توجد وثائق مطابقة لمعايير البحث
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        الوثيقة المودعة
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        النوع والتصنيف
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        الإصدار
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        الملف والحجم
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        المؤشرات المرتبطة بها
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        تاريخ الإيداع
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc, idx) => (
                      <tr
                        key={doc.id}
                        style={{
                          borderBottom: idx === filteredDocuments.length - 1 ? 'none' : '1px solid #F1F5F9',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {/* عنوان الوثيقة */}
                        <td style={{ padding: '14px 16px', maxWidth: '300px' }}>
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
                              <FileText size={18} />
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                                {doc.title}
                              </div>
                              {doc.description && (
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: '#64748B',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '260px',
                                    marginTop: '2px',
                                  }}
                                >
                                  {doc.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* نوع الوثيقة المعرّب */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#F1F5F9',
                              color: '#334155',
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            {doc.documentTypeArabic || translateDocType(doc.documentType)}
                          </span>
                        </td>

                        {/* الإصدار */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#EFF6FF',
                              color: '#2563EB',
                            }}
                          >
                            v{doc.versionNumber || 1}.0
                          </span>
                        </td>

                        {/* الملف والحجم */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                            {doc.fileName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            {doc.fileSizeFormatted}
                          </div>
                        </td>

                        {/* المؤشرات المرتبطة بالاسم والرمز */}
                        <td style={{ padding: '14px 16px', maxWidth: '300px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {doc.linkedIndicators.map((ind) => (
                              <span
                                key={ind.indicatorId}
                                title={`${ind.code} - ${ind.title}`}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#EFF6FF',
                                  color: '#1D4ED8',
                                  border: '1px solid #DBEAFE',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span style={{ fontWeight: 800 }}>{ind.code}</span>
                                <span style={{ fontWeight: 500, color: '#475569', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {ind.title}
                                </span>
                              </span>
                            ))}
                            {doc.linkedIndicators.length === 0 && (
                              <span style={{ fontSize: '11px', color: '#94A3B8' }}>غير مرتبطة</span>
                            )}
                          </div>
                        </td>

                        {/* تاريخ الإيداع */}
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748B' }}>
                          {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('ar-YE') : '—'}
                        </td>

                        {/* الإجراءات المصادقة */}
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => supervisionApi.previewDocumentVersion(doc.versionId || doc.documentVersionId || doc.id || doc.previewUrl || '')}
                              title="معاينة الوثيقة في نافذة جديدة"
                              style={{
                                padding: '6px',
                                borderRadius: '6px',
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #CBD5E1',
                                color: '#475569',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => supervisionApi.downloadDocumentVersion(doc.versionId || doc.documentVersionId || doc.id || doc.downloadUrl || '', doc.fileName)}
                              title="تحميل الملف الأصلي"
                              style={{
                                padding: '6px',
                                borderRadius: '6px',
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#2563EB',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. محتوى التبويب الفرعي الثاني: جرد وتغطية الشواهد حسب المعايير الـ 7 */}
      {subTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* البطاقات الإحصائية الأربع لجرد الشواهد */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
            }}
          >
            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>إجمالي المؤشرات الوطنية</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
                {inventoryKpis.totalIndicators} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>مؤشراً</span>
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#166534' }}>مؤشرات مستوفاة الشواهد</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803D', marginTop: '2px' }}>
                {inventoryKpis.sufficientCount} <span style={{ fontSize: '11px', fontWeight: 500, color: '#166534' }}>مؤشراً مستوفى</span>
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#991B1B' }}>مؤشرات ناقصة الشواهد</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
                {inventoryKpis.missingCount} <span style={{ fontSize: '11px', fontWeight: 500, color: '#991B1B' }}>مؤشراً ناقصاً</span>
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#1E40AF' }}>نسبة الكفاية الإجمالية للشواهد</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
                {inventoryKpis.overallCoveragePct}%
              </div>
            </div>
          </div>

          {/* شريط التحكم في طي وتوسيع المعايير */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>
              مصفوفة مطابقة الشواهد والمتطلبات الإلزامية (109 مؤشراً):
            </div>
            <button
              type="button"
              onClick={() => {
                const allCollapsed = standards.every((s) => collapsedInventoryStandards[s.standardId]);
                const next: Record<number, boolean> = {};
                standards.forEach((s) => {
                  next[s.standardId] = !allCollapsed;
                });
                setCollapsedInventoryStandards(next);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#F1F5F9',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <Layers size={13} />
              {standards.every((s) => collapsedInventoryStandards[s.standardId]) ? 'توسيع كافة المعايير' : 'طي كافة المعايير'}
            </button>
          </div>

          {/* مصفوفة جرد الشواهد والمتطلبات الإلزامية حسب المعايير السبعة */}
          {standards.map((std) => {
            const allIndicators = std.subStandards.flatMap((sub) => sub.indicators);
            const isCollapsed = !!collapsedInventoryStandards[std.standardId];

            return (
              <div
                key={std.standardId}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  overflow: 'hidden',
                }}
              >
                {/* ترويسة المعيار في الجرد - قابلة للطي والتوسيع */}
                <div
                  onClick={() =>
                    setCollapsedInventoryStandards((prev) => ({
                      ...prev,
                      [std.standardId]: !prev[std.standardId],
                    }))
                  }
                  style={{
                    padding: '14px 18px',
                    backgroundColor: isCollapsed ? '#FFFFFF' : '#F8FAFC',
                    borderBottom: isCollapsed ? 'none' : '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#EFF6FF',
                        color: '#2563EB',
                        fontWeight: 800,
                        fontSize: '12px',
                      }}
                    >
                      {std.code}
                    </span>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>
                      {std.title}
                    </h4>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      تغطية المتطلبات: {std.stats.coveredRequirements} من أصل {std.stats.totalMandatoryRequirements} متطلب ({std.stats.coveragePercentage}%)
                    </div>
                    <div style={{ color: '#64748B', display: 'flex', alignItems: 'center' }}>
                      {isCollapsed ? <ChevronLeft size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* جدول المؤشرات والشواهد والمتطلبات التفصيلية */}
                {!isCollapsed && (
                  <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
                        <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                          رمز المؤشر
                        </th>
                        <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                          عنوان المؤشر
                        </th>
                        <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                          المتطلبات الإلزامية
                        </th>
                        <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                          حالة الكفاية
                        </th>
                        <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                          تفصيل تغطية المتطلبات والملفات المودعة
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allIndicators.map((ind, iIdx) => {
                        const isSufficient = ind.evidenceCount > 0 && ind.coveredRequirementsCount >= ind.mandatoryRequirementsCount;

                        return (
                          <tr
                            key={ind.indicatorId}
                            style={{
                              borderBottom: iIdx === allIndicators.length - 1 ? 'none' : '1px solid #F1F5F9',
                            }}
                          >
                            <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: '#1E293B' }}>
                              {ind.code}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '12px', color: '#334155', maxWidth: '280px' }}>
                              {ind.title}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748B' }}>
                              {ind.coveredRequirementsCount} / {ind.mandatoryRequirementsCount} متطلب
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: isSufficient ? '#DCFCE7' : '#FEF2F2',
                                  color: isSufficient ? '#15803D' : '#DC2626',
                                }}
                              >
                                {isSufficient ? (
                                  <>
                                    <CheckCircle2 size={12} />
                                    مستوفى
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle size={12} />
                                    شواهد ناقصة
                                  </>
                                )}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {/* تفصيل المتطلبات إن وجدت */}
                                {ind.evidenceRequirements?.map((req) => (
                                  <div
                                    key={req.id || req.requirementId}
                                    style={{
                                      fontSize: '11px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      color: req.isCovered ? '#15803D' : '#B45309',
                                    }}
                                  >
                                    <span>{req.isCovered ? '✓' : '⚠'}</span>
                                    <span style={{ fontWeight: 600 }}>{req.title}:</span>
                                    <span style={{ color: '#64748B' }}>
                                      {req.coveringDocumentsSummary || (req.coveringDocuments && req.coveringDocuments.length > 0 ? req.coveringDocuments.join('، ') : 'لا يوجد')}
                                    </span>
                                  </div>
                                ))}

                                {/* أزرار معاينة الملفات المودعة */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                  {ind.evidences.map((ev) => (
                                    <div
                                      key={ev.id}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: '#F8FAFC',
                                        border: '1px solid #CBD5E1',
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => supervisionApi.previewDocumentVersion(ev.versionId || ev.documentVersionId || ev.id || ev.fileUrl)}
                                        title={`معاينة: ${ev.fileName}`}
                                        style={{
                                          fontSize: '11px',
                                          background: 'none',
                                          border: 'none',
                                          color: '#2563EB',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: 0,
                                        }}
                                      >
                                        <Eye size={11} />
                                        {ev.fileName}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => supervisionApi.downloadDocumentVersion(ev.versionId || ev.documentVersionId || ev.id || ev.fileUrl, ev.fileName)}
                                        title={`تحميل: ${ev.fileName}`}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: '#059669',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          padding: '0 2px',
                                        }}
                                      >
                                        <Download size={11} />
                                      </button>
                                    </div>
                                  ))}
                                  {ind.evidences.length === 0 && (
                                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>لا توجد ملفات مرفقة</span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
