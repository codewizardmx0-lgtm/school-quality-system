import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  ExternalLink,
  FileText,
  History,
  Link2,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { EvidenceItem, EvaluatorScreen } from '../../api/evaluationTypes';
import { designTokens } from '../../../../styles/designTokens';
import { EvidenceCard } from './EvidenceCard';

export type EvidenceSortField = 'standard' | 'title' | 'version' | 'size' | 'date' | 'links';
export type EvidenceSortDirection = 'asc' | 'desc';

interface EvidencePresentationSectionProps {
  viewMode: 'table' | 'grid';
  filteredEvidences: EvidenceItem[];
  sortedEvidences: EvidenceItem[];
  sortField: EvidenceSortField;
  sortDirection: EvidenceSortDirection;
  onSort: (field: EvidenceSortField) => void;
  readOnly: boolean;
  onNavigate?: (screen: EvaluatorScreen, param?: number) => void;
  onDownload: (ev: EvidenceItem) => void;
  onManageLinks: (ev: EvidenceItem) => void;
  onEditMetadata: (ev: EvidenceItem) => void;
  onReplaceVersion: (docId: number) => void;
  onViewVersions: (ev: EvidenceItem) => void;
  onDeleteUnlinked: (ev: EvidenceItem) => void;
}

const DOC_TYPE_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  minutes: { label: 'محضر اجتماع', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  plan: { label: 'خطة عمل', bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  record: { label: 'سجل رسمي', bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  report: { label: 'تقرير وإحصائية', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  board: { label: 'لوحة إعلانات', bg: '#FDF2F8', text: '#BE185D', border: '#FBCFE8' },
  image: { label: 'صورة فوتوغرافية', bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4' },
  evidence: { label: 'شاهد توثيقي', bg: '#F8FAFC', text: '#334155', border: '#CBD5E1' },
  other: { label: 'أخرى / عام', bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' },
};

const renderSortIcon = (
  field: EvidenceSortField,
  activeField: EvidenceSortField,
  direction: EvidenceSortDirection
) => {
  if (activeField !== field) {
    return <ArrowUpDown size={12} color="#94A3B8" />;
  }
  return direction === 'asc' ? (
    <ArrowUp size={13} color="#059669" />
  ) : (
    <ArrowDown size={13} color="#059669" />
  );
};

export const EvidencePresentationSection: React.FC<EvidencePresentationSectionProps> = ({
  viewMode,
  filteredEvidences,
  sortedEvidences,
  sortField,
  sortDirection,
  onSort,
  readOnly,
  onNavigate,
  onDownload,
  onManageLinks,
  onEditMetadata,
  onReplaceVersion,
  onViewVersions,
  onDeleteUnlinked,
}) => {
  if (viewMode === 'grid') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {sortedEvidences.map((ev) => (
          <EvidenceCard
            key={ev.id}
            evidence={ev}
            onReplaceVersion={(docId) => onReplaceVersion(docId)}
            onDownload={onDownload}
            readOnly={readOnly}
            onManageLinks={onManageLinks}
            onEditMetadata={onEditMetadata}
            onViewVersions={onViewVersions}
            onDeleteUnlinked={onDeleteUnlinked}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    );
  }

  return (
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
              <th
                onClick={() => onSort('title')}
                style={{
                  padding: '12px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: sortField === 'title' ? '#059669' : '#475569',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                title="ترتيب أبجدي حسب عنوان الشاهد"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span>عنوان الشاهد</span>
                  {renderSortIcon('title', sortField, sortDirection)}
                </div>
              </th>

              <th
                onClick={() => onSort('standard')}
                style={{
                  padding: '12px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: sortField === 'standard' ? '#059669' : '#475569',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                title="ترتيب معياري حسب تسلسل المعايير"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span>المعيار الوطني</span>
                  {renderSortIcon('standard', sortField, sortDirection)}
                </div>
              </th>

              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                المؤشر
              </th>

              <th
                onClick={() => onSort('version')}
                style={{
                  padding: '12px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: sortField === 'version' ? '#059669' : '#475569',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                title="فرز حسب رقم الإصدار"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span>الإصدار</span>
                  {renderSortIcon('version', sortField, sortDirection)}
                </div>
              </th>

              <th
                onClick={() => onSort('size')}
                style={{
                  padding: '12px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: sortField === 'size' ? '#059669' : '#475569',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                title="فرز حسب حجم الملف"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span>الحجم والصيغة</span>
                  {renderSortIcon('size', sortField, sortDirection)}
                </div>
              </th>

              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                نوع الوثيقة
              </th>

              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>
                الإجراءات
              </th>
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
              sortedEvidences.map((ev) => {
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

                const docConf = DOC_TYPE_STYLES[ev.documentType || 'other'] || DOC_TYPE_STYLES.other;

                return (
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
                      {uniqueStds.length === 0 || ev.isUnlinked ? (
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#B45309', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', padding: '3px 8px', borderRadius: '6px' }}>
                          غير مرتبط بأي مؤشر
                        </span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {uniqueStds.map((std, sIdx) => (
                            <div key={sIdx} style={{ fontSize: '12px' }}>
                              <span style={{ fontWeight: 700, color: '#059669' }}>{std.code}:</span> {std.name}
                            </div>
                          ))}
                        </div>
                      )}
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
                              {onNavigate && li.indicatorId ? (
                                <button
                                  type="button"
                                  onClick={() => onNavigate('rubric-assessment', li.indicatorId)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '2px 7px',
                                    borderRadius: '5px',
                                    backgroundColor: '#EFF6FF',
                                    border: '1px solid #BFDBFE',
                                    color: '#1D4ED8',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title={`الانتقال المباشر لتقييم المؤشر ${li.indicatorCode} ↗`}
                                >
                                  <span>{li.indicatorCode}</span>
                                  <ExternalLink size={10} />
                                </button>
                              ) : (
                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                  {li.indicatorCode}
                                </span>
                              )}
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
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: docConf.bg,
                          color: docConf.text,
                          border: `1px solid ${docConf.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {docConf.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => onDownload(ev)}
                          style={designTokens.buttons.iconAction}
                          title="تحميل الشاهد"
                        >
                          <Download size={15} color="#059669" />
                        </button>

                        {!readOnly && (
                          <button
                            onClick={() => onManageLinks(ev)}
                            style={designTokens.buttons.iconAction}
                            title="إدارة علاقات الشاهد وربطه بالمؤشرات"
                          >
                            <Link2 size={15} color="#2563EB" />
                          </button>
                        )}

                        {!readOnly && (
                          <button
                            onClick={() => onEditMetadata(ev)}
                            style={designTokens.buttons.iconAction}
                            title="تعديل بيانات الشاهد والنوع والوصف"
                          >
                            <Pencil size={15} color="#475569" />
                          </button>
                        )}

                        {!readOnly && (
                          <button
                            onClick={() => onReplaceVersion(ev.documentId)}
                            style={designTokens.buttons.iconAction}
                            title="رفع نسخة بديلة دون حذف النسخ السابقة"
                          >
                            <RefreshCw size={15} color="#D97706" />
                          </button>
                        )}

                        <button
                          onClick={() => onViewVersions(ev)}
                          style={designTokens.buttons.iconAction}
                          title="استعراض سجل الإصدارات التاريخية للشاهد"
                        >
                          <History size={15} color="#4F46E5" />
                        </button>

                        {!readOnly && (ev.isUnlinked || !ev.linkedIndicators || ev.linkedIndicators.length === 0) && (
                          <button
                            onClick={() => onDeleteUnlinked(ev)}
                            style={{
                              ...designTokens.buttons.iconAction,
                              backgroundColor: '#FEF2F2',
                              borderColor: '#FECACA',
                            }}
                            title="حذف هذا الشاهد غير المرتبط نهائياً من مستودع المدرسة"
                          >
                            <Trash2 size={15} color="#DC2626" />
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
  );
};
