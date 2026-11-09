<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>استمارة التقرير المفصلة لتقويم المدرسة - {{ $school['school_name'] }}</title>
    <style>
        @page {
            margin-top: 38mm;
            margin-bottom: 18mm;
            margin-left: 10mm;
            margin-right: 10mm;
            header: html_pageHeader;
            footer: html_pageFooter;
        }
        body {
            font-family: 'amiri', 'dejavusans', sans-serif;
            direction: rtl;
            text-align: right;
            color: #1e293b;
            font-size: 9pt;
            line-height: 1.4;
        }

        /* رأس الصفحة المكرر */
        .page-header-wrap {
            width: 100%;
            border-bottom: 2px solid #0f766e;
            padding-bottom: 6px;
            margin-bottom: 10px;
        }
        .header-col-right {
            width: 32%;
            text-align: right;
            font-size: 8.5pt;
            color: #475569;
            line-height: 1.3;
        }
        .header-col-center {
            width: 36%;
            text-align: center;
        }
        .header-col-center h1 {
            color: #0f766e;
            font-size: 13pt;
            margin: 0;
            padding: 0;
            font-weight: bold;
        }
        .header-col-center h2 {
            color: #334155;
            font-size: 9.5pt;
            margin: 2px 0 0 0;
            font-weight: normal;
        }
        .header-col-left {
            width: 32%;
            text-align: left;
            font-size: 8.5pt;
            color: #475569;
            line-height: 1.3;
        }

        /* ذيل الصفحة */
        .page-footer-wrap {
            width: 100%;
            border-top: 1px solid #cbd5e1;
            padding-top: 5px;
            font-size: 8pt;
            color: #64748b;
        }

        /* الجداول العامة */
        table {
            width: 100%;
            border-collapse: collapse;
        }
        .table-custom {
            margin-bottom: 12px;
            border: 1px solid #cbd5e1;
        }
        .table-custom th {
            background-color: #0f766e;
            color: #ffffff;
            font-weight: bold;
            padding: 5px 6px;
            font-size: 8.5pt;
            border: 1px solid #0f766e;
            text-align: center;
        }
        .table-custom td {
            padding: 5px 6px;
            font-size: 8.5pt;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        .table-zebra tr:nth-child(even) {
            background-color: #f8fafc;
        }

        /* الأقسام والعناوين */
        .section-header {
            background-color: #f1f5f9;
            border-right: 4px solid #0f766e;
            padding: 4px 8px;
            margin: 10px 0 6px 0;
            font-weight: bold;
            font-size: 9.5pt;
            color: #0f766e;
        }
        .standard-banner {
            background-color: #e6fffa;
            border: 1px solid #99f6e4;
            color: #115e59;
            padding: 6px 10px;
            margin: 12px 0 6px 0;
            font-weight: bold;
            font-size: 9.5pt;
            border-radius: 4px;
        }
        .substandard-title {
            background-color: #f8fafc;
            color: #334155;
            padding: 4px 8px;
            margin: 6px 0 4px 0;
            font-weight: bold;
            font-size: 8.5pt;
            border-right: 3px solid #64748b;
        }

        /* بطاقات الإحصاء الموجزة */
        .stat-card {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: center;
            border-radius: 4px;
        }
        .stat-val {
            font-size: 13pt;
            font-weight: bold;
            color: #0f766e;
            margin: 2px 0;
        }
        .stat-lbl {
            font-size: 7.5pt;
            color: #64748b;
        }

        /* شارات المستويات الرسمية */
        .badge-level {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 7.5pt;
            text-align: center;
        }
        .lvl-3 { background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .lvl-2 { background-color: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }
        .lvl-1 { background-color: #ffedd5; color: #9a3412; border: 1px solid #fed7aa; }
        .lvl-0 { background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
        .lvl-none { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

        /* الشواهد وأدوات التحقق */
        .evidence-pill {
            font-size: 7.5pt;
            color: #0369a1;
            background-color: #f0f9ff;
            border: 1px solid #bae6fd;
            padding: 1px 4px;
            border-radius: 2px;
            margin-bottom: 2px;
            display: inline-block;
        }

        /* صندوق التوقيعات */
        .sig-box {
            border: 1px dashed #cbd5e1;
            background-color: #f8fafc;
            padding: 8px;
            text-align: center;
            min-height: 60px;
        }
    </style>
</head>
<body>

    <!-- الترويسة الثابتة لكل الصفحات -->
    <htmlpageheader name="pageHeader">
        <div class="page-header-wrap">
            <table style="width: 100%;">
                <tr>
                    <td class="header-col-right">
                        <strong>الجمهورية اليمنية</strong><br>
                        وزارة التربية والتعليم والبحث العلمي<br>
                        قطاع المناهج والتوجيه - الإدارة العامة للاعتماد
                    </td>
                    <td class="header-col-center">
                        <h1>استمارة التقرير المفصلة للتقييم الذاتي</h1>
                        <h2>ملف الاعتماد المدرسي الشامل (Detailed Dossier)</h2>
                    </td>
                    <td class="header-col-left">
                        <strong>المدرسة:</strong> {{ $school['school_name'] }}<br>
                        <strong>الرمز:</strong> {{ $school['school_code'] }} | <strong>العام:</strong> {{ $cycle['academic_year'] }}<br>
                        <strong>التاريخ:</strong> {{ $report_date }}
                    </td>
                </tr>
            </table>
        </div>
    </htmlpageheader>

    <!-- ذيل الصفحة الثابت -->
    <htmlpagefooter name="pageFooter">
        <div class="page-footer-wrap">
            <table style="width: 100%;">
                <tr>
                    <td style="width: 50%; text-align: right;">
                        {{ $system_name }} | استمارة التقييم والاعتماد الرسمية
                    </td>
                    <td style="width: 50%; text-align: left;">
                        صفحة {PAGENO} من {nbpg}
                    </td>
                </tr>
            </table>
        </div>
    </htmlpagefooter>

    <!-- 1. هوية المدرسة واللقطة الإحصائية -->
    <div class="section-header">أولاً: بيانات المدرسة وسياق دورة التقييم</div>
    <table class="table-custom" style="margin-bottom: 8px;">
        <tr>
            <td style="width: 15%; background-color: #f8fafc; font-weight: bold;">اسم المدرسة</td>
            <td style="width: 35%; font-weight: bold; color: #0f766e;">{{ $school['school_name'] }}</td>
            <td style="width: 15%; background-color: #f8fafc; font-weight: bold;">المحافظة / المديرية</td>
            <td style="width: 35%;">{{ $school['governorate'] }} - {{ $school['educational_district'] }}</td>
        </tr>
        <tr>
            <td style="background-color: #f8fafc; font-weight: bold;">رمز المدرسة</td>
            <td><code>{{ $school['school_code'] }}</code></td>
            <td style="background-color: #f8fafc; font-weight: bold;">المرحلة ونوع التعليم</td>
            <td>{{ $school['educational_stage'] }} ({{ $school['school_type'] ?? 'حكومي' }})</td>
        </tr>
        <tr>
            <td style="background-color: #f8fafc; font-weight: bold;">دورة التقييم</td>
            <td>{{ $cycle['cycle_name'] ?? 'الدورة الوطنية للتقييم الذاتي' }} ({{ $cycle['academic_year'] }})</td>
            <td style="background-color: #f8fafc; font-weight: bold;">حالة التقييم</td>
            <td>
                @if(($evaluation['status'] ?? '') === 'Completed')
                    <span style="color: #166534; font-weight: bold;">مكتمل ومقفل رسمياً</span>
                @else
                    <span style="color: #9a3412; font-weight: bold;">قيد الرصد والتوثيق الميداني</span>
                @endif
            </td>
        </tr>
    </table>

    <!-- 2. بطاقات الأداء وتوزيع المستويات -->
    <table style="width: 100%; margin-bottom: 12px;">
        <tr>
            <td style="width: 25%; padding-left: 4px;">
                <div class="stat-card">
                    <div class="stat-lbl">النتيجة الإجمالية الموزونة</div>
                    <div class="stat-val">{{ number_format($final_score, 1) }}%</div>
                    <div class="stat-lbl" style="font-weight: bold; color: {{ $rating['color'] ?? '#0f766e' }};">
                        {{ $rating['label'] ?? 'مكتمل' }}
                    </div>
                </div>
            </td>
            <td style="width: 25%; padding: 0 4px;">
                <div class="stat-card">
                    <div class="stat-lbl">نسبة رصد المؤشرات</div>
                    <div class="stat-val" style="color: #0369a1;">{{ number_format($completion_rate, 1) }}%</div>
                    <div class="stat-lbl">({{ $scored_indicators_count }} من أصل {{ $total_indicators_count }})</div>
                </div>
            </td>
            <td style="width: 25%; padding: 0 4px;">
                <div class="stat-card">
                    <div class="stat-lbl">إجمالي الشواهد المودعة</div>
                    <div class="stat-val" style="color: #0f766e;">{{ $total_evidence_count }}</div>
                    <div class="stat-lbl">وثيقة ورابط مرجعي</div>
                </div>
            </td>
            <td style="width: 25%; padding-right: 4px;">
                <div class="stat-card">
                    <div class="stat-lbl">متوسط جودة الأداء الميداني</div>
                    <div class="stat-val" style="color: #7c3aed;">{{ number_format($average_score_out_of_3, 2) }} / 3.00</div>
                    <div class="stat-lbl">نقاط الجودة المعيارية</div>
                </div>
            </td>
        </tr>
    </table>

    <!-- توزيع المستويات الأربعة -->
    <table class="table-custom" style="margin-bottom: 14px;">
        <thead>
            <tr>
                <th style="width: 25%; background-color: #166534;">المستوى 3: متحقق</th>
                <th style="width: 25%; background-color: #0369a1;">المستوى 2: متحقق بدرجة متوسطة</th>
                <th style="width: 25%; background-color: #ea580c;">المستوى 1: متحقق بدرجة ضعيفة</th>
                <th style="width: 25%; background-color: #64748b;">المستوى 0: غير متوفر</th>
            </tr>
        </thead>
        <tbody>
            <tr style="text-align: center; font-weight: bold; font-size: 10pt;">
                <td style="color: #166534; background-color: #f0fdf4;">
                    {{ $scoreDistribution[3] ?? 0 }} مؤشر ({{ $total_indicators_count > 0 ? round((($scoreDistribution[3] ?? 0) / $total_indicators_count) * 100, 1) : 0 }}%)
                </td>
                <td style="color: #0369a1; background-color: #f0f9ff;">
                    {{ $scoreDistribution[2] ?? 0 }} مؤشر ({{ $total_indicators_count > 0 ? round((($scoreDistribution[2] ?? 0) / $total_indicators_count) * 100, 1) : 0 }}%)
                </td>
                <td style="color: #ea580c; background-color: #fff7ed;">
                    {{ $scoreDistribution[1] ?? 0 }} مؤشر ({{ $total_indicators_count > 0 ? round((($scoreDistribution[1] ?? 0) / $total_indicators_count) * 100, 1) : 0 }}%)
                </td>
                <td style="color: #475569; background-color: #f8fafc;">
                    {{ $scoreDistribution[0] ?? 0 }} مؤشر ({{ $total_indicators_count > 0 ? round((($scoreDistribution[0] ?? 0) / $total_indicators_count) * 100, 1) : 0 }}%)
                </td>
            </tr>
        </tbody>
    </table>

    <!-- 3. جدول المجالات المعيارية السبعة -->
    <div class="section-header">ثانياً: مقارنة استيفاء وجودة المجالات المعيارية السبعة (الأوزان ونسب الإنجاز)</div>
    <table class="table-custom table-zebra" style="margin-bottom: 16px;">
        <thead>
            <tr>
                <th style="width: 6%;">#</th>
                <th style="width: 34%; text-align: right;">المجال المعياري الرئيسي</th>
                <th style="width: 12%;">الوزن النسبي</th>
                <th style="width: 14%;">متوسط الجودة (من 3)</th>
                <th style="width: 12%;">نسبة الإدخال</th>
                <th style="width: 11%;">المساهمة الموزونة</th>
                <th style="width: 11%;">الشواهد</th>
            </tr>
        </thead>
        <tbody>
            @foreach($standards_summary as $index => $std)
                <tr>
                    <td style="text-align: center; font-weight: bold;">{{ $index + 1 }}</td>
                    <td style="font-weight: bold; color: #1e293b;">{{ $std['standard_name'] }}</td>
                    <td style="text-align: center;">{{ $std['weight'] }}%</td>
                    <td style="text-align: center; font-weight: bold; color: #0f766e;">
                        {{ number_format($std['average_score'] ?? 0, 2) }} / 3.00
                    </td>
                    <td style="text-align: center;">
                        {{ number_format($std['completion_rate'] ?? 0, 1) }}%
                    </td>
                    <td style="text-align: center; font-weight: bold; color: #115e59;">
                        {{ number_format($std['weighted_contribution'] ?? 0, 1) }}%
                    </td>
                    <td style="text-align: center;">
                        {{ $std['evidence_count'] ?? 0 }}
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- 4. سجل رصد المؤشرات الـ 109 بالتفصيل -->
    <div class="section-header">ثالثاً: مصفوفة المؤشرات الوطنية الـ 109 الشاملة وأدلة الإثبات المودعة</div>

    @foreach($standards_tree as $std)
        <div class="standard-banner">
            {{ $std['standard_code'] }} - {{ $std['standard_name'] }} (الوزن: {{ $std['weight'] }}%)
        </div>

        @foreach($std['sub_standards'] as $sub)
            <div class="substandard-title">
                {{ $sub['sub_standard_code'] }} - {{ $sub['sub_standard_name'] }}
            </div>

            <table class="table-custom table-zebra" style="margin-bottom: 10px;">
                <thead>
                    <tr>
                        <th style="width: 9%;">رمز المؤشر</th>
                        <th style="width: 37%; text-align: right;">نص المؤشر الوطني</th>
                        <th style="width: 14%;">أداة التحقق</th>
                        <th style="width: 16%;">المستوى المرصود</th>
                        <th style="width: 24%; text-align: right;">الشواهد المرفقة وملاحظات الرصد</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($sub['indicators'] as $ind)
                        <tr>
                            <td style="text-align: center; font-family: monospace; font-weight: bold; font-size: 8pt;">
                                {{ $ind['indicator_code'] }}
                            </td>
                            <td>
                                {{ $ind['indicator_name'] }}
                            </td>
                            <td style="text-align: center; font-size: 7.5pt; color: #475569;">
                                {{ implode('، ', $ind['verification_tools']) ?: 'فحص سجلات وملاحظة' }}
                            </td>
                            <td style="text-align: center;">
                                @if($ind['score'] === 3)
                                    <span class="badge-level lvl-3">المستوى 3: متحقق</span>
                                @elseif($ind['score'] === 2)
                                    <span class="badge-level lvl-2">المستوى 2: بدرجة متوسطة</span>
                                @elseif($ind['score'] === 1)
                                    <span class="badge-level lvl-1">المستوى 1: بدرجة ضعيفة</span>
                                @elseif($ind['score'] === 0)
                                    <span class="badge-level lvl-0">المستوى 0: غير متوفر</span>
                                @else
                                    <span class="badge-level lvl-none">لم يرصد بعد</span>
                                @endif
                            </td>
                            <td>
                                @if(!empty($ind['evidence_titles']))
                                    <div style="margin-bottom: 2px;">
                                        @foreach(array_slice($ind['evidence_titles'], 0, 3) as $evTitle)
                                            <span class="evidence-pill">📄 {{ $evTitle }}</span>
                                        @endforeach
                                        @if(count($ind['evidence_titles']) > 3)
                                            <span style="font-size: 7pt; color: #64748b;">+{{ count($ind['evidence_titles']) - 3 }} شواهد أخرى</span>
                                        @endif
                                    </div>
                                @else
                                    <span style="font-size: 7.5pt; color: #94a3b8;">لا توجد شواهد مرفقة</span>
                                @endif

                                @if(!empty($ind['notes']))
                                    <div style="font-size: 7pt; color: #64748b; margin-top: 2px; border-top: 1px dotted #e2e8f0; padding-top: 2px;">
                                        <strong>ملاحظة:</strong> {{ \Illuminate\Support\Str::limit($ind['notes'], 80) }}
                                    </div>
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endforeach
    @endforeach

    <!-- 5. التوقيعات والاعتماد الرسمي -->
    <div style="page-break-inside: avoid; margin-top: 14px;">
        <div class="section-header">رابعاً: توثيق واعتماد لجنة الجودة والتقويم والاعتماد المدرسي</div>
        <table style="width: 100%; margin-top: 8px;">
            <tr>
                <td style="width: 32%; padding-left: 5px;">
                    <div class="sig-box">
                        <strong style="color: #0f766e;">إعداد ومطابقة: مقيم المدرسة</strong><br>
                        <span style="font-size: 8pt; color: #475569;">الاسم: .......................................</span><br>
                        <span style="font-size: 8pt; color: #475569;">التوقيع: ....................................</span><br>
                        <span style="font-size: 7.5pt; color: #94a3b8;">التاريخ: {{ $report_date }}</span>
                    </div>
                </td>
                <td style="width: 32%; padding: 0 5px;">
                    <div class="sig-box">
                        <strong style="color: #0369a1;">مراجعة واعتماد: مدير المدرسة</strong><br>
                        <span style="font-size: 8pt; color: #475569;">الاسم: .......................................</span><br>
                        <span style="font-size: 8pt; color: #475569;">الختم والتوقيع: ..........................</span><br>
                        <span style="font-size: 7.5pt; color: #94a3b8;">التاريخ: ..... / ..... / 2026م</span>
                    </div>
                </td>
                <td style="width: 32%; padding-right: 5px;">
                    <div class="sig-box">
                        <strong style="color: #115e59;">تدقيق وتوثيق: المشرف الوزاري</strong><br>
                        <span style="font-size: 8pt; color: #475569;">الاسم: .......................................</span><br>
                        <span style="font-size: 8pt; color: #475569;">رقم الاعتماد: ...........................</span><br>
                        <span style="font-size: 7.5pt; color: #94a3b8;">التاريخ: ..... / ..... / 2026م</span>
                    </div>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
