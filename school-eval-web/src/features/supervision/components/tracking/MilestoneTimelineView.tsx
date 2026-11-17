/**
 * Component: MilestoneTimelineView
 * الخط الزمني المرئي المتسلسل لمحطات التقييم وإجراءات المتابعة الميدانية
 */

import React, { useState, useMemo } from 'react';
import {
  FileCheck,
  Cpu,
  AlertTriangle,
  MapPin,
  FileText,
  PhoneCall,
  User,
  Clock,
  Search,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { MilestoneEvent } from '../../api/supervisionTypes';

interface MilestoneTimelineViewProps {
  milestones: MilestoneEvent[];
}

export const MilestoneTimelineView: React.FC<MilestoneTimelineViewProps> = ({ milestones }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const filteredAndSortedMilestones = useMemo(() => {
    let list = milestones.filter((item) => {
      // Type filter
      if (selectedType !== 'all') {
        if (selectedType === 'submission' && item.eventType !== 'submission') return false;
        if (selectedType === 'completion' && item.eventType !== 'completion_request') return false;
        if (selectedType === 'memo' && item.eventType !== 'supervisor_memo') return false;
        if (selectedType === 'check' && item.eventType !== 'automated_check') return false;
        if (selectedType === 'visit' && item.eventType !== 'field_visit') return false;
      }
      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchActor = item.actorName?.toLowerCase().includes(q);
        const matchBadge = item.statusBadge?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchActor && !matchBadge) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [milestones, selectedType, searchTerm, sortOrder]);

  const typeCounts = useMemo(() => {
    return {
      all: milestones.length,
      submission: milestones.filter((m) => m.eventType === 'submission').length,
      completion: milestones.filter((m) => m.eventType === 'completion_request').length,
      memo: milestones.filter((m) => m.eventType === 'supervisor_memo').length,
      check: milestones.filter((m) => m.eventType === 'automated_check').length,
      visit: milestones.filter((m) => m.eventType === 'field_visit').length,
    };
  }, [milestones]);

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            الخط الزمني الموحد للإجراءات والأحداث ({filteredAndSortedMilestones.length} محطات)
          </h2>
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            تسلسل زمني موثق يربط أحداث التسليم الآلية بالمذكرات الإشرافية والزيارات الميدانية
          </p>
        </div>

        {/* أدوات البحث والترتيب */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* حقل البحث */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '6px 10px',
              minWidth: '220px',
            }}
          >
            <Search size={14} color="#64748B" />
            <input
              type="text"
              placeholder="بحث في سجل المحطات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                background: 'none',
                outline: 'none',
                fontSize: '12px',
                color: '#0F172A',
                width: '100%',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* زر الترتيب الزمني */}
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {sortOrder === 'desc' ? <ArrowDown size={14} color="#2563EB" /> : <ArrowUp size={14} color="#2563EB" />}
            <span>{sortOrder === 'desc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}</span>
          </button>
        </div>
      </div>

      {/* ألسنة التصفية لنوع الحدث */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          padding: '10px 14px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginLeft: '4px' }}>
          تصفية النوع:
        </span>
        {[
          { key: 'all', label: 'كافة المحطات', count: typeCounts.all },
          { key: 'submission', label: 'التسليم والمخرجات', count: typeCounts.submission },
          { key: 'completion', label: 'طلبات الاستكمال', count: typeCounts.completion },
          { key: 'memo', label: 'المذكرات الإشرافية', count: typeCounts.memo },
          { key: 'check', label: 'التدقيق الآلي', count: typeCounts.check },
          { key: 'visit', label: 'الزيارات الميدانية', count: typeCounts.visit },
        ].map((tab) => {
          const isSelected = selectedType === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedType(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: isSelected ? 800 : 600,
                cursor: 'pointer',
                border: isSelected ? '1px solid #2563EB' : '1px solid #CBD5E1',
                backgroundColor: isSelected ? '#2563EB' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '999px',
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.3)' : '#F1F5F9',
                  color: isSelected ? '#FFFFFF' : '#475569',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredAndSortedMilestones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748B' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>
            لا توجد محطات أو أحداث تطابق معايير البحث والتصفية المحددة.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedType('all');
            }}
            style={{
              marginTop: '10px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#2563EB',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            إلغاء معايير التصفية
          </button>
        </div>
      ) : (
        /* شريط المسار العمودي */
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
            {filteredAndSortedMilestones.map((milestone) => {
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
      )}
    </div>
  );
};
