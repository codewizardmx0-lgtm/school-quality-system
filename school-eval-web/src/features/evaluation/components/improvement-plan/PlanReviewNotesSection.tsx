import React from 'react';
import { MessageSquare, Send } from 'lucide-react';
import type { ImprovementPlanData } from '../../api/evaluationTypes';

interface PlanReviewNotesSectionProps {
  planData: ImprovementPlanData | null;
  readOnly: boolean;
  isPrincipal: boolean;
  newReviewNoteText: string;
  isSubmittingReviewNote: boolean;
  onReviewNoteTextChange: (text: string) => void;
  onSubmitReviewNote: () => void;
}

/**
 * قسم ملاحظات المراجعة الداخلية والتوجيهات الإشرافية على خطة التحسين.
 */
export const PlanReviewNotesSection: React.FC<PlanReviewNotesSectionProps> = ({
  planData,
  readOnly,
  isPrincipal,
  newReviewNoteText,
  isSubmittingReviewNote,
  onReviewNoteTextChange,
  onSubmitReviewNote,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        padding: '22px 24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageSquare size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              ملاحظات المراجعة الداخلية والتوجيهات الإشرافية
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              ملاحظات مدير المدرسة والمشرف التربوي على مسار تنفيذ الخطة المدرسية
            </p>
          </div>
        </div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '99px',
            backgroundColor: '#F1F5F9',
            color: '#475569',
          }}
        >
          {planData?.reviewNotes?.length || 0} ملاحظة
        </span>
      </div>

      {/* Existing Notes List */}
      {!planData?.reviewNotes || planData.reviewNotes.length === 0 ? (
        <div
          style={{
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: '#F8FAFC',
            border: '1px dashed #CBD5E1',
            color: '#64748B',
            fontSize: '12.5px',
            textAlign: 'center',
          }}
        >
          لا توجد ملاحظات مراجعة مسجلة على هذه الخطة حتى الآن.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {planData.reviewNotes.map((note) => (
            <div
              key={note.noteId}
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRight: '3px solid #2563EB',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#1E293B' }}>{note.authorName}</span>
                  <span
                    style={{
                      padding: '1px 8px',
                      borderRadius: '4px',
                      backgroundColor: note.reviewerRole === 'school_principal' ? '#FEF3C7' : '#DBEAFE',
                      color: note.reviewerRole === 'school_principal' ? '#92400E' : '#1E40AF',
                      border: `1px solid ${note.reviewerRole === 'school_principal' ? '#FCD34D' : '#BFDBFE'}`,
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {note.roleArabic || (note.reviewerRole === 'school_principal' ? 'مدير مدرسة' : 'مقيم')}
                  </span>
                </div>
                {note.createdAt && (
                  <span style={{ color: '#94A3B8', fontSize: '11px' }}>
                    {new Date(note.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                {note.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add Note Input if not ReadOnly OR if isPrincipal */}
      {(!readOnly || isPrincipal) && planData && planData.planId > 0 && planData.status !== 'Archived' && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
          <input
            type="text"
            value={newReviewNoteText}
            onChange={(e) => onReviewNoteTextChange(e.target.value)}
            placeholder={isPrincipal ? 'اكتب ملاحظة أو توجيهاً إدارياً من مدير المدرسة على الخطة...' : 'اكتب ملاحظة أو توجيهاً داخلياً على الخطة...'}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              outline: 'none',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmitReviewNote();
              }
            }}
          />
          <button
            type="button"
            onClick={onSubmitReviewNote}
            disabled={isSubmittingReviewNote || !newReviewNoteText.trim()}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              backgroundColor: isPrincipal ? '#D97706' : '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isSubmittingReviewNote || !newReviewNoteText.trim() ? 'not-allowed' : 'pointer',
              opacity: isSubmittingReviewNote || !newReviewNoteText.trim() ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <Send size={14} />
            <span>{isSubmittingReviewNote ? 'جاري الإرسال...' : isPrincipal ? 'إضافة ملاحظة المدير' : 'إضافة ملاحظة'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
