<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>وثيقة الختم الرقمي وإشعار التسليم والاعتماد الميداني - {{ $school['school_name'] }}</title>
    <style>
        @page {
            margin-top: 12mm;
            margin-bottom: 10mm;
            margin-left: 12mm;
            margin-right: 12mm;
        }
        body {
            font-family: 'amiri', 'dejavusans', sans-serif;
            direction: rtl;
            text-align: right;
            color: #0f172a;
            font-size: 11pt;
            line-height: 1.5;
        }
        .header-table {
            width: 100%;
            border-bottom: 3px double #0f766e;
            padding-bottom: 10px;
            margin-bottom: 16px;
        }
        .header-title {
            text-align: center;
        }
        .header-title h1 {
            color: #0f766e;
            font-size: 17pt;
            margin: 0;
            padding: 0;
        }
        .header-title h2 {
            color: #334155;
            font-size: 12pt;
            margin: 4px 0 0 0;
            font-weight: normal;
        }
        .seal-badge {
            background-color: #ecfdf5;
            border: 2px solid #059669;
            color: #065f46;
            text-align: center;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 18px;
            font-size: 13pt;
            font-weight: bold;
        }
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
        }
        .meta-table td {
            padding: 8px 12px;
            font-size: 10.5pt;
            border-bottom: 1px solid #e2e8f0;
        }
        .meta-label {
            font-weight: bold;
            color: #475569;
            width: 25%;
            background-color: #f1f5f9;
        }
        .hash-box {
            background-color: #f1f5f9;
            border: 1px solid #94a3b8;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 16px;
            font-family: 'dejavusansmono', monospace;
            font-size: 9.5pt;
            word-break: break-all;
            direction: ltr;
            text-align: left;
            color: #0f172a;
        }
        .governance-notice {
            background-color: #fffbeb;
            border: 1px solid #fde68a;
            border-right: 5px solid #d97706;
            padding: 12px 14px;
            font-size: 10pt;
            color: #92400e;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        .signatures-table {
            width: 100%;
            margin-top: 24px;
            border-collapse: collapse;
        }
        .signatures-table td {
            width: 33.33%;
            text-align: center;
            vertical-align: top;
            padding: 10px;
        }
        .sign-title {
            font-weight: bold;
            font-size: 10.5pt;
            color: #334155;
            margin-bottom: 40px;
        }
        .sign-line {
            border-top: 1px dashed #64748b;
            padding-top: 4px;
            font-size: 9.5pt;
            color: #475569;
        }
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td style="width: 25%; text-align: right; vertical-align: middle;">
                <div style="font-size: 9pt; color: #475569;">
                    المملكة العربية السعودية<br>
                    وزارة التعليم<br>
                    الإدارة العامة لضمان الجودة
                </div>
            </td>
            <td class="header-title" style="width: 50%; vertical-align: middle;">
                <h1>منصة ارتقاء للتقويم المدرسي</h1>
                <h2>شهادة الختم الرقمي وإشعار التسليم الرسمي</h2>
            </td>
            <td style="width: 25%; text-align: left; vertical-align: middle;">
                <barcode code="{{ $tracking_code }}" type="C128A" class="barcode" size="1.0" height="0.8" />
                <div style="font-size: 8pt; font-family: 'dejavusansmono', monospace; color: #64748b; margin-top: 2px; text-align: center;">
                    {{ $tracking_code }}
                </div>
            </td>
        </tr>
    </table>

    <div class="seal-badge">
        ✓ تم الاعتماد والتسليم الميداني الرسمي وإقفال التقييم الذاتي
    </div>

    <table class="meta-table">
        <tr>
            <td class="meta-label">اسم المنشأة التعليمية:</td>
            <td style="font-weight: bold; color: #0f172a;">{{ $school['school_name'] }}</td>
            <td class="meta-label">الرقم الوزاري (الإحصائي):</td>
            <td>{{ $school['school_code'] }}</td>
        </tr>
        <tr>
            <td class="meta-label">العام الدراسي والدورة:</td>
            <td>{{ $cycle['academic_year'] }} — {{ $cycle['cycle_name'] }}</td>
            <td class="meta-label">المرحلة / الجنس:</td>
            <td>{{ $school['stage'] ?? 'التعليم العام' }} / {{ $school['gender'] ?? 'مشترك' }}</td>
        </tr>
        <tr>
            <td class="meta-label">تاريخ ووقت التسليم:</td>
            <td>{{ $submitted_at }}</td>
            <td class="meta-label">رقم المحاولة:</td>
            <td>المحاولة رقم {{ $attempt_no }}</td>
        </tr>
        <tr>
            <td class="meta-label">رمز التتبع الوطني المعتمد:</td>
            <td colspan="3" style="font-weight: bold; color: #0369a1; font-family: 'dejavusansmono', monospace; font-size: 12pt;">
                {{ $tracking_code }}
            </td>
        </tr>
    </table>

    <div style="font-size: 10pt; font-weight: bold; color: #334155; margin-bottom: 4px;">
        البصمة الرقمية للبيانات المعتمدة (Cryptographic Digest - SHA-256):
    </div>
    <div class="hash-box">
        {{ $digital_hash }}
    </div>

    <div class="governance-notice">
        <strong>إشعار الحوكمة وضمان النزاهة التوثيقية (Non-Repudiation):</strong><br>
        هذه الوثيقة صادرة آلياً بموجب إقرار مسؤول التقييم المعتمد ومدير المدرسة، وتثبت خضوع كافة التقديرات والشواهد والأدلة المرفقة للبصمة الرقمية المشفرة الموضحة أعلاه. يُعد هذا الإشعار مستنداً رسمياً ملزماً يُحظر التعديل عليه، ويمكن التحقق من صحته عبر مسح رمز الاستجابة السريعة (QR) أو إدخال رمز التتبع الوطني في البوابة الرسمية.
    </div>

    <table class="signatures-table">
        <tr>
            <td>
                <div class="sign-title">مسؤول التقييم الذاتي المعتمد</div>
                <div class="sign-line">{{ $evaluator_name }}</div>
            </td>
            <td>
                <div class="sign-title">مدير / مديرة المدرسة</div>
                <div class="sign-line">{{ $principal_name }}</div>
            </td>
            <td>
                <div class="sign-title">المشرف الوزاري المتابع</div>
                <div class="sign-line">الإدارة العامة لضمان الجودة والاعتماد</div>
            </td>
        </tr>
    </table>

</body>
</html>
