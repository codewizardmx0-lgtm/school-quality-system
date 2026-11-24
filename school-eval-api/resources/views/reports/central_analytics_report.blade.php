<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>التقرير التحليلي المركزي لمؤشرات الجودة المدرسية</title>
    <style>
        @page {
            margin-top: 14mm;
            margin-bottom: 14mm;
            margin-left: 10mm;
            margin-right: 10mm;
            footer: html_reportFooter;
        }
        body {
            font-family: 'amiri', 'dejavusans', sans-serif;
            direction: rtl;
            text-align: right;
            color: #1e293b;
            font-size: 9.5pt;
            line-height: 1.45;
        }
        .header-table {
            width: 100%;
            border-bottom: 2.5px solid #0f766e;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }
        .header-title {
            text-align: center;
        }
        .header-title h1 {
            color: #0f766e;
            font-size: 15pt;
            margin: 0;
            padding: 0;
            font-weight: bold;
        }
        .header-title h2 {
            color: #334155;
            font-size: 11pt;
            margin: 4px 0 0 0;
            font-weight: normal;
        }
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
        }
        .meta-table td {
            padding: 5px 8px;
            font-size: 8.5pt;
            border-bottom: 1px solid #e2e8f0;
        }
        .meta-label {
            font-weight: bold;
            color: #475569;
            width: 18%;
            background-color: #f1f5f9;
        }
        .kpi-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .kpi-card {
            border: 1px solid #cbd5e1;
            padding: 7px;
            text-align: center;
            background-color: #ffffff;
            border-radius: 4px;
        }
        .kpi-title {
            font-size: 8pt;
            color: #64748b;
            margin-bottom: 3px;
        }
        .kpi-val {
            font-size: 12.5pt;
            font-weight: bold;
            color: #0f172a;
        }
        .section-title {
            font-size: 10.5pt;
            font-weight: bold;
            color: #0f766e;
            border-right: 4px solid #0f766e;
            padding-right: 8px;
            margin-top: 10px;
            margin-bottom: 6px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 8pt;
        }
        .data-table th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: bold;
            text-align: right;
            padding: 5px 7px;
            border: 1px solid #cbd5e1;
        }
        .data-table td {
            padding: 4px 7px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        .data-table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 7.5pt;
            font-weight: bold;
        }
        .badge-advanced {
            background-color: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
        }
        .badge-proficient {
            background-color: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
        }
        .badge-support {
            background-color: #fff1f2;
            color: #be123c;
            border: 1px solid #fecdd3;
        }
        .badge-overdue {
            background-color: #fef2f2;
            color: #991b1b;
            border: 1px solid #f87171;
            font-weight: bold;
        }
        .badge-completed {
            background-color: #f0fdf4;
            color: #15803d;
            border: 1px solid #86efac;
        }
        .policy-card {
            background-color: #f0fdfa;
            border: 1px solid #99f6e4;
            border-right: 4px solid #0d9488;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 8.5pt;
            margin-bottom: 12px;
            line-height: 1.5;
        }
        .footer-text {
            font-size: 7.5pt;
            color: #64748b;
            text-align: center;
            border-top: 1px solid #cbd5e1;
            padding-top: 4px;
        }
        .page-break {
            page-break-after: always;
        }
    </style>
