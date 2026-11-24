/**
 * Component: LaunchCyclePage
 * واجهة متوافقة لإطلاق دورة تقييم جديدة (تحول تلقائياً إلى التبويب الثاني في إدارة الدورات التقييمية)
 */

import React from 'react';
import { CyclesListPage } from './CyclesListPage';
import type { SupervisionScreenKey, CycleLaunchPayload } from '../../api/supervisionTypes';

interface LaunchCyclePageProps {
  prefillData?: Partial<CycleLaunchPayload>;
  onNavigate: (
    screen: SupervisionScreenKey,
    params?: {
      cycleId?: number;
      prefillCycleLaunch?: Partial<CycleLaunchPayload>;
      schoolId?: number;
      schoolName?: string;
    }
  ) => void;
}

export const LaunchCyclePage: React.FC<LaunchCyclePageProps> = ({ prefillData, onNavigate }) => {
  return (
    <CyclesListPage
      initialTab="form"
      prefillData={prefillData}
      onNavigate={onNavigate}
    />
  );
};
