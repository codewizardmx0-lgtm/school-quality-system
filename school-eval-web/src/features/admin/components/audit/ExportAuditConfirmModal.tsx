import React from 'react';
import { FileSpreadsheet, X, Filter, User, Clock, Search, ShieldCheck } from 'lucide-react';
import { theme } from '../../theme';
import { AUDIT_EVENT_LABELS } from '../../hooks/useAdminAudit';

interface ExportAuditConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isExporting: boolean;
  totalCount: number;
  selectedActions: string[];
  actor: string;
  timeScope: string;
  searchQuery: string;
}

export const ExportAuditConfirmModal: React.FC<ExportAuditConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isExporting,
  totalCount,
  selectedActions,
  actor,
  timeScope,
  searchQuery,
}) => {
  if (!isOpen) return null;

  const timeScopeLabel =
    timeScope === '24h'
      ? 'آخر 24 ساعة'
      : timeScope === '7d'
      ? 'آخر 7 أيام'
      : timeScope === '30d'
      ? 'آخر 30 يوماً'
      : 'كامل الأرشيف (كل السجلات)';

  const selectedActionLabels = selectedActions.map(
    (actionKey) => AUDIT_EVENT_LABELS[actionKey] || actionKey
  );

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        direction: 'rtl',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #F1F5F9',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                تأكيد استخراج سجل التدقيق الأمني
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                مراجعة شروط الفلترة المطبقة قبل توليد ملف الـ Excel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Informational Alert */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '12.5px',
              color: '#1E40AF',
              lineHeight: 1.5,
            }}
          >
            <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              سيتم تصدير ملف Excel (.xlsx) دقيق وموثق بالبصمات الرقمية SHA-256 يحتوي <strong>حصراً</strong> على العمليات المطابقة لمعايير الفلترة المحددة أدناه:
            </div>
          </div>

          {/* Active Filter Criteria Box */}
          <div
            style={{
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Criteria 1: Operations */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Filter size={16} color="#64748B" style={{ marginTop: '3px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>نوع العمليات المستهدفة:</div>
                {selectedActionLabels.length === 0 ? (
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    جميع العمليات (بدون استثناء - الكل)
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                    {selectedActionLabels.map((lbl, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#EEF2FF',
                          color: '#4338CA',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid #C7D2FE',
                        }}
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Criteria 2: Actor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={16} color="#64748B" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>الفاعل / الحساب: </span>
                <strong style={{ fontSize: '12.5px', color: '#0F172A' }}>
                  {actor === 'الكل' ? 'جميع الحسابات والمستخدمين' : actor}
                </strong>
              </div>
            </div>

            {/* Criteria 3: Time Scope */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={16} color="#64748B" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>النطاق الزمني: </span>
                <strong style={{ fontSize: '12.5px', color: '#0F172A' }}>{timeScopeLabel}</strong>
              </div>
            </div>

            {/* Criteria 4: Search query if any */}
            {searchQuery && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Search size={16} color="#64748B" style={{ flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>كلمة البحث المطبقة: </span>
                  <strong style={{ fontSize: '12.5px', color: '#0F172A' }}>"{searchQuery}"</strong>
                </div>
              </div>
            )}
          </div>

          {/* Expected Export Volume Banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#065F46' }}>
              إجمالي السجلات التي سيتم استخراجها:
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: '#047857',
                padding: '4px 12px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #6EE7B7',
              }}
            >
              {totalCount} عملية مسجلة
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #F1F5F9',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isExporting ? 'not-allowed' : 'pointer',
            }}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isExporting || totalCount === 0}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: totalCount === 0 ? '#94A3B8' : '#059669',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isExporting || totalCount === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: theme.shadows.sm,
            }}
          >
            <FileSpreadsheet size={16} />
            {isExporting ? 'جاري إنشاء ملف Excel...' : 'تأكيد واستخراج الملف'}
          </button>
        </div>
      </div>
    </div>
  );
};
