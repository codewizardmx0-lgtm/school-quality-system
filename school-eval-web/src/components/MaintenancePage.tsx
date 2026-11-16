import React from 'react';
import { Wrench, RefreshCw, Shield } from 'lucide-react';
import { SYSTEM_FULL_NAME } from '../constants/systemConstants';

interface MaintenancePageProps {
  message?: string;
  onRetry?: () => void;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({
  message = 'النظام في وضع الصيانة المجدولة حاليًا، يرجى المحاولة لاحقًا.',
  onRetry,
}) => {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
        color: '#FFFFFF',
        fontFamily: "'Cairo', 'Segoe UI', system-ui, -apple-system, sans-serif",
        padding: '24px',
        boxSizing: 'border-box',
        direction: 'rtl',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background glow */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main card */}
      <div
        style={{
          position: 'relative',
          maxWidth: '560px',
          width: '100%',
          backgroundColor: 'rgba(30, 41, 59, 0.85)',
          backdropFilter: 'blur(16px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '48px 36px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* System Branding */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '9999px', backgroundColor: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', marginBottom: '28px' }}>
          <Shield size={16} color="#818CF8" />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#C7D2FE' }}>
            {SYSTEM_FULL_NAME}
          </span>
        </div>

        {/* Maintenance Icon */}
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '24px',
            backgroundColor: 'rgba(217, 119, 6, 0.15)',
            border: '2px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
            color: '#FBBF24',
          }}
        >
          <Wrench size={42} />
        </div>

        {/* Heading & description */}
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            margin: '0 0 12px 0',
            color: '#FFFFFF',
            lineHeight: 1.4,
          }}
        >
          النظام في وضع الصيانة المجدولة حاليًا
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: '#94A3B8',
            lineHeight: 1.7,
            margin: '0 0 32px 0',
          }}
        >
          {message}
          <br />
          يجري حاليًا تحديث وتحسين قواعد البيانات والأنظمة الفرعية لضمان استمرارية الخدمة بأعلى موثوقية وجودة. نعتذر عن أي إزعاج ونقدر تفهمكم.
        </p>

        {/* Action Button */}
        <button
          onClick={handleRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '14px 32px',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(90deg, #4F46E5, #6366F1)',
            color: '#FFFFFF',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 10px 20px -5px rgba(79, 70, 229, 0.4)',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 15px 25px -5px rgba(79, 70, 229, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(79, 70, 229, 0.4)';
          }}
        >
          <RefreshCw size={18} />
          <span>إعادة المحاولة الآن</span>
        </button>

        {/* Footer info */}
        <div style={{ marginTop: '36px', fontSize: '0.75rem', color: '#64748B', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
          <span>كود الحالة: 503 Service Unavailable • وضع الصيانة النشط</span>
        </div>
      </div>
    </div>
  );
};
export default MaintenancePage;
