/**
 * Component: RubricLevelsGuide
 * دليل وبطاقات سلم التقدير اللفظي المعتمد (0-3) لمستويات الأداء
 */

import React from 'react';
import { Award, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { RubricLevelInfo } from '../../api/standardsTypes';

interface RubricLevelsGuideProps {
  levels: RubricLevelInfo[];
}

export const RubricLevelsGuide: React.FC<RubricLevelsGuideProps> = ({ levels }) => {
  const defaultLevels: RubricLevelInfo[] = [
    {
      scoreValue: 3,
      label: 'مستوفٍ بالكامل (Exemplary)',
      badgeColor: 'emerald',
      range: '85% – 100%',
      description: 'المستوى الدال على وصول المؤسسة إلى المستوى المطلوب تحقيقه وبشكل مستمر وتوثيقي كامل.',
    },
    {
      scoreValue: 2,
      label: 'مستوفٍ جزئياً (Proficient)',
      badgeColor: 'blue',
      range: '65% – 84%',
      description: 'يعبر عن قيام المدرسة بأداءات متحققة بصورة متوسطة الفاعلية مع وجود مجال واضح للتحسين.',
    },
    {
      scoreValue: 1,
      label: 'غير مستوفٍ / أدنى (Developing)',
      badgeColor: 'amber',
      range: '40% – 64%',
      description: 'يعبر عن قيام المدرسة بأداءات كتابية أو متحققة أحياناً وتتطلب تدخلاً عاجلاً للتطوير.',
    },
    {
      scoreValue: 0,
      label: 'غير متوفر / غائب (Unsatisfactory)',
      badgeColor: 'rose',
      range: '0% – 39%',
      description: 'يشير إلى عدم قيام المدرسة بالأداءات المطلوبة منها وغياب الشواهد والأدلة الداعمة.',
    },
  ];

  const items = levels.length >= 4 ? levels : defaultLevels;

  const getColorStyles = (color: string) => {
    switch (color) {
      case 'emerald':
        return {
          bg: 'bg-emerald-50/70',
          border: 'border-emerald-200',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
        };
      case 'blue':
        return {
          bg: 'bg-blue-50/70',
          border: 'border-blue-200',
          badge: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <Award className="w-5 h-5 text-blue-600" />,
        };
      case 'amber':
        return {
          bg: 'bg-amber-50/70',
          border: 'border-amber-200',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: <Clock className="w-5 h-5 text-amber-600" />,
        };
      case 'rose':
      default:
        return {
          bg: 'bg-rose-50/70',
          border: 'border-rose-200',
          badge: 'bg-rose-100 text-rose-800 border-rose-300',
          icon: <XCircle className="w-5 h-5 text-rose-600" />,
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 text-right space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            سلم التقدير اللفظي المعتمد (المستويات 0 – 3)
          </h3>
          <p className="text-xs text-slate-500">
            المستويات القياسية الحاكمة لكافة استمارات التقييم الذاتي والاعتماد
          </p>
        </div>
        <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          4 مستويات إلزامية
        </span>
      </div>

      <div className="space-y-3">
        {items.map((level) => {
          const style = getColorStyles(level.badgeColor);

          return (
            <div
              key={level.scoreValue}
              className={`p-3.5 rounded-xl border ${style.bg} ${style.border} transition-all`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {style.icon}
                  <span className="text-xs font-extrabold text-slate-900">
                    المستوى ({level.scoreValue}): {level.label}
                  </span>
                </div>

                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${style.badge}`}
                >
                  {level.range}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed pr-7">
                {level.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
