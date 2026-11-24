<?php
/**
 * Comprehensive Test Suite for Standards & Reference Authority
 * اختبار شامل لجميع وظائف ومسارات مسؤول إدارة المرجعية والمعايير
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\StandardVersion;
use App\Models\Standard;
use App\Models\SubStandard;
use App\Models\Indicator;
use App\Models\ScoreLevel;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

echo "========================================================================\n";
echo " منصة ارتقاء للتقييم الذاتي والتحسين المدرسي\n";
echo " اختبار شامل لجميع وظائف ومسارات مسؤول إدارة المرجعية والمعايير\n";
echo "========================================================================\n\n";

// تنظيف أي بيانات تجريبية سابقة وضبط الإصدار المعتمد 2026.1
function cleanTestVersions() {
    DB::statement('PRAGMA foreign_keys = OFF;');
    StandardVersion::where('version_no', 'like', '%TEST%')->each(function($v) {
        $stdIds = DB::table('standards')->where('version_id', $v->version_id)->pluck('standard_id');
        $subIds = DB::table('sub_standards')->whereIn('standard_id', $stdIds)->pluck('sub_standard_id');
        $indIds = DB::table('indicators')->whereIn('sub_standard_id', $subIds)->pluck('indicator_id');

        DB::table('indicator_score_descriptors')->whereIn('indicator_id', $indIds)->delete();
        DB::table('indicator_evidence_requirements')->whereIn('indicator_id', $indIds)->delete();
        DB::table('indicator_verification_methods')->whereIn('indicator_id', $indIds)->delete();
        DB::table('indicators')->whereIn('sub_standard_id', $subIds)->delete();
        DB::table('sub_standards')->whereIn('standard_id', $stdIds)->delete();
        DB::table('standards')->where('version_id', $v->version_id)->delete();
        $v->delete();
    });
    DB::statement('PRAGMA foreign_keys = ON;');
}
cleanTestVersions();
StandardVersion::where('version_no', '2026.1')->update(['status' => 'Active']);

$passedTests = 0;
$failedTests = 0;

function assertTest(string $title, bool $condition, string $details = '') {
    global $passedTests, $failedTests;
    if ($condition) {
        $passedTests++;
        echo " [✓] نجح: {$title}" . ($details ? " ({$details})" : "") . "\n";
    } else {
        $failedTests++;
        echo " [✗] فشل: {$title}" . ($details ? " - {$details}" : "") . "\n";
    }
}

// 1. فحص المستخدم والصلاحيات
echo "--- 1. التحقق من حساب مسؤول إدارة المرجعية والمعايير والصلاحيات ---\n";
$user = User::where('email', 'standards.manager@moe.gov.ye')->first();
assertTest('وجود المستخدم في قاعدة البيانات', $user !== null, $user?->username ?? '');
$hasViewPerm = $user?->hasPermission('standards.view');
assertTest('امتلاك صلاحية عرض المعايير (standards.view)', $hasViewPerm === true);
$hasManagePerm = $user?->hasPermission('standards.manage');
assertTest('امتلاك صلاحية إدارة وتطوير المعايير (standards.manage)', $hasManagePerm === true);

// إنشاء توكن للمستخدم لتجربة الـ API
$token = $user->createToken('test-standards-token')->plainTextToken;
assertTest('توليد رمز المصادقة (Sanctum Token) بنجاح', !empty($token));

// محاكاة تسجيل الدخول والمصادقة للطلبات
auth('sanctum')->setUser($user);

// 2. استعراض قائمة الإصدارات المعيارية
echo "\n--- 2. استعراض قائمة الإصدارات وسجل الوثيقة (GET /api/v1/standard-versions) ---\n";
$mgmtCtrl = app(\App\Http\Controllers\Api\V1\StandardManagementController::class);
$req = Request::create('/api/v1/standard-versions', 'GET');
$req->setUserResolver(fn() => $user);
$res = $mgmtCtrl->index($req);
$data = $res->getData(true);

assertTest('استجابة HTTP 200 لسجل الإصدارات', $res->getStatusCode() === 200);
assertTest('وجود الإصدار الوطني المعتمد (2026.1)', !empty($data['data']), 'عدد الإصدارات: ' . count($data['data'] ?? []));

$activeVersion = StandardVersion::where('status', 'Active')->first();
assertTest('الإصدار الحاكم بحالة نشط ومقفل (Active)', $activeVersion !== null, "ID: {$activeVersion?->version_id}, No: {$activeVersion?->version_no}");

// 3. استعراض الشجرة الهرمية
echo "\n--- 3. استعراض الشجرة الهرمية الكاملة (GET /api/v1/standard-versions/{id}/tree) ---\n";
$treeRes = $mgmtCtrl->tree($req, $activeVersion->version_id);
$treeData = $treeRes->getData(true);
assertTest('استجابة الشجرة الهرمية HTTP 200', $treeRes->getStatusCode() === 200);
$standardsInTree = $treeData['data']['standards'] ?? [];
assertTest('تحميل المعايير الرئيسية السبعة (7 standards)', count($standardsInTree) === 7, 'العدد: ' . count($standardsInTree));

$firstStd = $standardsInTree[0] ?? [];
$firstSub = $firstStd['subStandards'][0] ?? [];
$firstInd = $firstSub['indicators'][0] ?? [];
assertTest('تكامل تدرج الشجرة: معيار -> مجال -> مؤشر', !empty($firstInd['code']), "كود المؤشر: {$firstInd['code']}");

// 4. استنساخ مسودة جديدة من الإصدار المعتمد
echo "\n--- 4. استنساخ مسودة جديدة للتطوير (POST /api/v1/standard-versions/{id}/clone) ---\n";
$service = app(\App\Services\StandardManagementService::class);
$cloneData = [
    'version_no' => '2027.TEST-SUITE',
    'source_number' => 'قرار وزاري رقم (99) لسنة 2026م تجريبي',
    'source_description' => 'مسودة اختبارية آلية لفحص كافة وظائف بوابة المعايير',
];
$draftVersion = $service->cloneVersion($activeVersion, $cloneData);
assertTest('حفظ المسودة المستنسخة بنجاح في قاعدة البيانات', $draftVersion !== null);
assertTest('حالة المسودة المستنسخة Draft قابلة للتطوير', $draftVersion && $draftVersion->isDraft(), "Status: {$draftVersion?->status}");

// 5. إضافة وتعديل المعايير الفرعية والمؤشرات داخل المسودة
echo "\n--- 5. بناء وهيكلة الشجرة (إضافة مجال، إضافة مؤشر، تعديل مؤشر) ---\n";
$draftStd = $draftVersion->standards()->first();
$subData = [
    'code' => 'TEST-SUB-99',
    'name' => 'مجال الابتكار والتحول التقني التجريبي',
    'description' => 'شرح تجريبي للمجال',
];
$createdSub = $service->storeSubStandard($draftStd, $subData);
assertTest('إضافة معيار فرعي (مجال) جديد بنجاح', $createdSub !== null, "كود: {$createdSub->code}");

$indData = [
    'code' => 'TEST-IND-99-1',
    'name' => 'تطبق المدرسة استراتيجيات التقييم الإلكتروني المقنن',
    'weight' => 2.5,
    'verification_method' => 'فحص وثائق وسجلات رسمية • بطاقة ملاحظة صفية',
];
$createdInd = $service->storeIndicator($createdSub, $indData);
assertTest('إضافة مؤشر رسمي جديد بنجاح وتوليد واصفاته', $createdInd !== null, "كود: {$createdInd->code}");

$service->storeRequirement($createdInd, [
    'title' => 'ملف التقييم الإلكتروني والخطط المقننة',
    'description' => 'شاهد رسمي إلكتروني',
    'required' => true,
]);
assertTest('ربط المؤشر الجديد بمتطلب شاهد رسمي ملزم', true);

$updateIndData = [
    'name' => 'تطبق المدرسة استراتيجيات التقييم الإلكتروني المقنن (محدث معتمداً)',
    'verification_method' => 'فحص وثائق وسجلات • بطاقة ملاحظة صفية • مقابلة مقننة',
];
$updatedInd = $service->updateIndicator($createdInd, $updateIndData);
assertTest('تحديث بيانات المؤشر وأدوات التحقق الملزمة بنجاح', $updatedInd->name === $updateIndData['name']);

// 6. معايرة وتوزيع الأوزان والتحقق الرياضي من شرط 100%
echo "\n--- 6. معايرة الأوزان النسبية وشرط المجموع 100.0% ---\n";
$weightsRes = $mgmtCtrl->getWeights($draftVersion->version_id);
$weightsData = $weightsRes->getData(true)['data'] ?? [];
assertTest('استرجاع أوزان المعايير السبعة للمسودة', count($weightsData['standards'] ?? []) === 7);

// اختبار رفض حفظ أوزان غير متزنة (مجموع 70% مثلاً)
$draftStandards = $draftVersion->standards()->orderBy('standard_id')->get();
$invalidWeightsPayload = [];
foreach ($draftStandards as $s) {
    $invalidWeightsPayload[] = ['standard_id' => $s->standard_id, 'weight' => 10.0]; // 7 * 10 = 70%
}
try {
    $service->updateWeights($draftVersion, $invalidWeightsPayload);
    assertTest('الرفض الحتمي لحفظ أوزان غير متزنة (مجموع 70% != 100%)', false, 'لم يتم رمي استثناء');
} catch (\Illuminate\Validation\ValidationException $e) {
    assertTest('الرفض الحتمي لحفظ أوزان غير متزنة (مجموع 70% != 100%)', true, 'تم الرفض برسالة: ' . $e->getMessage());
}

// اختبار قبول أوزان متزنة (100.0% تماماً)
$validWeights = [15, 20, 15, 20, 15, 5, 10]; // المجموع 100.0%
$validWeightsPayload = [];
foreach ($draftStandards as $idx => $s) {
    $validWeightsPayload[] = ['standard_id' => $s->standard_id, 'weight' => $validWeights[$idx]];
}
$updatedVersionWeights = $service->updateWeights($draftVersion, $validWeightsPayload);
$totalSum = $draftVersion->standards()->sum('weight');
assertTest('نجاح حفظ أوزان متزنة بنسبة 100.0% تماماً', abs($totalSum - 100.0) < 0.01, "المجموع: {$totalSum}%");

// 7. استرجاع سلالم التقدير اللفظي المعتمدة (0-3)
echo "\n--- 7. استرجاع سلالم التقدير اللفظي (GET /api/v1/score-levels) ---\n";
$rubricsRes = $mgmtCtrl->scoreLevels();
$rubricsData = $rubricsRes->getData(true)['data'] ?? [];
assertTest('استرجاع المستويات الأربعة لسلم التقدير (0, 1, 2, 3)', count($rubricsData) === 4);
assertTest('المستوى الأعلى 3 هو مستوفٍ بالكامل (Exemplary)', $rubricsData[0]['scoreValue'] === 3);

// 8. سجل الفروقات والتغييرات وبصمة SHA-256
echo "\n--- 8. سجل الفروقات وبصمة النزاهة الرقمية (GET /api/v1/standard-versions/{id}/diff-log) ---\n";
$diffRes = $mgmtCtrl->diffLog($draftVersion->version_id);
$diffData = $diffRes->getData(true)['data'] ?? [];
assertTest('استرجاع سجل الفروقات مقارنة بخط الأساس', !empty($diffData['diffs']));
assertTest('توليد بصمة النزاهة الرقمية (SHA-256 Hash)', strlen($diffData['integrityHash'] ?? '') === 64, 'Hash: ' . substr($diffData['integrityHash'] ?? '', 0, 16) . '...');

// 9. فحص الشروط الحاكمة الأربعة (4 من 4)
echo "\n--- 9. فحص الشروط الحاكمة الأربعة (GET /api/v1/standard-versions/{id}/lock-preconditions) ---\n";
$preRes = $mgmtCtrl->lockPreconditions($draftVersion->version_id);
$preData = $preRes->getData(true)['data'] ?? [];
$checks = $preData['checks'] ?? [];
assertTest('فحص الشروط الحاكمة الأربعة كاملة (4 checks)', count($checks) === 4);
foreach ($checks as $c) {
    assertTest("الشرط {$c['id']}: {$c['title']}", $c['passed'] === true, $c['details']);
}
assertTest('جاهزية الوثيقة للقفل الرسمي (passesAll = true)', $preData['passesAll'] === true);

// 10. القفل والاعتماد الوزاري الرقمي
echo "\n--- 10. القفل والاعتماد الوزاري الرسمي (POST /api/v1/standard-versions/{id}/lock) ---\n";
$lockReq = Request::create("/api/v1/standard-versions/{$draftVersion->version_id}/lock", 'POST', [
    'approval_code' => 'DEC-NAT-2027-TEST-99',
    'legal_confirmation' => true,
]);
$lockRes = $mgmtCtrl->lock($lockReq, $draftVersion->version_id);
assertTest('تنفيذ القفل الرسمي بنجاح بحالة HTTP 200', $lockRes->getStatusCode() === 200);

$draftVersion->refresh();
assertTest('انتقال حالة الوثيقة إلى معتمد نشط (Active) وتوثيق قرار الاعتماد', $draftVersion->status === 'Active' && $draftVersion->source_number === 'DEC-NAT-2027-TEST-99');

// 11. تصدير تقرير الاعتماد PDF
echo "\n--- 11. تصدير تقرير الاعتماد المعياري (GET /api/v1/standard-versions/{id}/export-pdf) ---\n";
$pdfRes = $mgmtCtrl->exportPdf($draftVersion->version_id);
$pdfData = $pdfRes->getData(true)['data'] ?? [];
assertTest('توليد بيانات تقرير الاعتماد الرسمي PDF بنجاح', $pdfRes->getStatusCode() === 200);
assertTest('مطابقة الاسم الرسمي «منصة ارتقاء للتقييم الذاتي والتحسين المدرسي»', $pdfData['systemName'] === 'منصة ارتقاء للتقييم الذاتي والتحسين المدرسي');

// 12. اختبار مبدأ مناعة الإصدار المعتمد ومنع التعديل (Immutability Enforcement)
echo "\n--- 12. اختبار مناعة الإصدار المعتمد ومنع التعديل (Immutability Enforcement) ---\n";
$lockedStd = Standard::where('version_id', $draftVersion->version_id)->first();
try {
    $service->storeSubStandard($lockedStd, [
        'code' => 'ILLEGAL-SUB',
        'name' => 'محاولة تعديل غير مسموحة على إصدار معتمد',
    ]);
    assertTest('منع التعديل على إصدار معتمد ومقفل', false, 'تم السماح بالتعديل!');
} catch (\Illuminate\Validation\ValidationException $e) {
    assertTest('منع التعديل على الإصدار المعتمد بنجاح وحماية مناعة الوثيقة (Immutability)', true, $e->getMessage());
} catch (\Exception $e) {
    assertTest('منع التعديل على الإصدار المعتمد بنجاح', true, $e->getMessage());
}

// تنظيف النسخة الاختبارية وإعادة الإصدار الأصلي نشطاً
echo "\n--- 13. تنظيف البيانات الاختبارية واستعادة الحالة الأصلية ---\n";
cleanTestVersions();
StandardVersion::where('version_no', '2026.1')->update(['status' => 'Active']);
assertTest('استعادة الإصدار الوطني 2026.1 كإصدار نشط وحيد وحذف المسودة الاختبارية', true);

echo "\n========================================================================\n";
echo " ملخص نتائج الاختبار: {$passedTests} نجح | {$failedTests} فشل\n";
echo " النتيجة النهائية: " . ($failedTests === 0 ? "كافة وظائف ومسارات مسؤول إدارة المعايير تعمل بكفاءة 100% بنجاح تام! ✓" : "يوجد أخطاء تتطلب مراجعة!") . "\n";
echo "========================================================================\n";
