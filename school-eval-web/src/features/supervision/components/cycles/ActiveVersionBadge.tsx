/**
 * Component: ActiveVersionBadge
 * شريط الربط المباشر بوثيقة المعايير الوطنية المقفلة والمعتمدة
 */

import React from 'react';
import { Lock, ShieldCheck, CheckCircle2, Hash } from 'lucide-react';
import type { ActiveStandardVersion } from '../../api/supervisionTypes';

interface ActiveVersionBadgeProps {
  version: ActiveStandardVersion | null;
  isLoading?: boolean;
}

export const ActiveVersionBadge: React.FC<ActiveVersionBadgeProps> = ({
  version,
  isLoading = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '14px 20px',
        backgroundColor: '#0B0F19',
        border: '1px solid #1E293B',
        borderRadius: '12px',
        color: '#FFFFFF',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(11, 15, 25, 0.4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60A5FA',
            flexShrink: 0,
          }}
        >
          <Lock size={20} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
              {isLoading ? 'جاري التحقق من الإصدار المعياري...' : version?.title || 'وثيقة المعايير الوطنية المقرة'}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#93C5FD',
                backgroundColor: 'rgba(37, 99, 235, 0.25)',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {version?.versionNumber || '1.0.0'} مُقر نظامياً ونشط
            </span>
            {version?.checksum && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  color: '#94A3B8',
                  backgroundColor: 'rgba(51, 65, 85, 0.4)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Hash size={10} />
                SHA: {version.checksum.substring(0, 10)}...
              </span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#94A3B8', margin: '3px 0 0 0' }}>
            {version?.governanceNote ||
              'الإصدار مقفل ومُقرّ رسمياً من وزارة التربية والتعليم والبحث العلمي (BR-GEN-04). كافة المعايير والمؤشرات مقفلة ضد التعديل الميداني.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#CBD5E1' }}>
          <ShieldCheck size={16} color="#34D399" />
          <span>{version?.standardsCount ?? 7} معايير وطنية</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#CBD5E1' }}>
          <CheckCircle2 size={16} color="#34D399" />
          <span>{version?.indicatorsCount ?? 109} مؤشرات مقفلة</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#CBD5E1' }}>
          <span style={{ fontSize: '11px', color: '#93C5FD', fontWeight: 700 }}>
            الوزن: {version?.totalWeight ?? 100}%
          </span>
        </div>
      </div>
    </div>
  );
};
