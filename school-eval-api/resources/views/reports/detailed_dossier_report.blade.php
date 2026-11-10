<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>استمارة التقرير المفصلة لتقويم المدرسة - {{ $school['school_name'] }}</title>
    <style>
        @page {
            margin-top: 48mm;
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
            line-height: 1.45;
            margin: 0;
            padding: 0;
        }

        /* جداول عامة متوافقة مع mPDF */
        table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto;
        }
        thead {
            display: table-header-group;
        }
        tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }

        /* الترويسة الثابتة */
        .header-table {
            width: 100%;
            border-bottom: 2px solid #0f766e;
            margin-bottom: 4px;
        }
        .header-table td {
            border: none;
            vertical-align: middle;
            padding: 4px 2px 8px 2px;
        }

        /* ذيل الصفحة */
        .footer-table {
            width: 100%;
            border-top: 1px solid #cbd5e1;
        }
        .footer-table td {
            border: none;
            padding-top: 5px;
            font-size: 8pt;
            color: #64748b;
        }

        /* عناوين الأقسام */
        .section-title-box {
            background-color: #f1f5f9;
            border-right: 4px solid #0f766e;
            padding: 6px 10px;
            margin-top: 12px;
            margin-bottom: 8px;
            font-weight: bold;
            font-size: 10pt;
            color: #0f766e;
            page-break-after: avoid;
        }

        /* ترويسات المعايير داخل الشجرة */
        .standard-banner-table {
            width: 100%;
            margin-top: 12px;
            margin-bottom: 4px;
            page-break-after: avoid;
        }
        .standard-banner-td {
            background-color: #e6fffa;
            border: 1px solid #5eead4;
            color: #115e59;
            padding: 6px 10px;
            font-weight: bold;
            font-size: 9.5pt;
        }
        .substandard-banner-td {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-right: 4px solid #475569;
            color: #334155;
            padding: 4px 8px;
            font-weight: bold;
            font-size: 8.5pt;
        }

        /* الجداول البيانية */
        .data-table {
            width: 100%;
            margin-bottom: 10px;
            border: 1px solid #cbd5e1;
        }
        .data-table th {
            background-color: #0f766e;
            color: #ffffff;
            font-weight: bold;
            padding: 6px 5px;
            font-size: 8.5pt;
            border: 1px solid #0d9488;
            text-align: center;
        }
        .data-table td {
            padding: 5px 6px;
            font-size: 8.5pt;
            border: 1px solid #cbd5e1;
            vertical-align: top;
            word-wrap: break-word;
        }
        .zebra-even {
            background-color: #ffffff;
        }
        .zebra-odd {
            background-color: #f8fafc;
        }

        /* خلايا بطاقات الأداء */
        .kpi-table {
            width: 100%;
            margin-bottom: 10px;
            border-spacing: 6px;
            border-collapse: separate;
        }
        .kpi-cell {
            width: 25%;
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 8px 6px;
            text-align: center;
            vertical-align: middle;
        }
        .kpi-label {
            font-size: 8pt;
            color: #475569;
            font-weight: bold;
        }
        .kpi-value {
            font-size: 13pt;
            font-weight: bold;
            color: #0f766e;
            padding: 3px 0;
        }
        .kpi-sub {
            font-size: 7.5pt;
            color: #64748b;
        }

        /* ألوان المستويات النصية الآمنة في mPDF */
        .lvl-3 { color: #166534; font-weight: bold; background-color: #f0fdf4; }
        .lvl-2 { color: #075985; font-weight: bold; background-color: #f0f9ff; }
        .lvl-1 { color: #9a3412; font-weight: bold; background-color: #fff7ed; }
        .lvl-0 { color: #475569; font-weight: bold; background-color: #f1f5f9; }
        .lvl-none { color: #991b1b; font-weight: bold; background-color: #fef2f2; }

        /* التوقيعات */
        .sig-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 6px;
            margin-top: 8px;
        }
        .sig-cell {
            width: 33.3%;
            border: 1px solid #cbd5e1;
            background-color: #f8fafc;
            padding: 10px 8px;
            text-align: center;
            vertical-align: top;
            font-size: 8.5pt;
            line-height: 1.7;
        }
    </style>
</head>
<body>

    <!-- الترويسة الثابتة لجميع الصفحات -->
    <htmlpageheader name="pageHeader">
        <table class="header-table">
            <tr>
                <td style="width: 31%; text-align: right; font-size: 8pt; color: #475569; line-height: 1.4;">
                    <strong>الجمهورية اليمنية</strong><br>
                    وزارة التربية والتعليم والبحث العلمي<br>
                    الإدارة العامة للجودة والاعتماد المدرسي
                </td>
                <td style="width: 38%; text-align: center;">
                    <div style="color: #0f766e; font-size: 12.5pt; font-weight: bold;">استمارة التقرير المفصلة للتقييم الذاتي</div>
                    <div style="color: #334155; font-size: 8.5pt;">ملف الاعتماد المدرسي الشامل (Detailed Dossier)</div>
                </td>
                <td style="width: 31%; text-align: left; font-size: 8pt; color: #475569; line-height: 1.4;">
                    <strong>المدرسة:</strong> {{ $school['school_name'] }}<br>
                    <strong>الرمز:</strong> {{ $school['school_code'] }} | <strong>العام:</strong> {{ $cycle['academic_year'] }}<br>
                    <strong>تاريخ الإصدار:</strong> {{ $report_date }}
                </td>
            </tr>
        </table>
    </htmlpageheader>

    <!-- ذيل الصفحة الثابت -->
    <htmlpagefooter name="pageFooter">
        <table class="footer-table">
            <tr>
                <td style="width: 65%; text-align: right;">
                    {{ $system_name }} — وثيقة تقييم واعتماد رسمية
                </td>
                <td style="width: 35%; text-align: left;">
                    صفحة {PAGENO} من {nbpg}
                </td>
            </tr>
        </table>
    </htmlpagefooter>

    <!-- أولاً: بيانات المدرسة وسياق الدورة -->
    <div class="section-title-box">أولاً: بيانات المدرسة وسياق دورة التقييم</div>
    <table class="data-table">
        <tr>
            <td style="width: 16%; background-color: #f1f5f9; font-weight: bold;">اسم المدرسة</td>
            <td style="width: 34%; font-weight: bold; color: #0f766e;">{{ $school['school_name'] }}</td>
            <td style="width: 16%; background-color: #f1f5f9; font-weight: bold;">المحافظة / المديرية</td>
            <td style="width: 34%;">{{ $school['governorate'] }} - {{ $school['educational_district'] }}</td>
        </tr>
        <tr>
            <td style="background-color: #f1f5f9; font-weight: bold;">رمز المدرسة</td>
            <td style="font-family: monospace;">{{ $school['school_code'] }}</td>
            <td style="background-color: #f1f5f9; font-weight: bold;">المرحلة ونوع التعليم</td>
            <td>{{ $school['educational_stage'] }} ({{ $school['school_type'] }})</td>
        </tr>
        <tr>
            <td style="background-color: #f1f5f9; font-weight: bold;">دورة التقييم</td>
            <td>{{ $cycle['cycle_name'] }} ({{ $cycle['academic_year'] }})</td>
            <td style="background-color: #f1f5f9; font-weight: bold;">حالة الملف</td>
            <td>
                @if(($evaluation['status'] ?? '') === 'Completed')
                    <strong style="color: #166534;">مكتمل ومقفل رسمياً</strong>
                @else
                    <strong style="color: #9a3412;">قيد الرصد والتوثيق الميداني</strong>
                @endif
            </td>
        </tr>
    </table>

    <!-- ثانياً: مؤشرات الأداء الإجمالية وتوزيع المستويات -->
    <table class="kpi-table">
        <tr>
            <td class="kpi-cell">
                <div class="kpi-label">النتيجة الموزونة الإجمالية</div>
                <div class="kpi-value">{{ number_format($final_score, 1) }}%</div>
                <div class="kpi-sub" style="font-weight: bold; color: {{ $rating['color'] ?? '#0f766e' }};">
                    {{ $rating['label'] ?? 'مكتمل' }}
                </div>
            </td>
            <td class="kpi-cell">
                <div class="kpi-label">نسبة اكتمال رصد المؤشرات</div>
                <div class="kpi-value" style="color: #0369a1;">{{ number_format($completion_rate, 1) }}%</div>
                <div class="kpi-sub">{{ $scored_indicators_count }} من أصل {{ $total_indicators_count }} مؤشر</div>
            </td>
            <td class="kpi-cell">
                <div class="kpi-label">تغطية الشواهد الموثقة</div>
                <div class="kpi-value" style="color: #0f766e;">{{ $total_evidence_count }} / {{ $requirements_target }}</div>
                <div class="kpi-sub">تغطية ربط ({{ $unique_documents_count }} ملفاً فعلياً)</div>
            </td>
            <td class="kpi-cell">
                <div class="kpi-label">متوسط جودة الأداء الميداني</div>
                <div class="kpi-value" style="color: #6d28d9;">{{ number_format($average_score_out_of_3, 2) }} / 3.00</div>
                <div class="kpi-sub">متوسط الدرجات المعياري</div>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 25%; background-color: #166534;">المستوى 3: متحقق</th>
                <th style="width: 25%; background-color: #0369a1;">المستوى 2: متحقق بدرجة متوسطة</th>
                <th style="width: 25%; background-color: #c2410c;">المستوى 1: متحقق بدرجة ضعيفة</th>
                <th style="width: 25%; background-color: #475569;">المستوى 0: غير متوفر</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="lvl-3" style="text-align: center; font-size: 9.5pt;">
                    {{ $scoreDistribution[3] ?? 0 }} مؤشر ({{ $total_indicators_count > 0 ? round((($scoreDistribution[3] ?? 0) / $total_indicators_count) * 100, 1) : 0 }}%)
                </td>
                <td class="lvl-2" style="text-align: center; font-size: 9.5pt;">
                    {{ $scoreDistribution[2] ?? 0 }} مؤشر ({{ $total_indicators_count > 0 ? round((($scoreDistribution[2] ?? 0) / $total_indicators_count) * 100, 1) : 0 }}%)
                </td>
                <td class="lvl-1" style="text-align: center; font-size: 9.5pt;">
                    {{ $scoreDistribution[1] ?? 0 }} مؤشر ({{ $total_indicators_count > 0 ? round((($scoreDistribution[1] ?? 0) / $total_indicators_count) * 100, 1) : 0 }}%)
                </td>
                <td class="lvl-0" style="text-align: center; font-size: 9.5pt;">
                    {{ $scoreDistribution[0] ?? 0 }} مؤشر ({{ $total_indicators_count > 0 ? round((($scoreDistribution[0] ?? 0) / $total_indicators_count) * 100, 1) : 0 }}%)
                </td>
            </tr>
        </tbody>
    </table>

    <!-- ثالثاً: جدول المجالات المعيارية السبعة -->
    <div class="section-title-box">ثانياً: مقارنة متوسط جودة الأداء ونسبة الإنجاز للمجالات السبعة</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 8%;">الرمز</th>
                <th style="width: 34%; text-align: right;">المجال المعياري الرئيسي</th>
                <th style="width: 11%;">الوزن</th>
                <th style="width: 15%;">متوسط الجودة</th>
                <th style="width: 11%;">نسبة الإدخال</th>
                <th style="width: 11%;">المساهمة</th>
                <th style="width: 10%;">التغطيات</th>
            </tr>
        </thead>
        <tbody>
            @foreach($standards_summary as $index => $std)
                <tr class="{{ $index % 2 === 0 ? 'zebra-even' : 'zebra-odd' }}">
                    <td style="text-align: center; font-weight: bold;">{{ $std['standard_code'] }}</td>
                    <td style="font-weight: bold; color: #0f172a;">{{ $std['standard_name'] }}</td>
                    <td style="text-align: center;">{{ $std['weight'] }}%</td>
                    <td style="text-align: center; font-weight: bold; color: #0f766e;">
                        {{ number_format($std['average_score'] ?? 0, 2) }} / 3.00
                    </td>
                    <td style="text-align: center;">{{ number_format($std['completion_rate'] ?? 0, 1) }}%</td>
                    <td style="text-align: center; font-weight: bold; color: #115e59;">
                        {{ number_format($std['weighted_contribution'] ?? 0, 1) }}%
                    </td>
                    <td style="text-align: center;">{{ $std['evidence_count'] ?? 0 }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- رابعاً: مصفوفة المؤشرات الـ 109 الشاملة -->
    <div class="section-title-box">ثالثاً: مصفوفة المؤشرات الوطنية الـ 109 الشاملة وأدلة الإثبات المودعة</div>

    @foreach($standards_tree as $std)
        <table class="standard-banner-table">
            <tr>
                <td class="standard-banner-td">
                    {{ $std['standard_code'] }} — {{ $std['standard_name'] }} (الوزن النسبي: {{ $std['weight'] }}%)
                </td>
            </tr>
        </table>

        @foreach($std['sub_standards'] as $sub)
            <table class="data-table">
                <thead>
                    <tr>
                        <td colspan="5" class="substandard-banner-td">
                            المعيار الفرعي {{ $sub['sub_standard_code'] }}: {{ $sub['sub_standard_name'] }}
                        </td>
                    </tr>
                    <tr>
                        <th style="width: 9%;">الرمز</th>
                        <th style="width: 34%; text-align: right;">نص المؤشر الوطني</th>
                        <th style="width: 15%;">أداة التحقق</th>
                        <th style="width: 16%;">المستوى المرصود</th>
                        <th style="width: 26%; text-align: right;">الشواهد المربوطة وملاحظات الرصد</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($sub['indicators'] as $idx => $ind)
                        @php
                            $lvlClass = match($ind['score']) {
                                3 => 'lvl-3',
                                2 => 'lvl-2',
                                1 => 'lvl-1',
                                0 => 'lvl-0',
                                default => 'lvl-none',
                            };
                            $lvlText = match($ind['score']) {
                                3 => 'المستوى 3: متحقق',
                                2 => 'المستوى 2: بدرجة متوسطة',
                                1 => 'المستوى 1: بدرجة ضعيفة',
                                0 => 'المستوى 0: غير متوفر',
                                default => 'لم يرصد بعد',
                            };
                        @endphp
                        <tr class="{{ $idx % 2 === 0 ? 'zebra-even' : 'zebra-odd' }}">
                            <td style="text-align: center; font-family: monospace; font-weight: bold;">
                                {{ $ind['indicator_code'] }}
                            </td>
                            <td>
                                {{ $ind['indicator_name'] }}
                            </td>
                            <td style="text-align: center; font-size: 8pt; color: #334155;">
                                {{ !empty($ind['verification_tools']) ? implode('، ', $ind['verification_tools']) : 'فحص السجلات والملاحظة' }}
                            </td>
                            <td class="{{ $lvlClass }}" style="text-align: center; font-size: 8pt;">
                                {{ $lvlText }}
                            </td>
                            <td style="font-size: 7.5pt; line-height: 1.4;">
                                @if(!empty($ind['evidence_titles']))
                                    <div style="color: #0369a1; font-weight: bold;">
                                        عدد الشواهد المرفقة: {{ count($ind['evidence_titles']) }}
                                    </div>
                                    @foreach(array_slice($ind['evidence_titles'], 0, 3) as $evTitle)
                                        <div style="color: #1e293b;">- {{ \Illuminate\Support\Str::limit($evTitle, 48) }}</div>
                                    @endforeach
                                    @if(count($ind['evidence_titles']) > 3)
                                        <div style="color: #64748b;">(+{{ count($ind['evidence_titles']) - 3 }} شواهد إضافية)</div>
                                    @endif
                                @else
                                    <div style="color: #94a3b8;">لا توجد شواهد مرفقة</div>
                                @endif

                                @if(!empty($ind['notes']))
                                    <div style="color: #475569; margin-top: 3px; border-top: 1px solid #e2e8f0; padding-top: 2px;">
                                        <strong>ملاحظة:</strong> {{ \Illuminate\Support\Str::limit($ind['notes'], 85) }}
                                    </div>
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endforeach
    @endforeach

    <!-- خامساً: التوقيعات والاعتماد الرسمي -->
    <div style="page-break-inside: avoid; margin-top: 12px;">
        <div class="section-title-box">رابعاً: توثيق واعتماد لجنة الجودة والتقويم والاعتماد المدرسي</div>
        <table class="sig-table">
            <tr>
                <td class="sig-cell">
                    <strong style="color: #0f766e;">إعداد ومطابقة: مقيم المدرسة</strong><br>
                    الاسم: ________________________<br>
                    التوقيع: ______________________<br>
                    <span style="font-size: 7.5pt; color: #64748b;">التاريخ: {{ $report_date }}</span>
                </td>
                <td class="sig-cell">
                    <strong style="color: #0369a1;">مراجعة واعتماد: مدير المدرسة</strong><br>
                    الاسم: ________________________<br>
                    الختم والتوقيع: ________________<br>
                    <span style="font-size: 7.5pt; color: #64748b;">التاريخ: ____ / ____ / 2026م</span>
                </td>
                <td class="sig-cell">
                    <strong style="color: #115e59;">تدقيق وتوثيق: المشرف الوزاري</strong><br>
                    الاسم: ________________________<br>
                    رقم الاعتماد: _________________<br>
                    <span style="font-size: 7.5pt; color: #64748b;">التاريخ: ____ / ____ / 2026م</span>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
