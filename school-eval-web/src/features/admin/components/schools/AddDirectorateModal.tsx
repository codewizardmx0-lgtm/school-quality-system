import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import { theme } from '../../theme';
import { schoolsApi } from '../../api/schoolsApi';
import type { AddDirectorateDto, Directorate } from '../../types/admin.types';

interface AddDirectorateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  addToast: (type: 'success' | 'error', msg: string) => void;
  directorateToEdit?: Directorate | null;
}

export const AddDirectorateModal: React.FC<AddDirectorateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  addToast,
  directorateToEdit = null,
}) => {
  const isEditing = Boolean(directorateToEdit);

  const [form, setForm] = useState<AddDirectorateDto>({
    directorateName: '',
    governorate: 'أمانة العاصمة',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (directorateToEdit) {
      setForm({
        directorateName: directorateToEdit.directorateName,
        governorate: directorateToEdit.governorate || 'أمانة العاصمة',
      });
    } else {
      setForm({
        directorateName: '',
        governorate: 'أمانة العاصمة',
      });
    }
    setError('');
  }, [directorateToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.directorateName.trim()) {
      setError('اسم المديرية مطلوب');
      return;
    }
    setLoading(true);
    try {
      if (isEditing && directorateToEdit) {
        await schoolsApi.updateDirectorate(directorateToEdit.directorateId, form);
        addToast('success', `تم تعديل بيانات "${form.directorateName}" بنجاح`);
      } else {
        await schoolsApi.addDirectorate(form);
        addToast('success', `تمت تهيئة "${form.directorateName}" بنجاح في النظام`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errors) {
        const firstError = Object.values(err.errors)[0];
        setError(Array.isArray(firstError) ? firstError[0] : String(firstError));
      } else {
        setError(err?.message || (isEditing ? 'فشل تعديل المديرية' : 'فشل إضافة المديرية'));
        addToast('error', err?.message || (isEditing ? 'فشل تعديل المديرية' : 'فشل في إضافة المديرية، يرجى المحاولة لاحقاً'));
      }
    } finally {
      setLoading(false);
    }
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          width: '90%',
          maxWidth: '460px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(79, 70, 229, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818CF8',
              }}
            >
              <MapPin size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: theme.typography.fontSizes.base, fontWeight: theme.typography.fontWeights.bold, color: '#fff', margin: 0 }}>
                {isEditing ? 'تعديل بيانات المديرية التعليمية' : 'تهيئة نطاق جغرافي / مديرية جديدة'}
              </h2>
              <p style={{ fontSize: theme.typography.fontSizes.xs, color: '#94A3B8', marginTop: '2px' }}>
                {isEditing ? 'تحديث مسمى ونطاق المديرية في النظام' : 'إضافة نطاق جغرافي لتسكين المدارس المستقبلية'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '4px', display: 'block' }}>
              اسم المديرية التعليمية *
            </label>
            <input
              value={form.directorateName}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, directorateName: e.target.value }));
                setError('');
              }}
              placeholder="مثال: مديرية بني الحارث..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: theme.radii.lg,
                border: `1px solid ${error ? '#EF4444' : theme.colors.neutral[200]}`,
                fontSize: theme.typography.fontSizes.sm,
                backgroundColor: theme.colors.neutral[50],
                outline: 'none',
                fontFamily: theme.typography.fontFamily.sans,
                boxSizing: 'border-box',
              }}
            />
            {error && <p style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '4px', fontWeight: 600 }}>{error}</p>}
          </div>

          <div>
            <label style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: 600, color: theme.colors.neutral[700], marginBottom: '4px', display: 'block' }}>
              المحافظة *
            </label>
            <input
              value={form.governorate}
              onChange={(e) => setForm((prev) => ({ ...prev, governorate: e.target.value }))}
              placeholder="مثال: أمانة العاصمة أو محافظة تعز..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: theme.radii.lg,
                border: `1px solid ${theme.colors.neutral[200]}`,
                fontSize: theme.typography.fontSizes.sm,
                backgroundColor: theme.colors.neutral[50],
                color: theme.colors.neutral[800],
                fontFamily: theme.typography.fontFamily.sans,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '8px',
              paddingTop: '16px',
              borderTop: `1px solid ${theme.colors.neutral[100]}`,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 20px',
                borderRadius: theme.radii.lg,
                border: `1px solid ${theme.colors.neutral[200]}`,
                backgroundColor: theme.colors.neutral.white,
                color: theme.colors.neutral[700],
                fontSize: theme.typography.fontSizes.sm,
                cursor: 'pointer',
                fontFamily: theme.typography.fontFamily.sans,
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '9px 24px',
                borderRadius: theme.radii.lg,
                border: 'none',
                background: 'linear-gradient(90deg, #4F46E5, #6366F1)',
                color: '#fff',
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontFamily: theme.typography.fontFamily.sans,
              }}
            >
              {loading ? (isEditing ? 'جاري الحفظ...' : 'جاري التهيئة...') : (isEditing ? 'حفظ التعديلات ✓' : 'تهيئة المديرية ✓')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
