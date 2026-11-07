import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  KeyRound,
  Sliders,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Building,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { usersApi } from '../admin/api/usersApi';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void;
}

type TabType = 'info' | 'password' | 'preferences';

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  addToast,
}) => {
  const { user, refetchUser } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('info');

  // Personal Info Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Preferences State (Persisted in localStorage)
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'light';
  });
  const [fontSize, setFontSize] = useState<'normal' | 'large'>(() => {
    return (localStorage.getItem('app_font_size') as 'normal' | 'large') || 'normal';
  });
  const [audioAlerts, setAudioAlerts] = useState<boolean>(() => {
    return localStorage.getItem('app_audio_alerts') === 'true';
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
      setErrors({});
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Handle Tab Switch
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setErrors({});
  };

  // Theme Toggle
  const handleToggleTheme = (mode: 'light' | 'dark') => {
    setThemeMode(mode);
    localStorage.setItem('app_theme', mode);
    document.documentElement.setAttribute('data-theme', mode);
  };

  // Font Size Toggle
  const handleToggleFontSize = (size: 'normal' | 'large') => {
    setFontSize(size);
    localStorage.setItem('app_font_size', size);
    document.documentElement.style.fontSize = size === 'large' ? '17px' : '15px';
  };

  // Audio Alerts Toggle
  const handleToggleAudio = () => {
    const nextVal = !audioAlerts;
    setAudioAlerts(nextVal);
    localStorage.setItem('app_audio_alerts', nextVal ? 'true' : 'false');
  };

  // Validation
  const validate = () => {
    const errs: Record<string, string> = {};

    if (activeTab === 'info') {
      if (!fullName.trim()) {
        errs.fullName = 'الاسم الكامل مطلوب.';
      } else if (fullName.trim().length < 3) {
        errs.fullName = 'يجب ألا يقل الاسم عن 3 أحرف.';
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errs.email = 'صيغة البريد الإلكتروني غير صالحة.';
      }
    }

    if (activeTab === 'password') {
      if (!currentPassword) {
        errs.currentPassword = 'كلمة المرور الحالية مطلوبة.';
      }
      if (!newPassword) {
        errs.newPassword = 'كلمة المرور الجديدة مطلوبة.';
      } else if (newPassword.length < 8) {
        errs.newPassword = 'يجب ألا تقل كلمة المرور عن 8 خانات.';
      } else if (newPassword === currentPassword) {
        errs.newPassword = 'يجب أن تكون كلمة المرور الجديدة مختلفة عن الحالية.';
      }
      if (!newPasswordConfirmation) {
        errs.newPasswordConfirmation = 'تأكيد كلمة المرور مطلوب.';
      } else if (newPassword !== newPasswordConfirmation) {
        errs.newPasswordConfirmation = 'تأكيد كلمة المرور غير متطابق.';
      }
    }

    return errs;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      if (activeTab === 'info') {
        const res = await usersApi.updateProfile({
          fullName: fullName.trim(),
          email: email.trim() || undefined,
        });
        addToast('success', res.message || 'تم تحديث البيانات الشخصية بنجاح.');
        refetchUser();
        onClose();
      } else if (activeTab === 'password') {
        const res = await usersApi.changePassword({
          currentPassword,
          newPassword,
          newPasswordConfirmation,
        });
        addToast('success', res.message || 'تم تغيير كلمة المرور بنجاح.');
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirmation('');
        onClose();
      } else if (activeTab === 'preferences') {
        addToast('success', 'تم حفظ التفضيلات بنجاح في المتصفح.');
        onClose();
      }
    } catch (err: any) {
      const backendErrors = err?.response?.data?.errors || err?.errors;
      if (backendErrors) {
        const mapped: Record<string, string> = {};
        if (backendErrors.fullName) mapped.fullName = backendErrors.fullName[0];
        if (backendErrors.email) mapped.email = backendErrors.email[0];
        if (backendErrors.currentPassword) mapped.currentPassword = backendErrors.currentPassword[0];
        if (backendErrors.newPassword) mapped.newPassword = backendErrors.newPassword[0];
        setErrors(mapped);
      } else {
        const msg = err?.response?.data?.message || err?.message || 'فشلت العملية. يرجى التحقق من المدخلات والمحاولة لاحقاً.';
        addToast('error', msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleNameArabic = user?.roles?.[0]?.description || user?.roles?.[0]?.roleName || 'مستخدم معتمد';
  const schoolOrMinistry = user?.school?.schoolName || user?.ministry?.ministryName || 'الجمهورية اليمنية';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        direction: 'rtl',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '16px',
              }}
            >
              {user?.fullName?.substring(0, 2) || 'بر'}
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                الملف الشخصي وإعدادات الحساب
              </h2>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                {roleNameArabic} — {schoolOrMinistry}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            padding: '0 16px',
          }}
        >
          <button
            type="button"
            onClick={() => handleTabChange('info')}
            style={{
              flex: 1,
              padding: '12px 14px',
              fontSize: '13px',
              fontWeight: 800,
              color: activeTab === 'info' ? '#059669' : '#64748B',
              borderBottom: activeTab === 'info' ? '2.5px solid #059669' : '2.5px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <UserIcon size={16} />
            البيانات الشخصية
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('password')}
            style={{
              flex: 1,
              padding: '12px 14px',
              fontSize: '13px',
              fontWeight: 800,
              color: activeTab === 'password' ? '#059669' : '#64748B',
              borderBottom: activeTab === 'password' ? '2.5px solid #059669' : '2.5px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <KeyRound size={16} />
            كلمة المرور والأمان
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('preferences')}
            style={{
              flex: 1,
              padding: '12px 14px',
              fontSize: '13px',
              fontWeight: 800,
              color: activeTab === 'preferences' ? '#059669' : '#64748B',
              borderBottom: activeTab === 'preferences' ? '2.5px solid #059669' : '2.5px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Sliders size={16} />
            تفضيلات الواجهة
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Username (Locked / Read-Only per architecture decision) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  اسم المستخدم (رمز الدخول المؤسسي)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={user?.username || ''}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#F1F5F9',
                      color: '#64748B',
                      fontSize: '13.5px',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Lock size={16} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '12px' }} />
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  معرف وظيفي فريد؛ تعديله محصور بمسؤول النظام المركزي لأغراض الحوكمة والتدقيق.
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  الاسم الكامل <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أدخل اسمك الكامل..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.fullName ? '#EF4444' : '#CBD5E1'}`,
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.fullName && (
                  <div style={{ fontSize: '11.5px', color: '#EF4444', marginTop: '4px' }}>
                    {errors.fullName}
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  البريد الإلكتروني الرسمي
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school-eval.gov.ye"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.email ? '#EF4444' : '#CBD5E1'}`,
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.email && (
                  <div style={{ fontSize: '11.5px', color: '#EF4444', marginTop: '4px' }}>
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Institution Capsule */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <Building size={22} color="#059669" />
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>المؤسسة التابع لها</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                    {schoolOrMinistry}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  border: '1px solid #DCFCE7',
                  fontSize: '12px',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ShieldCheck size={18} color="#059669" />
                <span>تغيير كلمة المرور يؤدي إلى إنهاء الجلسات الأخرى للمستخدم لأمان الحساب.</span>
              </div>

              {/* Current Password */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  كلمة المرور الحالية <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.currentPassword ? '#EF4444' : '#CBD5E1'}`,
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '10px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#64748B',
                    }}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <div style={{ fontSize: '11.5px', color: '#EF4444', marginTop: '4px' }}>
                    {errors.currentPassword}
                  </div>
                )}
              </div>

              {/* New Password */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  كلمة المرور الجديدة <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8 خانات على الأقل..."
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.newPassword ? '#EF4444' : '#CBD5E1'}`,
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '10px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#64748B',
                    }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.newPassword && (
                  <div style={{ fontSize: '11.5px', color: '#EF4444', marginTop: '4px' }}>
                    {errors.newPassword}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  تأكيد كلمة المرور الجديدة <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={newPasswordConfirmation}
                    onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.newPasswordConfirmation ? '#EF4444' : '#CBD5E1'}`,
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '10px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#64748B',
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.newPasswordConfirmation && (
                  <div style={{ fontSize: '11.5px', color: '#EF4444', marginTop: '4px' }}>
                    {errors.newPasswordConfirmation}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Theme Mode */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  مظهر الواجهة (الثيم)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleTheme('light')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${themeMode === 'light' ? '#059669' : '#E2E8F0'}`,
                      backgroundColor: themeMode === 'light' ? '#F0FDF4' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontWeight: 800,
                      color: themeMode === 'light' ? '#065F46' : '#64748B',
                    }}
                  >
                    <Sun size={18} color={themeMode === 'light' ? '#059669' : '#64748B'} />
                    الوضع الفاتح
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleTheme('dark')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${themeMode === 'dark' ? '#059669' : '#E2E8F0'}`,
                      backgroundColor: themeMode === 'dark' ? '#F0FDF4' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontWeight: 800,
                      color: themeMode === 'dark' ? '#065F46' : '#64748B',
                    }}
                  >
                    <Moon size={18} color={themeMode === 'dark' ? '#059669' : '#64748B'} />
                    الوضع الداكن
                  </button>
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  حجم الخط (سهولة القراءة)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleFontSize('normal')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1.5px solid ${fontSize === 'normal' ? '#059669' : '#CBD5E1'}`,
                      backgroundColor: fontSize === 'normal' ? '#ECFDF5' : '#FFFFFF',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: fontSize === 'normal' ? '#059669' : '#334155',
                    }}
                  >
                    قياسي (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFontSize('large')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1.5px solid ${fontSize === 'large' ? '#059669' : '#CBD5E1'}`,
                      backgroundColor: fontSize === 'large' ? '#ECFDF5' : '#FFFFFF',
                      cursor: 'pointer',
                      fontSize: '14.5px',
                      fontWeight: 800,
                      color: fontSize === 'large' ? '#059669' : '#334155',
                    }}
                  >
                    مكبر (115%)
                  </button>
                </div>
              </div>

              {/* Audio Alerts */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {audioAlerts ? <Volume2 size={20} color="#059669" /> : <VolumeX size={20} color="#94A3B8" />}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>التنبيهات الصوتية</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>تشغيل أصوات خفيفة عند اكتمال الرصد والتنبيهات</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleAudio}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: audioAlerts ? '#059669' : '#CBD5E1',
                    color: '#FFFFFF',
                  }}
                >
                  {audioAlerts ? 'مفعل' : 'معطل'}
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div
            style={{
              marginTop: '28px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 700,
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
                fontWeight: 800,
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              <span>حفظ التغييرات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