</head>
<body>

    <!-- الترويسة الرسمية -->
    <table class="header-table">
        <tr>
            <td style="width: 25%; text-align: right; vertical-align: top; font-size: 8pt; color: #475569;">
                الجمهورية اليمنية<br>
                وزارة التربية والتعليم والبحث العلمي<br>
                قطاع التوجيه والمناهج والتقويم<br>
                الإدارة العامة لضمان الجودة
            </td>
            <td class="header-title" style="width: 50%; vertical-align: middle;">
                <h1>منصة ارتقاء للتقييم والتحسين المدرسي</h1>
                <h2>التقرير التحليلي المركزي لمؤشرات الجودة المدرسية</h2>
                <div style="font-size: 8pt; color: #0f766e; margin-top: 2px;">
                    وفق المعايير الوطنية المعتمدة ومخرجات المتابعة الإشرافية
                </div>
            </td>
            <td style="width: 25%; text-align: left; vertical-align: top; font-size: 8pt; color: #475569;">
                تاريخ الإصدار: {{ date('Y-m-d') }}<br>
                وقت الإصدار: {{ date('H:i') }}<br>
                الدورة: {{ $academicYear ?? '2026/2027' }}<br>
                رمز الوثيقة: REP-SUP-{{ date('Ymd') }}
            </td>
        </tr>
    </table>

    <!-- جدول بيانات نطاق التحليل -->
    <table class="meta-table">
        <tr>
            <td class="meta-label">النطاق الجغرافي:</td>
            <td>{{ $scopeSummary['governorate'] ?? 'كافة المحافظات' }}</td>
            <td class="meta-label">الدورة التقييمية:</td>
            <td>{{ $academicYear ?? 'العام الدراسي الجاري' }}</td>
        </tr>
        <tr>
            <td class="meta-label">إجمالي مدارس النطاق:</td>
            <td>{{ $scopeSummary['totalSchools'] ?? 0 }} مدرسة</td>
            <td class="meta-label">المدارس التي رُفعت مخرجاتها:</td>
            <td>{{ $scopeSummary['evaluatedSchools'] ?? 0 }} مدرسة ({{ $scopeSummary['totalSchools'] > 0 ? round(($scopeSummary['evaluatedSchools'] / $scopeSummary['totalSchools']) * 100, 1) : 0 }}%)</td>
        </tr>
        <tr>
            <td class="meta-label">أعلى المعايير أداءً:</td>
            <td style="color: #047857; font-weight: bold;">{{ is_array($scopeSummary['highestStandard']) ? ($scopeSummary['highestStandard']['name'] ?? '—') : ($scopeSummary['highestStandard'] ?? '—') }}</td>
            <td class="meta-label">أولوية الدعم والتدخل:</td>
            <td style="color: #be123c; font-weight: bold;">{{ is_array($scopeSummary['lowestStandard']) ? ($scopeSummary['lowestStandard']['name'] ?? '—') : ($scopeSummary['lowestStandard'] ?? '—') }}</td>
        </tr>
    </table>

    <!-- شريط المؤشرات الكمية الرباعي -->
    <table class="kpi-table">
        <tr>
            <td style="width: 25%; padding: 0 3px;">
                <div class="kpi-card" style="border-top: 3px solid #0f766e;">
                    <div class="kpi-title">متوسط الأداء الموزون (0-3.00)</div>
                    <div class="kpi-val" style="color: #0f766e;">{{ number_format($scopeSummary['averageScore'] ?? 0.0, 2) }} <span style="font-size: 8pt; font-weight: normal; color: #64748b;">({{ $scopeSummary['overallPercentage'] ?? 0 }}%)</span></div>
                </div>
            </td>
            <td style="width: 25%; padding: 0 3px;">
                <div class="kpi-card" style="border-top: 3px solid #0284c7;">
                    <div class="kpi-title">نسبة إنجاز المدارس</div>
                    <div class="kpi-val" style="color: #0284c7;">{{ $scopeSummary['totalSchools'] > 0 ? round((($scopeSummary['evaluatedSchools'] ?? 0) / $scopeSummary['totalSchools']) * 100, 1) : 0 }}%</div>
                </div>
            </td>
            <td style="width: 25%; padding: 0 3px;">
                <div class="kpi-card" style="border-top: 3px solid #e11d48;">
                    <div class="kpi-title">متأخرة عن التسليم (قاعدة 80%)</div>
                    <div class="kpi-val" style="color: #e11d48;">{{ $scopeSummary['overdueSchoolsCount'] ?? 0 }} <span style="font-size: 8pt; font-weight: normal; color: #64748b;">مدرسة</span></div>
                </div>
            </td>
            <td style="width: 25%; padding: 0 3px;">
                <div class="kpi-card" style="border-top: 3px solid #d97706;">
                    <div class="kpi-title">طلبات الاستكمال النشطة</div>
                    <div class="kpi-val" style="color: #d97706;">{{ $scopeSummary['activeRequestsCount'] ?? 0 }} <span style="font-size: 8pt; font-weight: normal; color: #64748b;">طلب</span></div>
                </div>
            </td>
        </tr>
    </table>

    <!-- بطاقة التركيب السياساتي والتوصية الاستراتيجية -->
    @if(!empty($scopeSummary['policySynthesisNote']))
    <div class="policy-card">
        <strong>خلاصة الرصد والتوجيه الإشرافي: </strong>
        {{ $scopeSummary['policySynthesisNote'] }}
    </div>
    @endif

    <!-- 1. تحليل المعايير السبعة الوطنية -->
    <div class="section-title">أولاً: مصفوفة متوسطات المعايير الوطنية السبعة وأوزانها الرسمية (FR-SUP-12)</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 10%;">الرمز</th>
                <th style="width: 38%;">اسم المعيار الوطني</th>
                <th style="width: 12%; text-align: center;">الوزن النسبي</th>
                <th style="width: 14%; text-align: center;">المتوسط (0-3.00)</th>
                <th style="width: 12%; text-align: center;">نسبة التحقق</th>
                <th style="width: 14%; text-align: center;">مستوى الكفاءة</th>
            </tr>
        </thead>
        <tbody>
            @foreach($standardsMeans as $std)
            <tr>
                <td style="font-weight: bold; color: #475569;">{{ $std['code'] ?? 'STD' }}</td>
                <td style="font-weight: bold; color: #0f172a;">{{ $std['name'] }}</td>
                <td style="text-align: center;">{{ $std['weight'] }}%</td>
                <td style="text-align: center; font-weight: bold;">{{ number_format($std['meanScore'], 2) }}</td>
                <td style="text-align: center;">{{ $std['percentageAttainment'] }}%</td>
                <td style="text-align: center;">
                    @if($std['percentageAttainment'] >= 80)
                        <span class="badge badge-advanced">متميز</span>
                    @elseif($std['percentageAttainment'] >= 60)
                        <span class="badge badge-proficient">متوسط</span>
                    @else
                        <span class="badge badge-support">بحاجة لدعم</span>
                    @endif
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- 2. مقارنة المراحل الدراسية وتوزيع الكفاءة -->
    <table style="width: 100%; margin-bottom: 12px; border-collapse: collapse;">
        <tr>
            <td style="width: 50%; vertical-align: top; padding-left: 6px;">
                <div class="section-title">ثانياً: مقارنة المراحل الدراسية (FR-SUP-14)</div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>المرحلة الدراسية</th>
                            <th style="text-align: center; width: 25%;">عدد المدارس</th>
                            <th style="text-align: center; width: 30%;">المتوسط (0-3.00)</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($stageBreakdown as $sb)
                        <tr>
                            <td>{{ $sb['stage'] }}</td>
                            <td style="text-align: center;">{{ $sb['schoolsCount'] }}</td>
                            <td style="text-align: center; font-weight: bold;">{{ number_format($sb['averageScore'], 2) }}</td>
                        </tr>
                        @empty
                        <tr><td colspan="3" style="text-align: center; color: #94a3b8;">لا توجد بيانات متاحة للمراحل</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </td>
            <td style="width: 50%; vertical-align: top; padding-right: 6px;">
                <div class="section-title">ثالثاً: التوزيع الإحصائي لمستويات الكفاءة (FR-SUP-12)</div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>المستوى الإشرافي</th>
                            <th style="text-align: center; width: 35%;">العتبة المعتمدة</th>
                            <th style="text-align: center; width: 25%;">النسبة المئوية</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span class="badge badge-advanced">متقدم / متميز</span></td>
                            <td style="text-align: center; font-size: 7.5pt;">نسبة تحقق &ge; 80%</td>
                            <td style="text-align: center; font-weight: bold; color: #047857;">{{ $distribution['advancedPercentage'] ?? 0 }}%</td>
                        </tr>
                        <tr>
                            <td><span class="badge badge-proficient">متوسط / مستقر</span></td>
                            <td style="text-align: center; font-size: 7.5pt;">نسبة تحقق 60% - 79.9%</td>
                            <td style="text-align: center; font-weight: bold; color: #1d4ed8;">{{ $distribution['proficientPercentage'] ?? 0 }}%</td>
                        </tr>
                        <tr>
                            <td><span class="badge badge-support">بحاجة لدعم وتدخل</span></td>
                            <td style="text-align: center; font-size: 7.5pt;">نسبة تحقق &lt; 60%</td>
                            <td style="text-align: center; font-weight: bold; color: #be123c;">{{ $distribution['needsSupportPercentage'] ?? 0 }}%</td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
    </table>

    <div class="page-break"></div>

    <!-- 3. أولويات التدخل ونقاط القوة -->
    <table style="width: 100%; margin-bottom: 14px; border-collapse: collapse;">
        <tr>
            <td style="width: 50%; vertical-align: top; padding-left: 6px;">
                <div class="section-title" style="color: #047857; border-color: #047857;">رابعاً: أبرز نقاط القوة (أعلى المؤشرات تحققاً)</div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 22%;">الرمز</th>
                            <th style="width: 58%;">المؤشر الوطني</th>
                            <th style="width: 20%; text-align: center;">التحقق</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse(array_slice($topStrengths ?? [], 0, 7) as $str)
                        <tr>
                            <td style="font-weight: bold; font-size: 7.5pt; color: #475569;">{{ $str['code'] }}</td>
                            <td style="font-size: 7.5pt;">{{ $str['name'] }}</td>
                            <td style="text-align: center; font-weight: bold; color: #047857;">{{ $str['percentageAttainment'] }}%</td>
                        </tr>
                        @empty
                        <tr><td colspan="3" style="text-align: center; color: #94a3b8;">لا تتوفر نتائج مرصودة حتى الآن</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </td>
            <td style="width: 50%; vertical-align: top; padding-right: 6px;">
                <div class="section-title" style="color: #be123c; border-color: #be123c;">خامساً: أولويات التدخل والدعم (أدنى المؤشرات تحققاً)</div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 22%;">الرمز</th>
                            <th style="width: 58%;">المؤشر الوطني</th>
                            <th style="width: 20%; text-align: center;">التحقق</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse(array_slice($bottomGaps ?? [], 0, 7) as $gap)
                        <tr>
                            <td style="font-weight: bold; font-size: 7.5pt; color: #475569;">{{ $gap['code'] }}</td>
                            <td style="font-size: 7.5pt;">{{ $gap['name'] }}</td>
                            <td style="text-align: center; font-weight: bold; color: #be123c;">{{ $gap['percentageAttainment'] }}%</td>
                        </tr>
                        @empty
                        <tr><td colspan="3" style="text-align: center; color: #94a3b8;">لا تتوفر نتائج مرصودة حتى الآن</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </td>
        </tr>
    </table>

    <!-- 4. التقرير المركزي لحالة المدارس ومخرجاتها الإشرافية -->
    <div class="section-title">سادساً: التقرير المركزي لحالة المدارس ومخرجاتها الإشرافية (FR-SUP-15)</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 10%;">كود المدرسة</th>
                <th style="width: 26%;">اسم المدرسة</th>
                <th style="width: 14%;">المديرية</th>
                <th style="width: 14%;">المرحلة الدراسية</th>
                <th style="width: 18%; text-align: center;">حالة الملف ومخرجه</th>
                <th style="width: 10%; text-align: center;">الإنجاز (109)</th>
                <th style="width: 8%; text-align: center;">الاستكمال</th>
            </tr>
        </thead>
        <tbody>
            @forelse($centralSchoolsReport as $sch)
            <tr>
                <td style="font-weight: bold; color: #475569;">{{ $sch['schoolCode'] }}</td>
                <td style="font-weight: bold; color: #0f172a;">{{ $sch['schoolName'] }}</td>
                <td>{{ $sch['directorate'] }}</td>
                <td>{{ $sch['stage'] }}</td>
                <td style="text-align: center;">
                    @if($sch['status'] === 'Overdue' || $sch['isDelayed'])
                        <span class="badge badge-overdue">متأخرة عن التسليم 🔴</span>
                    @elseif($sch['status'] === 'Completed')
                        <span class="badge badge-completed">مكتملة المراجعة والإقرار</span>
                    @elseif($sch['status'] === 'NeedsCompletion')
                        <span class="badge badge-support">تحتاج استكمال ({{ $sch['pendingRequestsCount'] }})</span>
                    @elseif($sch['status'] === 'UnderReview')
                        <span class="badge badge-proficient">قيد المراجعة الإشرافية</span>
                    @elseif($sch['status'] === 'Submitted')
                        <span class="badge badge-proficient">تم الإرسال للمشرف</span>
                    @else
                        <span class="badge" style="background-color: #f1f5f9; color: #64748b;">مسودة ({{ $sch['completionPercentage'] }}%)</span>
                    @endif
                </td>
                <td style="text-align: center;">{{ $sch['completionPercentage'] }}%</td>
                <td style="text-align: center;">{{ $sch['completionRequestsCount'] }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="7" style="text-align: center; color: #94a3b8; padding: 12px;">لا توجد مدارس مسجلة في هذا النطاق</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <!-- تذييل الوثيقة -->
    <htmlpagefooter name="reportFooter">
        <div class="footer-text">
            وثيقة رسمية صادرة آلياً عن منصة ارتقاء للتقييم والتحسين المدرسي — وزارة التربية والتعليم والبحث العلمي.<br>
            تُستخدم هذه المؤشرات حصراً لتوجيه الدعم وتخطيط التدخلات الإشرافية الميدانية، ومستبعدة نظامياً من أي مقارنة أو ترتيب تفاضلي بين المدارس.<br>
            صفحة {PAGENO} من {nbpg}
        </div>
    </htmlpagefooter>

</body>
</html>