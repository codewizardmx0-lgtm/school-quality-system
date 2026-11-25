import React from 'react';
import { AlertTriangle, CheckCircle2, FolderLock, HardDrive } from 'lucide-react';

interface EvidenceVaultStatsCardsProps {
  stats: {
    totalEvidences: number;
    compliantEvidences: number;
    needsReplacement: number;
    storageUsedMb: number;
    storageLimitMb: number;
    storagePercentage: number;
  };
  coveredIndicators: number;
  totalIndicators: number;
}

/**
 * بطاقات الإحصاءات الأربع لمستودع الشواهد والأدلة المدرسية.
 */
export const EvidenceVaultStatsCards: React.FC<EvidenceVaultStatsCardsProps> = ({
  stats,
  coveredIndicators,
  totalIndicators,
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
      }}
    >
      {/* Card 1: إجمالي وثائق الشواهد المودعة */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
            إجمالي وثائق الشواهد المودعة
          </span>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FolderLock size={18} />
          </div>
        </div>
        <div style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '10px' }}>
          {stats.totalEvidences}{' '}
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>وثيقة</span>
        </div>
        <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
          تغطي {coveredIndicators} من أصل {totalIndicators} مؤشراً معيارياً ({Math.min(100, Math.round((coveredIndicators / totalIndicators) * 100))}%)
        </div>
      </div>

      {/* Card 2: شواهد مطابقة ومعتمدة داخلياً */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
            شواهد مطابقة ومعتمدة داخلياً
          </span>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#ECFDF5',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={18} />
          </div>
        </div>
        <div style={{ fontSize: '28px', fontWeight: 900, color: '#059669', marginTop: '10px' }}>
          {stats.compliantEvidences}{' '}
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>وثيقة</span>
        </div>
        <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
          مستوفية لشروط التوثيق
        </div>
      </div>

      {/* Card 3: شواهد تتطلب استبدال / استكمال */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
            شواهد تتطلب استبدال / استكمال
          </span>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#FFFBEB',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={18} />
          </div>
        </div>
        <div style={{ fontSize: '28px', fontWeight: 900, color: '#D97706', marginTop: '10px' }}>
          {stats.needsReplacement}{' '}
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
            {stats.needsReplacement === 1 ? 'وثيقة' : stats.needsReplacement === 2 ? 'وثيقتان' : 'وثائق'}
          </span>
        </div>
        <div style={{ fontSize: '11.5px', color: '#B45309', marginTop: '4px', fontWeight: 600 }}>
          بحاجة لتحديث النسخة أو اعتمادها
        </div>
      </div>

      {/* Card 4: المساحة التخزينية للمستودع */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
            المساحة التخزينية للمستودع
          </span>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HardDrive size={18} />
          </div>
        </div>
        <div style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '10px' }}>
          {stats.storageUsedMb}{' '}
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
            MB من {stats.storageLimitMb} MB
          </span>
        </div>
        <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden', marginTop: '8px' }}>
          <div style={{ height: '100%', width: `${stats.storagePercentage}%`, backgroundColor: '#2563EB', borderRadius: '4px' }} />
        </div>
      </div>
    </div>
  );
};
