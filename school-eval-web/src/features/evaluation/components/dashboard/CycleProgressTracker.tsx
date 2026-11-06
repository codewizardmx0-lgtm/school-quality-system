import React from 'react';
import type { CycleStep } from '../../api/evaluationTypes';
import { Check, CircleDot, Award } from 'lucide-react';

interface CycleProgressTrackerProps {
  steps: CycleStep[];
}

export const CycleProgressTracker: React.FC<CycleProgressTrackerProps> = ({ steps }) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        padding: '24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            مسار دورة التقييم ومراجعة المخرج الحالية
          </h2>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
            المراحل التنفيذية المعتمدة لملف التقييم الذاتي من الإطلاق وحتى الاعتماد الوزاري
          </p>
        </div>
        <div
          style={{
            padding: '4px 10px',
            borderRadius: '16px',
            backgroundColor: '#ECFDF5',
            color: '#059669',
            fontSize: '11.5px',
            fontWeight: 700,
          }}
        >
          المرحلة 2: قيد الإدخال والتوثيق
        </div>
      </div>

      {/* Steps bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        {steps.map((step, idx) => {
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';
          const isPending = step.status === 'pending';

          const circleBg = isCompleted
            ? '#059669'
            : isCurrent
            ? '#10B981'
            : '#E2E8F0';

          const circleColor = isPending ? '#64748B' : '#FFFFFF';

          return (
            <React.Fragment key={step.id}>
              {/* Step Node */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  zIndex: 2,
                  minWidth: '110px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: circleBg,
                    color: circleColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '14px',
                    boxShadow: isCurrent ? '0 0 0 4px rgba(16, 185, 129, 0.25)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {isCompleted ? (
                    <Check size={20} strokeWidth={2.5} />
                  ) : isCurrent ? (
                    <CircleDot size={20} className="animate-pulse" />
                  ) : idx === steps.length - 1 ? (
                    <Award size={18} />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: isCurrent ? 800 : 600,
                    color: isCurrent ? '#059669' : isCompleted ? '#0F172A' : '#64748B',
                    marginTop: '8px',
                  }}
                >
                  {step.label}
                </div>

                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                  {step.date}
                </div>
              </div>

              {/* Connecting Line between steps */}
              {idx < steps.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: '3px',
                    backgroundColor: isCompleted ? '#059669' : '#E2E8F0',
                    margin: '0 8px',
                    marginBottom: '28px',
                    transition: 'background-color 0.3s',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
