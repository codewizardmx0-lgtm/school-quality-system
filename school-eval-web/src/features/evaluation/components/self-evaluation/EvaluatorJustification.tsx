import React from 'react';

interface EvaluatorJustificationProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  readOnly?: boolean;
}

export const EvaluatorJustification: React.FC<EvaluatorJustificationProps> = ({
  value,
  onChange,
  maxLength = 1000,
  readOnly = false,
}) => {
  const currentCount = value.length;
  const isNearLimit = currentCount > maxLength * 0.9;
  const isAtLimit = currentCount >= maxLength;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>
          المبررات التوثيقية وملاحظات المقيم الميدانية
        </label>
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 600,
            color: isAtLimit ? '#EF4444' : isNearLimit ? '#F59E0B' : '#64748B',
          }}
        >
          {currentCount} / {maxLength} حرف
        </span>
      </div>

      <textarea
        value={value}
        onChange={(e) => {
          if (e.target.value.length <= maxLength) {
            onChange(e.target.value);
          }
        }}
        disabled={readOnly}
        placeholder="أدخل مبررات التقدير المختار، مع ذكر السجلات والأدلة التي تم الرجوع إليها أو المقابلات المنفذة..."
        rows={4}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: '10px',
          border: `1px solid ${isAtLimit ? '#EF4444' : '#CBD5E1'}`,
          fontSize: '13px',
          lineHeight: '1.6',
          fontFamily: 'inherit',
          color: '#0F172A',
          backgroundColor: readOnly ? '#F8FAFC' : '#FFFFFF',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => {
          if (!readOnly) e.target.style.borderColor = '#059669';
        }}
        onBlur={(e) => {
          if (!readOnly) e.target.style.borderColor = '#CBD5E1';
        }}
      />
    </div>
  );
};
