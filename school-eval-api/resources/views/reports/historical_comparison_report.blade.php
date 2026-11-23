<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تقرير المقارنة التاريخية التراكمية - {{ $school['schoolName'] ?? 'مدرسة' }}</title>
    <style>
        @page {
            margin-top: 12mm;
            margin-bottom: 12mm;
            margin-left: 10mm;
            margin-right: 10mm;
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
            margin: 3px 0 0 0;
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
            font-size: 9pt;
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
            margin-bottom: 14px;
        }
        .kpi-card {
            border: 1px solid #cbd5e1;
            padding: 8px;
            text-align: center;
            background-color: #ffffff;
            border-radius: 4px;
        }
        .kpi-title {
            font-size: 8.5pt;
            color: #64748b;
            margin-bottom: 4px;
        }
        .kpi-val {
            font-size: 13pt;
            font-weight: bold;
            color: #0f172a;
        }
        .section-title {
            font-size: 11pt;
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
            font-size: 8.5pt;
        }
        .data-table th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: bold;
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: right;
        }
        .data-table td {
            border: 1px solid #e2e8f0;
            padding: 5px 8px;
        }
        .badge-up {
            color: #047857;
            font-weight: bold;
        }
        .badge-down {
            color: #b91c1c;
            font-weight: bold;
        }
        .badge-same {
            color: #475569;
        }
        .notice-box {
            background-color: #fffbeb;
            border: 1px solid #fde68a;
            color: #92400e;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 8.5pt;
            margin-bottom: 10px;
        }
        .footer-note {
            font-size: 7.5pt;
            color: #64748b;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td style="width: 25%; text-align: right; font-size: 8.5pt; color: #475569;">
                الجمهورية اليمنية<br>
                وزارة التربية والتعليم والبحث العلمي<br>
                قطاع المناهج والتوجيه
            </td>
            <td style="width: 50%;" class="header-title">
                <h1>منصة ارتقاء للتقييم الذاتي والتحسين المدرسي</h1>
                <h2>تقرير المقارنة التاريخية التراكمية لمسار النمو المدرسي (FR-SUP-18)</h2>
            </td>
            <td style="width: 25%; text-align: left; font-size: 8.5pt; color: #475569;">
                الإدارة العامة لضمان الجودة<br>
                التاريخ: {{ date('Y-m-d') }}<br>
                نطاق الفحص: المستوى الإشرافي
            </td>
        </tr>
    </table>

    <table class="meta-table">
        <tr>
            <td class="meta-label">اسم المدرسة:</td>
            <td style="font-weight: bold; color: #0f172a; width: 32%;">{{ $school['schoolName'] ?? '—' }}</td>
            <td class="meta-label">رمز المدرسة:</td>
            <td style="font-family: monospace; width: 32%;">{{ $school['schoolCode'] ?? '—' }}</td>
        </tr>
        <tr>
            <td class="meta-label">المحافظة / النطاق:</td>
            <td>{{ $school['governorate'] ?? '—' }}</td>
            <td class="meta-label">تاريخ الإصدار:</td>
            <td>{{ now()->format('Y-m-d H:i') }}</td>
        </tr>
        <tr>
            <td class="meta-label">الدورة الأساس (الحالية):</td>
            <td>{{ $baseCycle['name'] ?? $baseCycle['academicYear'] }} ({{ $baseCycle['versionNo'] ?? '2026.1' }})</td>
            <td class="meta-label">الدورة المقارنة (السابقة):</td>
            <td>{{ $comparedCycle['name'] ?? $comparedCycle['academicYear'] }} ({{ $comparedCycle['versionNo'] ?? '2026.1' }})</td>
        </tr>
    </table>

    @if (!empty($isVersionMismatch) && !empty($versionNotice))
        <div class="notice-box">
            <strong>قاعدة الحوكمة (BR-GEN-05):</strong> {{ $versionNotice }}
        </div>
    @endif

    <table class="kpi-table">
        <tr>
            <td style="width: 25%; padding-left: 4px;">
                <div class="kpi-card" style="border-top: 3px solid #2563eb;">
                    <div class="kpi-title">المعدل العام (الدورة السابقة)</div>
                    <div class="kpi-val" style="color: #475569;">{{ number_format($trajectory['previousTotalScore'] ?? 0, 2) }} / 3.0</div>
                </div>
            </td>
            <td style="width: 25%; padding: 0 4px;">
                <div class="kpi-card" style="border-top: 3px solid #059669;">
                    <div class="kpi-title">المعدل العام (الدورة الحالية)</div>
                    <div class="kpi-val" style="color: #047857;">{{ number_format($trajectory['currentTotalScore'] ?? 0, 2) }} / 3.0</div>
                </div>
            </td>
            <td style="width: 25%; padding: 0 4px;">
                <div class="kpi-card" style="border-top: 3px solid #10b981;">
                    <div class="kpi-title">صافي الفارق التراكمي</div>
                    <div class="kpi-val" style="color: {{ ($trajectory['netDelta'] ?? 0) >= 0 ? '#047857' : '#b91c1c' }};">
                        {{ ($trajectory['netDelta'] ?? 0) >= 0 ? '+' : '' }}{{ number_format($trajectory['netDelta'] ?? 0, 2) }}
                    </div>
                </div>
            </td>
            <td style="width: 25%; padding-right: 4px;">
                <div class="kpi-card" style="border-top: 3px solid #8b5cf6;">
                    <div class="kpi-title">حركة المؤشرات (تحسن / تراجع)</div>
                    <div class="kpi-val" style="font-size: 11pt;">
                        <span style="color: #047857;">▲ {{ $trajectory['improvedCount'] ?? 0 }}</span>
                        &nbsp;|&nbsp;
                        <span style="color: #b91c1c;">▼ {{ $trajectory['regressedCount'] ?? 0 }}</span>
                        &nbsp;|&nbsp;
                        <span style="color: #475569;">= {{ $trajectory['maintainedCount'] ?? 0 }}</span>
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <div class="section-title">أولاً: مصفوفة المقارنة التراكمية للمعايير الوطنية الرئيسية السبعة</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 6%; text-align: center;">م</th>
                <th style="width: 38%;">المعيار الوطني الرئيسي</th>
                <th style="width: 10%; text-align: center;">الوزن النسبي</th>
                <th style="width: 15%; text-align: center;">الدورة السابقة</th>
                <th style="width: 15%; text-align: center;">الدورة الحالية</th>
                <th style="width: 16%; text-align: center;">الفارق والاتجاه (Delta)</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($standardsDeltas as $idx => $std)
                <tr style="{{ $idx % 2 == 1 ? 'background-color: #fafbfc;' : '' }}">
                    <td style="text-align: center; font-weight: bold;">{{ $idx + 1 }}</td>
                    <td style="font-weight: bold; color: #0f172a;">{{ $std['name'] }}</td>
                    <td style="text-align: center; color: #64748b;">{{ $std['weight'] }}%</td>
                    <td style="text-align: center; color: #475569;">{{ number_format($std['previousScore'], 2) }} / 3.0</td>
                    <td style="text-align: center; font-weight: bold; color: #0f172a;">{{ number_format($std['currentScore'], 2) }} / 3.0</td>
                    <td style="text-align: center;">
                        @if ($std['delta'] > 0)
                            <span class="badge-up">▲ +{{ number_format($std['delta'], 2) }}</span>
                        @elseif ($std['delta'] < 0)
                            <span class="badge-down">▼ {{ number_format($std['delta'], 2) }}</span>
                        @else
                            <span class="badge-same">= 0.00</span>
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr style="background-color: #eff6ff; font-weight: bold;">
                <td colspan="3" style="text-align: right; padding: 6px 10px; color: #1e40af;">المتوسط العام التراكمي للمدرسة</td>
                <td style="text-align: center; color: #475569;">{{ number_format($trajectory['previousTotalScore'] ?? 0, 2) }} / 3.0</td>
                <td style="text-align: center; color: #1e40af;">{{ number_format($trajectory['currentTotalScore'] ?? 0, 2) }} / 3.0</td>
                <td style="text-align: center; color: {{ ($trajectory['netDelta'] ?? 0) >= 0 ? '#047857' : '#b91c1c' }};">
                    {{ ($trajectory['netDelta'] ?? 0) >= 0 ? '+' : '' }}{{ number_format($trajectory['netDelta'] ?? 0, 2) }}
                </td>
            </tr>
        </tfoot>
    </table>

    @if (!empty($allIndicatorsDeltas) && count($allIndicatorsDeltas) > 0)
        <div class="section-title">ثانياً: عينة المؤشرات ذات الأثر الأكبر (المتحسنة والمتراجعة)</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 12%; text-align: center;">رمز المؤشر</th>
                    <th style="width: 48%;">عنوان المؤشر التفصيلي</th>
                    <th style="width: 13%; text-align: center;">الدورة السابقة</th>
                    <th style="width: 13%; text-align: center;">الدورة الحالية</th>
                    <th style="width: 14%; text-align: center;">مسار التغير</th>
                </tr>
            </thead>
            <tbody>
                @php
                    $notableIndicators = collect($allIndicatorsDeltas)
                        ->filter(fn($i) => ($i['delta'] ?? 0) != 0)
                        ->sortByDesc(fn($i) => abs($i['delta'] ?? 0))
                        ->take(15);
                @endphp
                @foreach ($notableIndicators as $ind)
                    <tr>
                        <td style="text-align: center; font-family: monospace; font-weight: bold;">{{ $ind['code'] }}</td>
                        <td>{{ $ind['name'] }}</td>
                        <td style="text-align: center;">{{ $ind['previousScore'] }} / 3</td>
                        <td style="text-align: center; font-weight: bold;">{{ $ind['currentScore'] }} / 3</td>
                        <td style="text-align: center;">
                            @if (($ind['delta'] ?? 0) > 0)
                                <span class="badge-up">تحسن (+{{ $ind['delta'] }})</span>
                            @elseif (($ind['delta'] ?? 0) < 0)
                                <span class="badge-down">تراجع ({{ $ind['delta'] }})</span>
                            @else
                                <span class="badge-same">ثبات</span>
                            @endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <div class="footer-note">
        <strong>ضوابط الحوكمة المعتمدة (BR-MIN-03):</strong>
        يقتصر هذا التقرير على أغراض الفحص والتدقيق والمتابعة الإدارية لمسار النمو المدرسي ومقارنة التقييم الذاتي الداخلي عبر الدورات، ولا يترتب عليه أي قرار اعتماد خارجي أو تغيير في النتائج الرسمية للمدرسة.
    </div>
</body>
</html>
