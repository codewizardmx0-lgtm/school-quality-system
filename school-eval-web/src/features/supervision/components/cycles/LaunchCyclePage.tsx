/**
 * Component: LaunchCyclePage
 * الشاشة 2: إطلاق دورة تقييم جديدة وضبط النطاق المستهدف (02-V)
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 */

import React from 'react';
import {
  AlertTriangle,
  Building,
  Check,
  ArrowRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useCycleLaunch } from '../../hooks/useCycleLaunch';
import { ActiveVersionBadge } from './ActiveVersionBadge';
import type { SupervisionScreenKey } from '../../api/supervisionTypes';

interface LaunchCyclePageProps {
  onNavigate: (screen: SupervisionScreenKey) => void;
}

export const LaunchCyclePage: React.FC<LaunchCyclePageProps> = ({ onNavigate }) => {
  const {
    activeVersion,
    isLoadingVersion,
    academicYear,
    setAcademicYear,
    cycleTitle,
    setCycleTitle,
    targetTerm,
    setTargetTerm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    completionDeadlineDays,
    setCompletionDeadlineDays,
    publicDirectives,
    setPublicDirectives,
    targetGovernorate,
    setTargetGovernorate,
    selectedStages,
    toggleStage,
    validationErrors,
    isSubmitting,
    submitError,
    submitSuccess,
    handleLaunch,
  } = useCycleLaunch(() => {
    // نجاح الإطلاق والعودة بعد مهلة قصيرة
    setTimeout(() => {
      onNavigate('dashboard');
    }, 1500);
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* 1. الترويسة الرئيسية */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#64748B',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '6px',
            }}
          >
            <ArrowRight size={16} />
            <span>العودة إلى لوحة المتابعة</span>
          </button>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.3px',
              margin: 0,
            }}
          >
            إطلاق دورة تقييم ذاتي جديدة وضبط النطاق المستهدف
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            تفعيل دورة التقييم الميدانية لمدارس النطاق وتعميم المؤشرات المعيارية المقفلة
          </p>
        </div>
      </div>

      {/* 2. شارة ربط وثيقة المعايير الوطنية النشطة v2.1 */}
      <ActiveVersionBadge version={activeVersion} isLoading={isLoadingVersion} />

      {/* رسالة نجاح الإطلاق */}
      {submitSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '10px',
            color: '#065F46',
            marginBottom: '24px',
          }}
        >
          <CheckCircle2 size={24} color="#059669" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px' }}>تم إطلاق دورة التقييم بنجاح!</div>
            <div style={{ fontSize: '12px', marginTop: '2px' }}>
              تم تفعيل الدورة وتعميمها على 48 مدرسة بأمانة العاصمة، جاري تحويلك إلى لوحة المتابعة...
            </div>
          </div>
        </div>
      )}

      {/* رسالة خطأ الإطلاق */}
      {submitError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            color: '#991B1B',
            marginBottom: '20px',
            fontSize: '13px',
          }}
        >
          <ShieldAlert size={20} color="#DC2626" />
          <span>{submitError}</span>
        </div>
      )}

      {/* 3. معالج الأعمدة المزدوجة (Two-Column Wizard) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* العمود الأيمن: تفاصيل الدورة والتواريخ والمهل */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: '#0F172A',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid #F1F5F9',
            }}
          >
            المحددات الزمنية والتوجيهات العامة
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* عنوان الدورة */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                مسمى دورة التقييم <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={cycleTitle}
                onChange={(e) => setCycleTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: validationErrors.cycleTitle ? '1px solid #EF4444' : '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {validationErrors.cycleTitle && (
                <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                  {validationErrors.cycleTitle}
                </span>
              )}
            </div>

            {/* العام الدراسي والفصل المستهدف */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  العام الدراسي <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2026/2027"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: validationErrors.academicYear ? '1px solid #EF4444' : '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  الفصل المستهدف
                </label>
                <select
                  value={targetTerm}
                  onChange={(e) => setTargetTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="الفصل الدراسي الأول">الفصل الدراسي الأول</option>
                  <option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</option>
                  <option value="الدورة السنوية الشاملة">الدورة السنوية الشاملة</option>
                </select>
              </div>
            </div>

            {/* تاريخ البداية وتاريخ قفل المخرجات */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  تاريخ بداية الدورة <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: validationErrors.startDate ? '1px solid #EF4444' : '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  تاريخ قفل المخرجات <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: validationErrors.endDate ? '1px solid #EF4444' : '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {validationErrors.endDate && (
                  <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                    {validationErrors.endDate}
                  </span>
                )}
              </div>
            </div>

            {/* مهلة الاستكمال النظامية */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                مهلة طلبات الاستكمال (14 يوماً من تاريخ الطلب)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number"
                  min={7}
                  max={30}
                  value={completionDeadlineDays}
                  onChange={(e) => setCompletionDeadlineDays(Number(e.target.value))}
                  style={{
                    width: '90px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 700,
                    textAlign: 'center',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '13px', color: '#64748B' }}>
                  يوماً (المهلة الرسمية الافتراضية المحددة لفرق التقييم المدرسي)
                </span>
              </div>
            </div>

            {/* التوجيهات الإشرافية العامة للمدارس */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                التوجيهات والتعليمات العامة للمدارس المشاركة
              </label>
              <textarea
                rows={4}
                value={publicDirectives}
                onChange={(e) => setPublicDirectives(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>

        {/* العمود الأيسر: النطاق الجغرافي والمراحل وحجم النطاق */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* بطاقة النطاق المستهدف */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <h2
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              النطاق الجغرافي والمراحل التعليمية
            </h2>

            {/* المحافظة */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                المحافظة المستهدفة
              </label>
              <select
                value={targetGovernorate}
                onChange={(e) => setTargetGovernorate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="أمانة العاصمة">أمانة العاصمة (كافة المديريات الـ 10)</option>
              </select>
            </div>

            {/* المراحل الدراسية */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                المراحل التعليمية المستهدفة
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['المرحلة الأساسية (1-9)', 'المرحلة الثانوية (10-12)'].map((stage) => {
                  const isChecked = selectedStages.includes(stage);
                  return (
                    <label
                      key={stage}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: isChecked ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                        backgroundColor: isChecked ? '#EFF6FF' : '#F8FAFC',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: isChecked ? '#1E40AF' : '#475569',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStage(stage)}
                        style={{ width: '16px', height: '16px', accentColor: '#2563EB' }}
                      />
                      <span>{stage}</span>
                    </label>
                  );
                })}
              </div>
              {validationErrors.selectedStages && (
                <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                  {validationErrors.selectedStages}
                </span>
              )}
            </div>

            {/* معاينة حجم النطاق الإشرافي */}
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>
                  حجم النطاق الميداني المقدر
                </span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                  48 مدرسة حكومية وأهلية
                </span>
              </div>
              <Building size={28} color="#2563EB" />
            </div>
          </div>

          {/* تنبيه الأثر الحوكمي لإطلاق الدورة */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FDE68A',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <AlertTriangle size={20} color="#D97706" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.5 }}>
              <strong>تنبيه الأثر النظامي:</strong> فور تأكيد الإطلاق، سيتم ربط حسابات كافة المدارس
              بالدورة وفتح استمارات التقييم الذاتي بصيغة الكتابة وفق المؤشرات الـ 109 المقفلة، مع حظر أي
              تعديل على شجرة المعايير طوال فترة الدورة.
            </div>
          </div>
        </div>
      </div>

      {/* 4. تذييل الإجراءات: تأكيد الإطلاق / حفظ مسودة / إلغاء */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '12px',
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid #E2E8F0',
        }}
      >
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          disabled={isSubmitting}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748B',
            backgroundColor: '#F1F5F9',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          إلغاء والعودة
        </button>

        <button
          type="button"
          onClick={() => {
            alert('تم حفظ إعدادات الدورة كمسودة مؤقتة.');
          }}
          disabled={isSubmitting}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#334155',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            cursor: 'pointer',
          }}
        >
          حفظ كمسودة
        </button>

        <button
          type="button"
          onClick={handleLaunch}
          disabled={isSubmitting || submitSuccess}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 28px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 800,
            color: '#FFFFFF',
            backgroundColor: isSubmitting ? '#93C5FD' : '#2563EB',
            border: 'none',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            transition: 'background-color 0.15s ease',
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>جاري إطلاق الدورة...</span>
            </>
          ) : (
            <>
              <Check size={16} />
              <span>تأكيد إطلاق دورة التقييم رسمياً</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
