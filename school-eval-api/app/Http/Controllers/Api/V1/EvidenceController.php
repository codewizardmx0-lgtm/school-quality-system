<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Attachment;
use App\Models\EvaluationResult;
use App\Models\Evidence;
use App\Models\EvidenceVersion;
use App\Services\EvaluationLockChecker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * متحكم إدارة الشواهد والأدلة الداعمة ونسخها التاريخية ومرفقاتها (EvidenceController).
 *
 * القواعد المعمارية:
 * 1. العزل المؤسسي: أي شاهد أو نتيجة تخص مدرسة أخرى يرجع 404 Not Found (القرار 9).
 * 2. قفل التقييم (BR-SCH-03): التحقق عبر EvaluationLockChecker.
 * 3. المرفقات عبر attachments: UUID للملف المخزن مع الاحتفاظ بالاسم الأصلي وMIME والحجم (conventions §9).
 * 4. النسخة الحالية الواحدة: فرض current=true واحدة فقط داخل DB::transaction.
 */
class EvidenceController extends Controller
{
    /**
     * استعراض قائمة شواهد نتيجة مؤشر محدد مع نسخها ومرفقاتها دون كشف مسار التخزين.
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
            ])
            ->orderBy('evidence_id', 'desc')
            ->get();

        $data = $evidences->map(function ($evidence) {
            return [
                'evidenceId'    => $evidence->evidence_id,
                'resultId'      => $evidence->result_id,
                'indicatorId'   => $evidence->indicator_id,
                'title'         => $evidence->title,
                'description'   => $evidence->description,
                'justification' => $evidence->justification,
                'createdAt'     => $evidence->created_at?->toIso8601ZuluString(),
                'versions'      => $evidence->versions->map(function ($version) {
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
            ];
        });

        return ApiResponse::success(
            data: $data,
            message: null
        );
    }

    /**
     * إنشاء شاهد جديد لنتيجة مؤشر محدد مع أول نسخة ومرفق له.
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

        // فحص قفل التقييم
        $lockCheck = EvaluationLockChecker::canModifyIndicator($evaluation, $result->indicator_id);
        if (!$lockCheck['allowed']) {
            return ApiResponse::validationError([
                'evaluation' => [$lockCheck['message']],
            ], $lockCheck['message']);
        }

        // التحقق من المدخلات والمرفق
        $validator = Validator::make($request->all(), [
            'title'         => ['required', 'string', 'max:200'],
            'description'   => ['nullable', 'string'],
            'justification' => ['nullable', 'string'],
            'file'          => [
                'required',
                'file',
                'max:10240', // 10MB
                'mimes:pdf,png,jpg,jpeg,docx,xlsx',
            ],
        ], [
            'title.required' => 'عنوان الشاهد إلزامي.',
            'title.max'      => 'لا يمكن أن يتجاوز عنوان الشاهد 200 حرف.',
            'file.required'  => 'الملف المرفق للشاهد إلزامي.',
            'file.max'       => 'الحد الأقصى لحجم الملف هو 10 ميغابايت (conventions §9).',
            'file.mimes'     => 'صيغة الملف غير مدعومة. الصيغ المسموحة: pdf, png, jpg, jpeg, docx, xlsx.',
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

        $evidenceRecord = DB::transaction(function () use ($request, $result, $file, $originalName, $storedPath) {
            // 1. إنشاء سجل الشاهد
            $evidence = Evidence::create([
                'result_id'     => $result->result_id,
                'indicator_id'  => $result->indicator_id,
                'title'         => $request->input('title'),
                'description'   => $request->input('description'),
                'justification' => $request->input('justification'),
            ]);

            // 2. إنشاء أول نسخة تاريخية (current = true)
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

        return ApiResponse::success(
            data: [
                'evidenceId'     => $evidenceRecord['evidence']->evidence_id,
                'resultId'       => $evidenceRecord['evidence']->result_id,
                'indicatorId'    => $evidenceRecord['evidence']->indicator_id,
                'title'          => $evidenceRecord['evidence']->title,
                'description'    => $evidenceRecord['evidence']->description,
                'justification'  => $evidenceRecord['evidence']->justification,
                'createdAt'      => $evidenceRecord['evidence']->created_at?->toIso8601ZuluString(),
                'currentVersion' => [
                    'evidenceVersionId' => $evidenceRecord['version']->evidence_version_id,
                    'versionNo'         => $evidenceRecord['version']->version_no,
                    'current'           => (bool) $evidenceRecord['version']->current,
                    'createdAt'         => $evidenceRecord['version']->created_at?->toIso8601ZuluString(),
                    'attachment'        => [
                        'attachmentId' => $evidenceRecord['attachment']->attachment_id,
                        'fileName'     => $evidenceRecord['attachment']->file_name,
                        'fileType'     => $evidenceRecord['attachment']->file_type,
                        'fileSize'     => (int) $evidenceRecord['attachment']->file_size,
                    ],
                ],
            ],
            message: 'تم إضافة الشاهد ورفع ملفه بنجاح.',
            status: 201
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
            return ApiResponse::validationError([
                'evaluation' => [$lockCheck['message']],
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
}
