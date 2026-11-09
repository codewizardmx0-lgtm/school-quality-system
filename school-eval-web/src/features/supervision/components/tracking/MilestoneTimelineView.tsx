/**
 * Component: MilestoneTimelineView
 * الخط الزمني المرئي المتسلسل لمحطات التقييم وإجراءات المتابعة الميدانية
 */

import React from 'react';
import {
  FileCheck,
  Cpu,
  AlertTriangle,
  MapPin,
  FileText,
  PhoneCall,
  User,
  Clock,
} from 'lucide-react';
import type { MilestoneEvent } from '../../api/supervisionTypes';

interface MilestoneTimelineViewProps {
  milestones: MilestoneEvent[];
}

export const MilestoneTimelineView: React.FC<MilestoneTimelineViewProps> = ({ milestones }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'submission':
        return <FileCheck size={18} color="#2563EB" />;
      case 'automated_check':
        return <Cpu size={18} color="#059669" />;
      case 'completion_request':
        return <AlertTriangle size={18} color="#D97706" />;
      case 'field_visit':
        return <MapPin size={18} color="#7C3AED" />;
      case 'phone_call':
        return <PhoneCall size={18} color="#0284C7" />;
      case 'supervisor_memo':
      default:
        return <FileText size={18} color="#4F46E5" />;
    }
  };

  const getBadgeStyle = (badgeColor?: string) => {
    switch (badgeColor) {
      case 'emerald':
        return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' };
      case 'amber':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      case 'purple':
        return { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' };
      case 'indigo':
        return { bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE' };
      case 'crimson':
        return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' };
      case 'blue':
      default:
        return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' };
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
        الخط الزمني الموحد للإجراءات والأحداث ({milestones.length} محطات)
      </h2>
      <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '24px' }}>
        تسلسل زمني موثق يربط أحداث التسليم الآلية بالمذكرات الإشرافية والزيارات الميدانية
      </p>

      {/* شريط المسار العمودي */}
      <div style={{ position: 'relative', paddingRight: '28px' }}>
        {/* الخط الرابط */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            bottom: '16px',
            right: '9px',
            width: '2px',
            backgroundColor: '#E2E8F0',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {milestones.map((milestone) => {
            const badge = getBadgeStyle(milestone.badgeColor);
            return (
              <div key={milestone.id} style={{ position: 'relative' }}>
                {/* نقطة العقدة الأيقونية */}
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '-28px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.15)',
                    zIndex: 2,
                  }}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
                </div>

                {/* بطاقة المحطة */}
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    backgroundColor: '#FAFBFD',
                    border: '1px solid #E2E8F0',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {getEventIcon(milestone.eventType)}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                        {milestone.title}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        backgroundColor: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {milestone.statusBadge}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '13px',
                      color: '#475569',
                      margin: '0 0 12px 0',
                      lineHeight: 1.6,
                    }}
                  >
                    {milestone.description}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#64748B',
                      paddingTop: '8px',
                      borderTop: '1px solid #F1F5F9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <User size={13} color="#94A3B8" />
                      <span>
                        {milestone.actorName} ({milestone.actorRole})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={13} color="#94A3B8" />
                      <span>
                        {new Date(milestone.timestamp).toLocaleDateString('ar-YE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
