import React, { useState } from 'react';
import type { PendingIndicatorItem } from '../../api/evaluationTypes';
import { AlertCircle, ArrowLeft, CheckCircle2, Search, Filter } from 'lucide-react';

interface PendingIndicatorsTableProps {
  indicators: PendingIndicatorItem[];
  onOpenIndicator: (indicatorId: number) => void;
}

export const PendingIndicatorsTable: React.FC<PendingIndicatorsTableProps> = ({
  indicators,
  onOpenIndicator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unscored' | 'missing-evidence'>('all');

  const filteredIndicators = indicators.filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.standardName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'unscored') {
      return item.scoreStatus === 'unscored' || item.score === null || item.score === undefined;
    }
    if (filterType === 'missing-evidence') {
      return (item.evidenceCount ?? 0) === 0 || item.evidenceStatus === 'missing';
    }
    return true;
  });

  const getScoreBadge = (item: PendingIndicatorItem) => {
    const isScored = item.scoreStatus === 'scored' || (item.score !== null && item.score !== undefined);
    if (!isScored) {
      return (
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '12px',
            backgroundColor: '#F1F5F9',
            color: '#64748B',
            border: '1px solid #CBD5E1',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94A3B8' }} />
          غير مدخل (معلق)
        </span>
      );
    }

    const level = item.score ?? 0;
    const config: Record<number, { bg: string; text: string; border: string; label: string }> = {
      3: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', label: 'المستوى 3: متحقق' },
      2: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', label: 'المستوى 2: متحقق بدرجة متوسطة' },
      1: { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', label: 'المستوى 1: متحقق بدرجة ضعيفة' },
      0: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', label: 'المستوى 0: غير متوفر' },
    };
    const c = config[level] || config[0];

    return (
      <span
        style={{
          fontSize: '11.5px',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: '12px',
          backgroundColor: c.bg,
          color: c.text,
          border: `1px solid ${c.border}`,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: c.text }} />
        {c.label}
      </span>
    );
  };

  const getEvidenceBadge = (item: PendingIndicatorItem) => {
    const count = item.evidenceCount ?? 0;
    const isSufficient = count > 0 || item.evidenceStatus === 'sufficient';

    if (isSufficient) {
      return (
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '12px',
            backgroundColor: '#ECFDF5',
            color: '#059669',
            border: '1px solid #A7F3D0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }} />
          مستوفٍ ({count} {count === 1 ? 'شاهد' : count === 2 ? 'شاهدان' : 'شواهد'})
        </span>
      );
    }

    return (
      <span
        style={{
          fontSize: '11.5px',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: '12px',
          backgroundColor: '#FEF2F2',
          color: '#DC2626',
          border: '1px solid #FECACA',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#DC2626' }} />
        ناقص (0 شواهد)
      </span>
    );
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        padding: '24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Title & Filter Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                عناصر تقييم بحاجة لاستيفاء التقديرات أو الشواهد
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  backgroundColor: indicators.length > 0 ? '#FEF2F2' : '#ECFDF5',
                  color: indicators.length > 0 ? '#DC2626' : '#059669',
                  border: `1px solid ${indicators.length > 0 ? '#FECACA' : '#A7F3D0'}`,
                }}
              >
                {indicators.length} عنصر بحاجة لإجراء
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
              المؤشرات التي تتطلب استيفاء التقديرات أو إرفاق الشواهد والأدلة قبل الرفع والاعتماد
            </p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        {indicators.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '6px 12px',
              }}
            >
              <Search size={14} color="#64748B" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالرمز أو العنوان..."
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  outline: 'none',
                  fontSize: '12px',
                  color: '#0F172A',
                  width: '150px',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color="#64748B" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <option value="all">عرض الكل ({indicators.length})</option>
                <option value="unscored">غير مقيم فقط</option>
                <option value="missing-evidence">شواهد ناقصة فقط</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {indicators.length === 0 ? (
        <div
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            backgroundColor: '#F8FAFC',
            borderRadius: '10px',
            border: '1px dashed #CBD5E1',
          }}
        >
          <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
            كافة مؤشرات التقييم مستوفاة بالكامل
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            تم رصد جميع التقديرات وإرفاق كافة الشواهد بنجاح، ملف التقييم جاهز للاعتماد والمراجعة.
          </div>
        </div>
      ) : filteredIndicators.length === 0 ? (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            backgroundColor: '#F8FAFC',
            borderRadius: '10px',
            color: '#64748B',
            fontSize: '13px',
          }}
        >
          لا توجد عناصر تطابق معايير البحث أو التصفية المختارة.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
          <table style={{ minWidth: '920px', width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9', backgroundColor: '#F8FAFC' }}>
                <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '90px' }}>
                  رمز المؤشر
                </th>
                <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  عنوان المؤشر المعياري
                </th>
                <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '170px' }}>
                  المجال المعياري
                </th>
                <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '160px' }}>
                  إدخال التقدير
                </th>
                <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '150px' }}>
                  الشواهد المرفقة
                </th>
                <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'center', width: '110px' }}>
                  الإجراء
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredIndicators.map((item) => (
                <tr
                  key={item.indicatorId}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#ECFDF5',
                        color: '#059669',
                        border: '1px solid #A7F3D0',
                      }}
                    >
                      {item.code}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: '#1E293B', maxWidth: '320px' }}>
                    {item.name}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12.5px', color: '#64748B' }}>
                    {item.standardName}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {getScoreBadge(item)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {getEvidenceBadge(item)}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onOpenIndicator(item.indicatorId)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#047857')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                    >
                      <span>استكمال</span>
                      <ArrowLeft size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
