<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Attachment;
use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\Evidence;
use App\Models\EvidenceVersion;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\IndicatorScoreDescriptor;
use App\Models\School;
use App\Models\Standard;
use App\Services\EvaluationLockChecker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * متحكم إدارة الشواهد والأدلة الداعمة ونسخها وتنظيمها وتصنيفها (EvidenceController).
 *
 * القواعد المعمارية:
 * 1. العزل المؤسسي: أي شاهد أو نتيجة تخص مدرسة أخرى يرجع 404 Not Found (القرار المعماري 9).
 * 2. قفل التقييم (BR-SCH-03): التحقق عبر EvaluationLockChecker وإرجاع 422 عند محاولة التعديل في تقييم مقفل.
 * 3. المرفقات عبر attachments: UUID للملف المخزن مع الاحتفاظ بالاسم الأصلي وMIME والحجم (conventions §9).
 * 4. النسخة الحالية الواحدة: فرض current=true واحدة فقط داخل DB::transaction.
 * 5. تنظيم وتصنيف وتدقيق الشواهد (الشريحة 5): التصنيف اليدوي، الربط اليدوي بالمؤشر، ضبط الحالة، وملاحظات المراجع.
 */
class EvidenceController extends Controller
{
    /**
     * استعراض قائمة شواهد نتيجة مؤشر محدد مع نسخها ومرفقاتها وملاحظات التدقيق.
     *
     * GET /api/v1/evaluation-results/{id}/evidences
     * الصلاحية: evaluations.view أو evidence.manage
     */
    public function indexByResult(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('evaluations.view') && !$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض الشواهد.');
        }

        $result = EvaluationResult::with('evaluation')->find($id);
        if (!$result || !$result->evaluation) {
            return ApiResponse::notFound('نتيجة المؤشر المطلوبة غير موجودة.');
        }

