import React, { useState, useEffect } from 'react';
import { theme } from '../../styles/theme';
import { adminApi } from './adminApi';
import type { SchoolItem } from './types';
import {
  School,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Building2,
  MapPin,
  GraduationCap,
  Loader2,
  RefreshCw,
  Edit2,
  Power,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export const SchoolsManagementPage: React.FC = () => {
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [governorateFilter, setGovernorateFilter] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // حالة النافذة المنبثقة (Modal) للإضافة والتعديل
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // حقول النموذج
  const [formData, setFormData] = useState({
    schoolName: '',
    educationalStage: 'أساسي وثانوي',
    identificationData: '',
    educationalDistrict: '',
    governorate: 'أمانة العاصمة',
    status: 'Active' as 'Active' | 'Inactive',
  });

  const loadSchools = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getSchools({
        q: searchTerm || undefined,
        status: statusFilter || undefined,
        governorate: governorateFilter || undefined,
      });
      setSchools(data);
    } catch {
      setFeedback({ type: 'error', message: 'تعذر تحميل قائمة المدارس من الخادم.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
  }, [statusFilter, governorateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSchools();
  };

  const openCreateModal = () => {
    setEditingSchool(null);
    setFormData({
      schoolName: '',
      educationalStage: 'أساسي وثانوي',
      identificationData: '',
      educationalDistrict: '',
      governorate: 'أمانة العاصمة',
      status: 'Active',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (school: SchoolItem) => {
    setEditingSchool(school);
    setFormData({
      schoolName: school.schoolName,
      educationalStage: school.educationalStage,
      identificationData: school.identificationData || '',
      educationalDistrict: school.educationalDistrict,
      governorate: school.governorate,
      status: school.status,
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (school: SchoolItem) => {
    try {
      const res = await adminApi.toggleSchoolStatus(school.schoolId);
      setFeedback({
        type: 'success',
        message: res.message || 'تم تحديث حالة المدرسة بنجاح.',
      });
      loadSchools();
    } catch {
      setFeedback({ type: 'error', message: 'فشل تغيير حالة المدرسة.' });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingSchool) {
        await adminApi.updateSchool(editingSchool.schoolId, formData);
        setFeedback({ type: 'success', message: 'تم تحديث بيانات المدرسة بنجاح.' });
      } else {
        await adminApi.createSchool(formData);
        setFeedback({ type: 'success', message: 'تم إضافة المدرسة بنجاح إلى دليل المدارس.' });
      }
      setIsModalOpen(false);
      loadSchools();
    } catch {
      setFeedback({ type: 'error', message: 'حدث خطأ أثناء حفظ بيانات المدرسة. يرجى التأكد من الحقول.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '32px' }}>
      {/* رأس الصفحة والعنوان الإجرائي */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: theme.radii.full,
              backgroundColor: theme.colors.primary[50],
              color: theme.colors.primary[800],
              fontSize: theme.typography.fontSizes.xs,
              fontWeight: theme.typography.fontWeights.bold,
              marginBottom: '6px',
            }}
          >
            <ShieldCheck size={14} />
            <span>إدارة النظام | UI-ADM-02</span>
          </div>
          <h1
            style={{
              fontSize: theme.typography.fontSizes['2xl'],
              fontWeight: theme.typography.fontWeights.extrabold,
              color: theme.colors.neutral[900],
              margin: 0,
            }}
          >
            دليل المدارس والمؤسسات التعليمية
          </h1>
          <p
            style={{
              fontSize: theme.typography.fontSizes.sm,
              color: theme.colors.neutral[500],
              margin: '4px 0 0 0',
            }}
          >
            إدارة المدارس الخاضعة لعمليات التقويم والاعتماد، تهيئة البيانات الجغرافية، والتحكم بحالة التفعيل (تعطيل لا حذف).
          </p>
        </div>

        <button
          onClick={openCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: theme.colors.gradients.primaryButton,
            color: theme.colors.neutral.white,
            border: 'none',
            borderRadius: theme.radii.md,
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: theme.typography.fontWeights.bold,
            boxShadow: theme.shadows.emeraldGlow,
            cursor: 'pointer',
          }}
        >
          <Plus size={18} />
          <span>إضافة مدرسة جديدة</span>
        </button>
      </div>

      {/* رسائل التغذية الراجعة */}
      {feedback && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: theme.radii.md,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor:
              feedback.type === 'success'
                ? theme.colors.status.success.bg
                : theme.colors.status.danger.bg,
            border: `1px solid ${
              feedback.type === 'success'
                ? theme.colors.status.success.border
                : theme.colors.status.danger.border
            }`,
            color:
              feedback.type === 'success'
                ? theme.colors.status.success.text
                : theme.colors.status.danger.text,
            fontSize: theme.typography.fontSizes.sm,
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ flex: 1 }}>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontWeight: 'bold',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* شريط أدوات البحث والتصفية */}
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.lg,
          padding: '16px 20px',
          border: `1px solid ${theme.colors.neutral[200]}`,
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{ display: 'flex', gap: '10px', flex: '1 1 320px', position: 'relative' }}
        >
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث باسم المدرسة، الكود التعريفي، أو المديرية..."
            style={{
              width: '100%',
              height: '40px',
              padding: '0 36px 0 14px',
              borderRadius: theme.radii.md,
              border: `1px solid ${theme.colors.neutral[300]}`,
              fontSize: theme.typography.fontSizes.sm,
              backgroundColor: theme.colors.neutral[50],
              outline: 'none',
            }}
          />
          <Search
            size={18}
            style={{
              position: 'absolute',
              top: '11px',
              right: '12px',
              color: theme.colors.neutral[400],
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0 16px',
              height: '40px',
              backgroundColor: theme.colors.neutral[800],
              color: theme.colors.neutral.white,
              border: 'none',
              borderRadius: theme.radii.md,
              fontSize: theme.typography.fontSizes.xs,
              fontWeight: theme.typography.fontWeights.bold,
              cursor: 'pointer',
            }}
          >
            بحث
          </button>
        </form>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} color={theme.colors.neutral[500]} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                height: '40px',
                padding: '0 12px',
                borderRadius: theme.radii.md,
                border: `1px solid ${theme.colors.neutral[300]}`,
                fontSize: theme.typography.fontSizes.xs,
                backgroundColor: theme.colors.neutral.white,
                color: theme.colors.neutral[700],
                outline: 'none',
              }}
            >
              <option value="">كافة الحالات</option>
              <option value="Active">نشطة (Active)</option>
              <option value="Inactive">معطلة (Inactive)</option>
            </select>
          </div>

          <select
            value={governorateFilter}
            onChange={(e) => setGovernorateFilter(e.target.value)}
            style={{
              height: '40px',
              padding: '0 12px',
              borderRadius: theme.radii.md,
              border: `1px solid ${theme.colors.neutral[300]}`,
              fontSize: theme.typography.fontSizes.xs,
              backgroundColor: theme.colors.neutral.white,
              color: theme.colors.neutral[700],
              outline: 'none',
            }}
          >
            <option value="">كافة المحافظات</option>
            <option value="أمانة العاصمة">أمانة العاصمة</option>
            <option value="صنعاء">صنعاء</option>
            <option value="تعز">تعز</option>
            <option value="عدن">عدن</option>
            <option value="الحديدة">الحديدة</option>
            <option value="إب">إب</option>
            <option value="ذمار">ذمار</option>
            <option value="حضرموت">حضرموت</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setGovernorateFilter('');
              loadSchools();
            }}
            title="إعادة التعيين والتحديث"
            style={{
              height: '40px',
              width: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.neutral[100],
              border: `1px solid ${theme.colors.neutral[200]}`,
              borderRadius: theme.radii.md,
              color: theme.colors.neutral[600],
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* جدول عرض المدارس */}
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.lg,
          border: `1px solid ${theme.colors.neutral[200]}`,
          overflow: 'hidden',
          boxShadow: theme.shadows.sm,
        }}
      >
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Loader2 size={32} color={theme.colors.primary[600]} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
            <div style={{ color: theme.colors.neutral[500], fontSize: theme.typography.fontSizes.sm }}>
              جاري جلب بيانات المدارس...
            </div>
          </div>
        ) : schools.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Building2 size={44} color={theme.colors.neutral[300]} style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: theme.typography.fontSizes.base, color: theme.colors.neutral[700], margin: '0 0 6px 0' }}>
              لا توجد مدارس مطابقة للبحث
            </h3>
            <p style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[400], margin: 0 }}>
              جرّب تغيير عبارة البحث أو إزالة التصفية
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: theme.colors.neutral[50],
                    borderBottom: `1px solid ${theme.colors.neutral[200]}`,
                    fontSize: theme.typography.fontSizes.xs,
                    color: theme.colors.neutral[600],
                    fontWeight: theme.typography.fontWeights.bold,
                  }}
                >
                  <th style={{ padding: '14px 20px' }}>#</th>
                  <th style={{ padding: '14px 20px' }}>اسم المدرسة والمؤسسة</th>
                  <th style={{ padding: '14px 20px' }}>الكود التعريفي</th>
                  <th style={{ padding: '14px 20px' }}>المرحلة التعليمية</th>
                  <th style={{ padding: '14px 20px' }}>الموقع الجغرافي</th>
                  <th style={{ padding: '14px 20px' }}>الحالة</th>
                  <th style={{ padding: '14px 20px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school, index) => (
                  <tr
                    key={school.schoolId}
                    style={{
                      borderBottom: `1px solid ${theme.colors.neutral[100]}`,
                      fontSize: theme.typography.fontSizes.sm,
                      transition: theme.transitions.fast,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.colors.neutral[50])}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '16px 20px', color: theme.colors.neutral[400] }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: theme.radii.md,
                            backgroundColor: theme.colors.primary[50],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: theme.colors.primary[700],
                          }}
                        >
                          <School size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[900] }}>
                            {school.schoolName}
                          </div>
                          <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[400] }}>
                            معرف النظام: #{school.schoolId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontFamily: 'monospace',
                          padding: '3px 8px',
                          borderRadius: theme.radii.sm,
                          backgroundColor: theme.colors.neutral[100],
                          color: theme.colors.neutral[800],
                          fontSize: '11px',
                          fontWeight: theme.typography.fontWeights.semibold,
                        }}
                      >
                        {school.identificationData || 'غير محدد'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: theme.colors.neutral[700] }}>
                        <GraduationCap size={15} color={theme.colors.neutral[400]} />
                        <span>{school.educationalStage}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: theme.colors.neutral[700] }}>
                        <MapPin size={15} color={theme.colors.neutral[400]} />
                        <span>{school.governorate} — {school.educationalDistrict}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {school.status === 'Active' ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: theme.radii.full,
                            backgroundColor: theme.colors.status.success.badgeBg,
                            color: theme.colors.status.success.text,
                            fontSize: theme.typography.fontSizes.xs,
                            fontWeight: theme.typography.fontWeights.bold,
                          }}
                        >
                          <CheckCircle2 size={13} />
                          <span>نشطة</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: theme.radii.full,
                            backgroundColor: theme.colors.status.danger.badgeBg,
                            color: theme.colors.status.danger.text,
                            fontSize: theme.typography.fontSizes.xs,
                            fontWeight: theme.typography.fontWeights.bold,
                          }}
                        >
                          <XCircle size={13} />
                          <span>معطلة</span>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => openEditModal(school)}
                          title="تعديل بيانات المدرسة (UI-ADM-03)"
                          style={{
                            padding: '6px 10px',
                            backgroundColor: theme.colors.neutral[100],
                            border: `1px solid ${theme.colors.neutral[300]}`,
                            borderRadius: theme.radii.sm,
                            color: theme.colors.neutral[700],
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                          }}
                        >
                          <Edit2 size={14} />
                          <span>تعديل</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(school)}
                          title={school.status === 'Active' ? 'تعطيل المدرسة (تعطيل لا حذف)' : 'تفعيل المدرسة'}
                          style={{
                            padding: '6px 10px',
                            backgroundColor:
                              school.status === 'Active'
                                ? theme.colors.status.danger.bg
                                : theme.colors.status.success.bg,
                            border: `1px solid ${
                              school.status === 'Active'
                                ? theme.colors.status.danger.border
                                : theme.colors.status.success.border
                            }`,
                            borderRadius: theme.radii.sm,
                            color:
                              school.status === 'Active'
                                ? theme.colors.status.danger.text
                                : theme.colors.status.success.text,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: theme.typography.fontWeights.semibold,
                          }}
                        >
                          <Power size={14} />
                          <span>{school.status === 'Active' ? 'تعطيل' : 'تفعيل'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة إنشاء وتعديل بيانات المدرسة (Modal) */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: theme.colors.neutral.white,
              borderRadius: theme.radii.xl,
              width: '100%',
              maxWidth: '560px',
              padding: '28px',
              boxShadow: theme.shadows.xl,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: theme.radii.lg,
                    backgroundColor: theme.colors.primary[100],
                    color: theme.colors.primary[800],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: theme.typography.fontWeights.bold, margin: 0 }}>
                    {editingSchool ? 'تعديل بيانات المدرسة (UI-ADM-03)' : 'إضافة مدرسة جديدة إلى الدليل'}
                  </h2>
                  <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500] }}>
                    {editingSchool ? `تعديل بيانات المدرسة: ${editingSchool.schoolName}` : 'أدخل البيانات التعريفية والموقع الجغرافي'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: theme.colors.neutral[400],
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                    اسم المدرسة الرسمي *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    placeholder="مثال: مدرسة بلقيس النموذجية للبنات"
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 14px',
                      borderRadius: theme.radii.md,
                      border: `1px solid ${theme.colors.neutral[300]}`,
                      fontSize: theme.typography.fontSizes.sm,
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                      الرمز الوزاري التعريفي
                    </label>
                    <input
                      type="text"
                      value={formData.identificationData}
                      onChange={(e) => setFormData({ ...formData, identificationData: e.target.value })}
                      placeholder="مثال: SCH-SANAA-2026-001"
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 14px',
                        borderRadius: theme.radii.md,
                        border: `1px solid ${theme.colors.neutral[300]}`,
                        fontSize: theme.typography.fontSizes.sm,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                      المرحلة التعليمية *
                    </label>
                    <select
                      value={formData.educationalStage}
                      onChange={(e) => setFormData({ ...formData, educationalStage: e.target.value })}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: theme.radii.md,
                        border: `1px solid ${theme.colors.neutral[300]}`,
                        fontSize: theme.typography.fontSizes.sm,
                        outline: 'none',
                      }}
                    >
                      <option value="أساسي وثانوي">أساسي وثانوي (1 - 12)</option>
                      <option value="تعليم أساسي">تعليم أساسي (1 - 9)</option>
                      <option value="تعليم ثانوي">تعليم ثانوي (10 - 12)</option>
                      <option value="مجمع تربوي">مجمع تربوي شامل</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                      المحافظة *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.governorate}
                      onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                      placeholder="مثال: أمانة العاصمة أو تعز"
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 14px',
                        borderRadius: theme.radii.md,
                        border: `1px solid ${theme.colors.neutral[300]}`,
                        fontSize: theme.typography.fontSizes.sm,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                      المديرية التعليمية *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.educationalDistrict}
                      onChange={(e) => setFormData({ ...formData, educationalDistrict: e.target.value })}
                      placeholder="مثال: مديرية التحرير أو القاهرة"
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 14px',
                        borderRadius: theme.radii.md,
                        border: `1px solid ${theme.colors.neutral[300]}`,
                        fontSize: theme.typography.fontSizes.sm,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                    حالة تفعيل المدرسة *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: theme.radii.md,
                      border: `1px solid ${theme.colors.neutral[300]}`,
                      fontSize: theme.typography.fontSizes.sm,
                      outline: 'none',
                    }}
                  >
                    <option value="Active">نشطة ومدرجة في دورات التقييم (Active)</option>
                    <option value="Inactive">معطلة مؤقتاً (Inactive)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: theme.colors.neutral[100],
                    border: `1px solid ${theme.colors.neutral[300]}`,
                    borderRadius: theme.radii.md,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 24px',
                    background: theme.colors.gradients.primaryButton,
                    color: theme.colors.neutral.white,
                    border: 'none',
                    borderRadius: theme.radii.md,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.bold,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  <span>{editingSchool ? 'حفظ التعديلات' : 'إضافة المدرسة الآن'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
