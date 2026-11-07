import React, { useState, useEffect } from 'react';
import { X, BookOpen, Search, Check, Clock, User, Target, Filter } from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';
import type { ActionCatalogItem } from '../../api/evaluationTypes';

interface ActionCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: ActionCatalogItem) => void;
}

export const ActionCatalogModal: React.FC<ActionCatalogModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const [catalogItems, setCatalogItems] = useState<ActionCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlanType, setSelectedPlanType] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      evaluatorApi
        .getActionCatalog()
        .then((items) => {
          setCatalogItems(items);
        })
        .finally(() => {
          setIsLoading(false);
        });
      setSearchTerm('');
      setSelectedPlanType('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredItems = catalogItems.filter((item) => {
    const title = item.action_title || item.title || '';
    const desc = item.description || '';
    const code = item.sub_standard_code || '';
    const matchesSearch =
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlanType = selectedPlanType ? item.plan_type === selectedPlanType : true;
    return matchesSearch && matchesPlanType;
  });

  const getPlanTypeLabel = (type: string) => {
    switch (type) {
      case 'QualityImprovement':
        return 'تحسين الجودة والاعتماد';
      case 'StaffProfessionalDevelopment':
        return 'التطوير المهني والتربوي';
      case 'AnnualOperational':
        return 'الخطة التشغيلية السنوية';
      default:
        return type;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          direction: 'rtl',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <BookOpen size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                📋 بنك الإجراءات النموذجية المقترحة
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                نماذج إجراءات تربوية معيارية مصنفة حسب المعايير الـ 14 ونوع الخطة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', right: '12px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث في بنك الإجراءات النموذجية..."
              style={{
                width: '100%',
                padding: '8px 36px 8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} color="#64748b" />
            <select
              value={selectedPlanType}
              onChange={(e) => setSelectedPlanType(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                color: '#334155',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="">كافة أنواع الخطط</option>
              <option value="QualityImprovement">تحسين الجودة والاعتماد</option>
              <option value="StaffProfessionalDevelopment">التطوير المهني والتربوي</option>
              <option value="AnnualOperational">الخطة التشغيلية السنوية</option>
            </select>
          </div>
        </div>

        {/* Items List */}
        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
              جارِ تحميل بنك الإجراءات...
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13.5px' }}>
              لا توجد إجراءات مطابقة لمعايير البحث الحالية
            </div>
          ) : (
            filteredItems.map((item) => {
              const title = item.action_title || item.title || 'إجراء مقترح';
              return (
                <div
                  key={item.catalog_id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    backgroundColor: '#ffffff',
                    transition: 'border-color 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#e0e7ff',
                            color: '#3730a3',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {item.sub_standard_code}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {getPlanTypeLabel(item.plan_type)}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b', lineHeight: 1.4 }}>
                        {title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                        {item.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectAction(item);
                        onClose();
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={14} />
                      تبني هذا الإجراء
                    </button>
                  </div>

                  {/* Metadata Row */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '14px',
                      fontSize: '11.5px',
                      color: '#64748b',
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px dashed #f1f5f9',
                    }}
                  >
                    {item.timeframe && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        الإطار الزمني: {item.timeframe}
                      </span>
                    )}
                    {item.responsible_role && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} />
                        المسؤول المقترح: {item.responsible_role}
                      </span>
                    )}
                    {item.target_description && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Target size={12} />
                        المستهدف: {item.target_description}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
