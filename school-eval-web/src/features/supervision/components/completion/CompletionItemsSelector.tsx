/**
 * Component: CompletionItemsSelector
 * محدد ومحرر بنود الاستكمال الموجهة للمدرسة
 * معتمد للتكامل مع الشاشة 4 وشجرة المعايير الوطنية
 * يدعم الطي والفتح الفردي والجماعي (Accordion) لتسهيل مراجعة البنود
 */

import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, CheckSquare } from 'lucide-react';
import type { PreloadedCompletionItem } from '../../api/supervisionTypes';
import { SharedDeficiencyFormFields } from '../common/SharedDeficiencyFormFields';

interface CompletionItemsSelectorProps {
  items: PreloadedCompletionItem[];
  onNavigateToStandardsTree: () => void;
  onRemoveItem: (indicatorId: number) => void;
  onUpdateItem: <K extends keyof PreloadedCompletionItem>(indicatorId: number, field: K, value: PreloadedCompletionItem[K]) => void;
}

export const CompletionItemsSelector: React.FC<CompletionItemsSelectorProps> = ({
  items,
  onNavigateToStandardsTree,
  onRemoveItem,
  onUpdateItem,
}) => {
  // حالة طي/فتح البنود الفردية (true = مطوي، false أو undefined = مفتوح)
  const [collapsedItems, setCollapsedItems] = useState<Record<number, boolean>>({});

  // التحقق هل جميع البنود مطوية
  const isAllCollapsed = items.length > 0 && items.every((i) => !!collapsedItems[i.indicatorId]);

  // طي أو توسيع الكل
  const handleToggleAll = () => {
    const nextState = !isAllCollapsed;
    const next: Record<number, boolean> = {};
    items.forEach((i) => {
      next[i.indicatorId] = nextState;
    });
    setCollapsedItems(next);
  };

  // طي أو فتح بند فردي
  const handleToggleItem = (indicatorId: number) => {
    setCollapsedItems((prev) => ({
      ...prev,
      [indicatorId]: !prev[indicatorId],
    }));
  };

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
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            قائمة بنود الاستكمال المستهدفة ({items.length} بنود)
          </h2>
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '3px', margin: 0 }}>
            حدد تفاصيل النقص في الشاهد والصلاحيات المتعددة الممنوحة لمسؤول التقييم بالمدرسة
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* زر طي الكل / توسيع الكل */}
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleToggleAll}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                backgroundColor: '#F8FAFC',
                color: '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={isAllCollapsed ? 'توسيع كافة بنود الاستكمال' : 'طي كافة بنود الاستكمال'}
            >
              {isAllCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              <span>{isAllCollapsed ? 'توسيع الكل' : 'طي الكل'}</span>
            </button>
          )}

          {/* زر إضافة مؤشر من شجرة المعايير */}
          <button
            type="button"
            onClick={onNavigateToStandardsTree}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
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
            <span>+ إضافة مؤشر من شجرة المعايير</span>
          </button>
        </div>
      </div>

      {/* قائمة البنود */}
      {items.length === 0 ? (
        <div
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            backgroundColor: '#F8FAFC',
            borderRadius: '10px',
            border: '1px dashed #CBD5E1',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', margin: '0 0 10px 0' }}>
            لم يتم تحديد أي مؤشرات للاستكمال بعد.
          </p>
          <button
            type="button"
            onClick={onNavigateToStandardsTree}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
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
            <span>+ إضافة مؤشر من شجرة المعايير</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map((item, index) => {
            const isCollapsed = !!collapsedItems[item.indicatorId];
            const grantedCount = item.allowedActions?.length || 1;

            return (
              <div
                key={item.indicatorId}
                style={{
                  borderRadius: '10px',
                  backgroundColor: '#FAFBFD',
                  border: isCollapsed ? '1px solid #E2E8F0' : '1px solid #CBD5E1',
                  boxShadow: isCollapsed ? 'none' : '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'border-color 0.15s ease',
                  overflow: 'hidden',
                }}
              >
                {/* الترويسة التفاعلية القابلة للنقر للطي والفتح */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    backgroundColor: isCollapsed ? '#F8FAFC' : '#F1F5F9',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: isCollapsed ? 'none' : '1px solid #E2E8F0',
                  }}
                  onClick={() => handleToggleItem(item.indicatorId)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748B',
                        padding: '2px',
                      }}
                    >
                      {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </span>

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

                    {/* ملخص سريع عند طي البند */}
                    {isCollapsed && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginRight: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#0369A1',
                            backgroundColor: '#E0F2FE',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid #BAE6FD',
                          }}
                        >
                          <CheckSquare size={12} />
                          <span>{grantedCount} صلاحيات ممنوحة</span>
                        </span>

                        {item.categories && item.categories.length > 0 && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#475569',
                              backgroundColor: '#F1F5F9',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {item.categories.length} أوجه نقص
                          </span>
                        )}

                        {item.defectReason && (
                          <span
                            style={{
                              fontSize: '11.5px',
                              color: '#64748B',
                              maxWidth: '260px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={item.defectReason}
                          >
                            «{item.defectReason}»
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
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
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '4px',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* الحقول التفصيلية المشتركة الموحدة (تظهر فقط عند توسيع البند) */}
                {!isCollapsed && (
                  <div style={{ padding: '16px' }}>
                    <SharedDeficiencyFormFields
                      categories={item.categories || []}
                      onChangeCategories={(cats) => onUpdateItem(item.indicatorId, 'categories', cats)}
                      note={item.defectReason || ''}
                      onChangeNote={(val) => onUpdateItem(item.indicatorId, 'defectReason', val)}
                      directives={item.directives || ''}
                      onChangeDirectives={(val) => onUpdateItem(item.indicatorId, 'directives', val)}
                      allowedActions={
                        item.allowedActions && item.allowedActions.length > 0
                          ? item.allowedActions
                          : ['upload_replace_evidence']
                      }
                      onChangeAllowedActions={(acts) => onUpdateItem(item.indicatorId, 'allowedActions', acts)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
