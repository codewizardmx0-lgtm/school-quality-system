/**
 * Component: CompletionItemsSelector
 * محدد ومحرر بنود الاستكمال الموجهة للمدرسة
 */

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { PreloadedCompletionItem } from '../../api/supervisionTypes';

interface CompletionItemsSelectorProps {
  items: PreloadedCompletionItem[];
  onAddItem: () => void;
  onRemoveItem: (indicatorId: number) => void;
  onUpdateItem: (indicatorId: number, field: keyof PreloadedCompletionItem, value: any) => void;
}

export const CompletionItemsSelector: React.FC<CompletionItemsSelectorProps> = ({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            قائمة بنود الاستكمال المستهدفة ({items.length} بنود)
          </h2>
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '3px', margin: 0 }}>
            حدد تفاصيل النقص في الشاهد والصلاحية الممنوحة لمسؤول التقييم بالمدرسة
          </p>
        </div>

        <button
          type="button"
          onClick={onAddItem}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            border: '1px solid #BFDBFE',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          <span>إضافة بند استكمال</span>
        </button>
      </div>

      {/* قائمة البنود */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {items.map((item, index) => (
          <div
            key={item.indicatorId}
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#FAFBFD',
              border: '1px solid #E2E8F0',
              position: 'relative',
            }}
          >
            {/* الترويسة والرمز وزر الحذف */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#D97706',
                    backgroundColor: '#FEF3C7',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  البند {index + 1}: المؤشر {item.code}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  {item.title}
                </span>
              </div>

              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.indicatorId)}
                  title="حذف هذا البند"
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#EF4444',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* الحقول التفصيلية للبند */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
                gap: '14px',
                marginBottom: '12px',
              }}
            >
              {/* سبب الخلل / النقص */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  سبب الخلل أو النقص المرصود في الشاهد <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={item.defectReason}
                  onChange={(e) => onUpdateItem(item.indicatorId, 'defectReason', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* الصلاحية الممنوحة للمدرسة */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  الصلاحية الممنوحة للمدرسة في الفك الجزئي
                </label>
                <select
                  value={item.grantedPermission}
                  onChange={(e) =>
                    onUpdateItem(item.indicatorId, 'grantedPermission', e.target.value)
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                >
                  <option value="استبدال / رفع الشاهد والمبرر">استبدال / رفع الشاهد والمبرر</option>
                  <option value="تحديث مرفق الشاهد">تحديث مرفق الشاهد</option>
                  <option value="تعديل مبرر التقدير فقط">تعديل مبرر التقدير فقط</option>
                  <option value="استيفاء المحضر المعتمد">استيفاء المحضر المعتمد</option>
                </select>
              </div>
            </div>

            {/* توجيه المشرف المباشر للبند */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                توجيهات المشرف الوزاري الإلزامية للبند
              </label>
              <textarea
                rows={2}
                value={item.directives}
                onChange={(e) => onUpdateItem(item.indicatorId, 'directives', e.target.value)}
                placeholder="أدخل التعليمات المحددة الواجب على المدرسة استيفاؤها..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  color: '#0F172A',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: 1.5,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
