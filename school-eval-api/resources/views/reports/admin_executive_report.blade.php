<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>التقرير التشغيلي والتنفيذي الشامل - منصة ارتقاء</title>
    <style>
        @page {
            margin-top: 12mm;
            margin-bottom: 12mm;
            margin-left: 12mm;
            margin-right: 12mm;
            header: html_reportHeader;
            footer: html_reportFooter;
        }
        body {
            font-family: 'amiri', 'dejavusans', sans-serif;
            direction: rtl;
            text-align: right;
            color: #1e293b;
            font-size: 10pt;
            line-height: 1.4;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #0f766e;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }
        .header-right {
            width: 35%;
            font-size: 9pt;
            line-height: 1.3;
            color: #334155;
            font-weight: bold;
        }
        .header-center {
            width: 30%;
            text-align: center;
        }
        .header-center h1 {
            color: #0f766e;
            font-size: 13pt;
            margin: 0;
            padding: 0;
            font-weight: bold;
        }
        .header-center h2 {
            color: #475569;
            font-size: 10pt;
            margin: 3px 0 0 0;
            font-weight: normal;
        }
        .header-left {
            width: 35%;
            text-align: left;
            font-size: 8.5pt;
            color: #64748b;
            line-height: 1.3;
        }
        .section-box {
            margin-bottom: 14px;
        }
        .section-title {
            font-size: 11pt;
            font-weight: bold;
            color: #0f766e;
            border-right: 4px solid #0f766e;
            padding-right: 8px;
            margin-bottom: 6px;
            background-color: #f0fdfa;
            padding-top: 3px;
            padding-bottom: 3px;
        }
        .stats-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        .stats-grid td {
            width: 20%;
            padding: 8px 6px;
            text-align: center;
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
        }
        .stat-val {
            font-size: 14pt;
            font-weight: bold;
            color: #0f766e;
            display: block;
        }
        .stat-lbl {
            font-size: 8pt;
            color: #475569;
            margin-top: 2px;
            display: block;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            margin-bottom: 10px;
        }
        .data-table th {
            background-color: #0f766e;
            color: #ffffff;
            font-weight: bold;
            font-size: 8.5pt;
            padding: 6px 8px;
            border: 1px solid #0d9488;
            text-align: right;
        }
        .data-table td {
            padding: 5px 8px;
            font-size: 8.5pt;
            border: 1px solid #cbd5e1;
            color: #1e293b;
        }
        .data-table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 7.5pt;
            font-weight: bold;
        }
        .badge-gov {
            background-color: #e0f2fe;
            color: #0369a1;
            border: 1px solid #bae6fd;
        }
        .badge-pvt {
            background-color: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
        }
        .badge-ready {
            background-color: #dcfce7;
            color: #15803d;
            border: 1px solid #bbf7d0;
        }
        .badge-pending {
            background-color: #fee2e2;
            color: #b91c1c;
            border: 1px solid #fecaca;
        }
        .footer-note {
            font-size: 8pt;
            color: #64748b;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            padding-top: 4px;
            margin-top: 8px;
        }
    </style>
