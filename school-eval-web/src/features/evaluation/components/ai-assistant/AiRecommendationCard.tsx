import React, { useState } from 'react';
import type { AiInitiative, AiRecommendationStatus } from '../../api/evaluationTypes';
import { Target, CheckCircle2, Edit3, EyeOff, ArrowLeft } from 'lucide-react';

interface AiRecommendationCardProps {
  initiative: AiInitiative;
  onUpdateStatus: (id: number, status: AiRecommendationStatus, modifications?: string) => Promise<void>;
  onOpenTransferModal: (initiative: AiInitiative) => void;
  readOnly?: boolean;
}

export const AiRecommendationCard: React.FC<AiRecommendationCardProps> = ({
  initiative,
  onUpdateStatus,
  onOpenTransferModal,
  readOnly = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [modifications, setModifications] = useState(initiative.humanModifications || initiative.title);

  const isAccepted = initiative.status === 'Accepted';
  const isIgnored = initiative.status === 'Ignored';

  const handleSaveModification = async () => {
    await onUpdateStatus(initiative.id, 'Modified', modifications);
    setIsEditing(false);
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: isAccepted ? '1.5px solid #059669' : isIgnored ? '1px dashed #CBD5E1' : '1px solid #E2E8F0',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '14px',
        opacity: isIgnored ? 0.6 : 1,
        transition: 'all 0.2s',
        boxShadow: isAccepted ? '0 4px 12px rgba(5, 150, 105, 0.08)' : '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div>
        {/* Top Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: initiative.priority === 'High' ? '#FEF2F2' : '#EFF6FF',
              color: initiative.priority === 'High' ? '#EF4444' : '#2563EB',
              border: `1px solid ${initiative.priority === 'High' ? '#FECACA' : '#BFDBFE'}`,
            }}
          >
            أولوية {initiative.priority === 'High' ? 'عالية' : 'متوسطة'}
          </span>

          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '12px',
              backgroundColor:
                initiative.status === 'Accepted'
                  ? '#ECFDF5'
                  : initiative.status === 'Modified'
                  ? '#EFF6FF'
                  : initiative.status === 'Ignored'
                  ? '#F1F5F9'
                  : '#FFFBEB',
              color:
                initiative.status === 'Accepted'
                  ? '#059669'
                  : initiative.status === 'Modified'
                  ? '#2563EB'
                  : initiative.status === 'Ignored'
                  ? '#64748B'
                  : '#D97706',
            }}
          >
            {initiative.status === 'Accepted'
              ? 'معتمدة بالخطة'
              : initiative.status === 'Modified'
              ? 'معدلة بشرياً'
              : initiative.status === 'Ignored'
              ? 'مستبعدة'
              : 'قيد المراجعة'}
          </span>
        </div>

        {/* Content or Edit Mode */}
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea
              value={modifications}
              onChange={(e) => setModifications(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #059669',
                fontSize: '13px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsEditing(false)}
                style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#F1F5F9', border: 'none', cursor: 'pointer', fontSize: '11px' }}
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveModification}
                style={{ padding: '4px 12px', borderRadius: '6px', backgroundColor: '#059669', color: '#FFF', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
              >
                حفظ التعديل
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', lineHeight: 1.4 }}>
              {initiative.humanModifications || initiative.title}
            </h4>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              {initiative.description}
            </p>
          </div>
        )}
      </div>

      {/* Action Footer */}
      {!readOnly && (
        <div
          style={{
            paddingTop: '12px',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {/* Status Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => onUpdateStatus(initiative.id, 'Accepted')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '6px',
                backgroundColor: isAccepted ? '#059669' : '#ECFDF5',
                color: isAccepted ? '#FFFFFF' : '#059669',
                border: '1px solid #A7F3D0',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="قبول التوصية كما هي"
            >
              <CheckCircle2 size={13} />
              قبول
            </button>

            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                color: '#475569',
                border: '1px solid #CBD5E1',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="تعديل نص التوصية وتوثيق التعديل البشري"
            >
              <Edit3 size={13} />
              تعديل
            </button>

            <button
              onClick={() => onUpdateStatus(initiative.id, isIgnored ? 'PendingReview' : 'Ignored')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                color: '#64748B',
                border: '1px solid #E2E8F0',
                fontSize: '11.5px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              title="استبعاد التوصية من الخطة"
            >
              <EyeOff size={13} />
              {isIgnored ? 'استعادة' : 'استبعاد'}
            </button>
          </div>

          {/* Transfer button */}
          <button
            onClick={() => onOpenTransferModal(initiative)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#059669',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Target size={13} />
            نقل للخطة
            <ArrowLeft size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
