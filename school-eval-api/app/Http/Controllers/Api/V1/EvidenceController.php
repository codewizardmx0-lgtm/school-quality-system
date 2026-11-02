<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Attachment;
use App\Models\DocumentVersion;
use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\Evidence;
use App\Models\EvidenceLink;
use App\Models\EvidenceVersion;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\IndicatorScoreDescriptor;
use App\Models\School;
use App\Models\SchoolDocument;
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

        // قراءة الشواهد أولاً من المعمارية الجديدة (EvidenceLink)
        $links = EvidenceLink::where('evaluation_result_id', $result->result_id)
            ->orWhere(function ($q) use ($result) {
                $q->where('evaluation_id', $result->evaluation_id)
                  ->where('indicator_id', $result->indicator_id);
            })
            ->with(['documentVersion.document'])
            ->orderBy('id', 'desc')
            ->get();

        if ($links->isNotEmpty()) {
            $data = $links->map(function ($link) {
                return $this->formatEvidenceLink($link);
            });

            return ApiResponse::success(
                data: $data,
                message: null
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

        // قراءة الشواهد أولاً من المعمارية الجديدة (EvidenceLink)
        $links = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
            ->where('indicator_id', $actualIndicatorId)
            ->with(['documentVersion.document'])
            ->orderBy('id', 'desc')
            ->get();

        if ($links->isNotEmpty()) {
            $data = $links->map(function ($link) {
                return $this->formatEvidenceLink($link);
            });

            return ApiResponse::success(
                data: $data,
                message: 'تم استرجاع قائمة الشواهد بنجاح.'
            );
        }

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
     * إنشاء شاهد جديد (مسار قديم مؤقت - محول للقراءة فقط في U-24 Step 2 وسيتم حذفه في الخطوة 3).
     *
     * POST /api/v1/evaluations/{id}/indicators/{indicatorId}/evidences
     */
    public function storeByIndicator(Request $request, int $id, int $indicatorId, ?int $thirdParam = null): JsonResponse
    {
        return ApiResponse::validationError([
            'evidence' => ['تم تحويل إدارة الشواهد إلى المعمارية الجديدة؛ مسارات الشواهد القديمة مغلقة ومؤقتة للقراءة فقط وسيتم حذفها في الخطوة 3. يرجى استخدام مسارات /evidence-links المعتمدة.'],
        ], 'تم إيقاف التعديل عبر مسارات الشواهد القديمة.');
    }

    /**
     * إنشاء شاهد جديد لنتيجة (مسار قديم مؤقت - محول للقراءة فقط في U-24 Step 2 وسيتم حذفه في الخطوة 3).
     *
     * POST /api/v1/evaluation-results/{id}/evidences
     */
    public function store(Request $request, int $id): JsonResponse
    {
        return ApiResponse::validationError([
            'evidence' => ['تم تحويل إدارة الشواهد إلى المعمارية الجديدة؛ مسارات الشواهد القديمة مغلقة ومؤقتة للقراءة فقط وسيتم حذفها في الخطوة 3. يرجى استخدام مسارات /evidence-links المعتمدة.'],
        ], 'تم إيقاف التعديل عبر مسارات الشواهد القديمة.');
    }

    /**
     * منطق التحقق القديم (معطل في U-24 Step 2).
     */
    protected function createEvidenceForRecord(Request $request, EvaluationResult $result): JsonResponse
    {
        return ApiResponse::validationError([
            'evidence' => ['تم إيقاف الإنشاء عبر المسار القديم.'],
        ], 'تم إيقاف الإنشاء عبر المسار القديم.');
    }

    /**
     * تصنيف الشاهد يدوياً (مسار قديم مؤقت - معطل في U-24 Step 2 وسيتم حذفه في الخطوة 3).
     *
     * PATCH /api/v1/evidences/{id}/classify
     */
    public function classify(Request $request, int $id): JsonResponse
    {
        return ApiResponse::validationError([
            'evidence' => ['تم تحويل إدارة الشواهد إلى المعمارية الجديدة؛ مسارات الشواهد القديمة مغلقة ومؤقتة للقراءة فقط وسيتم حذفها في الخطوة 3.'],
        ], 'تم إيقاف التعديل عبر مسارات الشواهد القديمة.');
    }

    /**
     * ربط الشاهد بالمؤشر (مسار قديم مؤقت - معطل في U-24 Step 2 وسيتم حذفه في الخطوة 3).
     *
     * POST/PATCH /api/v1/evidences/{id}/link-indicator
     */
    public function linkIndicator(Request $request, int $id): JsonResponse
    {
        return ApiResponse::validationError([
            'evidence' => ['تم تحويل إدارة الشواهد إلى المعمارية الجديدة؛ مسارات الشواهد القديمة مغلقة ومؤقتة للقراءة فقط وسيتم حذفها في الخطوة 3. يرجى استخدام POST /api/v1/evaluations/{id}/indicators/{indicatorId}/evidence-links.'],
        ], 'تم إيقاف التعديل عبر مسارات الشواهد القديمة.');
    }

    /**
     * تحديث حالة الشاهد (مسار قديم مؤقت - معطل في U-24 Step 2 وسيتم حذفه في الخطوة 3).
     *
     * PATCH /api/v1/evidences/{id}/status
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        return ApiResponse::validationError([
            'evidence' => ['تم تحويل إدارة الشواهد إلى المعمارية الجديدة؛ مسارات الشواهد القديمة مغلقة ومؤقتة للقراءة فقط وسيتم حذفها في الخطوة 3.'],
        ], 'تم إيقاف التعديل عبر مسارات الشواهد القديمة.');
    }

    /**
     * إضافة ملاحظات تدقيق الشاهد (مسار قديم مؤقت - معطل في U-24 Step 2 وسيتم حذفه في الخطوة 3).
     *
     * POST/PATCH /api/v1/evidences/{id}/review-notes
     */
    public function addReviewNote(Request $request, int $id): JsonResponse
    {
        return ApiResponse::validationError([
            'evidence' => ['تم تحويل إدارة الشواهد إلى المعمارية الجديدة؛ مسارات الشواهد القديمة مغلقة ومؤقتة للقراءة فقط وسيتم حذفها في الخطوة 3.'],
        ], 'تم إيقاف التعديل عبر مسارات الشواهد القديمة.');
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
     * رفع نسخة جديدة لشاهد (مسار قديم مؤقت - معطل في U-24 Step 2 وسيتم حذفه في الخطوة 3).
     *
     * POST /api/v1/evidences/{id}/versions
     */
    public function addVersion(Request $request, int $id): JsonResponse
    {
        return ApiResponse::validationError([
            'evidence' => ['تم تحويل إدارة الشواهد إلى المعمارية الجديدة؛ مسارات الشواهد القديمة مغلقة ومؤقتة للقراءة فقط وسيتم حذفها في الخطوة 3.'],
        ], 'تم إيقاف التعديل عبر مسارات الشواهد القديمة.');
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

    /**
     * استعراض مستندات المدرسة المتاحة للاختيار (U-24 Step 2).
     *
     * GET /api/v1/schools/{schoolId}/documents
     */
    public function schoolDocuments(Request $request, int $schoolId): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('evaluations.view') && !$user->hasPermission('evidence.manage') && !$user->hasPermission('school.view')) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض مستندات المدرسة.');
        }

        // العزل المؤسسي: لا يمكن لمستخدم مدرسة رؤية مستندات مدرسة أخرى (404)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $schoolId) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $school = School::find($schoolId);
        if (!$school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $query = SchoolDocument::query()
            ->where('school_id', $schoolId)
            ->with([
                'currentVersion',
                'creator:user_id,full_name,email',
            ])
            ->withCount(['versions', 'evidenceLinks']);

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('document_type')) {
            $query->where('document_type', $request->input('document_type'));
        }

        $documents = $query->orderBy('id', 'desc')->get();

        $data = $documents->map(function ($doc) {
            $ver = $doc->currentVersion;
            return [
                'id'                 => $doc->id,
                'schoolId'           => $doc->school_id,
                'title'              => $doc->title,
                'documentType'       => $doc->document_type,
                'description'        => $doc->description,
                'versionsCount'      => (int) $doc->versions_count,
                'evidenceLinksCount' => (int) $doc->evidence_links_count,
                'createdBy'          => $doc->creator ? [
                    'userId'   => $doc->creator->user_id,
                    'fullName' => $doc->creator->full_name,
                ] : null,
                'createdAt'          => $doc->created_at?->toIso8601ZuluString(),
                'currentVersion'     => $ver ? [
                    'id'          => $ver->id,
                    'versionNo'   => $ver->version_no,
                    'fileName'    => $ver->file_name,
                    'fileSize'    => (int) $ver->file_size,
                    'mimeType'    => $ver->mime_type,
                    'downloadUrl' => url("/api/v1/document-versions/{$ver->id}/download"),
                    'createdAt'   => $ver->created_at?->toIso8601ZuluString(),
                ] : null,
            ];
        });

        return ApiResponse::success($data, 'تم استرجاع مستندات المدرسة بنجاح.');
    }

    /**
     * اختيار مستند مدرسي موجود وربطه بمؤشر مع تبرير مستقل (U-24 Step 2).
     *
     * POST /api/v1/evaluations/{id}/indicators/{indicatorId}/evidence-links
     */
    public function linkExistingDocument(Request $request, int $id, int $indicatorId): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('evidence.manage') && !$user->hasPermission('evaluations.edit')) {
            return ApiResponse::forbidden('غير مصرح لك بربط الشواهد.');
        }

        $evaluation = Evaluation::find($id);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        // العزل المؤسسي: لا يمكن لمستخدم مدرسة الوصول لتقييم مدرسة أخرى (404)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        // قاعدة القفل: يُمنع التعديل والربط بعد التسليم أو القفل (422)
        $lockStatus = EvaluationLockChecker::canModifyIndicator($evaluation, $indicatorId);
        if (!$lockStatus['allowed']) {
            $msg = $lockStatus['message'] ?? 'ملف التقييم مقفل ولا يمكن ربط شواهد جديدة.';
            return ApiResponse::validationError(['evaluation' => [$msg]], $msg);
        }

        $indicator = Indicator::find($indicatorId);
        if (!$indicator) {
            return ApiResponse::notFound('المؤشر المطلوب غير موجود.');
        }

        $validator = Validator::make($request->all(), [
            'document_id'         => 'nullable|integer',
            'document_version_id' => 'nullable|integer',
            'justification'       => 'nullable|string|max:1000',
            'status'              => 'nullable|in:draft,completed',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray(), 'بيانات غير صالحة.');
        }

        if (!$request->filled('document_id') && !$request->filled('document_version_id')) {
            return ApiResponse::validationError([
                'document_id' => ['يجب تحديد المستند المدرسي أو رقم النسخة المراد ربطها.'],
            ], 'يجب تحديد المستند المطلوب ربطه.');
        }

        // تحديد النسخة والتحقق من العزل المؤسسي للمستند
        if ($request->filled('document_version_id')) {
            $version = DocumentVersion::with('document')->find($request->input('document_version_id'));
            if (!$version || (int) $version->school_id !== (int) $evaluation->school_id) {
                return ApiResponse::notFound('نسخة المستند المطلوبة غير موجودة.');
            }
        } else {
            $doc = SchoolDocument::with('currentVersion')->find($request->input('document_id'));
            if (!$doc || (int) $doc->school_id !== (int) $evaluation->school_id) {
                return ApiResponse::notFound('المستند المدرسي المطلوب غير موجود.');
            }
            $version = $doc->currentVersion ?? $doc->versions()->latest('version_no')->first();
            if (!$version) {
                return ApiResponse::validationError([
                    'document_id' => ['المستند المختار لا يحتوي على أي نسخة ملف مرفوعة.'],
                ], 'المستند غير صالح للربط.');
            }
        }

        // التحقق من عدم التكرار (Unique constraint: evaluation_id + indicator_id + document_version_id)
        $alreadyLinked = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
            ->where('indicator_id', $indicatorId)
            ->where('document_version_id', $version->id)
            ->exists();

        if ($alreadyLinked) {
            return ApiResponse::validationError([
                'document_version_id' => ['هذه النسخة من المستند مرتبطة بالفعل بهذا المؤشر داخل هذا التقييم.'],
            ], 'المستند مرتبط مسبقاً بهذا المؤشر.');
        }

        $result = EvaluationResult::firstOrCreate(
            ['evaluation_id' => $evaluation->evaluation_id, 'indicator_id' => $indicatorId],
            [
                'school_id' => $evaluation->school_id,
                'completion_status' => 'Draft',
            ]
        );

        $status = $request->input('status', EvidenceLink::STATUS_COMPLETED);

        $link = EvidenceLink::create([
            'school_id'            => $evaluation->school_id,
            'evaluation_id'        => $evaluation->evaluation_id,
            'evaluation_result_id' => $result->result_id,
            'indicator_id'         => $indicatorId,
            'document_version_id'  => $version->id,
            'justification'        => $request->input('justification'),
            'status'               => $status,
        ]);

        return ApiResponse::created($this->formatEvidenceLink($link), 'تم ربط المستند بالمؤشر بنجاح.');
    }

    /**
     * رفع مستند مدرسي جديد مع نسخته الأولى وربطه بمؤشر (U-24 Step 2).
     *
     * POST /api/v1/evaluations/{id}/indicators/{indicatorId}/evidence-links/upload
     */
    public function uploadAndLinkDocument(Request $request, int $id, int $indicatorId): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('evidence.manage') && !$user->hasPermission('evaluations.edit')) {
            return ApiResponse::forbidden('غير مصرح لك برفع وربط الشواهد.');
        }

        $evaluation = Evaluation::find($id);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        // العزل المؤسسي
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        // قاعدة القفل
        $lockStatus = EvaluationLockChecker::canModifyIndicator($evaluation, $indicatorId);
        if (!$lockStatus['allowed']) {
            $msg = $lockStatus['message'] ?? 'ملف التقييم مقفل بعد تسليمه ولا يمكن رفع شواهد جديدة.';
            return ApiResponse::validationError(['evaluation' => [$msg]], $msg);
        }

        $indicator = Indicator::find($indicatorId);
        if (!$indicator) {
            return ApiResponse::notFound('المؤشر المطلوب غير موجود.');
        }

        $validator = Validator::make($request->all(), [
            'title'         => 'required|string|max:255',
            'file'          => 'required|file|max:20480|mimes:pdf,png,jpg,jpeg,doc,docx,xls,xlsx',
            'document_type' => 'nullable|string|max:50',
            'description'   => 'nullable|string|max:2000',
            'justification' => 'nullable|string|max:1000',
            'status'        => 'nullable|in:draft,completed',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray(), 'بيانات غير صالحة أو الملف غير مطابق.');
        }

        $uploadedFile = $request->file('file');
        $status = $request->input('status', EvidenceLink::STATUS_COMPLETED);

        $link = DB::transaction(function () use ($request, $evaluation, $indicatorId, $user, $uploadedFile, $status) {
            $storagePath = $uploadedFile->store('school_documents/' . $evaluation->school_id, 'local');

            $doc = SchoolDocument::create([
                'school_id'          => $evaluation->school_id,
                'title'              => $request->input('title'),
                'document_type'      => $request->input('document_type', 'other'),
                'description'        => $request->input('description'),
                'created_by_user_id' => $user->user_id,
            ]);

            $version = DocumentVersion::create([
                'school_id'          => $evaluation->school_id,
                'school_document_id' => $doc->id,
                'version_no'         => 1,
                'is_current'         => true,
                'file_name'          => $uploadedFile->getClientOriginalName(),
                'storage_uri'        => $storagePath,
                'file_size'          => $uploadedFile->getSize(),
                'mime_type'          => $uploadedFile->getClientMimeType() ?: $uploadedFile->getMimeType(),
            ]);

            $result = EvaluationResult::firstOrCreate(
                ['evaluation_id' => $evaluation->evaluation_id, 'indicator_id' => $indicatorId],
                [
                    'school_id' => $evaluation->school_id,
                    'completion_status' => 'Draft',
                ]
            );

            return EvidenceLink::create([
                'school_id'            => $evaluation->school_id,
                'evaluation_id'        => $evaluation->evaluation_id,
                'evaluation_result_id' => $result->result_id,
                'indicator_id'         => $indicatorId,
                'document_version_id'  => $version->id,
                'justification'        => $request->input('justification'),
                'status'               => $status,
            ]);
        });

        return ApiResponse::created($this->formatEvidenceLink($link), 'تم رفع المستند وربطه بالمؤشر بنجاح.');
    }

    /**
     * استعراض روابط الشواهد المقترنة بمؤشر محدد في ملف التقييم (U-24 Step 2).
     *
     * GET /api/v1/evaluations/{id}/indicators/{indicatorId}/evidence-links
     */
    public function indexEvidenceLinks(Request $request, int $id, int $indicatorId): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('evaluations.view') && !$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض الشواهد.');
        }

        $evaluation = Evaluation::find($id);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        $links = EvidenceLink::query()
            ->where('evaluation_id', $id)
            ->where('indicator_id', $indicatorId)
            ->with(['documentVersion.document'])
            ->orderBy('id', 'desc')
            ->get();

        $data = $links->map(function ($link) {
            return $this->formatEvidenceLink($link);
        });

        return ApiResponse::success($data, 'تم استرجاع روابط شواهد المؤشر بنجاح.');
    }

    /**
     * فك ارتباط مستند بمؤشر دون حذف المستند أو نسخته (U-24 Step 2).
     *
     * DELETE /api/v1/evidence-links/{linkId}
     */
    public function unlinkEvidence(Request $request, int $linkId): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('evidence.manage') && !$user->hasPermission('evaluations.edit')) {
            return ApiResponse::forbidden('غير مصرح لك بفك ارتباط الشواهد.');
        }

        $link = EvidenceLink::with('evaluation')->find($linkId);
        if (!$link) {
            return ApiResponse::notFound('رابط الشاهد غير موجود.');
        }

        // العزل المؤسسي
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $link->school_id) {
            return ApiResponse::notFound('رابط الشاهد غير موجود.');
        }

        // قاعدة القفل
        if ($link->evaluation) {
            $lockStatus = EvaluationLockChecker::canModifyIndicator($link->evaluation, $link->indicator_id);
            if (!$lockStatus['allowed']) {
                $msg = $lockStatus['message'] ?? 'ملف التقييم مقفل بعد تسليمه ولا يمكن فك ارتباط الشواهد.';
                return ApiResponse::validationError(['evaluation' => [$msg]], $msg);
            }
        }

        $link->delete();

        return ApiResponse::success(null, 'تم فك ارتباط الشاهد بالمؤشر بنجاح دون حذف المستند الأصلي أو ملفه.');
    }

    /**
     * تحميل ملف نسخة المستند مع التحقق من العزل المؤسسي (U-24 Step 2).
     *
     * GET /api/v1/document-versions/{versionId}/download
     */
    public function downloadDocumentVersion(Request $request, int $versionId): mixed
    {
        $user = $request->user();

        if (!$user->hasPermission('evaluations.view') && !$user->hasPermission('evidence.manage') && !$user->hasPermission('school.view')) {
            return ApiResponse::forbidden('غير مصرح لك بتحميل الملف.');
        }

        $version = DocumentVersion::find($versionId);
        if (!$version) {
            return ApiResponse::notFound('نسخة المستند المطلوبة غير موجودة.');
        }

        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $version->school_id) {
            return ApiResponse::notFound('نسخة المستند المطلوبة غير موجودة.');
        }

        if (!Storage::disk('local')->exists($version->storage_uri)) {
            return ApiResponse::notFound('الملف الفيزيائي غير موجود في وحدة التخزين.');
        }

        return Storage::disk('local')->download($version->storage_uri, $version->file_name);
    }

    /**
     * تنسيق بيانات رابط الشاهد بصيغة موحدة (U-24 Step 2).
     *
     * @param EvidenceLink $link
     * @return array<string, mixed>
     */
    protected function formatEvidenceLink(EvidenceLink $link): array
    {
        $link->loadMissing(['documentVersion.document']);
        $version = $link->documentVersion;
        $doc = $version?->document;

        return [
            'id'                 => $link->id,
            'evidenceLinkId'     => $link->id,
            'schoolId'           => $link->school_id,
            'evaluationId'       => $link->evaluation_id,
            'evaluationResultId' => $link->evaluation_result_id,
            'indicatorId'        => $link->indicator_id,
            'documentVersionId'  => $link->document_version_id,
            'justification'      => $link->justification,
            'status'             => $link->status,
            'createdAt'          => $link->created_at?->toIso8601ZuluString(),
            'updatedAt'          => $link->updated_at?->toIso8601ZuluString(),
            'document'           => $doc ? [
                'id'           => $doc->id,
                'documentId'   => $doc->id,
                'title'        => $doc->title,
                'documentType' => $doc->document_type,
                'description'  => $doc->description,
            ] : null,
            'version'            => $version ? [
                'id'          => $version->id,
                'versionNo'   => $version->version_no,
                'isCurrent'   => (bool) $version->is_current,
                'fileName'    => $version->file_name,
                'fileSize'    => (int) $version->file_size,
                'mimeType'    => $version->mime_type,
                'downloadUrl' => url("/api/v1/document-versions/{$version->id}/download"),
                'createdAt'   => $version->created_at?->toIso8601ZuluString(),
            ] : null,
        ];
    }
}
