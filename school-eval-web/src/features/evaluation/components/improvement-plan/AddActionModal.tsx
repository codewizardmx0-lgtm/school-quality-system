import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ActionStatus, CreateImprovementActionPayload, ImprovementAreaBrief } from '../../api/evaluationTypes';
import { Target, X, Check, Search, ChevronDown, Award } from 'lucide-react';

interface AddActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  areas?: ImprovementAreaBrief[];
  onAddAction: (payload: CreateImprovementActionPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export const AddActionModal: React.FC<AddActionModalProps> = ({
  isOpen,
  onClose,
  areas = [],
  onAddAction,
  isSubmitting = false,
}) => {
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [leader, setLeader] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('2026-12-31');
  const [status, setStatus] = useState<ActionStatus>('InProgress');
  const [progressDescription, setProgressDescription] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(10);
  const [error, setError] = useState<string | null>(null);

  // Searchable Popover State
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'High' | 'Medium' | 'Low'>('ALL');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && areas.length > 0 && !selectedAreaId) {
      setSelectedAreaId(String(areas[0].areaId));
    }
  }, [isOpen, areas, selectedAreaId]);

  // إغلاق النافذة المنبثقة عند النقر خارجها
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isPopoverOpen]);

  const selectedArea = useMemo(() => {
    return areas.find((a) => String(a.areaId) === selectedAreaId) || null;
  }, [areas, selectedAreaId]);

  const filteredAreas = useMemo(() => {
    return areas.filter((area) => {
      if (priorityFilter !== 'ALL' && area.priority !== priorityFilter) {
        return false;
      }
      if (!areaSearch.trim()) return true;
      const q = areaSearch.toLowerCase().trim();
      const nameMatch = area.name.toLowerCase().includes(q);
      const codeMatch = area.indicatorCode ? area.indicatorCode.toLowerCase().includes(q) : false;
      const indNameMatch = area.indicatorName ? area.indicatorName.toLowerCase().includes(q) : false;
      const stdNameMatch = area.standardName ? area.standardName.toLowerCase().includes(q) : false;
      return nameMatch || codeMatch || indNameMatch || stdNameMatch;
    });
  }, [areas, areaSearch, priorityFilter]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setTitle('');
    setLeader('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setDueDate('2026-12-31');
    setStatus('InProgress');
    setProgressDescription('');
    setCompletionPercentage(10);
    setError(null);
    setIsPopoverOpen(false);
    setAreaSearch('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (areas.length > 0 && !selectedAreaId) {
      setError('يرجى اختيار إجراء التحسين المستهدف المتبنى من التقييم الذاتي.');
      return;
    }

    if (!title.trim()) {
      setError('عنوان الإجراء التنفيذي مطلوب.');
      return;
    }

    try {
      await onAddAction({
        areaId: selectedAreaId ? Number(selectedAreaId) : undefined,
        title,
        leader: leader || 'فريق التطوير والتحسين',
        startDate,
        dueDate,
        status,
        progressDescription: progressDescription || 'تم اعتماد الإجراء والبدء في تنفيذه.',
        completionPercentage: status === 'Done' ? 100 : completionPercentage,
      });
      handleClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || (err as Error)?.message || 'فشل في حفظ إجراء التحسين.';
      setError(msg);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '720px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Target size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                إضافة إجراء تنفيذي جديد لخطة التحسين
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                ربط الإجراء بمجال التحسين المتبنى، وتحديد المسؤوليات، والجدول الزمني، ونسبة الإنجاز
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#F1F5F9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
          }}
        >
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: '12.5px',
              }}
            >
              {error}
            </div>
          )}

          {/* إجراء التحسين المستهدف (المتبنى من التقييم الذاتي) — Searchable Popover */}
          <div style={{ position: 'relative' }} ref={popoverRef}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                إجراء التحسين المستهدف (المتبنى من التقييم الذاتي) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                {areas.length} إجراءات متبناة متاحة
              </span>
            </div>

            {/* Custom Trigger Button */}
            <div
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: isPopoverOpen ? '1.5px solid #059669' : '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {selectedArea ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  {selectedArea.indicatorCode && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#E0F2FE',
                        color: '#0369A1',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        flexShrink: 0,
                      }}
                    >
                      {selectedArea.indicatorCode}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0F172A',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {selectedArea.name}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      backgroundColor:
                        selectedArea.priority === 'High'
                          ? '#FEE2E2'
                          : selectedArea.priority === 'Medium'
                          ? '#FEF3C7'
                          : '#E0F2FE',
                      color:
                        selectedArea.priority === 'High'
                          ? '#B91C1C'
                          : selectedArea.priority === 'Medium'
                          ? '#B45309'
                          : '#0369A1',
                      flexShrink: 0,
                    }}
                  >
                    {selectedArea.priority === 'High'
                      ? 'أولوية عالية'
                      : selectedArea.priority === 'Medium'
                      ? 'أولوية متوسطة'
                      : 'أولوية منخفضة'}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: '#94A3B8' }}>
                  -- اضغط لاختيار إجراء التحسين المستهدف من القائمة المتبناة --
                </span>
              )}
              <ChevronDown size={18} style={{ color: '#64748B', flexShrink: 0 }} />
            </div>

            {/* Popover Dropdown Panel */}
            {isPopoverOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                  zIndex: 60,
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* Search Bar & Priority Filter Pills */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 12px',
                      backgroundColor: '#F1F5F9',
                      borderRadius: '8px',
                      flex: 1,
                    }}
                  >
                    <Search size={15} style={{ color: '#64748B' }} />
                    <input
                      type="text"
                      value={areaSearch}
                      onChange={(e) => setAreaSearch(e.target.value)}
                      placeholder="ابحث برمز المؤشر أو اسم المعيار أو عنوان الإجراء..."
                      style={{
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        fontSize: '12.5px',
                        width: '100%',
                      }}
                      autoFocus
                    />
                    {areaSearch && (
                      <button
                        type="button"
                        onClick={() => setAreaSearch('')}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={14} style={{ color: '#94A3B8' }} />
                      </button>
                    )}
                  </div>
                  {/* Priority Pills */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['ALL', 'High', 'Medium', 'Low'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setPriorityFilter(lvl)}
                        style={{
                          padding: '5px 9px',
                          borderRadius: '6px',
                          border: priorityFilter === lvl ? '1px solid #059669' : '1px solid #E2E8F0',
                          backgroundColor: priorityFilter === lvl ? '#ECFDF5' : '#FFFFFF',
                          color: priorityFilter === lvl ? '#065F46' : '#64748B',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {lvl === 'ALL'
                          ? 'الكل'
                          : lvl === 'High'
                          ? 'عالية'
                          : lvl === 'Medium'
                          ? 'متوسطة'
                          : 'منخفضة'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items List */}
                <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredAreas.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '12.5px' }}>
                      لا توجد إجراءات متبناة تطابق البحث.
                    </div>
                  ) : (
                    filteredAreas.map((area) => {
                      const isSelected = String(area.areaId) === selectedAreaId;
                      return (
                        <div
                          key={area.areaId}
                          onClick={() => {
                            setSelectedAreaId(String(area.areaId));
                            if (!title) {
                              setTitle(area.name);
                            }
                            setIsPopoverOpen(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid #059669' : '1px solid #F1F5F9',
                            backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            transition: 'background-color 0.1s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF';
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {area.indicatorCode && (
                                <span
                                  style={{
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: '#E0F2FE',
                                    color: '#0369A1',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  {area.indicatorCode}
                                </span>
                              )}
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                                {area.name}
                              </span>
                            </div>
                            {(area.standardName || area.indicatorName) && (
                              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                                {area.standardName || area.indicatorName}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {area.targetScore && (
                              <span
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  backgroundColor: '#F8FAFC',
                                  border: '1px solid #E2E8F0',
                                  color: '#334155',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }}
                              >
                                <Award size={12} style={{ color: '#D97706' }} />
                                المستهدف: {area.targetScore}★
                              </span>
                            )}
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor:
                                  area.priority === 'High'
                                    ? '#FEE2E2'
                                    : area.priority === 'Medium'
                                    ? '#FEF3C7'
                                    : '#E0F2FE',
                                color:
                                  area.priority === 'High'
                                    ? '#B91C1C'
                                    : area.priority === 'Medium'
                                    ? '#B45309'
                                    : '#0369A1',
                              }}
                            >
                              {area.priority === 'High'
                                ? 'عالية'
                                : area.priority === 'Medium'
                                ? 'متوسطة'
                                : 'منخفضة'}
                            </span>
                            {isSelected && <Check size={16} style={{ color: '#059669' }} />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Title */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              عنوان الإجراء التنفيذي <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تطبيق استراتيجيات التعلم النشط وتدريب المعلمين على الدروس المصغرة"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              required
            />
          </div>

          {/* Leader */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              المسؤول عن التنفيذ (قائد الفريق)
            </label>
            <input
              type="text"
              value={leader}
              onChange={(e) => setLeader(e.target.value)}
              placeholder="مثال: أ. منير شرف — رئيس شعبة التدريب والجودة"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                تاريخ البداية
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                تاريخ الإنجاز المستهدف
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Status & Progress Percentage */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                حالة الإجراء
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ActionStatus)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="InProgress">قيد التنفيذ</option>
                <option value="Pending">معلق</option>
                <option value="Done">مكتمل</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                نسبة الإنجاز ({status === 'Done' ? 100 : completionPercentage}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={status === 'Done' ? 100 : completionPercentage}
                disabled={status === 'Done'}
                onChange={(e) => setCompletionPercentage(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#059669', marginTop: '10px' }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              وصف التقدم الحالي
            </label>
            <textarea
              value={progressDescription}
              onChange={(e) => setProgressDescription(e.target.value)}
              placeholder="بيان الخطوات المنجزة حتى اللحظة والإجراءات التنفيذية..."
              rows={3}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: '#F1F5F9',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 22px',
                borderRadius: '8px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
              }}
            >
              <Check size={16} />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'إضافة الإجراء'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
