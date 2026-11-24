/**
 * Component: VersionRuleCallout
 * صندوق الإرشادات التنظيمية والقواعد الحاكمة لمناعة وثائق المعايير (Immutability Rules)
 */

import React from 'react';
import { ShieldAlert, CheckCircle, Lock, BookOpen } from 'lucide-react';

export const VersionRuleCallout: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-amber-50/80 to-amber-100/40 border border-amber-200/80 rounded-xl p-5 my-6 text-slate-800">
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700">
          <ShieldAlert className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-amber-900 mb-1 flex items-center gap-2">
            <span>اللوائح الحاكمة لمناعة وثيقة المعايير والاعتماد الأكاديمي</span>
            <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900">
              قرار وزاري رقم (1) لسنة 2026م
            </span>
          </h4>

          <p className="text-xs text-amber-800/90 leading-relaxed mb-3">
            تخضع وثيقة معايير التقييم والاعتماد لقواعد حوكمة صارمة لحماية الاستقرار المنهجي للمدارس ومنع اضطراب عمليات القياس أثناء الدورات التقييمية الجارية:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-start gap-2 bg-white/70 p-2.5 rounded-lg border border-amber-200/60">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block mb-0.5">مناعة الإصدار المعتمد</span>
                <span className="text-slate-600">
                  الإصدار المُقرّ نهائياً غير قابل لأي تعديل لحظي لمنع الإخلال بنتائج الدورات المفتوحة.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-white/70 p-2.5 rounded-lg border border-amber-200/60">
              <BookOpen className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block mb-0.5">التطوير عبر المسودات</span>
                <span className="text-slate-600">
                  تتم كافة التحديثات والإضافات عبر استنساخ مسودة مستقلة تخضع للتحكيم والتدقيق.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-white/70 p-2.5 rounded-lg border border-amber-200/60">
              <CheckCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block mb-0.5">القفل الرقمي 4/4</span>
                <span className="text-slate-600">
                  لا يدخل الإصدار حيز النفاذ الرسمي إلا بعد استيفاء 100% من الشروط الحاكمة وختم SHA-256.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
