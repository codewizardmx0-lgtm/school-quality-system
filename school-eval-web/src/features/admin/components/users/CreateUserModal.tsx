import React, { useState, useEffect, useMemo } from 'react';
import { X, Eye, EyeOff, Globe, MapPin } from 'lucide-react';
import { theme } from '../../theme';
import { usersApi } from '../../api/usersApi';
import { schoolsApi } from '../../api/schoolsApi';
import { SearchableSelect, type SearchableOption } from '../common/SearchableSelect';
import { formatRoleNameAr } from '../../utils/roleUtils';
import type { CreateUserDto, UserType, Role, Directorate, Governorate } from '../../types/admin.types';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

const DEFAULT_YEMENI_GOVERNORATES = [
  'أمانة العاصمة',
  'محافظة تعز',
  'محافظة صنعاء',
  'محافظة عدن',
  'محافظة الحديدة',
  'محافظة إب',
  'محافظة ذمار',
  'محافظة حضرموت',
  'محافظة حجة',
  'محافظة صعدة',
  'محافظة عمران',
  'محافظة لحج',
  'محافظة أبين',
  'محافظة البيضاء',
  'محافظة شبوة',
  'محافظة مأرب',
  'محافظة الجوف',
  'محافظة المهرة',
  'محافظة المحويت',
  'محافظة ريمة',
  'محافظة الضالع',
  'محافظة سقطرى',
];

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSuccess, addToast }) => {
  const [form, setForm] = useState<CreateUserDto>({
    fullName: '', username: '', email: '', password: '', userType: 'school',
    roleId: 2, schoolId: null, directorateId: null, governorate: null, status: 'Active',
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [schools, setSchools] = useState<Array<{ schoolId: number; schoolName: string; schoolCode: string }>>([]);
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [directorates, setDirectorates] = useState<Directorate[]>([]);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;

    // Load users metadata
    usersApi.getUsersMeta().then((res) => {
      if (!ignore && res.data) {
        if (res.data.roles?.length) setRoles(res.data.roles);
        if (res.data.schools?.length) setSchools(res.data.schools);
        if (res.data.governorates?.length) setGovernorates(res.data.governorates);
        if (res.data.directorates?.length) setDirectorates(res.data.directorates);
      }
    }).catch((err) => console.warn('Failed to load users meta:', err));

    // Load full governorates list
    schoolsApi.getGovernorates().then((res) => {
      if (!ignore && res.data?.length) {
        setGovernorates(res.data);
      }
    }).catch((err) => console.warn('Failed to load governorates:', err));

    // Load all active directorates
    schoolsApi.getDirectorates().then((res) => {
      if (!ignore && res.data?.length) {
        setDirectorates(res.data);
      }
    }).catch((err) => console.warn('Failed to load directorates:', err));

    return () => { ignore = true; };
  }, [isOpen]);

  // List of governorate names combining DB and official default
  const governorateNames: string[] = useMemo(() => {
    if (governorates.length > 0) {
      const names = governorates.map((g) => g.nameAr).filter(Boolean);
      return Array.from(new Set([...names, ...DEFAULT_YEMENI_GOVERNORATES]));
    }
    return DEFAULT_YEMENI_GOVERNORATES;
  }, [governorates]);

  // Filter directorates strictly by the selected governorate
  const filteredDirectorates = useMemo(() => {
    if (!form.governorate) return [];
    const normalizedGov = form.governorate.trim().toLowerCase();
    const cleanGov = normalizedGov.replace('محافظة', '').trim();

    return directorates.filter((d) => {
      if (!d.governorate && !(d as any).governorateName) return false;
      const dGov = (d.governorate || (d as any).governorateName || '').trim().toLowerCase();
      const cleanDGov = dGov.replace('محافظة', '').trim();
      return (
        dGov === normalizedGov ||
        cleanDGov === cleanGov ||
        normalizedGov.includes(cleanDGov) ||
        cleanDGov.includes(cleanGov)
      );
    });
  }, [directorates, form.governorate]);

  // Directorate options: starts with comprehensive option, then filtered directorates of that governorate
  const directorateOptions: SearchableOption[] = useMemo(() => {
    const list: SearchableOption[] = [
      {
        value: 0,
        label: '✨ شامل للمحافظة ككل (كافة المديريات)',
        sublabel: form.governorate || 'إشراف عام على كامل المحافظة',
      },
    ];

    filteredDirectorates.forEach((d) => {
      list.push({
        value: d.directorateId,
        label: d.directorateName,
        sublabel: d.governorate || form.governorate || undefined,
      });
    });

    return list;
  }, [filteredDirectorates, form.governorate]);

  if (!isOpen) return null;

  const schoolOptions: SearchableOption[] = schools.map((s) => ({
    value: s.schoolId,
    label: s.schoolName,
    code: s.schoolCode,
    sublabel: (s as any).educationalDistrict || (s as any).directorate,
  }));

  // Filter roles dynamically according to official DB roles
  const filteredRoles = roles.filter((r) => {
    const rName = r?.roleName || '';
    if (form.userType === 'school') {
      return rName === 'school_evaluator' || rName === 'school_principal' || rName.includes('school');
    }
    if (form.userType === 'ministry') {
      return rName === 'ministry_supervisor' || rName === 'ministry_standards_manager' || rName.includes('ministry');
    }
    if (form.userType === 'system') {
      return rName === 'admin' || rName.includes('admin') || rName.includes('system');
    }
    return true;
  });

  const handleChange = (field: keyof CreateUserDto, value: string | number | null) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'userType') {
        const allowed = roles.filter((r) => {
          const rName = r?.roleName || '';
          if (value === 'school') return rName.includes('school');
          if (value === 'ministry') return rName.includes('ministry');
          return rName === 'admin' || rName.includes('admin');
        });
        next.roleId = allowed[0]?.roleId || (value === 'school' ? 2 : value === 'ministry' ? 4 : 1);
        next.schoolId = null;
        next.governorate = null;
        next.directorateId = null;
      } else if (field === 'governorate') {
        // Reset directorate when governorate changes
        next.directorateId = null;
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'الاسم الكامل مطلوب';
    if (!form.username.trim()) e.username = 'اسم المستخدم مطلوب';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'البريد الإلكتروني غير صالح';
    if (!form.password || form.password.length < 8) e.password = 'كلمة المرور يجب ألا تقل عن 8 أحرف';
    if (form.userType === 'school' && !form.schoolId) e.schoolId = 'يجب تحديد المدرسة التابع لها';
    // ملاحظة: المديرية غير إلزامية لحساب المشرف الوزاري - في حال عدم تحديدها يكون النطاق شاملاً للمحافظة أو النظام
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const payload: CreateUserDto = {
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        userType: form.userType,
        roleId: form.roleId,
        schoolId: form.userType === 'school' ? form.schoolId : null,
        governorate: form.userType === 'ministry' ? (form.governorate || null) : null,
        directorateId:
          form.userType === 'ministry' && form.directorateId && Number(form.directorateId) > 0
            ? Number(form.directorateId)
            : null,
        status: form.status,
      };

      await usersApi.createUser(payload);
      addToast('success', `تم إنشاء حساب ${form.fullName} بنجاح`);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errors) {
        const mappedErrors: Record<string, string> = {};
        const unmappedMessages: string[] = [];
        Object.entries(err.errors).forEach(([field, msgs]) => {
          const msg = Array.isArray(msgs) ? (msgs as string[])[0] : String(msgs);
          mappedErrors[field] = msg;
          if (!['fullName', 'username', 'email', 'password', 'schoolId', 'directorateId', 'governorate', 'roleId'].includes(field)) {
            unmappedMessages.push(msg);
          }
        });
        setErrors(mappedErrors);
        if (unmappedMessages.length > 0) {
          addToast('error', unmappedMessages.join(' • '));
        } else if (err?.message) {
          addToast('error', err.message);
        }
      } else {
        addToast('error', err?.message || 'فشل إنشاء الحساب، يرجى المحاولة لاحقاً');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasErr?: boolean) => ({
    width: '100%',
    padding: '9px 12px',
    borderRadius: theme.radii.lg,
    border: `1px solid ${hasErr ? '#EF4444' : theme.colors.neutral[200]}`,
    fontSize: theme.typography.fontSizes.sm,
    backgroundColor: theme.colors.neutral.white,
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: theme.typography.fontFamily.sans,
  });

  const labelStyle = {
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.neutral[700],
    marginBottom: '4px',
    display: 'block',
  };

  const errorStyle = {
    fontSize: '0.7rem',
    color: '#EF4444',
    marginTop: '3px',
    margin: '3px 0 0',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 8000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          width: '90%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: theme.shadows.xl,
          fontFamily: theme.typography.fontFamily.sans,
          direction: 'rtl',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${theme.colors.neutral[200]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #0B0F19 0%, #1e293b 100%)',
          }}
        >
          <div>
            <h2 style={{ fontSize: theme.typography.fontSizes.base, fontWeight: 700, color: '#fff', margin: 0 }}>
              إنشاء حساب مستخدم جديد
            </h2>
            <p style={{ fontSize: theme.typography.fontSizes.xs, color: '#94A3B8', marginTop: '2px', margin: '2px 0 0' }}>
              إسناد الصلاحيات وتحديد النطاق الجغرافي (شامل للنظام / المحافظة / المديرية)
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>الاسم الكامل الثلاثي *</label>
            <input style={inputStyle(!!errors.fullName)} value={form.fullName} onChange={(e) => handleChange('fullName', e.target.value)} placeholder="مثال: د. عبدالرحمن محمد الشامي" />
            {errors.fullName && <p style={errorStyle}>{errors.fullName}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>اسم المستخدم (Sign In) *</label>
              <input style={inputStyle(!!errors.username)} value={form.username} onChange={(e) => handleChange('username', e.target.value)} placeholder="مثال: sup_taiz_2026" dir="ltr" />
              {errors.username && <p style={errorStyle}>{errors.username}</p>}
            </div>
            <div>
              <label style={labelStyle}>البريد الإلكتروني الرسمي *</label>
              <input type="email" style={inputStyle(!!errors.email)} value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="user@domain.ye" dir="ltr" />
              {errors.email && <p style={errorStyle}>{errors.email}</p>}
            </div>
          </div>

          <div>
            <label style={labelStyle}>كلمة المرور المبدئية *</label>
            <div style={{ position: 'relative' }}>
              <input type={showPwd ? 'text' : 'password'} style={{ ...inputStyle(!!errors.password), paddingLeft: '40px' }} value={form.password} onChange={(e) => handleChange('password', e.target.value)} placeholder="8 أحرف كحد أدنى" dir="ltr" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p style={errorStyle}>{errors.password}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>نوع الحساب (User Type) *</label>
              <select style={inputStyle()} value={form.userType} onChange={(e) => handleChange('userType', e.target.value as UserType)}>
                <option value="school">مستخدم مدرسة (تقييم / إدارة)</option>
                <option value="ministry">مشرف / مسؤول وزاري</option>
                <option value="system">مسؤول النظام المركزي</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>الدور المسند *</label>
              <select style={inputStyle()} value={form.roleId} onChange={(e) => handleChange('roleId', Number(e.target.value))}>
                {filteredRoles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.roleNameAr || formatRoleNameAr(r.roleName, r.description)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.userType === 'school' && (
            <div>
              <label style={labelStyle}>المدرسة التابعة *</label>
              <SearchableSelect
                options={schoolOptions}
                value={form.schoolId}
                onChange={(val) => handleChange('schoolId', val ? Number(val) : null)}
                placeholder="ابحث باسم المدرسة أو الكود (مثال: بلقيس، 1000)..."
                error={errors.schoolId}
              />
              {errors.schoolId && <p style={errorStyle}>{errors.schoolId}</p>}
            </div>
          )}

          {form.userType === 'ministry' && (
            <>
              <div>
                <label style={labelStyle}>
                  النطاق الجغرافي الإشرافي (المحافظة)
                  <span style={{ fontWeight: 400, color: '#64748B', marginRight: '6px' }}>
                    (اختياري — اتركه شاملاً للنظام أو حدد محافظة)
                  </span>
                </label>
                <select
                  style={inputStyle()}
                  value={form.governorate || ''}
                  onChange={(e) => handleChange('governorate', e.target.value || null)}
                >
                  <option value="">🌐 شامل للنظام ككل / كافة المحافظات (إشراف مركزي عام)</option>
                  {governorateNames.map((govName) => (
                    <option key={govName} value={govName}>
                      {govName}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', margin: 0 }}>
                  {!form.governorate
                    ? 'النطاق الإشرافي الحالي: إشراف مركزي عام على مستوى الجمهورية والنظام ككل.'
                    : `النطاق الإشرافي محصور في نطاق: ${form.governorate}.`}
                </p>
              </div>

              <div>
                <label style={labelStyle}>
                  المديرية التابعة
                  <span style={{ fontWeight: 400, color: '#64748B', marginRight: '6px' }}>
                    (اختياري — شامل للمحافظة ككل في حال عدم التحديد)
                  </span>
                </label>
                
                {!form.governorate ? (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: theme.radii.lg,
                      backgroundColor: '#F8FAFC',
                      border: '1px dashed #CBD5E1',
                      color: '#64748B',
                      fontSize: theme.typography.fontSizes.xs,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Globe size={16} color="#4F46E5" />
                    <span>النطاق محدد على مستوى النظام ككل — لا حاجة لاختيار أي مديرية.</span>
                  </div>
                ) : (
                  <>
                    <SearchableSelect
                      options={directorateOptions}
                      value={form.directorateId ? Number(form.directorateId) : 0}
                      onChange={(val) => handleChange('directorateId', val && Number(val) > 0 ? Number(val) : null)}
                      placeholder={`اختر مديرية في ${form.governorate} أو اختر شامل للمحافظة...`}
                      error={errors.directorateId}
                      icon={<MapPin size={16} color="#4F46E5" style={{ flexShrink: 0 }} />}
                    />
                    {errors.directorateId && <p style={errorStyle}>{errors.directorateId}</p>}
                    <p style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', margin: 0 }}>
                      يتم عرض مديريات {form.governorate} فقط ({filteredDirectorates.length} مديرية مسجلة). يمكنك اختيار مديرية معينة أو إبقاؤها شاملة للمحافظة ككل.
                    </p>
                  </>
                )}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '16px', borderTop: `1px solid ${theme.colors.neutral[100]}` }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', borderRadius: theme.radii.lg, border: `1px solid ${theme.colors.neutral[200]}`, backgroundColor: theme.colors.neutral.white, color: theme.colors.neutral[700], fontSize: theme.typography.fontSizes.sm, cursor: 'pointer', fontFamily: theme.typography.fontFamily.sans }}>
              إلغاء
            </button>
            <button type="submit" disabled={loading} style={{ padding: '9px 24px', borderRadius: theme.radii.lg, border: 'none', background: 'linear-gradient(90deg, #059669, #10B981)', color: '#fff', fontSize: theme.typography.fontSizes.sm, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: theme.typography.fontFamily.sans }}>
              {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
