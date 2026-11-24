<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>وثيقة إقرار واعتماد معايير الجودة والتقويم المدرسي - إصدار {{ $version->version_no }}</title>
    <style>
        @page {
            margin-top: 12mm;
            margin-bottom: 12mm;
            margin-left: 12mm;
            margin-right: 12mm;
        }
        body {
            font-family: 'amiri', 'dejavusans', sans-serif;
            direction: rtl;
            text-align: right;
            color: #0f172a;
            font-size: 10pt;
            line-height: 1.5;
        }
        .header-table {
            width: 100%;
            border-bottom: 3px double #92400e;
            padding-bottom: 8px;
            margin-bottom: 14px;
        }
        .header-title {
            text-align: center;
        }
        .header-title h1 {
            color: #78350f;
            font-size: 16pt;
            margin: 0;
            padding: 0;
        }
        .header-title h2 {
            color: #475569;
            font-size: 11pt;
            margin: 4px 0 0 0;
            font-weight: normal;
        }
        .seal-badge {
            background-color: #fef3c7;
            border: 2px solid #d97706;
            color: #92400e;
            text-align: center;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 14px;
            font-size: 12pt;
            font-weight: bold;
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
            width: 22%;
            background-color: #f1f5f9;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            font-size: 9pt;
        }
        .data-table th {
            background-color: #fef3c7;
            color: #78350f;
            border: 1px solid #d97706;
            padding: 6px 8px;
            font-weight: bold;
            text-align: center;
        }
        .data-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
        }
        .data-table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .hash-box {
            background-color: #f1f5f9;
            border: 1px solid #94a3b8;
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 14px;
            font-family: 'dejavusansmono', monospace;
            font-size: 9pt;
            word-break: break-all;
            direction: ltr;
            text-align: left;
            color: #0f172a;
        }
        .governance-notice {
            background-color: #ecfdf5;
            border: 1px solid #a7f3d0;
            border-right: 5px solid #059669;
            padding: 10px 12px;
            font-size: 9.5pt;
            color: #065f46;
            margin-bottom: 16px;
            line-height: 1.5;
        }
        .signatures-table {
            width: 100%;
            margin-top: 18px;
            border-collapse: collapse;
        }
        .signatures-table td {
            width: 33.33%;
            text-align: center;
            font-size: 9pt;
            vertical-align: top;
        }
    </style>
