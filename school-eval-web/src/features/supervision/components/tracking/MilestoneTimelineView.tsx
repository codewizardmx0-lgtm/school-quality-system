/**
 * Component: MilestoneTimelineView
 * الخط الزمني المرئي المتسلسل لمحطات التقييم وإجراءات المتابعة الميدانية
 * متوافق تماماً مع UC-SUP-06 و FR-SUP-08 و NFR-INT-02 (سجل تراكمي محمي - Append-Only)
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
  ArrowLeft,
  Filter,
  RotateCcw,
} from 'lucide-react';
import type { MilestoneEvent, TrackingSelectorItem } from '../../api/supervisionTypes';

interface MilestoneTimelineViewProps {
  milestones: MilestoneEvent[];
  availableCycles?: TrackingSelectorItem[];
}

export const MilestoneTimelineView: React.FC<MilestoneTimelineViewProps> = ({
  milestones,
  availableCycles = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedActor, setSelectedActor] = useState<string>('all');
  const [selectedCycle, setSelectedCycle] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // تصفية وفرز الأحداث
  const filteredAndSortedMilestones = useMemo(() => {
    let list = milestones.filter((item) => {
      // 1. تصفية نوع المحطة
      if (selectedType !== 'all') {
        if (selectedType === 'submission' && item.eventType !== 'submission') return false;
        if (selectedType === 'completion' && item.eventType !== 'completion_request') return false;
        if (selectedType === 'memo' && item.eventType !== 'supervisor_memo') return false;
        if (selectedType === 'visit' && item.eventType !== 'field_visit') return false;
        if (selectedType === 'phone' && item.eventType !== 'phone_call') return false;
        if (selectedType === 'check' && item.eventType !== 'automated_check') return false;
        if (selectedType === 'corrective' && item.eventType !== 'corrective_memo') return false;
      }

      // 2. تصفية الجهة القائمة بالإجراء (Actor)
      if (selectedActor !== 'all') {
        if (selectedActor === 'school' && item.actorType !== 'school') return false;
        if (selectedActor === 'supervisor' && item.actorType !== 'supervisor') return false;
        if (selectedActor === 'system' && item.actorType !== 'system') return false;
      }

      // 3. تصفية الدورة التقييمية
      if (selectedCycle !== 'all') {
        if (String(item.cycleId) !== selectedCycle) return false;
      }

      // 4. تصفية النطاق الزمني (Date Range)
      if (fromDate) {
        const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
        if (itemDate < fromDate) return false;
      }
      if (toDate) {
        const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
        if (itemDate > toDate) return false;
      }

      // 5. البحث النصي الفوري
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
  }, [milestones, selectedType, selectedActor, selectedCycle, fromDate, toDate, searchTerm, sortOrder]);

  // إحصائيات التصفية السريعة
  const typeCounts = useMemo(() => {
    return {
      all: milestones.length,
      submission: milestones.filter((m) => m.eventType === 'submission').length,
      completion: milestones.filter((m) => m.eventType === 'completion_request').length,
      memo: milestones.filter((m) => m.eventType === 'supervisor_memo').length,
      visit: milestones.filter((m) => m.eventType === 'field_visit').length,
      phone: milestones.filter((m) => m.eventType === 'phone_call').length,
      check: milestones.filter((m) => m.eventType === 'automated_check').length,
      corrective: milestones.filter((m) => m.eventType === 'corrective_memo').length,
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
      case 'corrective_memo':
        return <RotateCcw size={18} color="#DC2626" />;
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

  const hasActiveFilters =
    selectedType !== 'all' ||
    selectedActor !== 'all' ||
    selectedCycle !== 'all' ||
    Boolean(fromDate) ||
    Boolean(toDate) ||
    Boolean(searchTerm.trim());

  const resetFilters = () => {
    setSelectedType('all');
    setSelectedActor('all');
    setSelectedCycle('all');
    setFromDate('');
    setToDate('');
    setSearchTerm('');
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. الترويسة وأدوات البحث والفرز */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '18px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            الخط الزمني الموحد للأحداث والتدخلات الميدانية ({filteredAndSortedMilestones.length} محطة)
          </h2>
          <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            تسلسل زمني غير قابل للتعديل (NFR-INT-02) يربط دورات التسليم بطلبات الاستكمال والمذكرات التوجيهية
          </p>
        </div>

        {/* أدوات البحث والفرز وأزرار الفلاتر */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* حقل البحث السريع */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '7px 12px',
              minWidth: '240px',
            }}
          >
            <Search size={15} color="#64748B" />
            <input
              type="text"
              placeholder="بحث في نصوص السجل والمحطات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                background: 'none',
                outline: 'none',
                fontSize: '12.5px',
                color: '#0F172A',
                width: '100%',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: '#94A3B8',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* زر الفلاتر المتقدمة */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              border: showAdvancedFilters ? '1px solid #2563EB' : '1px solid #CBD5E1',
              backgroundColor: showAdvancedFilters ? '#EFF6FF' : '#FFFFFF',
              color: showAdvancedFilters ? '#1D4ED8' : '#334155',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Filter size={14} />
            <span>تصفية متقدمة</span>
            {hasActiveFilters && (
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#2563EB',
                }}
              />
            )}
          </button>

          {/* زر اتجاه الفرز الزمني */}
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {sortOrder === 'desc' ? (
              <ArrowDown size={14} color="#2563EB" />
            ) : (
              <ArrowUp size={14} color="#2563EB" />
            )}
            <span>{sortOrder === 'desc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}</span>
          </button>
        </div>
      </div>

      {/* 2. شريط التصفية المتقدمة (عند التفعيل) */}
      {showAdvancedFilters && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            marginBottom: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* تصفية الجهة */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>الجهة المنفذة:</span>
            <select
              value={selectedActor}
              onChange={(e) => setSelectedActor(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                outline: 'none',
              }}
            >
              <option value="all">كافة الجهات</option>
              <option value="school">المدرسة (فريق الجودة)</option>
              <option value="supervisor">المشرف الوزاري</option>
              <option value="system">النظام الآلي</option>
            </select>
          </div>

          {/* تصفية الدورة */}
          {availableCycles.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>الدورة:</span>
              <select
                value={selectedCycle}
                onChange={(e) => setSelectedCycle(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  outline: 'none',
                }}
              >
                <option value="all">كافة الدورات</option>
                {availableCycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* تصفية التاريخ من وإلى */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>من تاريخ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '11.5px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>إلى:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '11.5px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                outline: 'none',
              }}
            />
          </div>

          {/* زر إعادة الضبط */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#DC2626',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginRight: 'auto',
                textDecoration: 'underline',
              }}
            >
              إلغاء الفلاتر
            </button>
          )}
        </div>
      )}

      {/* 3. ألسنة تصفية نوع المحطة السريعة */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          padding: '10px 14px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          marginBottom: '24px',
        }}
      >
        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', marginLeft: '4px' }}>
          تصنيف المحطات:
        </span>
        {[
          { key: 'all', label: 'كافة المحطات', count: typeCounts.all },
          { key: 'submission', label: 'مخرجات التسليم', count: typeCounts.submission },
          { key: 'completion', label: 'طلبات الاستكمال', count: typeCounts.completion },
          { key: 'memo', label: 'المذكرات الإشرافية', count: typeCounts.memo },
          { key: 'visit', label: 'الزيارات الميدانية', count: typeCounts.visit },
          { key: 'phone', label: 'الاتصالات', count: typeCounts.phone },
          { key: 'check', label: 'الفحص الآلي', count: typeCounts.check },
          { key: 'corrective', label: 'مذكرات تعقيبية', count: typeCounts.corrective },
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
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '11.5px',
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
                  fontWeight: 800,
                  padding: '1px 6px',
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

      {/* 4. قائمة المحطات والخط الزمني */}
      {filteredAndSortedMilestones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748B' }}>
          <p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
            لا توجد محطات أو أحداث تطابق معايير البحث والتصفية المحددة.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            style={{
              marginTop: '12px',
              fontSize: '13px',
              fontWeight: 800,
              color: '#2563EB',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            إعادة تعيين كافة الفلاتر والبحث
          </button>
        </div>
      ) : (
        /* المسار الزمني المتسلسل بعرض 100% كامل */
        <div style={{ position: 'relative', paddingRight: '32px' }}>
          {/* الخط الرابط العمودي */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              bottom: '24px',
              right: '11px',
              width: '2px',
              backgroundColor: '#E2E8F0',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredAndSortedMilestones.map((milestone) => {
              const badge = getBadgeStyle(milestone.badgeColor);
              const isCorrective = milestone.eventType === 'corrective_memo';

              return (
                <div key={milestone.id} style={{ position: 'relative' }}>
                  {/* عقدة النقطة الأيقونية في الخط الرابط */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '-32px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      border: isCorrective ? '2px solid #DC2626' : '2px solid #2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isCorrective
                        ? '0 0 0 4px rgba(220, 38, 38, 0.15)'
                        : '0 0 0 4px rgba(37, 99, 235, 0.15)',
                      zIndex: 2,
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isCorrective ? '#DC2626' : '#2563EB',
                      }}
                    />
                  </div>

                  {/* بطاقة تفاصيل المحطة بعرض كامل */}
                  <div
                    style={{
                      padding: '18px 20px',
                      borderRadius: '12px',
                      backgroundColor: isCorrective ? '#FFFDFD' : '#FAFBFD',
                      border: isCorrective ? '1px solid #FECACA' : '1px solid #E2E8F0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* الترويسة العليا للمحطة */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                        marginBottom: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {getEventIcon(milestone.eventType)}
                        </div>
                        <div>
                          <span
                            style={{
                              fontSize: '14.5px',
                              fontWeight: 800,
                              color: isCorrective ? '#991B1B' : '#0F172A',
                            }}
                          >
                            {milestone.title}
                          </span>
                        </div>
                      </div>

                      {/* شارات الحالة وسياق المحطة */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {milestone.cycleName && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#F1F5F9',
                              color: '#475569',
                              border: '1px solid #CBD5E1',
                            }}
                          >
                            {milestone.cycleName}
                          </span>
                        )}

                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {milestone.statusBadge}
                        </span>
                      </div>
                    </div>

                    {/* انتقال الحالة المعتمد (State Transition Badge) إن وُجد */}
                    {milestone.stateTransition && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          marginBottom: '10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#1E40AF',
                        }}
                      >
                        <span style={{ color: '#64748B' }}>انتقال الحالة:</span>
                        <span style={{ backgroundColor: '#DBEAFE', padding: '1px 6px', borderRadius: '4px' }}>
                          {milestone.stateTransition.from}
                        </span>
                        <ArrowLeft size={13} color="#2563EB" />
                        <span style={{ backgroundColor: '#2563EB', color: '#FFFFFF', padding: '1px 6px', borderRadius: '4px' }}>
                          {milestone.stateTransition.to}
                        </span>
                      </div>
                    )}

                    {/* نص الشرح والتفاصيل والملاحظات */}
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#334155',
                        margin: '0 0 14px 0',
                        lineHeight: 1.65,
                      }}
                    >
                      {milestone.description}
                    </p>

                    {/* التذييل: القائم بالإجراء والتاريخ وسياق النزاهة */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        fontSize: '11.5px',
                        color: '#64748B',
                        paddingTop: '10px',
                        borderTop: '1px solid #F1F5F9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} color="#94A3B8" />
                        <span>
                          <strong>{milestone.actorName}</strong> ({milestone.actorRole})
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="#94A3B8" />
                        <span>
                          {new Date(milestone.timestamp).toLocaleString('ar-YE', {
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
