/**
 * Component: IndicatorAuditRow
 * صف فحص وتدقيق مؤشر مع الشواهد المرفقة وإمكانية رصد النواقص
 */

import React from 'react';
import { FileText, ExternalLink, AlertTriangle } from 'lucide-react';
import type { IndicatorAuditItem } from '../../api/supervisionTypes';

interface IndicatorAuditRowProps {
  indicator: IndicatorAuditItem;
  isDefective: boolean;
  onToggleDefect: () => void;
}

export const IndicatorAuditRow: React.FC<IndicatorAuditRowProps> = ({
  indicator,
  isDefective,
  onToggleDefect,
}) => {
  const getScoreBadge = (score: number, levelName: string) => {
    const config =
      score === 3
        ? { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }
        : score === 2
        ? { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' }
        : score === 1
        ? { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' }
        : { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' };

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '6px',
          backgroundColor: config.bg,
          color: config.text,
          border: `1px solid ${config.border}`,
          fontSize: '11px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        <span>{score}/3</span>
        <span>•</span>
        <span>{levelName}</span>
      </span>
    );
  };

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '10px',
        backgroundColor: isDefective ? '#FFFBEB' : '#FFFFFF',
        border: isDefective ? '1px solid #FCD34D' : '1px solid #E2E8F0',
        marginBottom: '12px',
        transition: 'all 0.15s ease',
      }}
    >
      {/* سطر المعيار والرمز والتقدير ورصد الخلل */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '8px',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                padding: '2px 7px',
                borderRadius: '4px',
              }}
            >
              {indicator.code}
            </span>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
              {indicator.standardName} • {indicator.subStandardName}
            </span>
          </div>

          <h3
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#0F172A',
              margin: '0 0 6px 0',
              lineHeight: 1.4,
            }}
          >
            {indicator.title}
          </h3>

          {indicator.scoreDescription && (
            <p
              style={{
                fontSize: '12px',
                color: '#475569',
                margin: '0 0 8px 0',
                backgroundColor: '#F8FAFC',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #F1F5F9',
              }}
            >
              <strong>مبرر المدرسة:</strong> {indicator.scoreDescription}
            </p>
          )}
        </div>

        {/* التقدير ورصد الخلل */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          {getScoreBadge(indicator.schoolScore, indicator.scoreLevelName)}

          <button
            type="button"
            onClick={onToggleDefect}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              border: isDefective ? '1px solid #D97706' : '1px solid #CBD5E1',
              backgroundColor: isDefective ? '#F59E0B' : '#FFFFFF',
              color: isDefective ? '#FFFFFF' : '#64748B',
              transition: 'all 0.15s ease',
            }}
          >
            <AlertTriangle size={13} color={isDefective ? '#FFFFFF' : '#D97706'} />
            <span>{isDefective ? 'محدد للاستكمال ✓' : 'رصد نقص الشاهد'}</span>
          </button>
        </div>
      </div>

      {/* الشواهد المرفقة */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #F1F5F9',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
          الشواهد المرفقة ({indicator.evidences.length}):
        </span>

        {indicator.evidences.length > 0 ? (
          indicator.evidences.map((ev) => (
            <a
              key={ev.id}
              href={ev.fileUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                e.preventDefault();
                alert(`معاينة وثيقة الشاهد: ${ev.fileName} (${ev.fileSizeFormatted})`);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#2563EB',
                fontSize: '11px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <FileText size={13} />
              <span>{ev.fileName}</span>
              <ExternalLink size={11} color="#64748B" />
            </a>
          ))
        ) : (
          <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600 }}>
            لا يوجد شاهد مرفوع!
          </span>
        )}
      </div>

      {/* تنبيه الخلل في حال تم التحديد */}
      {isDefective && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: '#FEF3C7',
            border: '1px solid #FDE68A',
            fontSize: '12px',
            color: '#92400E',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={15} color="#D97706" />
          <span>
            <strong>توجيه المشرف:</strong> {indicator.defectReason || 'نقص وثيقة الشاهد الميداني ومحضر المعالجة الفصلية.'}
          </span>
        </div>
      )}
    </div>
  );
};