</head>
<body>

    <!-- Header -->
    <table class="header-table">
        <tr>
            <td style="width: 25%; text-align: right; font-size: 9pt; color: #475569;">
                الجمهورية اليمنية<br>
                وزارة التربية والتعليم والبحث العلمي<br>
                مجلس الاعتماد وضمان الجودة
            </td>
            <td style="width: 50%;" class="header-title">
                <h1>وثيقة إقرار واعتماد المعايير الوطنية</h1>
                <h2>منصة ارتقاء للتقويم الذاتي والاعتماد المدرسي</h2>
            </td>
            <td style="width: 25%; text-align: left; font-size: 9pt; color: #475569;">
                التاريخ: {{ now()->format('Y-m-d') }}<br>
                الوقت: {{ now()->format('H:i') }}<br>
                كود الوثيقة: STD-{{ $version->version_no }}
            </td>
        </tr>
    </table>

    <!-- Seal Badge -->
    <div class="seal-badge">
        شهادة إقرار وقفل الوثيقة المعيارية — إصدار ({{ $version->version_no }})
    </div>

    <!-- Metadata Table -->
    <table class="meta-table">
        <tr>
            <td class="meta-label">رقم وكود الإصدار:</td>
            <td style="font-weight: bold; font-family: monospace;">{{ $version->version_no }}</td>
            <td class="meta-label">حالة الوثيقة:</td>
            <td style="font-weight: bold; color: {{ $version->status === 'Active' ? '#047857' : ($version->status === 'Approved' ? '#1d4ed8' : '#b45309') }};">
                {{ $version->status === 'Active' ? 'نافذ ومُفعّل للدورة الجارية' : ($version->status === 'Approved' ? 'مُقرّ ومجدول للدورة القادمة' : 'مسودة قيد التطوير') }} ({{ $version->status }})
            </td>
        </tr>
        <tr>
            <td class="meta-label">قرار الإقرار الوزاري:</td>
            <td style="font-weight: bold;">{{ $version->source_number ?? 'قرار وزاري رقم (1) لسنة 2026م' }}</td>
            <td class="meta-label">تاريخ الإصدار / الإقرار:</td>
            <td>{{ $version->issue_date ? \Carbon\Carbon::parse($version->issue_date)->format('Y-m-d') : now()->format('Y-m-d') }}</td>
        </tr>
        <tr>
            <td class="meta-label">الجهة المرجعية المصدرة:</td>
            <td colspan="3">{{ $version->source_organization ?? 'مجلس الاعتماد الأكاديمي وضمان جودة التعليم' }}</td>
        </tr>
        <tr>
            <td class="meta-label">الوصف المعتمد:</td>
            <td colspan="3">{{ $version->source_description ?? 'الوثيقة الوطنية الرسمية لمعايير تقويم واعتماد المدارس' }}</td>
        </tr>
    </table>

    <!-- Standards Hierarchy & Weights Table -->
    <h3 style="font-size: 11pt; color: #0f172a; margin: 12px 0 6px 0;">مصفوفة المعايير السبعة وتوزيع الأوزان النسبية:</h3>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 8%;">#</th>
                <th style="width: 14%;">كود المعيار</th>
                <th style="width: 44%;">اسم المعيار الرئيسي</th>
                <th style="width: 16%;">عدد المؤشرات</th>
                <th style="width: 18%;">الوزن النسبي (%)</th>
            </tr>
        </thead>
        <tbody>
            @php $totalWeight = 0; $totalIndicators = 0; @endphp
            @foreach($version->standards as $index => $standard)
                @php
                    $indCount = $standard->indicators_count ?? $standard->subStandards->sum(fn($sub) => $sub->indicators->count());
                    $totalIndicators += $indCount;
                    $totalWeight += (float) $standard->weight;
                @endphp
                <tr>
                    <td style="text-align: center; font-weight: bold;">{{ $index + 1 }}</td>
                    <td style="text-align: center; font-family: monospace;">{{ $standard->code }}</td>
                    <td style="font-weight: bold;">{{ $standard->name }}</td>
                    <td style="text-align: center;">{{ $indCount }} مؤشراً</td>
                    <td style="text-align: center; font-weight: bold;">{{ number_format((float) $standard->weight, 2) }}%</td>
                </tr>
            @endforeach
            <tr style="background-color: #fef3c7; font-weight: bold;">
                <td colspan="3" style="text-align: center;">المجموع الكلي المعتمد للأوزان</td>
                <td style="text-align: center;">{{ $totalIndicators }} مؤشراً</td>
                <td style="text-align: center; color: #047857;">{{ number_format($totalWeight, 2) }}%</td>
            </tr>
        </tbody>
    </table>

    <!-- Digital Fingerprint (SHA-256) -->
    <div style="font-weight: bold; font-size: 9.5pt; color: #0f172a; margin-bottom: 4px;">
        بصمة النزاهة الرقمية المشفرة (SHA-256 Digital Hash):
    </div>
    <div class="hash-box">
        {{ $hash ?? hash('sha256', "OFFICIAL_STANDARDS_{$version->version_id}_{$version->version_no}_{$totalWeight}") }}
    </div>

    <!-- Governance Notice -->
    <div class="governance-notice">
        <strong>ضمان النزاهة والحصانة النظامية:</strong>
        هذه الوثيقة صادرة ومعتمدة وموثقة رقمياً ولا يجوز تعديل أي عنصر من معاييرها أو مؤشراتها أو أوزانها أو سلالم تقديرها بعد تاريخ الإقرار. تخضع كافة التقييمات الميدانية في المدارس للنسخة المطابقة لبصمة النزاهة الموضحة أعلاه.
    </div>

    <!-- Signatures Table -->
    <table class="signatures-table">
        <tr>
            <td>
                <strong>مسؤول إدارة المعايير والمؤشرات</strong><br><br>
                التوقيع: ............................<br>
                التاريخ: {{ now()->format('Y-m-d') }}
            </td>
            <td>
                <strong>رئيس فريق التحكيم والمراجعة</strong><br><br>
                التوقيع: ............................<br>
                التاريخ: {{ now()->format('Y-m-d') }}
            </td>
            <td>
                <strong>رئيس مجلس الاعتماد وضمان الجودة</strong><br><br>
                الختم والتوقيع: ............................<br>
                التاريخ: {{ now()->format('Y-m-d') }}
            </td>
        </tr>
    </table>

</body>
</html>