</head>
<body>

    <!-- HTML Header -->
    <htmlpageheader name="reportHeader">
        <table class="header-table">
            <tr>
                <td class="header-right">
                    الجمهورية اليمنية<br>
                    وزارة التربية والتعليم والبحث العلمي<br>
                    قطاع التوجيه والمناهج • إدارة الجودة
                </td>
                <td class="header-center">
                    <h1>منصة ارتقاء الوطنية</h1>
                    <h2>التقرير التنفيذي الشامل للجاهزية والمدارس</h2>
                </td>
                <td class="header-left">
                    تاريخ الإصدار: {{ $generated_at }}<br>
                    الرقم المرجعي: ERT-EXEC-{{ $ref_number }}<br>
                    المستوى: حوكمة النظام المركزي
                </td>
            </tr>
        </table>
    </htmlpageheader>

    <!-- HTML Footer -->
    <htmlpagefooter name="reportFooter">
        <div class="footer-note">
            منظومة تقويم جودة المدارس (ارتقاء) • وثيقة رسمية صادرة آلياً • صفحة {PAGENO} من {nbpg} • البصمة الرقمية: SHA-{{ $digital_hash }}
        </div>
    </htmlpagefooter>

    <!-- Section 1: KPI Stats Grid -->
    <div class="section-box" style="margin-top: 10px;">
        <div class="section-title">أولاً: ملخص المؤشرات العامة للجاهزية والمنظومة</div>
        <table class="stats-grid">
            <tr>
                <td>
                    <span class="stat-val">{{ $total_schools }}</span>
                    <span class="stat-lbl">إجمالي المدارس المسجلة</span>
                </td>
                <td>
                    <span class="stat-val" style="color: #0369a1;">{{ $gov_schools }}</span>
                    <span class="stat-lbl">مدارس حكومية (رسمية)</span>
                </td>
                <td>
                    <span class="stat-val" style="color: #d97706;">{{ $pvt_schools }}</span>
                    <span class="stat-lbl">مدارس أهلية (خاصة)</span>
                </td>
                <td>
                    <span class="stat-val" style="color: #16a34a;">{{ $ready_schools }} ({{ $readiness_rate }}%)</span>
                    <span class="stat-lbl">المدارس الجاهزة تشغيلياً</span>
                </td>
                <td>
                    <span class="stat-val">{{ $active_users }} / {{ $total_users }}</span>
                    <span class="stat-lbl">الحسابات المفعلة والنشطة</span>
                </td>
            </tr>
        </table>
    </div>

    <!-- Section 2: Directorates Distribution -->
    <div class="section-box">
        <div class="section-title">ثانياً: التوزيع الجغرافي للمدارس على المديريات التعليمية</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 8%;">#</th>
                    <th style="width: 32%;">المديرية التعليمية</th>
                    <th style="width: 25%;">المحافظة</th>
                    <th style="width: 15%; text-align: center;">عدد المدارس</th>
                    <th style="width: 20%; text-align: center;">نسبة التغطية</th>
                </tr>
            </thead>
            <tbody>
                @foreach($directorates as $idx => $dir)
                <tr>
                    <td>{{ $idx + 1 }}</td>
                    <td><strong>{{ $dir['directorateName'] }}</strong></td>
                    <td>{{ $dir['governorate'] }}</td>
                    <td style="text-align: center; font-weight: bold; color: #0f766e;">{{ $dir['schoolCount'] }}</td>
                    <td style="text-align: center;">
                        {{ $total_schools > 0 ? round(($dir['schoolCount'] / $total_schools) * 100, 1) : 0 }}%
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <!-- Section 3: Schools Directory & Staff Assignment -->
    <div class="section-box">
        <div class="section-title">ثالثاً: تفاصيل المدارس والكوادر التربوية المسندة</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 14%;">كود المدرسة</th>
                    <th style="width: 26%;">اسم المدرسة الرسمي</th>
                    <th style="width: 10%;">النوع</th>
                    <th style="width: 16%;">المديرية</th>
                    <th style="width: 15%;">المدير المعتمد</th>
                    <th style="width: 14%;">مقيّمو الجودة</th>
                </tr>
            </thead>
            <tbody>
                @foreach($schools as $idx => $s)
                <tr>
                    <td>{{ $idx + 1 }}</td>
                    <td style="font-family: monospace; font-size: 8pt; direction: ltr; text-align: right;">{{ $s['schoolCode'] }}</td>
                    <td><strong>{{ $s['schoolName'] }}</strong></td>
                    <td>
                        <span class="badge {{ $s['schoolType'] === 'private' ? 'badge-pvt' : 'badge-gov' }}">
                            {{ $s['schoolType'] === 'private' ? 'أهلية' : 'حكومية' }}
                        </span>
                    </td>
                    <td>{{ $s['directorate'] }}</td>
                    <td>
                        @if($s['principal'])
                            <span style="color: #0f766e; font-weight: bold;">{{ $s['principal']['fullName'] }}</span>
                        @else
                            <span class="badge badge-pending">غير مسند</span>
                        @endif
                    </td>
                    <td>
                        @if(count($s['evaluators']) > 0)
                            <span style="color: #1e293b;">
                                {{ implode('، ', array_map(fn($ev) => $ev['fullName'], $s['evaluators'])) }}
                            </span>
                        @else
                            <span class="badge badge-pending">غير مسند</span>
                        @endif
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <!-- Section 4: Evaluation Cycles Summary -->
    @if(count($cycles) > 0)
    <div class="section-box">
        <div class="section-title">رابعاً: ملخص دورات التقويم والاعتماد المدرسي المعتمدة</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 8%;">#</th>
                    <th style="width: 35%;">مسمى الدورة التقييمية</th>
                    <th style="width: 18%;">العام الدراسي</th>
                    <th style="width: 15%; text-align: center;">الحالة</th>
                    <th style="width: 24%; text-align: center;">الفترة الزمنية</th>
                </tr>
            </thead>
            <tbody>
                @foreach($cycles as $idx => $c)
                <tr>
                    <td>{{ $idx + 1 }}</td>
                    <td><strong>{{ $c['name'] ?? $c['cycle_name'] ?? 'دورة تقويم' }}</strong></td>
                    <td>{{ $c['academic_year'] }}</td>
                    <td style="text-align: center;">
                        <span class="badge badge-ready">{{ $c['status'] === 'Active' ? 'نشطة ومفعلة' : $c['status'] }}</span>
                    </td>
                    <td style="text-align: center; font-size: 8pt;">
                        من {{ $c['start_date'] ? \Carbon\Carbon::parse($c['start_date'])->format('Y-m-d') : '---' }} 
                        إلى {{ $c['end_date'] ? \Carbon\Carbon::parse($c['end_date'])->format('Y-m-d') : '---' }}
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

</body>
</html>