        $evaluation = $result->evaluation;

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('نتيجة المؤشر المطلوبة غير موجودة.');
        }

        if ($user->cannot('view', $evaluation)) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض شواهد هذا التقييم.');
        }

        $evidences = Evidence::where('result_id', $result->result_id)
            ->with([
                'versions' => function ($q) {
                    $q->orderBy('version_no', 'desc');
                },
                'versions.attachments',
                'reviewer',
            ])
            ->orderBy('evidence_id', 'desc')
            ->get();

        $data = $evidences->map(function ($evidence) {
            return $this->formatEvidence($evidence);
        });

        return ApiResponse::success(
            data: $data,
            message: null
        );
    }

    /**
     * استعراض قائمة جميع الشواهد النشطة المرتبطة بمؤشر محدد داخل ملف التقييم مع نسخها النشطة ومرفقاتها وملاحظات التدقيق.
     *
     * GET /api/v1/evaluations/{id}/indicators/{indicatorId}/evidences
     * أو GET /api/v1/schools/{school}/assessments/{assessment}/indicators/{indicatorId}/evidences
     * الصلاحية: evaluations.view أو evidence.manage
     */
    public function indexByIndicator(Request $request, int $id, int $indicatorId, ?int $thirdParam = null): JsonResponse
    {
        $evalId = $thirdParam !== null ? $indicatorId : $id;
        $actualIndicatorId = $thirdParam !== null ? $thirdParam : $indicatorId;
        $schoolId = $thirdParam !== null ? $id : null;

        $user = $request->user();

        if (!$user->hasPermission('evaluations.view') && !$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض الشواهد.');
        }

        $evaluation = Evaluation::with(['cycle', 'school'])->find($evalId);
        if (!$evaluation || ($schoolId !== null && (int) $evaluation->school_id !== (int) $schoolId)) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        if ($user->cannot('view', $evaluation)) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض شواهد هذا التقييم.');
        }

        $indicator = Indicator::with('subStandard.standard')
            ->where('indicator_id', $actualIndicatorId)
            ->where('status', 'Active')
            ->first();

        if (!$indicator) {
            return ApiResponse::notFound('المؤشر المطلوب غير موجود أو غير فعّال.');
        }

        // التحقق من أن دورة التقييم مرتبطة بإصدار معياري معتمد
        $evaluation->loadMissing('cycle');
        $versionId = (int) ($evaluation->cycle?->standard_version_id ?? $evaluation->cycle?->version_id);
        if (!$versionId) {
            return ApiResponse::validationError([
                'cycle' => ['دورة التقييم غير مرتبطة بإصدار معياري معتمد.'],
            ], 'دورة التقييم غير مرتبطة بإصدار معياري معتمد.');
        }

        if ((int) $indicator->subStandard?->standard?->version_id !== $versionId) {
            return ApiResponse::validationError([
                'indicator' => ['المؤشر لا ينتمي للإصدار المعياري المعتمد لدورة التقييم.'],
            ], 'المؤشر لا ينتمي للإصدار المعياري المعتمد لدورة التقييم.');
        }

        // جلب سجل النتيجة للمؤشر في هذا التقييم
        $result = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->where('indicator_id', $actualIndicatorId)
            ->first();

        if (!$result) {
            return ApiResponse::success(
                data: [],
                message: 'لا توجد شواهد مرفوعة لهذا المؤشر بعد.'
            );
        }

        $evidences = Evidence::where('result_id', $result->result_id)
            ->with([
                'versions' => function ($q) {
                    $q->orderBy('version_no', 'desc');
                },
                'versions.attachments',
                'reviewer',
            ])
            ->orderBy('evidence_id', 'desc')
            ->get();

        $data = $evidences->map(function ($evidence) {
            return $this->formatEvidence($evidence);
        });

        return ApiResponse::success(
            data: $data,
            message: 'تم استرجاع قائمة الشواهد بنجاح.'
        );
    }

    /**
     * إنشاء شاهد جديد (أول أو إضافي) لمؤشر محدد داخل ملف التقييم دون استبدال الشواهد السابقة.
     *
     * POST /api/v1/evaluations/{id}/indicators/{indicatorId}/evidences
     * أو POST /api/v1/schools/{school}/assessments/{assessment}/indicators/{indicatorId}/evidences
     * الصلاحية: evidence.manage
     */
    public function storeByIndicator(Request $request, int $id, int $indicatorId, ?int $thirdParam = null): JsonResponse
    {
        $evalId = $thirdParam !== null ? $indicatorId : $id;
        $actualIndicatorId = $thirdParam !== null ? $thirdParam : $indicatorId;
        $schoolId = $thirdParam !== null ? $id : null;

        $user = $request->user();

        if (!$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بإدارة الشواهد.');
        }

        $evaluation = Evaluation::with(['cycle', 'school'])->find($evalId);
        if (!$evaluation || ($schoolId !== null && (int) $evaluation->school_id !== (int) $schoolId)) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        // فحص قفل التقييم للمؤشر (BR-SCH-03)
        $lockCheck = EvaluationLockChecker::canModifyIndicator($evaluation, $actualIndicatorId);
        if (!$lockCheck['allowed']) {
            $key = $lockCheck['errorKey'] ?? 'evaluation';
            return ApiResponse::validationError([
                $key => [$lockCheck['message']],
            ], $lockCheck['message']);
        }

        $indicator = Indicator::with('subStandard.standard')
            ->where('indicator_id', $actualIndicatorId)
            ->where('status', 'Active')
            ->first();

        if (!$indicator) {
            return ApiResponse::notFound('المؤشر المطلوب غير موجود أو غير فعّال.');
        }

        // التحقق من أن دورة التقييم مرتبطة بإصدار معياري معتمد
        $evaluation->loadMissing('cycle');
        $versionId = (int) ($evaluation->cycle?->standard_version_id ?? $evaluation->cycle?->version_id);
        if (!$versionId) {
            return ApiResponse::validationError([
                'cycle' => ['دورة التقييم غير مرتبطة بإصدار معياري معتمد.'],
            ], 'دورة التقييم غير مرتبطة بإصدار معياري معتمد.');
        }

        if ((int) $indicator->subStandard?->standard?->version_id !== $versionId) {
            return ApiResponse::validationError([
                'indicator' => ['المؤشر لا ينتمي للإصدار المعياري المعتمد لدورة التقييم.'],
            ], 'المؤشر لا ينتمي للإصدار المعياري المعتمد لدورة التقييم.');
        }

        // جلب سجل النتيجة أو إنشاؤه تلقائياً
        $result = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->where('indicator_id', $actualIndicatorId)
            ->first();

        if (!$result) {
            $descriptor = IndicatorScoreDescriptor::where('indicator_id', $actualIndicatorId)
                ->where('standard_version_id', $versionId)
                ->whereHas('scoreLevel', function ($q) {
                    $q->where('score_value', 0);
                })
                ->first();

            if (!$descriptor) {
                return ApiResponse::validationError([
                    'descriptor' => ['تعذر إنشاء النتيجة التلقائية: لا توجد واصفة تقييم معتمدة للدرجة (0) لهذا المؤشر في هذا الإصدار المعياري.'],
                ], 'تعذر إنشاء النتيجة التلقائية لعدم وجود واصفة تقييم معتمدة للدرجة (0) لهذا المؤشر في هذا الإصدار المعياري.');
            }

            $result = EvaluationResult::create([
                'evaluation_id'       => $evaluation->evaluation_id,
                'indicator_id'        => $actualIndicatorId,
                'score_descriptor_id' => $descriptor->descriptor_id,
                'standard_version_id' => $versionId,
                'evaluator_user_id'   => $user->user_id,
                'score'               => 0,
                'textual_result'      => null,
                'completion_status'   => 'Pending',
            ]);
        }

        return $this->createEvidenceForRecord($request, $result);
    }

    /**
     * إنشاء شاهد جديد لنتيجة مؤشر محدد مع أول نسخة ومرفق له وتصنيفه اليدوي.
     *
     * POST /api/v1/evaluation-results/{id}/evidences
     * الصلاحية: evidence.manage
     */
    public function store(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بإدارة الشواهد.');
        }

        $result = EvaluationResult::with('evaluation')->find($id);
        if (!$result || !$result->evaluation) {
            return ApiResponse::notFound('نتيجة المؤشر المطلوبة غير موجودة.');
        }

        $evaluation = $result->evaluation;

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('نتيجة المؤشر المطلوبة غير موجودة.');
        }

        // فحص قفل التقييم وإغلاق الدورة (BR-SCH-03 / FR-SCH-01)
        $lockCheck = EvaluationLockChecker::canModifyIndicator($evaluation, $result->indicator_id);
        if (!$lockCheck['allowed']) {
            $key = $lockCheck['errorKey'] ?? 'evaluation';
            return ApiResponse::validationError([
                $key => [$lockCheck['message']],
            ], $lockCheck['message']);
        }

        return $this->createEvidenceForRecord($request, $result);
    }

    /**
     * منطق التحقق وإنشاء الشاهد ونسخته الأولى ومرفقه لسجل نتيجة محدد.
     */
    protected function createEvidenceForRecord(Request $request, EvaluationResult $result): JsonResponse
    {
        // التحقق من المدخلات والمرفق والتصنيف
        $validator = Validator::make($request->all(), [
            'title'         => ['required', 'string', 'max:200'],
            'description'   => ['nullable', 'string'],
            'justification' => ['nullable', 'string'],
            'evidence_type' => ['nullable', 'string', 'in:minutes,plan,record,report,board,image,other'],
            'evidenceType'  => ['nullable', 'string', 'in:minutes,plan,record,report,board,image,other'],
            'file'          => [
                'required',
                'file',
                'max:10240', // 10MB
                'mimes:pdf,png,jpg,jpeg,docx,xlsx',
            ],
        ], [
            'title.required'     => 'عنوان الشاهد إلزامي.',
            'title.max'          => 'لا يمكن أن يتجاوز عنوان الشاهد 200 حرف.',
            'file.required'      => 'الملف المرفق للشاهد إلزامي.',
            'file.max'           => 'الحد الأقصى لحجم الملف هو 10 ميغابايت (conventions §9).',
            'file.mimes'         => 'صيغة الملف غير مدعومة. الصيغ المسموحة: pdf, png, jpg, jpeg, docx, xlsx.',
            'evidence_type.in'   => 'نوع الشاهد غير صالح. الأنواع المقبولة: minutes, plan, record, report, board, image, other.',
            'evidenceType.in'    => 'نوع الشاهد غير صالح. الأنواع المقبولة: minutes, plan, record, report, board, image, other.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $evidenceType = $request->input('evidence_type', $request->input('evidenceType', 'other')) ?: 'other';

        $file = $request->file('file');
        $uuid = (string) Str::uuid();
        $originalName = $file->getClientOriginalName();
        $ext = $file->getClientOriginalExtension();
        $storageFileName = "{$uuid}." . ($ext ?: 'bin');
        $storedPath = $file->storeAs('attachments/evidence', $storageFileName, 'local');

        $evidenceRecord = DB::transaction(function () use ($request, $result, $evidenceType, $file, $originalName, $storedPath) {
            // 1. إنشاء سجل الشاهد (كل شاهد ينشأ ككيان مستقل)
            $evidence = Evidence::create([
                'result_id'     => $result->result_id,
                'indicator_id'  => $result->indicator_id,
                'title'         => $request->input('title'),
                'description'   => $request->input('description'),
                'justification' => $request->input('justification'),
                'evidence_type' => $evidenceType,
                'status'        => 'Draft',
            ]);

            // 2. إنشاء أول نسخة تاريخية للشاهد الجديد (current = true لهذا الشاهد)
            $version = EvidenceVersion::create([
                'evidence_id' => $evidence->evidence_id,
                'version_no'  => 1,
                'current'     => true,
            ]);

            // 3. إنشاء المرفق متعدد الأشكال
            $attachment = Attachment::create([
                'target_type' => 'evidence_version',
                'target_id'   => $version->evidence_version_id,
                'file_name'   => $originalName,
                'file_type'   => $file->getMimeType(),
                'file_size'   => $file->getSize(),
                'storage_uri' => $storedPath,
            ]);

            return [
                'evidence'   => $evidence,
                'version'    => $version,
                'attachment' => $attachment,
            ];
        });

        $formatted = $this->formatEvidence($evidenceRecord['evidence']);

        return ApiResponse::success(
            data: $formatted,
            message: 'تم إضافة الشاهد ورفع ملفه بنجاح.',
            status: 201
        );
    }

    /**
     * تصنيف الشاهد يدوياً من قبل المستخدم (نوع الشاهد: محضر، خطة، سجل، تقرير، لوحة، صورة، أخرى).
     *
     * PATCH /api/v1/evidences/{id}/classify
     * الصلاحية: evidence.manage
     */
    public function classify(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بإدارة الشواهد.');
        }

        $evidence = Evidence::with('result.evaluation')->find($id);
        if (!$evidence || !$evidence->result || !$evidence->result->evaluation) {
            return ApiResponse::notFound('الشاهد المطلوب غير موجود.');
        }

        $evaluation = $evidence->result->evaluation;

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('الشاهد المطلوب غير موجود.');
        }

        // فحص قفل التقييم للشاهد (BR-SCH-03)
        $lockCheck = EvaluationLockChecker::canModifyEvidence($evaluation, $evidence);
        if (!$lockCheck['allowed']) {
            $key = $lockCheck['errorKey'] ?? 'evaluation';
            return ApiResponse::validationError([
                $key => [$lockCheck['message']],
            ], $lockCheck['message']);
        }

        $validator = Validator::make($request->all(), [
            'evidence_type' => ['required_without:evidenceType', 'string', 'in:minutes,plan,record,report,board,image,other'],
            'evidenceType'  => ['required_without:evidence_type', 'string', 'in:minutes,plan,record,report,board,image,other'],
        ], [
            'evidence_type.required_without' => 'نوع الشاهد إلزامي.',
            'evidenceType.required_without'  => 'نوع الشاهد إلزامي.',
            'evidence_type.in'               => 'نوع الشاهد غير صالح. الأنواع المقبولة: minutes, plan, record, report, board, image, other.',
            'evidenceType.in'                => 'نوع الشاهد غير صالح. الأنواع المقبولة: minutes, plan, record, report, board, image, other.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $type = $request->input('evidence_type', $request->input('evidenceType'));
        $evidence->update(['evidence_type' => $type]);

        return ApiResponse::success(
            data: $this->formatEvidence($evidence),
            message: 'تم تصنيف الشاهد بنجاح.'
        );
    }

    /**
     * ربط الشاهد بالمؤشر الصحيح يدوياً مع تأكيد المستخدم.
     *
     * POST/PATCH /api/v1/evidences/{id}/link-indicator
     * الصلاحية: evidence.manage
     */
    public function linkIndicator(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بإدارة الشواهد.');
        }

        $evidence = Evidence::with('result.evaluation.cycle')->find($id);
        if (!$evidence || !$evidence->result || !$evidence->result->evaluation) {
            return ApiResponse::notFound('الشاهد المطلوب غير موجود.');
        }

        $evaluation = $evidence->result->evaluation;

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('الشاهد المطلوب غير موجود.');
        }

        // فحص قفل التقييم للشاهد (BR-SCH-03)
        $lockCheck = EvaluationLockChecker::canModifyEvidence($evaluation, $evidence);
        if (!$lockCheck['allowed']) {
            $key = $lockCheck['errorKey'] ?? 'evaluation';
            return ApiResponse::validationError([
                $key => [$lockCheck['message']],
            ], $lockCheck['message']);
        }

        $validator = Validator::make($request->all(), [
            'indicator_id' => ['required_without:indicatorId', 'integer'],
            'indicatorId'  => ['required_without:indicator_id', 'integer'],
        ], [
            'indicator_id.required_without' => 'معرّف المؤشر المستهدف إلزامي.',
            'indicatorId.required_without'  => 'معرّف المؤشر المستهدف إلزامي.',
            'indicator_id.integer'          => 'معرّف المؤشر يجب أن يكون رقماً صحيحاً.',
            'indicatorId.integer'           => 'معرّف المؤشر يجب أن يكون رقماً صحيحاً.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $targetIndicatorId = (int) $request->input('indicator_id', $request->input('indicatorId'));

        $targetIndicator = Indicator::with('subStandard.standard')
            ->where('indicator_id', $targetIndicatorId)
            ->where('status', 'Active')
            ->first();

        if (!$targetIndicator) {
            return ApiResponse::validationError([
                'indicator_id' => ['المؤشر المستهدف غير موجود أو غير فعّال.'],
            ]);
        }

        // التحقق من أن دورة التقييم مرتبطة بإصدار معياري معتمد
        $evaluation->loadMissing('cycle');
        $versionId = (int) ($evaluation->cycle?->standard_version_id ?? $evaluation->cycle?->version_id);
        if (!$versionId) {
            return ApiResponse::validationError([
                'cycle' => ['دورة التقييم غير مرتبطة بإصدار معياري معتمد.'],
            ], 'دورة التقييم غير مرتبطة بإصدار معياري معتمد.');
        }

        if ((int) $targetIndicator->subStandard?->standard?->version_id !== $versionId) {
            return ApiResponse::validationError([
                'indicator_id' => ['المؤشر المستهدف لا ينتمي للإصدار المعياري المعتمد لدورة التقييم.'],
            ], 'المؤشر المستهدف لا ينتمي للإصدار المعياري المعتمد لدورة التقييم.');
        }

        // إذا كان الشاهد مرتبطاً بالفعل بنفس المؤشر
        if ((int) $evidence->indicator_id === $targetIndicatorId) {
            return ApiResponse::success(
                data: $this->formatEvidence($evidence),
                message: 'الشاهد مرتبط بالفعل بهذا المؤشر.'
            );
        }

        // فحص قفل التعديل للمؤشر الجديد المستهدف (BR-SCH-03)
        $targetLockCheck = EvaluationLockChecker::canModifyIndicator($evaluation, $targetIndicatorId);
        if (!$targetLockCheck['allowed']) {
            $key = $targetLockCheck['errorKey'] ?? 'evaluation';
            return ApiResponse::validationError([
                $key => [$targetLockCheck['message']],
            ], $targetLockCheck['message']);
        }

        // البحث عن نتيجة التقييم للمؤشر المستهدف في نفس ملف التقييم أو إنشاؤها
        $targetResult = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->where('indicator_id', $targetIndicatorId)
            ->first();

        if (!$targetResult) {
            $descriptor = IndicatorScoreDescriptor::where('indicator_id', $targetIndicatorId)
                ->where('standard_version_id', $versionId)
                ->whereHas('scoreLevel', function ($q) {
                    $q->where('score_value', 0);
                })
                ->first();

            if (!$descriptor) {
                return ApiResponse::validationError([
                    'descriptor' => ['تعذر إنشاء النتيجة التلقائية: لا توجد واصفة تقييم معتمدة للدرجة (0) للمؤشر المستهدف في هذا الإصدار المعياري.'],
                ], 'تعذر إنشاء النتيجة التلقائية لعدم وجود واصفة تقييم معتمدة للدرجة (0) للمؤشر المستهدف في هذا الإصدار المعياري.');
            }

            $targetResult = EvaluationResult::create([
                'evaluation_id'       => $evaluation->evaluation_id,
                'indicator_id'        => $targetIndicatorId,
                'score_descriptor_id' => $descriptor->descriptor_id,
                'standard_version_id' => $versionId,
                'evaluator_user_id'   => $user->user_id,
                'score'               => 0,
                'textual_result'      => null,
                'completion_status'   => 'Pending',
            ]);
        }

        $oldResult = $evidence->result;

        DB::transaction(function () use ($evidence, $targetIndicatorId, $targetResult, $oldResult) {
            // تحديث ربط الشاهد بالمؤشر والنتيجة الجديدة
            $evidence->update([
                'indicator_id' => $targetIndicatorId,
                'result_id'    => $targetResult->result_id,
            ]);

            // تنظيف النتيجة السابقة إذا كانت Pending واستوفت كافة شروط الحذف
            if ($oldResult && (int) $oldResult->result_id !== (int) $targetResult->result_id) {
                $isPending = ($oldResult->completion_status === 'Pending');
                $hasNoEvidence = ($oldResult->evidences()->count() === 0);
                $hasNoNotes = ($oldResult->notes()->count() === 0);
                $hasNoVerificationTools = (DB::table('evaluation_result_verification_methods')
                    ->where('evaluation_result_id', $oldResult->result_id)
                    ->count() === 0);
                $hasNoTextualResult = empty($oldResult->textual_result);

                if ($isPending && $hasNoEvidence && $hasNoNotes && $hasNoVerificationTools && $hasNoTextualResult) {
                    $oldResult->delete();
                }
            }
        });

        $evidence->refresh();

        return ApiResponse::success(
            data: $this->formatEvidence($evidence),
            message: 'تم ربط الشاهد بالمؤشر بنجاح.'
        );
    }

    /**
     * تحديد وتحديث حالة الشاهد (مسودة Draft، مكتمل Completed، مدقق ومقبول Audited).
     *
     * PATCH /api/v1/evidences/{id}/status
     * الصلاحية: evidence.manage
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بإدارة الشواهد.');
        }

        $evidence = Evidence::with('result.evaluation')->find($id);
        if (!$evidence || !$evidence->result || !$evidence->result->evaluation) {
            return ApiResponse::notFound('الشاهد المطلوب غير موجود.');
        }

        $evaluation = $evidence->result->evaluation;

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('الشاهد المطلوب غير موجود.');
        }

        // فحص قفل التقييم للشاهد (BR-SCH-03)
        $lockCheck = EvaluationLockChecker::canModifyEvidence($evaluation, $evidence);
        if (!$lockCheck['allowed']) {
            $key = $lockCheck['errorKey'] ?? 'evaluation';
            return ApiResponse::validationError([
                $key => [$lockCheck['message']],
            ], $lockCheck['message']);
        }

        $rawStatus = (string) $request->input('status');
        $statusMap = [
            'draft'     => 'Draft',
            'completed' => 'Completed',
            'audited'   => 'Audited',
        ];

        $normalizedStatus = $statusMap[strtolower(trim($rawStatus))] ?? null;

        if (!$normalizedStatus) {
            return ApiResponse::validationError([
                'status' => ['حالة الشاهد غير صالحة. الحالات المقبولة: Draft, Completed, Audited.'],
            ]);
        }

        $evidence->update(['status' => $normalizedStatus]);

        return ApiResponse::success(
            data: $this->formatEvidence($evidence),
            message: 'تم تحديث حالة الشاهد بنجاح.'
        );
    }

    /**
     * إضافة ملاحظات المراجع أو المقيم على الشاهد يدوياً وتوثيق هوية المراجع ووقته.
     *
     * POST/PATCH /api/v1/evidences/{id}/review-notes
     * الصلاحية: reviews.write أو evidence.manage
     */
    public function addReviewNote(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('reviews.write') && !$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بتسجيل ملاحظات المراجعة.');
        }

        $evidence = Evidence::with('result.evaluation')->find($id);
        if (!$evidence || !$evidence->result || !$evidence->result->evaluation) {
            return ApiResponse::notFound('الشاهد المطلوب غير موجود.');
        }

        $evaluation = $evidence->result->evaluation;

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('الشاهد المطلوب غير موجود.');
        }

        // فحص قفل التقييم للشاهد (BR-SCH-03)
        $lockCheck = EvaluationLockChecker::canModifyEvidence($evaluation, $evidence);
        if (!$lockCheck['allowed']) {
            $key = $lockCheck['errorKey'] ?? 'evaluation';
            return ApiResponse::validationError([
                $key => [$lockCheck['message']],
            ], $lockCheck['message']);
        }

        $note = $request->input('notes', $request->input('reviewer_notes', $request->input('reviewerNotes')));

        if (empty($note) || !is_string($note) || trim($note) === '') {
            return ApiResponse::validationError([
                'notes' => ['نص ملاحظات المراجع إلزامي.'],
            ]);
        }

        if (mb_strlen($note) > 2000) {
            return ApiResponse::validationError([
                'notes' => ['لا يمكن أن تتجاوز ملاحظات المراجع 2000 حرف.'],
            ]);
        }

        $evidence->update([
            'reviewer_notes'      => trim($note),
            'reviewed_by_user_id' => $user->user_id,
            'reviewed_at'         => now(),
        ]);

        $evidence->load('reviewer');

        return ApiResponse::success(
            data: $this->formatEvidence($evidence),
            message: 'تمت إضافة ملاحظات المراجع على الشاهد بنجاح.'
        );
    }

    /**
     * حصر الشواهد لكل مؤشر وإظهار النواقص والمكتمل للتقييم.
     *
     * GET /api/v1/evaluations/{id}/evidence-inventory
     * أو GET /api/v1/schools/{school}/assessments/{assessment}/evidence-inventory
     * الصلاحية: evaluations.view أو evidence.manage
     */
    public function inventory(Request $request, int $id, ?int $assessment = null): JsonResponse
    {
        $evalId = $assessment ?? $id;
        $schoolId = $assessment !== null ? $id : null;

        $user = $request->user();

        if (!$user->hasPermission('evaluations.view') && !$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض جرد الشواهد.');
        }

        $evaluation = Evaluation::with(['cycle', 'school'])->find($evalId);
        if (!$evaluation || ($schoolId !== null && (int) $evaluation->school_id !== (int) $schoolId)) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        if ($user->cannot('view', $evaluation)) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض شواهد هذا التقييم.');
        }

        // التحقق من أن دورة التقييم مرتبطة بإصدار معياري معتمد
        $evaluation->loadMissing(['cycle', 'school']);
        $versionId = (int) ($evaluation->cycle?->standard_version_id ?? $evaluation->cycle?->version_id);
        if (!$versionId) {
            return ApiResponse::validationError([
                'cycle' => ['دورة التقييم غير مرتبطة بإصدار معياري معتمد.'],
            ], 'دورة التقييم غير مرتبطة بإصدار معياري معتمد.');
        }

        /** @var \App\Services\EvidenceSufficiencyService $sufficiencyService */
        $sufficiencyService = app(\App\Services\EvidenceSufficiencyService::class);
        $sufficiency = $sufficiencyService->evaluateEvaluation($evaluation);

        $standardsBreakdown = [];
        foreach ($sufficiency['standards'] as $std) {
            $stdIndicatorsList = [];
            foreach ($std['indicators'] as $ind) {
                $stdIndicatorsList[] = [
                    'indicatorId'            => $ind['indicator_id'],
                    'indicatorCode'          => $ind['code'],
                    'indicatorName'          => $ind['name'],
                    'domainName'             => $ind['domain_name'],
                    'mandatoryRequiredCount' => $ind['mandatory_required_count'],
                    'totalRequiredCount'     => $ind['total_required_count'],
                    'uploadedEvidenceCount'  => $ind['uploaded_evidence_count'],
                    'validEvidenceCount'     => $ind['valid_evidence_count'],
                    'draftEvidenceCount'     => $ind['draft_evidence_count'],
                    'completionRate'         => $ind['completion_rate'],
                    'completion_rate'        => $ind['completion_rate'],
                    'isSufficient'           => $ind['is_sufficient'],
                    'status'                 => $ind['status'],
                    'evidences'              => $ind['evidences']->map(function ($ev) {
                        return [
                            'evidenceId'    => $ev->evidence_id,
                            'title'         => $ev->title,
                            'evidenceType'  => $ev->evidence_type,
                            'status'        => $ev->status,
                            'reviewerNotes' => $ev->reviewer_notes,
                            'reviewedBy'    => $ev->reviewer?->full_name,
                            'reviewedAt'    => $ev->reviewed_at?->toIso8601ZuluString(),
                            'createdAt'     => $ev->created_at?->toIso8601ZuluString(),
                            'versionsCount' => $ev->versions->count(),
                        ];
                    })->values(),
                ];
            }

            $standardsBreakdown[] = [
                'standardId'             => $std['standard_id'],
                'standardCode'           => $std['standard_code'],
                'standardName'           => $std['standard_name'],
                'mandatoryRequiredCount' => $std['mandatory_required_count'],
                'uploadedEvidenceCount'  => $std['uploaded_evidence_count'],
                'validEvidenceCount'     => $std['valid_evidence_count'],
                'draftEvidenceCount'     => $std['draft_evidence_count'],
                'completionRate'         => $std['completion_rate'],
                'completion_rate'        => $std['completion_rate'],
                'indicators'             => $stdIndicatorsList,
            ];
        }

        return ApiResponse::success(
            data: [
                'evaluationId'                  => $evaluation->evaluation_id,
                'schoolId'                      => $evaluation->school_id,
                'schoolName'                    => $evaluation->school?->name,
                'inventoryStatus'               => $sufficiency['inventory_status'],
                'overallEvidenceCompletionRate' => $sufficiency['overall_evidence_completion_rate'],
                'completionRate'                => $sufficiency['overall_evidence_completion_rate'],
                'completion_rate'               => $sufficiency['overall_evidence_completion_rate'],
                'summary'         => [
                    'totalIndicators'                  => $sufficiency['total_indicators'],
                    'indicatorsWithSufficientEvidence' => $sufficiency['indicators_with_sufficient_evidence'],
                    'indicatorsMissingEvidence'        => $sufficiency['indicators_missing_evidence'],
                    'totalEvidencesUploaded'           => $sufficiency['total_uploaded_evidences'],
                    'totalValidEvidences'              => $sufficiency['total_valid_evidences'],
                    'totalDraftEvidences'              => $sufficiency['total_draft_evidences'],
                    'overallEvidenceCompletionRate'    => $sufficiency['overall_evidence_completion_rate'],
                    'completionRate'                   => $sufficiency['overall_evidence_completion_rate'],
                    'completion_rate'                  => $sufficiency['overall_evidence_completion_rate'],
                    'byType'                           => $sufficiency['by_type'],
                    'byStatus'                         => $sufficiency['by_status'],
                ],
                'standards'       => $standardsBreakdown,
            ],
            message: 'تم استخراج حصر الشواهد بنجاح.'
        );
    }

    /**
     * رفع نسخة جديدة لشاهد قائم مع الاحتفاظ بالنسخ السابقة وضمان current=true واحدة فقط.
     *
     * POST /api/v1/evidences/{id}/versions
     * الصلاحية: evidence.manage
     */
    public function addVersion(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بإدارة الشواهد.');
        }

        $evidence = Evidence::with('result.evaluation')->find($id);
        if (!$evidence || !$evidence->result || !$evidence->result->evaluation) {
            return ApiResponse::notFound('الشاهد المطلوب غير موجود.');
        }

        $evaluation = $evidence->result->evaluation;

        // عزل المدارس (القرار 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('الشاهد المطلوب غير موجود.');
        }

        // فحص قفل التقييم للشاهد (BR-SCH-03)
        $lockCheck = EvaluationLockChecker::canModifyEvidence($evaluation, $evidence);
        if (!$lockCheck['allowed']) {
            $key = $lockCheck['errorKey'] ?? 'evaluation';
            return ApiResponse::validationError([
                $key => [$lockCheck['message']],
            ], $lockCheck['message']);
        }

        $validator = Validator::make($request->all(), [
            'file' => [
                'required',
                'file',
                'max:10240', // 10MB
                'mimes:pdf,png,jpg,jpeg,docx,xlsx',
            ],
        ], [
            'file.required' => 'الملف المرفق للنسخة الجديدة إلزامي.',
            'file.max'      => 'الحد الأقصى لحجم الملف هو 10 ميغابايت.',
            'file.mimes'    => 'صيغة الملف غير مدعومة. الصيغ المسموحة: pdf, png, jpg, jpeg, docx, xlsx.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $file = $request->file('file');
        $uuid = (string) Str::uuid();
        $originalName = $file->getClientOriginalName();
        $ext = $file->getClientOriginalExtension();
        $storageFileName = "{$uuid}." . ($ext ?: 'bin');
        $storedPath = $file->storeAs('attachments/evidence', $storageFileName, 'local');

        $resultRecord = DB::transaction(function () use ($evidence, $file, $originalName, $storedPath) {
            // إلغاء تفعيل النسخ السابقة لتصبح current = false
            EvidenceVersion::where('evidence_id', $evidence->evidence_id)
                ->update(['current' => false]);

            // احتساب رقم النسخة التالي
            $maxVersion = (int) EvidenceVersion::where('evidence_id', $evidence->evidence_id)
                ->max('version_no');
            $nextVersionNo = $maxVersion + 1;

            // إنشاء النسخة الجديدة كـ current = true
            $newVersion = EvidenceVersion::create([
                'evidence_id' => $evidence->evidence_id,
                'version_no'  => $nextVersionNo,
                'current'     => true,
            ]);

            // إنشاء المرفق متعدد الأشكال
            $attachment = Attachment::create([
                'target_type' => 'evidence_version',
                'target_id'   => $newVersion->evidence_version_id,
                'file_name'   => $originalName,
                'file_type'   => $file->getMimeType(),
                'file_size'   => $file->getSize(),
                'storage_uri' => $storedPath,
            ]);

            return [
                'version'    => $newVersion,
                'attachment' => $attachment,
            ];
        });

        return ApiResponse::success(
            data: [
                'evidenceId'        => $evidence->evidence_id,
                'evidenceVersionId' => $resultRecord['version']->evidence_version_id,
                'versionNo'         => $resultRecord['version']->version_no,
                'current'           => (bool) $resultRecord['version']->current,
                'createdAt'         => $resultRecord['version']->created_at?->toIso8601ZuluString(),
                'attachment'        => [
                    'attachmentId' => $resultRecord['attachment']->attachment_id,
                    'fileName'     => $resultRecord['attachment']->file_name,
                    'fileType'     => $resultRecord['attachment']->file_type,
                    'fileSize'     => (int) $resultRecord['attachment']->file_size,
                ],
            ],
            message: 'تم رفع النسخة الجديدة للشاهد بنجاح.',
            status: 201
        );
    }

    /**
     * تنزيل المرفق الرقمي لنسخة شاهد محددة بالاسم الأصلي دون كشف مسار التخزين.
     *
     * GET /api/v1/evidences/{id}/versions/{versionId}/download
     * الصلاحية: evaluations.view أو evidence.manage
     */
    public function downloadVersion(Request $request, int $id, int $versionId): mixed
    {
        $user = $request->user();

        if (!$user->hasPermission('evaluations.view') && !$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بتحميل المرفق.');
        }

        $evidence = Evidence::with('result.evaluation')->find($id);
        if (!$evidence || !$evidence->result || !$evidence->result->evaluation) {
            return ApiResponse::notFound('الشاهد المطلوب غير موجود.');
        }

        $evaluation = $evidence->result->evaluation;

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('الشاهد المطلوب غير موجود.');
        }

        if ($user->cannot('view', $evaluation)) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض شواهد هذا التقييم.');
        }

        $version = EvidenceVersion::where('evidence_id', $evidence->evidence_id)
            ->where('evidence_version_id', $versionId)
            ->first();

        if (!$version) {
            return ApiResponse::notFound('نسخة الشاهد المطلوبة غير موجودة.');
        }

        $attachment = Attachment::where('target_type', 'evidence_version')
            ->where('target_id', $version->evidence_version_id)
            ->first();

        if (!$attachment) {
            return ApiResponse::notFound('المرفق المطلوب غير موجود.');
        }

        if (!Storage::disk('local')->exists($attachment->storage_uri)) {
            return ApiResponse::notFound('ملف المرفق غير موجود على الخادم.');
        }

        return Storage::disk('local')->download(
            $attachment->storage_uri,
            $attachment->file_name
        );
    }

    /**
     * تنسيق بيانات الشاهد لتطابق معايير واجهات برمجة التطبيقات (API Contract).
     */
    protected function formatEvidence(Evidence $evidence): array
    {
        $evidence->loadMissing(['versions.attachments', 'reviewer']);
        $currentVersion = $evidence->versions->firstWhere('current', true) ?? $evidence->versions->first();

        return [
            'evidenceId'     => $evidence->evidence_id,
            'resultId'       => $evidence->result_id,
            'indicatorId'    => $evidence->indicator_id,
            'title'          => $evidence->title,
            'description'    => $evidence->description,
            'justification'  => $evidence->justification,
            'evidenceType'   => $evidence->evidence_type ?: 'other',
            'status'         => $evidence->status ?: 'Draft',
            'reviewerNotes'  => $evidence->reviewer_notes,
            'reviewedBy'     => $evidence->reviewer ? [
                'userId'   => $evidence->reviewer->user_id,
                'fullName' => $evidence->reviewer->full_name,
            ] : null,
            'reviewedAt'     => $evidence->reviewed_at?->toIso8601ZuluString(),
            'createdAt'      => $evidence->created_at?->toIso8601ZuluString(),
            'versions'       => $evidence->versions->map(function ($version) {
                return [
                    'evidenceVersionId' => $version->evidence_version_id,
                    'versionNo'         => $version->version_no,
                    'current'           => (bool) $version->current,
                    'createdAt'         => $version->created_at?->toIso8601ZuluString(),
                    'attachments'       => $version->attachments->map(function ($att) {
                        return [
                            'attachmentId' => $att->attachment_id,
                            'fileName'     => $att->file_name,
                            'fileType'     => $att->file_type,
                            'fileSize'     => (int) $att->file_size,
                        ];
                    })->values(),
                ];
            })->values(),
            'currentVersion' => $currentVersion ? [
                'evidenceVersionId' => $currentVersion->evidence_version_id,
                'versionNo'         => $currentVersion->version_no,
                'current'           => (bool) $currentVersion->current,
                'createdAt'         => $currentVersion->created_at?->toIso8601ZuluString(),
                'attachment'        => $currentVersion->attachments->first() ? [
                    'attachmentId' => $currentVersion->attachments->first()->attachment_id,
                    'fileName'     => $currentVersion->attachments->first()->file_name,
                    'fileType'     => $currentVersion->attachments->first()->file_type,
                    'fileSize'     => (int) $currentVersion->attachments->first()->file_size,
                ] : null,
            ] : null,
        ];
    }
}
