/**
 * Component: GapsAndInterventionsTab
 * التبويب الرابع: مصفوفة الفجوات وأولويات التدخل الإشرافي الميداني
 * يغطي متطلبات (FR-SUP-13) و (FR-SUP-14)
 */

import React from 'react';
import { Compass, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { IndicatorMeanItem } from '../../api/supervisionTypes';

interface GapsAndInterventionsTabProps {
  topStrengths?: IndicatorMeanItem[];
  bottomGaps?: IndicatorMeanItem[];
  policySynthesisNote?: string;
}

export const GapsAndInterventionsTab: React.FC<GapsAndInterventionsTabProps> = ({
  topStrengths = [],
  bottomGaps = [],
  policySynthesisNote,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. بطاقة التركيب السياساتي والتوجيه الاستراتيجي */}
      {policySynthesisNote && (
        <div
          style={{
            backgroundColor: '#F0FDFA',
            borderRadius: '12px',
            border: '1px solid #99F6E4',
            borderRight: '5px solid #0D9488',
            padding: '18px 24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#CCFBF1',
              color: '#0F766E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px',
            }}
          >
            <Compass size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F766E', margin: 0, marginBottom: '4px' }}>
              خلاصة الرصد والتوجيه الإشرافي الميداني (FR-SUP-14)
            </h3>
            <p style={{ fontSize: '13px', color: '#134E4A', lineHeight: 1.6, margin: 0 }}>
              {policySynthesisNote}
            </p>
          </div>
        </div>
      )}

      {/* 2. جدولان متجاوران: نقاط القوة وأولويات التدخل */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '20px',
        }}
      >
        {/* أ) أبرز نقاط القوة (Top 10) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            borderTop: '4px solid #059669',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowUpRight size={15} />
              </div>
              <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                أبرز نقاط القوة الوطنية (أعلى المؤشرات تحققاً)
              </h3>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '4px' }}>
              Top 10
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                  <th style={{ padding: '9px 12px', textAlign: 'right', width: '85px' }}>الرمز</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right' }}>المؤشر الوطني</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center', width: '80px' }}>المتوسط</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center', width: '90px' }}>نسبة التحقق</th>
                </tr>
              </thead>
              <tbody>
                {topStrengths.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                      لا تتوفر نتائج مرصودة حتى الآن.
                    </td>
                  </tr>
                ) : (
                  topStrengths.map((ind, idx) => (
                    <tr
                      key={ind.indicatorId}
                      style={{
                        borderBottom: idx === topStrengths.length - 1 ? 'none' : '1px solid #F1F5F9',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                      }}
                    >
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#475569', fontSize: '11.5px' }}>
                        {ind.code}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{ind.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{ind.standardName}</div>
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: '#0F172A' }}>
                        {ind.meanScore.toFixed(2)}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 800, color: '#059669' }}>
                        {ind.percentageAttainment.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ب) أولويات التدخل والدعم (Bottom 10) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            borderTop: '4px solid #DC2626',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  backgroundColor: '#FFF1F2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowDownRight size={15} />
              </div>
              <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                أولويات الدعم والتدخل الإشرافي (أدنى المؤشرات تحققاً)
              </h3>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', backgroundColor: '#FFF1F2', padding: '2px 8px', borderRadius: '4px' }}>
              Bottom 10
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                  <th style={{ padding: '9px 12px', textAlign: 'right', width: '85px' }}>الرمز</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right' }}>المؤشر الوطني</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center', width: '80px' }}>المتوسط</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center', width: '90px' }}>نسبة التحقق</th>
                </tr>
              </thead>
              <tbody>
                {bottomGaps.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                      لا تتوفر نتائج مرصودة حتى الآن.
                    </td>
                  </tr>
                ) : (
                  bottomGaps.map((ind, idx) => (
                    <tr
                      key={ind.indicatorId}
                      style={{
                        borderBottom: idx === bottomGaps.length - 1 ? 'none' : '1px solid #F1F5F9',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                      }}
                    >
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#475569', fontSize: '11.5px' }}>
                        {ind.code}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{ind.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{ind.standardName}</div>
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: '#0F172A' }}>
                        {ind.meanScore.toFixed(2)}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 800, color: '#DC2626' }}>
                        {ind.percentageAttainment.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};