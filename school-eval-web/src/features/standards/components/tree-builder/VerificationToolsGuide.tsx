/**
 * Component: VerificationToolsGuide
 * دليل وبطاقات أدوات التحقق الأربعة المعتمدة في التقويم المدرسي
 */

import React from 'react';
import { FileSearch, Eye, Users, BarChart3, CheckSquare } from 'lucide-react';

export const VerificationToolsGuide: React.FC = () => {
  const tools = [
    {
      id: 'docs',
      name: 'فحص الوثائق والسجلات',
      code: 'DOCUMENT_REVIEW',
      icon: <FileSearch className="w-5 h-5 text-blue-600" />,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      bgColor: 'bg-blue-50/70',
      borderColor: 'border-blue-200',
      description: 'فحص الخطط المدرسية، السجلات الأكاديمية، محاضر الاجتماعات، والتقارير الدورية الداعمة.',
      examples: 'الخطة التشغيلية، سجلات درجات الطلاب، ملفات الإنجاز، محاضر مجالس الآباء والمعلمين',
    },
    {
      id: 'observation',
      name: 'الملاحظة الصفية والبيئية',
      code: 'CLASSROOM_OBSERVATION',
      icon: <Eye className="w-5 h-5 text-emerald-600" />,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      bgColor: 'bg-emerald-50/70',
      borderColor: 'border-emerald-200',
      description: 'الملاحظة الميدانية للتدريس داخل الفصول الدراسية، وفحص المرافق المدرسية وبيئة التعلم والسلامة.',
      examples: 'بطاقة الملاحظة الصفية، تفاعل المعلم والمتعلم، جاهزية المعامل والمختبرات ومصادر التعلم',
    },
    {
      id: 'interview',
      name: 'المقابلات الفردية والجماعية',
      code: 'INTERVIEW',
      icon: <Users className="w-5 h-5 text-amber-600" />,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      bgColor: 'bg-amber-50/70',
      borderColor: 'border-amber-200',
      description: 'مقابلات مقننة ومخططة مع قيادة المدرسة، المعلمين، الكادر الإداري، والطلاب وأولياء الأمور.',
      examples: 'مقابلة مدير المدرسة، مقابلات المعلمين التخصصية، جلسات استماع ممثلي مجالس الطلاب',
    },
    {
      id: 'survey',
      name: 'الاستبانات واستطلاعات الرأي',
      code: 'SURVEY',
      icon: <BarChart3 className="w-5 h-5 text-purple-600" />,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      bgColor: 'bg-purple-50/70',
      borderColor: 'border-purple-200',
      description: 'استبانات رقمية مقاسة إحصائياً لقياس مستويات الرضا وجودة الخدمات والمناخ المدرسي العام.',
      examples: 'استبانة رضا أولياء الأمور، استبانة البيئة التعليمية للطلاب، استبانة الرضا الوظيفي للمعلمين',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 text-right space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-extrabold text-slate-900">
              أدوات ووسائل التحقق المعتمدة (Verification Tools)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            في معايير الهيئة الوطنية، يرتبط كل مؤشر بأداة أو أكثر من أدوات التحقق المعتمدة لفحص الشواهد والأدلة
          </p>
        </div>
        <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          أدوات تقييم معتمدة
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className={`p-3.5 rounded-xl border ${tool.bgColor} ${tool.borderColor} flex flex-col justify-between transition-all hover:shadow-xs`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {tool.icon}
                  <span className="text-xs font-extrabold text-slate-900">
                    {tool.name}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed mb-2 font-medium">
                {tool.description}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200/60 mt-1">
              <span className="text-[10px] text-slate-500 block">
                <strong>أمثلة تطبيقية:</strong> {tool.examples}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between flex-wrap gap-2">
        <span>
          💡 <strong>إرشاد التحرير:</strong> يمكنك تعيين أي عدد من الأدوات لأي مؤشر عبر تبويب <strong>&quot;أدوات التحقق&quot;</strong>، كما يمكنك إدارة وإضافة أدوات مخصصة جديدة عبر زر <strong>&quot;إدارة أدوات التحقق&quot;</strong>.
        </span>
      </div>
    </div>
  );
};
