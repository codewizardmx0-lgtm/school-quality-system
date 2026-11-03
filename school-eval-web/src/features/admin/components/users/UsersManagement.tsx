import React, { useState, useEffect, useMemo } from 'react';
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
import { mockAdminService } from '../../services/mockAdminData';
import { downloadXlsx } from '../../utils/exportUtils';
import { formatRelativeArabic } from '../../utils/dateUtils';
import type { User, AdminScreen } from '../../types/admin.types';

interface UsersManagementProps {
  onNavigate: (screen: AdminScreen) => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
}

export const UsersManagement: React.FC<UsersManagementProps> = ({ onNavigate, addToast }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState('الكل');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [toggleConfirmUser, setToggleConfirmUser] = useState<User | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await mockAdminService.getUsers();
      if (res.data) setUsers(res.data);
    } catch {
      addToast('error', 'فشل في تحميل قائمة المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    void fetchUsers();
  };

  useEffect(() => {
    let ignore = false;
    mockAdminService
      .getUsers()
      .then((res) => {
        if (!ignore) {
          if (res.data) setUsers(res.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          addToast('error', 'فشل في تحميل قائمة المستخدمين');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.schoolName && u.schoolName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.directorate && u.directorate.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRole =
        roleFilter === 'الكل' ||
        u.roleName === roleFilter;

      const matchStatus =
        statusFilter === 'الكل' ||
        (statusFilter === 'نشط' && u.status === 'Active') ||
        (statusFilter === 'معلق مؤقتاً' && u.status === 'Disabled');

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Stat Counts
  const totalUsers = 68;
  const activeUsers = 65;
  const schoolEvaluatorsCount = 48;
  const ministrySupervisorsCount = 14;
  const systemAdminsCount = 6;

  // Toggle User Status
  const handleToggleStatus = async () => {
    if (!toggleConfirmUser) return;
    setToggleLoading(true);
    try {
      const res = await mockAdminService.toggleUserStatus(toggleConfirmUser.userId);
      if (res.data) {
        setUsers((prev) =>
          prev.map((u) => (u.userId === res.data!.userId ? res.data! : u))
        );
        const action = res.data.status === 'Active' ? 'تفعيل' : 'تعليق';
        addToast('success', `تم ${action} حساب ${res.data.fullName} بنجاح`);
      }
    } catch {
      addToast('error', 'حدث خطأ أثناء تغيير حالة الحساب');
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
      u.status === 'Active' ? 'نشط' : 'معلق مؤقتاً',
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
    <div style={{ padding: '32px', direction: 'rtl', fontFamily: theme.typography.fontFamily.sans }}>
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
          value={`${totalUsers} مستخدماً`}
          subtitle={`${activeUsers} حساباً نشطاً`}
          icon={<Users size={24} />}
          iconBgColor="#EFF6FF"
          iconColor="#2563EB"
        />
        <StatCard
          title="مسؤولو التقييم بالمدارس"
          value={`${schoolEvaluatorsCount} مستخدماً`}
          subtitle="مستخدم واحد لكل مدرسة نشطة"
          icon={<UserCheck size={24} />}
          iconBgColor="#ECFDF5"
          iconColor="#059669"
        />
        <StatCard
          title="فريق الإشراف الوزاري"
          value={`${ministrySupervisorsCount} مشرفاً`}
          subtitle="موزعون على المديريات"
          icon={<Building size={24} />}
          iconBgColor="#CFFAFE"
          iconColor="#0891B2"
        />
        <StatCard
          title="إدارة المرجعية والنظام"
          value={`${systemAdminsCount} حسابات`}
          subtitle="صلاحيات حوكمة عليا"
          icon={<ShieldCheck size={24} />}
          iconBgColor="#FEF3C7"
          iconColor="#D97706"
        />
      </div>

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
            <option value="نشط">نشط</option>
            <option value="معلق مؤقتاً">معلق مؤقتاً</option>
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
          overflow: 'hidden',
          boxShadow: theme.shadows.sm,
          marginBottom: '24px',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
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
            {filteredUsers.length === 0 ? (
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
                        label={user.status === 'Active' ? 'نشط' : 'معلق مؤقتاً'}
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
                          title={user.status === 'Active' ? 'تعليق الحساب' : 'تفعيل الحساب'}
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
                          {user.status === 'Active' ? 'قفل' : 'تفعيل'}
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
        title={toggleConfirmUser?.status === 'Active' ? 'تعليق حساب مستخدم' : 'تفعيل حساب مستخدم'}
        message={
          toggleConfirmUser?.status === 'Active'
            ? `هل أنت متأكد من رغبتك في تعليق حساب "${toggleConfirmUser?.fullName}"؟ لن يتمكن من تسجيل الدخول للنظام لحين إعادة تفعيله.`
            : `هل أنت متأكد من تفعيل حساب "${toggleConfirmUser?.fullName}"؟ سيتمكن من الوصول للنظام فوراً.`
        }
        confirmLabel={toggleConfirmUser?.status === 'Active' ? 'نعم، قم بالقفل' : 'نعم، قم بالتفعيل'}
        cancelLabel="إلغاء"
        variant={toggleConfirmUser?.status === 'Active' ? 'danger' : 'info'}
        isLoading={toggleLoading}
        onConfirm={handleToggleStatus}
        onCancel={() => setToggleConfirmUser(null)}
      />
    </div>
  );
};
