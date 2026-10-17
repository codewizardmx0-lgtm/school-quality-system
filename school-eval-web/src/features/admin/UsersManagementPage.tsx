import React, { useState, useEffect } from 'react';
import { theme } from '../../styles/theme';
import { adminApi } from './adminApi';
import type { UserItem, AdminMeta } from './types';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Building2,
  Loader2,
  RefreshCw,
  Edit2,
  Power,
  AlertCircle,
  School,
} from 'lucide-react';

export const UsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [meta, setMeta] = useState<AdminMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // حالة النافذة المنبثقة (Modal) للإضافة والتعديل
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // حقول النموذج
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    userType: 'school' as 'school' | 'ministry' | 'system',
    schoolId: '' as string | number,
    ministryId: '' as string | number,
    roleId: '' as string | number,
    status: 'Active' as 'Active' | 'Disabled',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, metaData] = await Promise.all([
        adminApi.getUsers({
          q: searchTerm || undefined,
          status: statusFilter || undefined,
          userType: userTypeFilter || undefined,
        }),
        adminApi.getAdminMeta(),
      ]);
      setUsers(usersData);
      setMeta(metaData);
    } catch {
      setFeedback({ type: 'error', message: 'تعذر جلب بيانات المستخدمين من الخادم.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, userTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      fullName: '',
      email: '',
      userType: 'school',
      schoolId: meta?.schools[0]?.schoolId || '',
      ministryId: '',
      roleId: meta?.roles[0]?.roleId || '',
      status: 'Active',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserItem) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      password: '', // فارغ في حال عدم الرغبة بالتغيير
      fullName: u.fullName,
      email: u.email,
      userType: u.userType,
      schoolId: u.schoolId || '',
      ministryId: u.ministryId || '',
      roleId: u.roles[0]?.roleId || '',
      status: u.status,
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (u: UserItem) => {
    try {
      const res = await adminApi.toggleUserStatus(u.userId);
      setFeedback({
        type: 'success',
        message: res.message || 'تم تحديث حالة المستخدم بنجاح.',
      });
      loadData();
    } catch {
      setFeedback({ type: 'error', message: 'فشل تغيير حالة الحساب.' });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        await adminApi.updateUser(editingUser.userId, {
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password || undefined,
          userType: formData.userType,
          schoolId: formData.userType === 'school' ? Number(formData.schoolId) : null,
          ministryId: formData.userType === 'ministry' ? Number(formData.ministryId) : null,
          roleId: formData.roleId ? Number(formData.roleId) : undefined,
          status: formData.status,
        });
        setFeedback({ type: 'success', message: 'تم تحديث بيانات المستخدم بنجاح.' });
      } else {
        await adminApi.createUser({
          username: formData.username,
          password: formData.password,
          fullName: formData.fullName,
          email: formData.email,
          userType: formData.userType,
          schoolId: formData.userType === 'school' ? Number(formData.schoolId) : null,
          ministryId: formData.userType === 'ministry' ? Number(formData.ministryId) : null,
          roleId: Number(formData.roleId),
          status: formData.status,
        });
        setFeedback({ type: 'success', message: 'تم إنشاء الحساب وإسناد الصلاحيات بنجاح.' });
      }
      setIsModalOpen(false);
      loadData();
    } catch {
      setFeedback({ type: 'error', message: 'حدث خطأ أثناء حفظ الحساب. تحقق من تكرار اسم المستخدم أو البريد.' });
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleArabicName = (roleName?: string) => {
    switch (roleName) {
      case 'admin':
        return 'مسؤول النظام (Admin)';
      case 'school_evaluator':
        return 'مسؤول تقييم الجودة';
      case 'school_principal':
        return 'مدير مدرسة';
      case 'ministry_supervisor':
        return 'مشرف تربوي وزاري';
      case 'ministry_standards_manager':
        return 'مدير إدارة المعايير';
      default:
        return roleName || 'غير مسند';
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
            <span>إدارة النظام | UI-ADM-04</span>
          </div>
          <h1
            style={{
              fontSize: theme.typography.fontSizes['2xl'],
              fontWeight: theme.typography.fontWeights.extrabold,
              color: theme.colors.neutral[900],
              margin: 0,
            }}
          >
            إدارة حسابات المستخدمين والصلاحيات
          </h1>
          <p
            style={{
              fontSize: theme.typography.fontSizes.sm,
              color: theme.colors.neutral[500],
              margin: '4px 0 0 0',
            }}
          >
            التحكم في وصول المستخدمين للأدوار الخمسة (RBAC)، التبعية المؤسسية الحصرية (XOR)، وحظر الحذف لصالح التعطيل.
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
          <UserPlus size={18} />
          <span>إنشاء حساب مستخدم جديد</span>
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
            placeholder="البحث باسم المستخدم، الاسم الكامل، أو البريد..."
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
              value={userTypeFilter}
              onChange={(e) => setUserTypeFilter(e.target.value)}
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
              <option value="">كافة أنواع الحسابات</option>
              <option value="school">مدرسي (School)</option>
              <option value="ministry">وزاري (Ministry)</option>
              <option value="system">مسؤول نظام (System)</option>
            </select>
          </div>

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
            <option value="Active">نشط (Active)</option>
            <option value="Disabled">معطل (Disabled)</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setUserTypeFilter('');
              loadData();
            }}
            title="تحديث القائمة"
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

      {/* جدول المستخدمين والحسابات */}
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
              جاري جلب حسابات المستخدمين...
            </div>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Users size={44} color={theme.colors.neutral[300]} style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: theme.typography.fontSizes.base, color: theme.colors.neutral[700], margin: '0 0 6px 0' }}>
              لا يوجد مستخدمون مطابقون
            </h3>
            <p style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[400], margin: 0 }}>
              جرّب تغيير فلاتر البحث لعرض الحسابات
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
                  <th style={{ padding: '14px 20px' }}>المستخدم والاسم</th>
                  <th style={{ padding: '14px 20px' }}>الدور الوظيفي (RBAC)</th>
                  <th style={{ padding: '14px 20px' }}>التبعية المؤسسية (XOR)</th>
                  <th style={{ padding: '14px 20px' }}>نوع الحساب</th>
                  <th style={{ padding: '14px 20px' }}>الحالة</th>
                  <th style={{ padding: '14px 20px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, index) => (
                  <tr
                    key={u.userId}
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
                            width: '38px',
                            height: '38px',
                            borderRadius: theme.radii.full,
                            backgroundColor: theme.colors.neutral[100],
                            border: `1px solid ${theme.colors.neutral[300]}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: theme.colors.neutral[700],
                            fontWeight: 'bold',
                          }}
                        >
                          {u.fullName.slice(0, 1)}
                        </div>
                        <div>
                          <div style={{ fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[900] }}>
                            {u.fullName}
                          </div>
                          <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[400], display: 'flex', gap: '8px' }}>
                            <span style={{ fontFamily: 'monospace' }}>@{u.username}</span>
                            <span>•</span>
                            <span>{u.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: theme.radii.sm,
                          backgroundColor: theme.colors.primary[50],
                          color: theme.colors.primary[800],
                          fontSize: '11px',
                          fontWeight: theme.typography.fontWeights.bold,
                        }}
                      >
                        {getRoleArabicName(u.roles[0]?.roleName)}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {u.school ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: theme.colors.neutral[800] }}>
                          <School size={15} color={theme.colors.primary[600]} />
                          <span>{u.school.schoolName}</span>
                        </div>
                      ) : u.ministry ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: theme.colors.neutral[800] }}>
                          <Building2 size={15} color={theme.colors.neutral[500]} />
                          <span>{u.ministry.ministryName}</span>
                        </div>
                      ) : (
                        <span style={{ color: theme.colors.neutral[400], fontSize: theme.typography.fontSizes.xs }}>
                          إدارة عليا مركزية (بدون جهة)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: theme.radii.sm,
                          backgroundColor: theme.colors.neutral[100],
                          color: theme.colors.neutral[700],
                        }}
                      >
                        {u.userType === 'school' ? 'مدرسي' : u.userType === 'ministry' ? 'وزاري' : 'نظام'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {u.status === 'Active' ? (
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
                          <span>نشط</span>
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
                          <span>معطل</span>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => openEditModal(u)}
                          title="تعديل بيانات الحساب (UI-ADM-05)"
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
                          onClick={() => handleToggleStatus(u)}
                          title={u.status === 'Active' ? 'تعطيل الحساب (حظر الدخول)' : 'تفعيل الحساب'}
                          style={{
                            padding: '6px 10px',
                            backgroundColor:
                              u.status === 'Active'
                                ? theme.colors.status.danger.bg
                                : theme.colors.status.success.bg,
                            border: `1px solid ${
                              u.status === 'Active'
                                ? theme.colors.status.danger.border
                                : theme.colors.status.success.border
                            }`,
                            borderRadius: theme.radii.sm,
                            color:
                              u.status === 'Active'
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
                          <span>{u.status === 'Active' ? 'تعطيل' : 'تفعيل'}</span>
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

      {/* نافذة إنشاء وتعديل المستخدم (Modal - UI-ADM-05) */}
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
              maxWidth: '600px',
              padding: '28px',
              boxShadow: theme.shadows.xl,
              maxHeight: '90vh',
              overflowY: 'auto',
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
                  <Users size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: theme.typography.fontWeights.bold, margin: 0 }}>
                    {editingUser ? 'تعديل بيانات الحساب (UI-ADM-05)' : 'إنشاء حساب مستخدم جديد'}
                  </h2>
                  <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500] }}>
                    {editingUser ? `تعديل الحساب: ${editingUser.username}` : 'تعبئة بيانات الحساب وإسناد الدور والمؤسسة'}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                      اسم المستخدم (Login) *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!editingUser}
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="مثال: quality_farouq"
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 14px',
                        borderRadius: theme.radii.md,
                        border: `1px solid ${theme.colors.neutral[300]}`,
                        fontSize: theme.typography.fontSizes.sm,
                        outline: 'none',
                        backgroundColor: editingUser ? theme.colors.neutral[100] : theme.colors.neutral.white,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                      الاسم الكامل والشهرة *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="مثال: أ. أحمد علي (مسؤول تقييم)"
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                      البريد الإلكتروني *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="مثال: user@school-eval.gov.ye"
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
                      {editingUser ? 'تغيير كلمة المرور (اختياري)' : 'كلمة المرور *'}
                    </label>
                    <input
                      type="password"
                      required={!editingUser}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? 'اتركه فارغاً لعدم التغيير' : 'لا يقل عن 8 أحرف'}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                      نوع الحساب المؤسسي *
                    </label>
                    <select
                      value={formData.userType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          userType: e.target.value as 'school' | 'ministry' | 'system',
                        })
                      }
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
                      <option value="school">مدرسي (School)</option>
                      <option value="ministry">وزاري (Ministry)</option>
                      <option value="system">مسؤول نظام (System)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                      الدور الوظيفي والصلاحيات (Role) *
                    </label>
                    <select
                      value={formData.roleId}
                      onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
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
                      <option value="">اختر الدور الوظيفي...</option>
                      {meta?.roles.map((r) => (
                        <option key={r.roleId} value={r.roleId}>
                          {getRoleArabicName(r.roleName)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* التبعية المؤسسية الحصرية (XOR) */}
                {formData.userType === 'school' && (
                  <div>
                    <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                      المدرسة التابع لها الحساب *
                    </label>
                    <select
                      required
                      value={formData.schoolId}
                      onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
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
                      <option value="">اختر مدرسة المستخدم...</option>
                      {meta?.schools.map((s) => (
                        <option key={s.schoolId} value={s.schoolId}>
                          {s.schoolName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.userType === 'ministry' && (
                  <div>
                    <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                      الجهة الوزارية التابع لها الحساب *
                    </label>
                    <select
                      required
                      value={formData.ministryId}
                      onChange={(e) => setFormData({ ...formData, ministryId: e.target.value })}
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
                      <option value="">اختر الجهة الوزارية...</option>
                      {meta?.ministries.map((m) => (
                        <option key={m.ministryId} value={m.ministryId}>
                          {m.ministryName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: theme.typography.fontSizes.xs, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[700], marginBottom: '6px' }}>
                    حالة الحساب *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Disabled' })}
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
                    <option value="Active">نشط ومصرّح له بالدخول (Active)</option>
                    <option value="Disabled">معطل ومحظور الدخول (Disabled)</option>
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
                  <span>{editingUser ? 'حفظ التعديلات' : 'إنشاء الحساب الآن'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
