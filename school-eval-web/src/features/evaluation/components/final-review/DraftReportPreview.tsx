import React from 'react';
import { Download, ShieldCheck } from 'lucide-react';

interface DraftReportPreviewProps {
  onExportPdf: () => void;
  isLocked?: boolean;
}

export const DraftReportPreview: React.FC<DraftReportPreviewProps> = ({
  onExportPdf,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        padding: '32px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
      }}
    >
      {/* Document Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid #E2E8F0',
          paddingBottom: '20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#059669',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>
              الجمهورية اليمنية — وزارة التربية والتعليم والبحث العلمي
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: '2px 0 0 0' }}>
              تقرير التقييم الذاتي المدرسي الشامل (النسخة الرسمية 2026)
            </h2>
          </div>
        </div>

        <button
          onClick={onExportPdf}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 18px',
            borderRadius: '8px',
            backgroundColor: '#059669',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Download size={15} />
          تصدير التقرير الرسمي (PDF)
        </button>
      </div>

      {/* Meta Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          backgroundColor: '#F8FAFC',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '24px',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>المدرسة</span>
          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>مدرسة الأمل النموذجية الثانوية</span>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>العام الدراسي</span>
          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>2026/2027</span>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>المقيم المعتمد</span>
          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>عمار عمر عبدالله</span>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>رمز الاعتماد والتتبع</span>
          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#059669' }}>ARQ-2026-SCH104-FIN</span>
        </div>
      </div>

      {/* Standards Summary Table in Report */}
      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
        خلاصة مؤشرات المعايير الوطنية السبعة
      </h3>
      <div style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', marginBottom: '24px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1' }}>
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700 }}>المعيار الوطني</th>
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700 }}>الوزن النسبي</th>
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700 }}>المؤشرات المنجزة</th>
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700 }}>متوسط التقدير (0-3)</th>
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700 }}>مستوى التحقق</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'STD-01: القيادة والإدارة المدرسية', weight: '15%', scored: '7 / 8', avg: '2.6', status: 'متحقق بدرجة عالية' },
              { name: 'STD-02: التعليم والتعلم وبيئة الصف', weight: '20%', scored: '8 / 10', avg: '2.1', status: 'متحقق بدرجة متوسطة' },
              { name: 'STD-03: نواتج التعلم والتحصيل الأكاديمي', weight: '20%', scored: '6 / 8', avg: '1.9', status: 'يتطلب تحسيناً' },
              { name: 'STD-04: البيئة المدرسية والصحة والسلامة', weight: '15%', scored: '6 / 8', avg: '2.4', status: 'متحقق بدرجة جيدة' },
              { name: 'STD-05: رعاية الطلبة والأنشطة اللاصفية', weight: '10%', scored: '5 / 8', avg: '2.0', status: 'متحقق بدرجة متوسطة' },
              { name: 'STD-06: المشاركة المجتمعية والشراكة الأسرية', weight: '10%', scored: '5 / 7', avg: '2.3', status: 'متحقق بدرجة جيدة' },
              { name: 'STD-07: التطوير والتحسين المستمر', weight: '10%', scored: '5 / 7', avg: '2.2', status: 'متحقق بدرجة جيدة' },
            ].map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0', fontSize: '12.5px' }}>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1E293B' }}>{row.name}</td>
                <td style={{ padding: '10px 12px', color: '#64748B' }}>{row.weight}</td>
                <td style={{ padding: '10px 12px', color: '#059669', fontWeight: 600 }}>{row.scored}</td>
                <td style={{ padding: '10px 12px', fontWeight: 800 }}>{row.avg}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#ECFDF5', color: '#059669' }}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Internal Review Note from School Principal */}
      <div
        style={{
          border: '1px dashed #059669',
          borderRadius: '10px',
          padding: '16px 20px',
          backgroundColor: '#F0FDF4',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#065F46', marginBottom: '4px' }}>
          اعتماد المراجعة الداخلية لمدير المدرسة
        </div>
        <p style={{ fontSize: '12.5px', color: '#166534', margin: 0, lineHeight: 1.6 }}>
          «اطلعت إدارة المدرسة على نتائج رصد التقييم الذاتي والشواهد المودعة في المستودع ومصفوفة خطة التحسين المرفقة، وتؤكد صحة البيانات المسجلة ومطابقتها لواقع المدرسة تمهيداً للإرسال والاعتماد الوزاري.»
        </p>
      </div>
    </div>
  );
};
