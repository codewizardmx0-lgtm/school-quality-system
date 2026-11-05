import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  ShieldAlert,
  Building,
  Search,
  Filter,
  UserPlus,
  Download,
  Lock,
  Unlock,
  KeyRound,
  Edit,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { theme } from '../../theme';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { downloadXlsx } from '../../utils/exportUtils';
import { formatRelativeArabic } from '../../utils/dateUtils';
import type { User, AdminScreen } from '../../types/admin.types';

interface UsersManagementProps {
  onNavigate: (screen: AdminScreen) => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
}

export const UsersManagement: React.FC<UsersManagementProps> = ({ onNavigate, addToast }) => {
  const {
    users,
    filteredUsers,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    fetchUsers,
    toggleUserStatus,
  } = useAdminUsers();

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [toggleConfirmUser, setToggleConfirmUser] = useState<User | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const handleRefresh = () => {
    void fetchUsers();
  };

  // Stat Counts dynamically computed
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'Active').length;
  const schoolEvaluatorsCount = users.filter((u) => u.userType === 'school').length;
  const ministrySupervisorsCount = users.filter((u) => u.userType === 'ministry').length;
  const systemAdminsCount = users.filter((u) => u.userType === 'system').length;

  // Toggle User Status via API Hook
  const handleToggleStatus = async () => {
    if (!toggleConfirmUser) return;
    setToggleLoading(true);
    try {
      const updated = await toggleUserStatus(toggleConfirmUser.userId);
      const action = updated.status === 'Active' ? 'تنشيط' : 'تعطيل';
      addToast('success', `تم ${action} حساب ${updated.fullName} بنجاح`);
    } catch (err: any) {
      addToast('error', err?.message || 'حدث خطأ أثناء تغيير حالة الحساب');
    } finally {
      setToggleLoading(false);
      setToggleConfirmUser(null);
    }
  };

  // Export to XLSX / CSV
  const handleExport = () => {
    const headers = [
      'معرف المستخدم',
      'الاسم الكامل',
      'اسم المستخدم',
      'البريد الرسمي',
      'نوع المستخدم',
      'الدور المسند',
      'الجهة التابعة',
      'الحالة',
      'آخر نشاط',
    ];
    const rows = filteredUsers.map((u) => [
      u.userId,
      u.fullName,
      u.username,
      u.email,
      u.userType === 'school' ? 'مدرسة' : u.userType === 'ministry' ? 'مشرف وزاري' : 'إدارة النظام',
      u.roleName,
      u.schoolName ? `${u.schoolName} (${u.schoolCode})` : u.directorate || 'المركز الرئيسي',
      u.status === 'Active' ? 'نشط' : 'معطل',
      formatRelativeArabic(u.lastActivity),
    ]);
    downloadXlsx('erteqa_users_directory.xlsx', headers, rows);
    addToast('success', 'تم تصدير دليل المستخدمين بنجاح بصيغة XLSX');
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
    return parts[0]?.slice(0, 2) || 'MS';
  };

  return (
    <div style={{ padding: '24px 20px', direction: 'rtl', fontFamily: theme.typography.fontFamily.sans, boxSizing: 'border-box' }}>
      {/* Header & Primary Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: theme.colors.neutral[900],
              margin: 0,
            }}
          >
            لوحة إدارة المستخدمين وتوزيع الأدوار والصلاحيات
          </h1>
          <p
            style={{
              fontSize: theme.typography.fontSizes.sm,
              color: theme.colors.neutral[500],
              marginTop: '4px',
            }}
          >
            إدارة وصول مسؤولي التقييم والمشرفين الوزاريين • عزل الصلاحيات ومنع تضارب الأدوار
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: theme.radii.lg,
            border: 'none',
            background: 'linear-gradient(90deg, #4F46E5, #6366F1)',
            color: '#fff',
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
            fontFamily: theme.typography.fontFamily.sans,
          }}
        >
          <UserPlus size={18} />
          + إنشاء مستخدم جديد
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <StatCard
          title="إجمالي الحسابات المسجلة"
          value={loading ? '...' : `${totalUsers} مستخدماً`}
          subtitle={loading ? '...' : `${activeUsers} حساباً نشطاً`}
          icon={<Users size={24} />}
          iconBgColor="#EFF6FF"
          iconColor="#2563EB"
        />
        <StatCard
          title="مسؤولو التقييم بالمدارس"
          value={loading ? '...' : `${schoolEvaluatorsCount} مستخدماً`}
          subtitle="مستخدم واحد لكل مدرسة نشطة"
          icon={<UserCheck size={24} />}
          iconBgColor="#ECFDF5"
          iconColor="#059669"
        />
        <StatCard
          title="فريق الإشراف الوزاري"
          value={loading ? '...' : `${ministrySupervisorsCount} مشرفاً`}
          subtitle="موزعون على المديريات"
          icon={<Building size={24} />}
          iconBgColor="#CFFAFE"
          iconColor="#0891B2"
        />
        <StatCard
          title="إدارة المرجعية والنظام"
          value={loading ? '...' : `${systemAdminsCount} حسابات`}
          subtitle="صلاحيات حوكمة عليا"
          icon={<ShieldCheck size={24} />}
          iconBgColor="#FEF3C7"
          iconColor="#D97706"
        />
      </div>

      {/* Error Fallback Prompt */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: theme.radii.lg,
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991B1B', fontSize: theme.typography.fontSizes.sm }}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => void fetchUsers()}
            style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: theme.radii.md,
              padding: '6px 14px',
              fontSize: theme.typography.fontSizes.xs,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          padding: '16px 20px',
          border: `1px solid ${theme.colors.neutral[200]}`,
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search
            size={18}
            color={theme.colors.neutral[400]}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 38px 9px 12px',
              borderRadius: theme.radii.lg,
              border: `1px solid ${theme.colors.neutral[200]}`,
              fontSize: theme.typography.fontSizes.sm,
              backgroundColor: theme.colors.neutral[50],
              outline: 'none',
              fontFamily: theme.typography.fontFamily.sans,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Role Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color={theme.colors.neutral[400]} />
          <span style={{ fontSize: theme.typography.fontSizes.sm, color: theme.colors.neutral[600], whiteSpace: 'nowrap' }}>
            تصفية الدور:
          </span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: theme.radii.lg,
              border: `1px solid ${theme.colors.neutral[200]}`,
              fontSize: theme.typography.fontSizes.sm,
              backgroundColor: theme.colors.neutral.white,
              color: theme.colors.neutral[800],
              outline: 'none',
              fontFamily: theme.typography.fontFamily.sans,
            }}
          >
            <option value="الكل">الكل</option>
            <option value="مستخدم التقييم بالمدرسة">مستخدم التقييم بالمدرسة</option>
            <option value="مشرف وزاري معتمد">مشرف وزاري معتمد</option>
            <option value="مسؤول إدارة المرجعية">مسؤول إدارة المرجعية</option>
            <option value="مدير النظام المركزي">مدير النظام المركزي</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: theme.typography.fontSizes.sm, color: theme.colors.neutral[600], whiteSpace: 'nowrap' }}>
            حالة الحساب:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: theme.radii.lg,
              border: `1px solid ${theme.colors.neutral[200]}`,
              fontSize: theme.typography.fontSizes.sm,
              backgroundColor: theme.colors.neutral.white,
              color: theme.colors.neutral[800],
              outline: 'none',
              fontFamily: theme.typography.fontFamily.sans,
            }}
          >
            <option value="الكل">الكل</option>
            <option value="نشط">نشط (Active)</option>
            <option value="معطل">معطل (Disabled)</option>
          </select>
        </div>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          title="تحديث البيانات"
          style={{
            padding: '8px 12px',
            borderRadius: theme.radii.lg,
            border: `1px solid ${theme.colors.neutral[200]}`,
            backgroundColor: theme.colors.neutral.white,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: theme.colors.neutral[600],
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>

        <span style={{ marginRight: 'auto', fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[400] }}>
          عرض {filteredUsers.length} من أصل {users.length} مستخدماً
        </span>
      </div>

      {/* Users Data Table */}
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          border: `1px solid ${theme.colors.neutral[200]}`,
          overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        boxShadow: theme.shadows.sm,
        marginBottom: '24px',
        }}
      >
        <table style={{ width: '100%', minWidth: '840px', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr
              style={{
                backgroundColor: theme.colors.neutral[50],
                borderBottom: `1px solid ${theme.colors.neutral[200]}`,
              }}
            >
              <th style={{ padding: '14px 20px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                المستخدم / البريد الرسمي
              </th>
              <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                الدور المسند (Role)
              </th>
              <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                الجهة التابعة / النطاق
              </th>
              <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                آخر نشاط بالنظام
              </th>
              <th style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600] }}>
                حالة الحساب
              </th>
              <th style={{ padding: '14px 20px', fontSize: theme.typography.fontSizes.xs, fontWeight: 700, color: theme.colors.neutral[600], textAlign: 'center' }}>
                إجراءات الأمان
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse" style={{ borderBottom: `1px solid ${theme.colors.neutral[100]}` }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#E5E7EB' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ width: '120px', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px' }} />
                        <div style={{ width: '160px', height: '10px', backgroundColor: '#F3F4F6', borderRadius: '4px' }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ width: '100px', height: '22px', backgroundColor: '#E5E7EB', borderRadius: '12px' }} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ width: '110px', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px' }} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ width: '90px', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px' }} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ width: '60px', height: '22px', backgroundColor: '#E5E7EB', borderRadius: '12px' }} />
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ width: '80px', height: '28px', backgroundColor: '#E5E7EB', borderRadius: '6px', margin: '0 auto' }} />
                  </td>
                </tr>
              ))
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: theme.colors.neutral[400] }}>
                  لا توجد نتائج مطابقة لخيارات البحث أو التصفية
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, idx) => {
                const roleBadgeVariant =
                  user.userType === 'school' ? 'school' : user.userType === 'ministry' ? 'ministry' : 'system';

                return (
                  <tr
                    key={user.userId}
                    style={{
                      borderBottom: idx < filteredUsers.length - 1 ? `1px solid ${theme.colors.neutral[100]}` : 'none',
                      backgroundColor: idx % 2 === 0 ? theme.colors.neutral.white : '#FAFAFA',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* User & Email */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor:
                              user.userType === 'school'
                                ? '#EDE9FE'
                                : user.userType === 'ministry'
                                ? '#CFFAFE'
                                : '#FEF3C7',
                            color:
                              user.userType === 'school'
                                ? '#6D28D9'
                                : user.userType === 'ministry'
                                ? '#0E7490'
                                : '#B45309',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(user.fullName)}
                        </div>
                        <div>
                          <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: theme.colors.neutral[900] }}>
                            {user.fullName}
                          </div>
                          <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[400], direction: 'ltr', textAlign: 'right' }}>
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge variant={roleBadgeVariant} label={`${user.roleName} (${user.roleCode})`} size="md" />
                    </td>

                    {/* Affiliation */}
                    <td style={{ padding: '14px 16px' }}>
                      {user.schoolName ? (
                        <div>
                          <div style={{ fontSize: theme.typography.fontSizes.sm, color: theme.colors.neutral[800], fontWeight: 500 }}>
                            {user.schoolName}
                          </div>
                          <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[400] }}>
                            {user.directorate} • كود: {user.schoolCode}
                          </div>
                        </div>
                      ) : user.directorate ? (
                        <div>
                          <div style={{ fontSize: theme.typography.fontSizes.sm, color: theme.colors.neutral[800], fontWeight: 500 }}>
                            الإشراف الميداني
                          </div>
                          <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[400] }}>
                            {user.directorate} • أمانة العاصمة
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: theme.typography.fontSizes.sm, color: theme.colors.neutral[600] }}>
                          المركز الرئيسي • قيادة المنصة
                        </div>
                      )}
                    </td>

                    {/* Last Activity */}
                    <td style={{ padding: '14px 16px', fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500] }}>
                      <div>{formatRelativeArabic(user.lastActivity)}</div>
                      {user.isOnline && (
                        <span style={{ color: '#16A34A', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
                          متصل حالياً
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge
                        variant={user.status === 'Active' ? 'active' : 'disabled'}
                        label={user.status === 'Active' ? 'نشط' : 'معطل'}
                        size="md"
                      />
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {/* Edit */}
                        <button
                          onClick={() => setEditingUser(user)}
                          title="تعديل الحساب"
                          style={{
                            padding: '6px 10px',
                            borderRadius: theme.radii.md,
                            border: `1px solid ${theme.colors.neutral[200]}`,
                            backgroundColor: theme.colors.neutral.white,
                            color: theme.colors.neutral[700],
                            fontSize: theme.typography.fontSizes.xs,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontFamily: theme.typography.fontFamily.sans,
                          }}
                        >
                          <Edit size={13} />
                          تعديل
                        </button>

                        {/* Lock / Unlock */}
                        <button
                          onClick={() => setToggleConfirmUser(user)}
                          title={user.status === 'Active' ? 'تعطيل الحساب' : 'تنشيط الحساب'}
                          style={{
                            padding: '6px 10px',
                            borderRadius: theme.radii.md,
                            border: `1px solid ${user.status === 'Active' ? '#FECACA' : '#BBF7D0'}`,
                            backgroundColor: user.status === 'Active' ? '#FEF2F2' : '#F0FDF4',
                            color: user.status === 'Active' ? '#B91C1C' : '#15803D',
                            fontSize: theme.typography.fontSizes.xs,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontFamily: theme.typography.fontFamily.sans,
                          }}
                        >
                          {user.status === 'Active' ? <Lock size={13} /> : <Unlock size={13} />}
                          {user.status === 'Active' ? 'تعطيل' : 'تنشيط'}
                        </button>

                        {/* Reset Password */}
                        <button
                          onClick={() => setResetUser(user)}
                          title="إعادة ضبط كلمة المرور"
                          style={{
                            padding: '6px 10px',
                            borderRadius: theme.radii.md,
                            border: '1px solid #FDE68A',
                            backgroundColor: '#FFFBEB',
                            color: '#B45309',
                            fontSize: theme.typography.fontSizes.xs,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontFamily: theme.typography.fontFamily.sans,
                          }}
                        >
                          <KeyRound size={13} />
                          إعادة ضبط
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Governance Callout Box */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#F8FAFC',
          borderRadius: theme.radii.xl,
          border: '1px solid #E2E8F0',
          borderRight: '4px solid #4F46E5',
          marginBottom: '28px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}
      >
        <ShieldAlert size={20} color="#4F46E5" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
            مبدأ الفصل الصارم بين الصلاحيات (Separation of Duties)
          </div>
          <div style={{ fontSize: theme.typography.fontSizes.xs, color: '#64748B', lineHeight: 1.6 }}>
            يمنع النظام برمجياً منح مستخدم المدرسة صلاحيات إشرافية، كما يُمنع المشرف الوزاري من إدخال أو تعديل درجات التقييم الذاتي. أي تعديل على صلاحيات الحسابات أو إنشاء أدوار جديدة يتم توثيقه فوراً في سجل التدقيق الأمني غير القابل للحذف.
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingTop: '8px',
        }}
      >
        <button
          onClick={handleExport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: theme.radii.lg,
            border: `1px solid ${theme.colors.neutral[300]}`,
            backgroundColor: theme.colors.neutral.white,
            color: theme.colors.neutral[700],
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: theme.typography.fontFamily.sans,
          }}
        >
          <Download size={16} />
          تصدير دليل المستخدمين (XLSX) ↓
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onNavigate('audit')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: theme.radii.lg,
              border: `1px solid ${theme.colors.neutral[200]}`,
              backgroundColor: theme.colors.neutral.white,
              color: theme.colors.neutral[700],
              fontSize: theme.typography.fontSizes.sm,
              cursor: 'pointer',
              fontFamily: theme.typography.fontFamily.sans,
            }}
          >
            سجل الأمان والتدقيق
          </button>
          <button
            onClick={() => onNavigate('schools')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: theme.radii.lg,
              border: 'none',
              backgroundColor: '#0F172A',
              color: '#fff',
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: theme.typography.fontFamily.sans,
            }}
          >
            إدارة المدارس والتهيئة الجغرافية
            <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchUsers}
        addToast={addToast}
      />

      <EditUserModal
        isOpen={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={fetchUsers}
        addToast={addToast}
      />

      <ResetPasswordModal
        isOpen={!!resetUser}
        user={resetUser}
        onClose={() => setResetUser(null)}
        addToast={addToast}
      />

      <ConfirmationDialog
        isOpen={!!toggleConfirmUser}
        title={toggleConfirmUser?.status === 'Active' ? 'تعطيل حساب مستخدم' : 'تنشيط حساب مستخدم'}
        message={
          toggleConfirmUser?.status === 'Active'
            ? `هل أنت متأكد من رغبتك في تعطيل حساب "${toggleConfirmUser?.fullName}"؟ لن يتمكن من تسجيل الدخول للنظام لحين إعادة تنشيطه.`
            : `هل أنت متأكد من تنشيط حساب "${toggleConfirmUser?.fullName}"؟ سيتمكن من الوصول للنظام فوراً.`
        }
        confirmLabel={toggleConfirmUser?.status === 'Active' ? 'نعم، قم بالتعطيل' : 'نعم، قم بالتنشيط'}
        cancelLabel="إلغاء"
        variant={toggleConfirmUser?.status === 'Active' ? 'danger' : 'info'}
        isLoading={toggleLoading}
        onConfirm={handleToggleStatus}
        onCancel={() => setToggleConfirmUser(null)}
      />
    </div>
  );
};
