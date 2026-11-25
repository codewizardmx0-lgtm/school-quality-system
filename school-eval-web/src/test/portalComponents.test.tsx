import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortalLoader } from '../components/ui/PortalLoader';
import { AdminSystemHealthWidget } from '../features/admin/components/dashboard/AdminSystemHealthWidget';
import { CloseCycleModal } from '../features/supervision/components/cycles/CloseCycleModal';
import { ParticipatingSchoolsModal } from '../features/supervision/components/cycles/ParticipatingSchoolsModal';
import { PlanSummaryCards } from '../features/evaluation/components/improvement-plan/PlanSummaryCards';
import type { EvaluationCycleItem } from '../features/supervision/api/supervisionTypes';
import type { AdminDashboardStats } from '../features/admin/api/dashboardApi';

describe('Portal and Split Components', () => {
  it('renders PortalLoader with custom label', () => {
    render(<PortalLoader inline label="جاري تحميل البيانات..." />);
    expect(screen.getByText('جاري تحميل البيانات...')).toBeInTheDocument();
  });

  it('renders live systemHealthDetails inside AdminSystemHealthWidget', () => {
    const mockStats: AdminDashboardStats = {
      totalSchools: 10,
      activeSchools: 10,
      schoolsReadinessRate: 100,
      totalUsers: 24,
      activeUsers: 24,
      securityIndex: 98.5,
      infrastructureStatus: 'operational',
      systemHealth: {
        database: 'operational',
        storage: 'operational',
        aiEngine: 'connected',
        smtp: 'running',
      },
      systemHealthDetails: {
        databaseStatus: 'operational',
        databaseLatencyMs: 2.4,
        databaseEngine: 'MYSQL',
        storageUsedMb: 128.5,
        storageLimitMb: 5120,
        storageUsagePercent: 2.5,
        backupFilesCount: 3,
        cloudStorageEnabled: false,
        cloudEndpoint: 'local',
        aiEnabled: true,
        aiModel: 'Artaqa-Assist v2.4',
        aiStatus: 'connected',
        smtpEnabled: true,
        smtpHost: 'smtp.moe.gov.ye',
        smtpPort: 587,
        firewallEnabled: true,
      },
    };

    render(<AdminSystemHealthWidget stats={mockStats} />);
    expect(screen.getByText(/تعمل بكفاءة \(2.4 ms\)/)).toBeInTheDocument();
    expect(screen.getByText(/128.5 MB من 5120 MB/)).toBeInTheDocument();
    expect(screen.getByText(/3 ملف نسخة/)).toBeInTheDocument();
    expect(screen.getByText('smtp.moe.gov.ye (منفذ 587)')).toBeInTheDocument();
    expect(screen.getByText('قاعدة البيانات والتشفير (MYSQL)')).toBeInTheDocument();
  });

  it('renders CloseCycleModal and confirms closure callback', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const cycle: EvaluationCycleItem = {
      cycleId: 5,
      academicYear: '2026/2027',
      name: 'الدورة الوطنية الأولى',
      scopeGovernorate: null,
      startDate: '2026-09-01',
      endDate: '2026-12-30',
      status: 'Active',
      participationsCount: 10,
      evaluationsCount: 10,
      maxCompletionDays: 14,
      participatingSchools: [],
    };

    render(
      <CloseCycleModal
        cycle={cycle}
        isClosingCycle={false}
        closeSuccessMessage={null}
        closeErrorMessage={null}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText(/تأكيد إغلاق وأرشفة الدورة التقييمية/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('تأكيد إغلاق وأرشفة الدورة'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('إلغاء التراجع'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders ParticipatingSchoolsModal and displays filtered school rows', () => {
    const onClose = vi.fn();
    const cycle: EvaluationCycleItem = {
      cycleId: 1,
      academicYear: '2026/2027',
      name: 'دورة التحقق',
      scopeGovernorate: null,
      startDate: '2026-09-01',
      endDate: '2026-12-30',
      status: 'Active',
      participationsCount: 1,
      evaluationsCount: 1,
      maxCompletionDays: 14,
      participatingSchools: [
        {
          schoolId: 189,
          schoolName: 'مدرسة الفاروق الأساسية',
          schoolCode: 'SCH-TAIZ-2026-001',
          stage: 'أساسي',
          governorate: 'تعز',
          district: 'القاهرة',
        },
      ],
    };

    render(
      <ParticipatingSchoolsModal
        cycle={cycle}
        modalSearchTerm=""
        onModalSearchChange={vi.fn()}
        filteredModalSchools={cycle.participatingSchools || []}
        isEnrollingOpen={false}
        isLoadingAvailableSchools={false}
        availableSchools={[]}
        selectedSchoolIdsToEnroll={[]}
        onToggleEnrollSchoolId={vi.fn()}
        isSubmittingEnrollment={false}
        enrollSuccessMessage={null}
        enrollErrorMessage={null}
        onClose={onClose}
        onToggleEnrollSection={vi.fn()}
        onConfirmEnrollment={vi.fn()}
      />
    );

    expect(screen.getByText('مدرسة الفاروق الأساسية')).toBeInTheDocument();
    fireEvent.click(screen.getByText('إغلاق'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders PlanSummaryCards and triggers filter status change', () => {
    const onSelect = vi.fn();
    render(
      <PlanSummaryCards
        summary={{
          totalActions: 12,
          inProgressActions: 4,
          doneActions: 5,
          pendingActions: 3,
        }}
        filterStatus="ALL"
        onSelectFilterStatus={onSelect}
      />
    );

    expect(screen.getByText('12')).toBeInTheDocument();
    fireEvent.click(screen.getByText('إجراءات مكتملة بنجاح'));
    expect(onSelect).toHaveBeenCalledWith('Done');
  });
});
