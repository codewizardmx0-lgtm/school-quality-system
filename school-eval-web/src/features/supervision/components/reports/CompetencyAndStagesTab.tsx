/**
 * Component: CompetencyAndStagesTab
 * التبويب الثالث: التوزيع الإحصائي لمستويات الكفاءة ومقارنة المراحل الدراسية
 * يغطي متطلبات (FR-SUP-12) و (FR-SUP-14)
 */

import React from 'react';
import { Award, TrendingUp, AlertTriangle, Layers } from 'lucide-react';
import type { CentralReportsData } from '../../api/supervisionTypes';

interface CompetencyAndStagesTabProps {
  distribution?: CentralReportsData['distribution'];
  stageBreakdown?: CentralReportsData['stageBreakdown'];
}

export const CompetencyAndStagesTab: React.FC<CompetencyAndStagesTabProps> = ({
  distribution = {
    advancedPercentage: 0,
    proficientPercentage: 0,
    needsSupportPercentage: 0,
  },
  stageBreakdown = [],
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. بطاقات مستويات الكفاءة الثلاثية */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
          التوزيع الإحصائي لمدارس النطاق حسب مستويات الكفاءة (FR-SUP-12)
        </h2>
        <p style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '16px' }}>
          تصنيف مستويات الأداء وفق العتبات الوطنية المعتمدة لتوجيه التدخلات الإشرافية الميدانية (حظر لوحات الترتيب التنافسي)
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {/* متقدم / متميز */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #A7F3D0',
              borderTop: '4px solid #059669',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Award size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>متقدم / متميز</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>نسبة تحقق &ge; 80% (معدل &ge; 2.40)</div>
                </div>
              </div>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#059669' }}>
                {distribution.advancedPercentage}%
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${distribution.advancedPercentage}%`,
                  height: '100%',
                  backgroundColor: '#059669',
                  borderRadius: '999px',
                }}
              />
            </div>
            {distribution.advancedCount !== undefined && (
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '8px' }}>
                عدد المدارس: {distribution.advancedCount} مدرسة
              </div>
            )}
          </div>

          {/* متوسط / مستقر */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #BFDBFE',
              borderTop: '4px solid #2563EB',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>متوسط / مستقر</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>نسبة تحقق 60% - 79.9% (1.80 - 2.39)</div>
                </div>
              </div>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#2563EB' }}>
                {distribution.proficientPercentage}%
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${distribution.proficientPercentage}%`,
                  height: '100%',
                  backgroundColor: '#2563EB',
                  borderRadius: '999px',
                }}
              />
            </div>
            {distribution.proficientCount !== undefined && (
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '8px' }}>
                عدد المدارس: {distribution.proficientCount} مدرسة
              </div>
            )}
          </div>

          {/* بحاجة لدعم وتدخل */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #FECDD3',
              borderTop: '4px solid #DC2626',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#FFF1F2',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>بحاجة لدعم وتدخل</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>نسبة تحقق &lt; 60% (معدل &lt; 1.80)</div>
                </div>
              </div>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#DC2626' }}>
                {distribution.needsSupportPercentage}%
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${distribution.needsSupportPercentage}%`,
                  height: '100%',
                  backgroundColor: '#DC2626',
                  borderRadius: '999px',
                }}
              />
            </div>
            {distribution.needsSupportCount !== undefined && (
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '8px' }}>
                عدد المدارس: {distribution.needsSupportCount} مدرسة
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. جدول مقارنة المراحل الدراسية */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Layers size={18} color="#0F766E" />
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            مقارنة أداء المراحل الدراسية (FR-SUP-14)
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>المرحلة الدراسية</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '150px' }}>عدد المدارس</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '180px' }}>المتوسط الحسابي (0-3.00)</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '160px' }}>نسبة التحقق المقابلة</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '160px' }}>المستوى المعياري</th>
              </tr>
            </thead>
            <tbody>
              {stageBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                    لا تتوفر بيانات للمراحل الدراسية في النطاق المحدد.
                  </td>
                </tr>
              ) : (
                stageBreakdown.map((item, idx) => {
                  const pct = Math.round((item.averageScore / 3.0) * 100);
                  const isAdvanced = pct >= 80;
                  const isProficient = pct >= 60 && !isAdvanced;

                  return (
                    <tr
                      key={item.stage}
                      style={{
                        borderBottom: idx === stageBreakdown.length - 1 ? 'none' : '1px solid #F1F5F9',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0F172A' }}>
                        {item.stage}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                        {item.schoolsCount} مدرسة
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#0F172A' }}>
                        {item.averageScore.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>
                        <span style={{ color: isAdvanced ? '#059669' : isProficient ? '#2563EB' : '#DC2626' }}>
                          {pct}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '4px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            backgroundColor: isAdvanced ? '#ECFDF5' : isProficient ? '#EFF6FF' : '#FFF1F2',
                            color: isAdvanced ? '#059669' : isProficient ? '#2563EB' : '#DC2626',
                            border: `1px solid ${isAdvanced ? '#A7F3D0' : isProficient ? '#BFDBFE' : '#FECDD3'}`,
                          }}
                        >
                          {isAdvanced ? 'متميز' : isProficient ? 'متوسط ومستقر' : 'بحاجة لدعم'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};