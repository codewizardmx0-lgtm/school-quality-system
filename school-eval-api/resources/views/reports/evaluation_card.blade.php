<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>بطاقة تقويم المدرسة الرسمية - {{ $school['school_name'] }}</title>
    <style>
        @page {
            header: page-header;
            footer: page-footer;
            margin-top: 25mm;
            margin-bottom: 25mm;
            margin-left: 12mm;
            margin-right: 12mm;
        }
        body {
            font-family: 'dejavusans', sans-serif;
            direction: rtl;
            text-align: right;
            color: #1e293b;
            font-size: 11pt;
            line-height: 1.4;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #0f766e;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }
        .header-title {
            text-align: center;
        }
        .header-title h1 {
            color: #0f766e;
            font-size: 16pt;
            margin: 0;
            padding: 0;
        }
        .header-title h2 {
            color: #334155;
            font-size: 12pt;
            margin: 4px 0 0 0;
            font-weight: normal;
        }
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
        }
        .meta-table td {
            padding: 6px 10px;
            font-size: 9.5pt;
            border-bottom: 1px solid #e2e8f0;
        }
        .meta-label {
            font-weight: bold;
            color: #475569;
            width: 18%;
            background-color: #f1f5f9;
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
        }
        .stats-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        .stats-grid td {
            width: 25%;
            padding: 8px;
            text-align: center;
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
        }
        .stat-value {
            font-size: 13pt;
            font-weight: bold;
            color: #0f766e;
        }
        .stat-label {
            font-size: 8.5pt;
            color: #64748b;
        }
        .result-banner {
            width: 100%;
            background-color: #f0fdf4;
            border: 2px solid {{ $rating['color'] ?? '#10b981' }};
            border-radius: 6px;
            padding: 12px;
            text-align: center;
            margin-bottom: 14px;
        }
        .result-score {
            font-size: 24pt;
            font-weight: bold;
            color: {{ $rating['color'] ?? '#10b981' }};
        }
        .result-badge {
            display: inline-block;
            background-color: {{ $rating['color'] ?? '#10b981' }};
            color: #ffffff;
            padding: 4px 16px;
            font-size: 12pt;
            font-weight: bold;
            border-radius: 20px;
            margin-top: 4px;
        }
        .result-desc {
            font-size: 9.5pt;
            color: #475569;
            margin-top: 6px;
        }
        .standards-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            font-size: 9pt;
        }
        .standards-table th {
            background-color: #0f766e;
            color: #ffffff;
            font-weight: bold;
            padding: 7px 6px;
            text-align: center;
            border: 1px solid #0f766e;
        }
        .standards-table td {
            padding: 6px 8px;
            border: 1px solid #cbd5e1;
            text-align: center;
        }
        .standards-table td.std-name {
            text-align: right;
            font-weight: 500;
        }
        .signatures-table {
            width: 100%;
            margin-top: 15px;
            border-collapse: collapse;
        }
        .sig-box {
            width: 33.33%;
            border: 1px dashed #94a3b8;
            padding: 10px;
            text-align: center;
            vertical-align: top;
            background-color: #fdfdfd;
        }
        .sig-role {
            font-weight: bold;
            color: #334155;
            font-size: 9.5pt;
            margin-bottom: 30px;
        }
        .sig-line {
            font-size: 8.5pt;
            color: #64748b;
            border-top: 1px solid #cbd5e1;
            padding-top: 4px;
        }
        .footer-note {
            font-size: 8pt;
            color: #94a3b8;
            text-align: center;
            margin-top: 10px;
        }
    </style>
