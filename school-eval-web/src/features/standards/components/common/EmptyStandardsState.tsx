/**
 * Component: EmptyStandardsState
 * حالة فارغة متوافقة تماماً مع معايير المنصة UI_STANDARDS (§16)
 */

import React from 'react';
import { BookOpen, AlertCircle, RefreshCw } from 'lucide-react';

interface EmptyStandardsStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  isError?: boolean;
}

export const EmptyStandardsState: React.FC<EmptyStandardsStateProps> = ({
  title = 'لا توجد بيانات متاحة حالياً',
  description = 'لم يتم العثور على أي سجلات في هذا القسم.',
  icon,
  actionText,
  onAction,
  isError = false,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-xl border border-slate-200">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
          isError ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
        }`}
      >
        {icon || (isError ? <AlertCircle className="w-7 h-7" /> : <BookOpen className="w-7 h-7" />)}
      </div>

      <h3 className="text-base font-bold text-slate-800 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">{description}</p>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