</head>
<body>

    <!-- الترويسة العلوية الرسمية -->
    <table class="header-table">
        <tr>
            <td style="width: 25%; text-align: right; font-size: 9pt; color: #475569;">
                <strong>الجمهورية اليمنية</strong><br>
                وزارة التربية والتعليم والبحث العلمي<br>
                قطاع معايير الاعتماد المدرسي والجودة
            </td>
            <td class="header-title" style="width: 50%;">
                <h1>{{ $system_name }}</h1>
                <h2>بطاقة تقويم المدرسة الرسمية</h2>
            </td>
            <td style="width: 25%; text-align: left; font-size: 8.5pt; color: #64748b;">
                <strong>العام الدراسي:</strong> {{ $cycle['academic_year'] ?? '2025/2026' }}<br>
                <strong>رقم التقرير:</strong> #EV-{{ str_pad($evaluation['evaluation_id'], 5, '0', STR_PAD_LEFT) }}<br>
                <strong>التاريخ:</strong> {{ $report_date }}
            </td>
        </tr>
    </table>

    <!-- بيانات ملف المدرسة المعتمدة -->
    <table class="meta-table">
        <tr>
            <td class="meta-label">اسم المدرسة:</td>
            <td style="font-weight: bold; color: #0f766e;">{{ $school['school_name'] }}</td>
            <td class="meta-label">الرقم التعريفي:</td>
            <td>{{ $school['school_code'] ?? 'SCH-' . $school['school_id'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">المحافظة / الإدارة:</td>
            <td>{{ $school['governorate'] ?? 'الأمانة' }} - {{ $school['educational_admin'] ?? $school['educational_district'] ?? 'معين' }}</td>
            <td class="meta-label">المرحلة الدراسية:</td>
            <td>{{ $school['educational_stage'] ?? 'أساسي وثانوي' }}</td>
        </tr>
        <tr>
            <td class="meta-label">نوع المبنى والفترة:</td>
            <td>{{ $school['building_type'] ?? 'حكومي' }} (الفترة: {{ $school['shift_type'] ?? 'صباحي' }})</td>
            <td class="meta-label">المساحة الإجمالية:</td>
            <td>{{ $school['total_area'] ? $school['total_area'] . ' م²' : 'غير مسجلة' }}</td>
        </tr>
    </table>

    <!-- الملخص الإحصائي المعتمد (Context Snapshot) -->
    <div class="section-box">
        <div class="section-title">الملخص الإحصائي المعتمد للمدرسة</div>
        <table class="stats-grid">
            <tr>
                <td>
                    <div class="stat-value">{{ $summary['enrollment']['total_students'] ?? 0 }}</div>
                    <div class="stat-label">إجمالي الطلاب</div>
                </td>
                <td>
                    <div class="stat-value">{{ $summary['facilities']['classrooms_count'] ?? 0 }}</div>
                    <div class="stat-label">الفصول الصالحة</div>
                </td>
                <td>
                    <div class="stat-value">
                        {{ ($summary['facilities']['classrooms_count'] ?? 0) > 0 ? round(($summary['enrollment']['total_students'] ?? 0) / $summary['facilities']['classrooms_count'], 1) : 0 }}
                    </div>
                    <div class="stat-label">متوسط الكثافة الصفية</div>
                </td>
                <td>
                    <div class="stat-value">{{ $summary['staff']['total_teachers'] ?? 0 }}</div>
                    <div class="stat-label">إجمالي المعلمين</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="stat-value">
                        {{ ($summary['staff']['total_teachers'] ?? 0) > 0 ? round((($summary['staff']['qualified_teachers_count'] ?? 0) / $summary['staff']['total_teachers']) * 100, 1) : 0 }}%
                    </div>
                    <div class="stat-label">نسبة التأهيل التربوي</div>
                </td>
                <td>
                    <div class="stat-value">
                        {{ ($summary['staff']['total_teachers'] ?? 0) > 0 ? round((($summary['staff']['matched_specialization_count'] ?? 0) / $summary['staff']['total_teachers']) * 100, 1) : 0 }}%
                    </div>
                    <div class="stat-label">مطابقة التخصص للمادة</div>
                </td>
                <td>
                    <div class="stat-value">{{ $summary['facilities']['science_labs_count'] ?? 0 }} / {{ $summary['facilities']['computer_labs_count'] ?? 0 }}</div>
                    <div class="stat-label">معامل علوم / حاسوب</div>
                </td>
                <td>
                    <div class="stat-value">{{ $summary['facilities']['restrooms_count'] ?? 0 }}</div>
                    <div class="stat-label">المرافق الصحية الصالحة</div>
                </td>
            </tr>
        </table>
    </div>

    <!-- النتيجة الإجمالية والتصنيف النوعي المحايد -->
    <div class="result-banner">
        <div style="font-size: 11pt; color: #475569; margin-bottom: 2px;">النتيجة الموزونة الإجمالية لتقويم المدرسة</div>
        <div class="result-score">{{ number_format($final_score, 2) }}%</div>
        <div class="result-badge">{{ $rating['label'] }}</div>
        <div class="result-desc">{{ $rating['description'] }}</div>
    </div>

    <!-- تفصيل مجالات معايير الاعتماد المدرسي السبعة -->
    <div class="section-box">
        <div class="section-title">تفصيل أداء مجالات معايير الاعتماد المدرسي السبعة</div>
        <table class="standards-table">
            <thead>
                <tr>
                    <th style="width: 8%;">الرمز</th>
                    <th style="width: 36%;">المجال المعياري</th>
                    <th style="width: 12%;">الوزن النسبي</th>
                    <th style="width: 14%;">الدرجة المرجحة (3)</th>
                    <th style="width: 14%;">النسبة المحققة</th>
                    <th style="width: 16%;">المساهمة الموزونة</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($standards as $std)
                    <tr>
                        <td style="font-weight: bold; color: #0f766e;">{{ $std['code'] }}</td>
                        <td class="std-name">{{ $std['name'] }}</td>
                        <td>{{ number_format($std['weight'], 1) }}%</td>
                        <td>{{ number_format($std['raw_score'], 2) }} / 3.00</td>
                        <td style="font-weight: bold;">{{ number_format($std['percentage'], 1) }}%</td>
                        <td style="color: #0f766e; font-weight: bold;">{{ number_format($std['weighted_score'], 2) }}%</td>
                    </tr>
                @endforeach
                <tr style="background-color: #f1f5f9; font-weight: bold;">
                    <td colspan="2" style="text-align: right; padding-right: 12px;">الإجمالي الكلي الموزون</td>
                    <td>100.0%</td>
                    <td>—</td>
                    <td>—</td>
                    <td style="color: #0f766e; font-size: 10.5pt;">{{ number_format($final_score, 2) }}%</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- خانات التوقيع والتوثيق الرسمي الثلاثية -->
    <table class="signatures-table">
        <tr>
            <td class="sig-box">
                <div class="sig-role">إعداد وتدقيق<br><span style="font-weight: normal; color: #64748b;">(مقيّم المدرسة)</span></div>
                <div class="sig-line">الاسم: .......................................<br>التوقيع: ....................................</div>
            </td>
            <td class="sig-box" style="margin: 0 8px;">
                <div class="sig-role">إقرار واطلاع<br><span style="font-weight: normal; color: #64748b;">(مدير المدرسة)</span></div>
                <div class="sig-line">الاسم: .......................................<br>التوقيع والختم: ............................</div>
            </td>
            <td class="sig-box">
                <div class="sig-role">مراجعة وتوثيق<br><span style="font-weight: normal; color: #64748b;">(المشرف التربوي / إدارة الجودة)</span></div>
                <div class="sig-line">الاسم: .......................................<br>التوقيع: ....................................</div>
            </td>
        </tr>
    </table>

    <div class="footer-note">
        وثيقة رسمية صادرة آلياً عن نظام معايير الاعتماد المدرسي وجودة التعليم — الرقم المرجعي للتحقق: REF-{{ md5($evaluation['evaluation_id'] . '-' . $school['school_id'] . '-SQS') }}
    </div>

</body>
</html>
