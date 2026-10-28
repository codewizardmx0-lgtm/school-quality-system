<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\EvaluationResource;
use App\Http\Responses\ApiResponse;
use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\Indicator;
use App\Models\IndicatorScoreDescriptor;
use App\Models\Note;
use App\Models\StandardVersion;
use App\Services\EvaluationLockChecker;
use App\Events\EvaluationSubmitted;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * متحكم استعراض ورصد عمليات التقييم المدرسي الذاتي وإدارة مؤشراته وملاحظاته.
 *
 * القواعد الأمنية:
 * 1. مستخدم مدرسة (بلقيس): لا يرى ولا يستعلم ولا يرصد إلا لتقييم مدرسة بلقيس حصراً.
 * 2. مستخدم مدرسة (الفاروق): لا يرى ولا يستعلم ولا يرصد إلا لتقييم مدرسة الفاروق حصراً.
 * 3. في حال محاولة مستخدم مدرسة طلب معرف تقييم يخص مدرسة أخرى يُرجع 404 (القرار المعماري 9).
 * 4. قفل التقييم (BR-SCH-03): يمنع التعديل بعد الإرسال النهائي عبر EvaluationLockChecker.
 * 5. مسؤول النظام: ممنوع من الدخول لمنطقة التقييم (فصل السلطات BR-GEN-06).
 */
class EvaluationController extends Controller
{
    /**
     * استعراض قائمة التقييمات وفق نطاق الفاعل المصادق.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // فحص صلاحية الاطلاع على التقييمات
        if (!$user->hasPermission('evaluations.view')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $query = Evaluation::with(['school', 'cycle', 'creator', 'results.indicator', 'results.scoreDescriptor', 'results.evidences']);

        // عزل النطاق لمستخدم المدرسة: حصر التقييمات بمدرسته فقط
        if ($user->user_type === 'school') {
            $query->where('school_id', $user->school_id);
        }

        $evaluations = $query->orderBy('evaluation_id', 'desc')->get();

        return ApiResponse::success(
            data: EvaluationResource::collection($evaluations)->resolve($request),
            message: null
        );
    }

    /**
     * استعراض ملف تقييم محدد مع التحقق الصارم من العزل.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('evaluations.view')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $evaluation = Evaluation::with(['school', 'cycle', 'creator', 'results.indicator', 'results.scoreDescriptor', 'results.evidences'])
            ->find($id);

        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        // قاعدة القرار 9: إذا كان مستخدم مدرسة وطلب تقييم مدرسة أخرى، يُرجع 404 بدلاً من 403 لمنع كشف وجود التقييم
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        // فحص السياسة المعتمدة
        if ($user->cannot('view', $evaluation)) {
            return ApiResponse::forbidden('غير مصرح');
        }

        return ApiResponse::success(
            data: (new EvaluationResource($evaluation))->resolve($request),
            message: null
        );
    }

    /**
     * استعراض شجرة المعايير والمؤشرات والواصفات لملف التقييم مع حالة الرصد ونسبة الإنجاز.
     *
     * GET /api/v1/evaluations/{id}/standards-tree
     * الصلاحية: standards.view أو evaluations.view
     */
    public function standardsTree(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('standards.view') && !$user->hasPermission('evaluations.view')) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض شجرة التقييم.');
        }

        $evaluation = Evaluation::with(['cycle', 'school'])->find($id);

        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        if ($user->cannot('view', $evaluation)) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $versionId = $evaluation->cycle?->version_id;
        $version = StandardVersion::with([
            'standards' => function ($q) {
                $q->orderBy('standard_id', 'asc');
            },
            'standards.subStandards' => function ($q) {
                $q->orderBy('sub_standard_id', 'asc');
            },
            'standards.subStandards.indicators' => function ($q) {
                $q->orderBy('indicator_id', 'asc');
            },
            'standards.subStandards.indicators.scoreDescriptors' => function ($q) {
                $q->orderBy('display_order', 'asc');
            },
            'standards.subStandards.indicators.scoreDescriptors.scoreLevel',
            'standards.subStandards.indicators.verificationTools',
            'standards.subStandards.indicators.evidenceRequirements' => function ($q) {
                $q->orderBy('display_order', 'asc');
            },
        ])->find($versionId);

        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري المرتبط بهذه الدورة غير موجود.');
        }

        // جلب نتائج التقييم المسجلة لهذه المدرسة ومفهرسة برقم المؤشر
        $existingResults = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->with([
                'scoreDescriptor',
                'evidences',
                'verificationTools',
                'notes' => function ($q) {
                    $q->orderBy('note_id', 'desc')->with('author');
                },
            ])
            ->get()
            ->keyBy('indicator_id');

        $totalActiveIndicators = 0;
        $completedResultsCount = 0;

        $standardsData = $version->standards->map(function ($std) use ($existingResults, &$totalActiveIndicators, &$completedResultsCount) {
            return [
                'standardId'   => $std->standard_id,
                'code'         => $std->code,
                'name'         => $std->name,
                'description'  => $std->description,
                'weight'       => (float) $std->weight,
                'subStandards' => $std->subStandards->map(function ($sub) use ($std, $existingResults, &$totalActiveIndicators, &$completedResultsCount) {
                    return [
                        'subStandardId' => $sub->sub_standard_id,
                        'code'          => $sub->code,
                        'name'          => $sub->name,
                        'description'   => $sub->description,
                        'indicators'    => $sub->indicators->map(function ($ind) use ($std, $sub, $existingResults, &$totalActiveIndicators, &$completedResultsCount) {
                            $isActive = $ind->status === 'Active';
                            if ($isActive) {
                                $totalActiveIndicators++;
                            }

                            $result = $existingResults->get($ind->indicator_id);
                            if ($result && $result->completion_status === 'Completed') {
                                $completedResultsCount++;
                            }

                            $notes = $result ? $result->notes->take(5)->map(function ($n) {
                                return [
                                    'noteId'       => $n->note_id,
                                    'text'         => $n->text,
                                    'authorUserId' => $n->author_user_id,
                                    'authorName'   => $n->author?->full_name ?? '',
                                    'createdAt'    => $n->created_at?->toIso8601ZuluString(),
                                ];
                            })->values()->all() : [];

                            return [
                                'indicatorId'            => $ind->indicator_id,
                                'code'                   => $ind->code,
                                'name'                   => $ind->name,
                                'description'            => $ind->description,
                                'standardName'           => $std->name,
                                'standardDescription'    => $std->description,
                                'subStandardName'        => $sub->name,
                                'subStandardDescription' => $sub->description,
                                'weight'                 => (float) $ind->weight,
                                'status'                 => $ind->status,
                                'resultId'               => $result?->result_id,
                                'score'                  => ($result && $result->completion_status === 'Completed') ? $result->score : null,
                                'scoreDescriptorId'      => ($result && $result->completion_status === 'Completed') ? $result->score_descriptor_id : null,
                                'scoreDescriptorLabel'   => ($result && $result->completion_status === 'Completed') ? $result->scoreDescriptor?->label : null,
                                'completionStatus'       => $result?->completion_status,
                                'textualResult'          => $result?->textual_result,
                                'evidenceCount'          => $result ? $result->evidences->count() : 0,
                                'notesCount'             => $result ? $result->notes->count() : 0,
                                'notes'                  => $notes,
                                'verificationToolIds'    => $result ? $result->verificationTools->pluck('tool_id')->all() : [],
                                'verificationTools'      => $ind->verificationTools->map(function ($tool) {
                                    return [
                                        'toolId'        => $tool->tool_id,
                                        'name'          => $tool->name,
                                        'toolType'      => $tool->tool_type,
                                        'required'      => (bool) $tool->pivot?->required,
                                        'usageGuidance' => $tool->pivot?->usage_guidance,
                                    ];
                                })->values(),
                                'evidenceRequirements'   => $ind->evidenceRequirements->map(function ($req) {
                                    return [
                                        'requirementId' => $req->requirement_id,
                                        'title'         => $req->title,
                                        'description'   => $req->description,
                                        'required'      => (bool) $req->required,
                                        'displayOrder'  => $req->display_order,
                                    ];
                                })->values(),
                                'scoreDescriptors'       => $ind->scoreDescriptors->map(function ($desc) {
                                    return [
                                        'descriptorId' => $desc->descriptor_id,
                                        'scoreLevelId' => $desc->score_level_id,
                                        'scoreValue'   => $desc->scoreLevel?->score_value,
                                        'label'        => $desc->label,
                                        'description'  => $desc->description,
                                        'displayOrder' => $desc->display_order,
                                    ];
                                }),
                            ];
                        }),
                    ];
                }),
            ];
        });

        $completionPercentage = $totalActiveIndicators > 0
            ? round(($completedResultsCount / $totalActiveIndicators) * 100, 2)
            : 0.0;

        return ApiResponse::success(
            data: [
                'evaluationId' => $evaluation->evaluation_id,
                'schoolId'     => $evaluation->school_id,
                'schoolName'   => $evaluation->school?->school_name,
                'cycleId'      => $evaluation->cycle_id,
                'academicYear' => $evaluation->cycle?->academic_year,
                'versionId'    => $version->version_id,
                'versionName'  => $version->version_name,
                'standards'    => $standardsData,
            ],
            message: null,
            meta: [
                'totalActiveIndicators' => $totalActiveIndicators,
                'completedResults'      => $completedResultsCount,
                'completionPercentage'  => $completionPercentage,
            ]
        );
    }

    /**
     * رصد أو تعديل نتيجة مؤشر (Upsert Score).
     *
     * PUT /api/v1/evaluations/{evaluationId}/indicators/{indicatorId}/score
     * الصلاحية: evaluations.edit
     */
    public function scoreIndicator(Request $request, int $evaluationId, int $indicatorId): JsonResponse
    {
        $user = $request->user();

        // فحص الصلاحية الأساسية
        if (!$user->hasPermission('evaluations.edit')) {
            return ApiResponse::forbidden('غير مصرح لك برصد نتائج التقييم.');
        }

        $evaluation = Evaluation::with('cycle')->find($evaluationId);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        if ($user->cannot('update', $evaluation)) {
            // التحقق مما إذا كان المنع بسبب قفل التقييم أو إغلاق الدورة
            $lockCheck = EvaluationLockChecker::canModifyIndicator($evaluation, $indicatorId);
            if (!$lockCheck['allowed']) {
                $key = $lockCheck['errorKey'] ?? 'evaluation';
                return ApiResponse::validationError([
                    $key => [$lockCheck['message']],
                ], $lockCheck['message']);
            }

            return ApiResponse::forbidden('غير مصرح لك بتعديل هذا التقييم.');
        }

        // فحص قفل التعديل الدقيق (BR-SCH-03 / FR-SCH-01)
        $lockCheck = EvaluationLockChecker::canModifyIndicator($evaluation, $indicatorId);
        if (!$lockCheck['allowed']) {
            $key = $lockCheck['errorKey'] ?? 'evaluation';
            return ApiResponse::validationError([
                $key => [$lockCheck['message']],
            ], $lockCheck['message']);
        }

        // التحقق من صحة المدخلات
        $validator = Validator::make($request->all(), [
            'score'             => ['required', 'integer', 'between:0,3'],
            'scoreDescriptorId' => ['nullable', 'integer'],
            'score_descriptor_id' => ['nullable', 'integer'],
            'textualResult'     => ['nullable', 'string'],
            'textual_result'    => ['nullable', 'string'],
        ], [
            'score.required' => 'تقدير المؤشر إلزامي.',
            'score.between'  => 'يجب أن يكون التقدير بين 0 و 3 وفق معيار الرصد (BR-SCH-05).',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $score = (int) $request->input('score');
        $descriptorId = $request->input('scoreDescriptorId') ?? $request->input('score_descriptor_id');
        $textualResult = $request->input('textualResult') ?? $request->input('textual_result');

        // التحقق من أدوات التحقق المقررة للمؤشر (FR-SCH-13)
        $toolIds = $request->input('verificationToolIds') ?? $request->input('verification_tool_ids');
        if ($toolIds !== null) {
            if (!is_array($toolIds)) {
                return ApiResponse::validationError([
                    'verificationToolIds' => ['يجب أن تكون أدوات التحقق مصفوفة من المعرفات.'],
                ]);
            }

            foreach ($toolIds as $tId) {
                if (!is_numeric($tId)) {
                    return ApiResponse::validationError([
                        'verificationToolIds' => ['يجب أن تكون معرّفات أدوات التحقق أرقاماً صحيحة.'],
                    ]);
                }
            }

            // أدوات التحقق المعتمدة لهذا المؤشر
            $allowedToolIds = DB::table('indicator_verification_methods')
                ->where('indicator_id', $indicatorId)
                ->pluck('tool_id')
                ->map(fn($id) => (int) $id)
                ->all();

            foreach ($toolIds as $tId) {
                if (!in_array((int) $tId, $allowedToolIds, true)) {
                    return ApiResponse::validationError([
                        'verificationToolIds' => ['إحدى أدوات التحقق المحددة غير معتمدة لهذا المؤشر (FR-SCH-13).'],
                    ]);
                }
            }
        }

        // التحقق من وجود المؤشر وصلاحيته
        $indicator = Indicator::with('subStandard.standard')->find($indicatorId);
        if (!$indicator) {
            return ApiResponse::notFound('المؤشر المطلوب غير موجود.');
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
            ]);
        }

        // رفض المؤشرات غير الفعالة
        if ($indicator->status !== 'Active') {
            return ApiResponse::validationError([
                'indicator' => ['المؤشر المحدد غير فعّال ولا يمكن رصده.'],
            ]);
        }

        // مطابقة أو اشتقاق الواصفة المعيارية
        if ($descriptorId) {
            $descriptor = IndicatorScoreDescriptor::with('scoreLevel')
                ->where('descriptor_id', $descriptorId)
                ->where('indicator_id', $indicatorId)
                ->where('standard_version_id', $versionId)
                ->first();

            if (!$descriptor || (int) $descriptor->scoreLevel?->score_value !== $score) {
                return ApiResponse::validationError([
                    'scoreDescriptorId' => ['الواصفة المحددة لا تنتمي لهذا المؤشر أو لا تطابق التقدير الرقمي المختار (BR-SCH-05).'],
                ]);
            }
        } else {
            // اشتقاق الواصفة تلقائياً بناءً على التقدير والمؤشر
            $descriptor = IndicatorScoreDescriptor::where('indicator_id', $indicatorId)
                ->where('standard_version_id', $versionId)
                ->whereHas('scoreLevel', function ($q) use ($score) {
                    $q->where('score_value', $score);
                })
                ->first();

            if (!$descriptor) {
                return ApiResponse::validationError([
                    'scoreDescriptor' => ['تعذر اشتقاق واصفة أداء مطابقة لهذا التقدير.'],
                ]);
            }
        }

        // تنفيذ الرصد Upsert
        $result = EvaluationResult::updateOrCreate(
            [
                'evaluation_id' => $evaluation->evaluation_id,
                'indicator_id'  => $indicatorId,
            ],
            [
                'score_descriptor_id' => $descriptor->descriptor_id,
                'standard_version_id' => $versionId,
                'evaluator_user_id'   => $user->user_id,
                'score'               => $score,
                'textual_result'      => $textualResult,
                'completion_status'   => 'Completed',
            ]
        );

        // مزامنة أدوات التحقق المستخدمة فعلياً في النتيجة (FR-SCH-13)
        if ($toolIds !== null) {
            $result->verificationTools()->sync($toolIds);
        }

        // حساب نسبة الإنجاز المحدثة
        $totalActive = Indicator::where('status', 'Active')
            ->whereHas('subStandard.standard', fn($q) => $q->where('version_id', $versionId))
            ->count();

        $completedCount = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->where('completion_status', 'Completed')
            ->count();

        $percentage = $totalActive > 0 ? round(($completedCount / $totalActive) * 100, 2) : 0.0;

        return ApiResponse::success(
            data: [
                'resultId'             => $result->result_id,
                'evaluationId'         => $result->evaluation_id,
                'indicatorId'          => $result->indicator_id,
                'score'                => $result->score,
                'scoreDescriptorId'    => $result->score_descriptor_id,
                'scoreDescriptorLabel' => $descriptor->label,
                'textualResult'        => $result->textual_result,
                'completionStatus'     => $result->completion_status,
                'verificationToolIds'  => $result->verificationTools()->pluck('verification_tools.tool_id')->all(),
                'evaluatorUserId'      => $result->evaluator_user_id,
                'updatedAt'            => $result->updated_at?->toIso8601ZuluString(),
            ],
            message: 'تم رصد نتيجة المؤشر بنجاح.',
            meta: [
                'totalActiveIndicators' => $totalActive,
                'completedResults'      => $completedCount,
                'completionPercentage'  => $percentage,
            ]
        );
    }

    /**
     * تدوين ملاحظة نصية على نتيجة مؤشر مرصود في التقييم.
     *
     * POST /api/v1/evaluation-results/{id}/notes
     * الصلاحية: evaluations.edit
     */
    public function addNote(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('evaluations.edit')) {
            return ApiResponse::forbidden('غير مصرح لك بإضافة ملاحظات.');
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

        if ($user->cannot('update', $evaluation)) {
            $lockCheck = EvaluationLockChecker::canModifyIndicator($evaluation, $result->indicator_id);
            if (!$lockCheck['allowed']) {
                $key = $lockCheck['errorKey'] ?? 'evaluation';
                return ApiResponse::validationError([
                    $key => [$lockCheck['message']],
                ], $lockCheck['message']);
            }

            return ApiResponse::forbidden('غير مصرح لك بتعديل هذا التقييم.');
        }

        // فحص قفل التقييم أو إغلاق الدورة
        $lockCheck = EvaluationLockChecker::canModifyIndicator($evaluation, $result->indicator_id);
        if (!$lockCheck['allowed']) {
            $key = $lockCheck['errorKey'] ?? 'evaluation';
            return ApiResponse::validationError([
                $key => [$lockCheck['message']],
            ], $lockCheck['message']);
        }

        $validator = Validator::make($request->all(), [
            'text' => ['required', 'string', 'max:2000'],
        ], [
            'text.required' => 'نص الملاحظة إلزامي.',
            'text.max'      => 'لا يمكن أن يتجاوز نص الملاحظة 2000 حرف.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $note = Note::create([
            'result_id'      => $result->result_id,
            'author_user_id' => $user->user_id,
            'text'           => $request->input('text'),
        ]);

        return ApiResponse::success(
            data: [
                'noteId'       => $note->note_id,
                'resultId'     => $note->result_id,
                'authorUserId' => $note->author_user_id,
                'text'         => $note->text,
                'createdAt'    => $note->created_at?->toIso8601ZuluString(),
            ],
            message: 'تم حفظ الملاحظة بنجاح.',
            status: 201
        );
    }

    /**
     * إنهاء وتقديم التقييم الذاتي المدرسي كمكتمل وقفل العمليات التعديلية (G-01 / BR-SCH-03).
     *
     * الشروط الحاكمة:
     * 1. اكتمال رصد كافة المؤشرات الفعالة ووجود درجات لها (0-3).
     * 2. تحقق الحد الأدنى من الشواهد الإلزامية المطلوبة (شاهد واحد على الأقل لكل مؤشر له متطلب إلزامي).
     * 3. ألا يكون التقييم مكتملاً أو مقفلاً مسبقاً، وألا تكون دورة التقييم مغلقة.
     * 4. امتلاك صلاحية evaluations.submit والعزل المؤسسي (المدرسة المطابقة حصراً 404/403).
     *
     * POST /api/v1/evaluations/{id}/submit
     */
    public function submit(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $evaluation = Evaluation::with(['cycle', 'school'])->find($id);

        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        // عزل المدارس الصارم (القرار المعماري 9): إرجاع 404 إذا طلب مستخدم مدرسة تقييم مدرسة أخرى
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        // فحص الصلاحية عبر مصفوفة الصلاحيات أو السياسة
        if (!$user->hasPermission('evaluations.submit')) {
            return ApiResponse::forbidden('غير مصرح لك بتقديم هذا التقييم.');
        }

        if ($user->cannot('submit', $evaluation)) {
            return ApiResponse::forbidden('غير مصرح لك بتقديم هذا التقييم.');
        }

        // 1. التحقق من حالة الدورة التقييمية (FR-SCH-01)
        if ($evaluation->cycle && $evaluation->cycle->status === 'Closed') {
            return ApiResponse::validationError([
                'cycle' => ['دورة التقييم مغلقة حالياً ولا يُسمح بتقديم أو تعديل التقييم.'],
            ], 'دورة التقييم مغلقة حالياً ولا يُسمح بتقديم التقييم.');
        }

        // 2. التحقق من أن التقييم غير مكتمل أو مقفل مسبقاً (BR-SCH-03)
        if ($evaluation->status === 'Completed') {
            return ApiResponse::validationError([
                'evaluation' => ['ملف التقييم مكتمل ومقفل مسبقاً ولا يمكن إعادة تقديمه.'],
            ], 'ملف التقييم مكتمل ومقفل مسبقاً ولا يمكن إعادة تقديمه.');
        }

        if (EvaluationLockChecker::isEvaluationLocked($evaluation)) {
            $lockStatus = EvaluationLockChecker::checkEvaluationGeneralStatus($evaluation);
            $reason = $lockStatus['reason'] ?? 'ملف التقييم مقفل حالياً.';
            return ApiResponse::validationError([
                'evaluation' => [$reason],
            ], $reason);
        }

        // 3. التحقق من اكتمال رصد درجات جميع المؤشرات الفعالة
        $versionId = (int) ($evaluation->cycle?->standard_version_id ?? $evaluation->cycle?->version_id);
        if (!$versionId) {
            return ApiResponse::validationError([
                'cycle' => ['دورة التقييم غير مرتبطة بإصدار معياري معتمد.'],
            ], 'دورة التقييم غير مرتبطة بإصدار معياري معتمد.');
        }

        $indicatorsQuery = Indicator::query()->where('status', 'Active');
        $indicatorsQuery->whereHas('subStandard.standard', function ($q) use ($versionId) {
            $q->where('version_id', $versionId);
        });
        $allActiveIndicators = $indicatorsQuery->get(['indicator_id', 'code', 'name']);
        $totalIndicatorsCount = $allActiveIndicators->count();

        $scoredIndicatorIds = EvaluationResult::query()
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->where('completion_status', 'Completed')
            ->whereNotNull('score')
            ->pluck('indicator_id')
            ->all();

        $unscoredIndicators = $allActiveIndicators->filter(function ($ind) use ($scoredIndicatorIds) {
            return !in_array($ind->indicator_id, $scoredIndicatorIds);
        })->values();

        if ($unscoredIndicators->isNotEmpty()) {
            $missingCount = $unscoredIndicators->count();
            $unscoredList = $unscoredIndicators->map(function ($ind) {
                return [
                    'indicator_id' => $ind->indicator_id,
                    'code' => $ind->code,
                    'name' => $ind->name,
                ];
            })->all();

            return ApiResponse::validationError([
                'indicators' => [
                    "التقييم غير مكتمل. يتبقى عدد {$missingCount} مؤشر بدون رصد درجات من أصل {$totalIndicatorsCount} مؤشر.",
                ],
                'unscored_indicators' => $unscoredList,
            ], 'لا يمكن تقديم تقييم غير مكتمل الرصد.');
        }

        // 4. التحقق من استيفاء الحد الأدنى من الشواهد الإلزامية المطلوبة عبر خدمة الكفاية الموحدة
        /** @var \App\Services\EvidenceSufficiencyService $sufficiencyService */
        $sufficiencyService = app(\App\Services\EvidenceSufficiencyService::class);
        $sufficiency = $sufficiencyService->evaluateEvaluation($evaluation);

        if (!empty($sufficiency['missing_evidence_indicators'])) {
            $missingCount = count($sufficiency['missing_evidence_indicators']);
            return ApiResponse::validationError([
                'evidences' => [
                    "يوجد عدد {$missingCount} مؤشر لم يستوفِ الحد الأدنى من الشواهد الإلزامية المطلوبة.",
                ],
                'missing_evidence_indicators' => $sufficiency['missing_evidence_indicators'],
            ], 'لا يمكن تقديم التقييم لعدم استيفاء الحد الأدنى من الشواهد المطلوبة.');
        }

        // 5. التحديث داخل Transaction وإطلاق حدث القفل
        DB::transaction(function () use ($evaluation, $user) {
            $evaluation->status = 'Completed';
            $evaluation->updated_at = now();
            $evaluation->save();

            event(new EvaluationSubmitted($evaluation, $user));
        });

        return ApiResponse::success(
            data: [
                'evaluationId' => $evaluation->evaluation_id,
                'schoolId' => $evaluation->school_id,
                'status' => $evaluation->status,
                'completedAt' => $evaluation->updated_at?->toIso8601ZuluString(),
                'submittedByUser' => [
                    'userId' => $user->user_id,
                    'name' => $user->full_name,
                    'role' => $user->roles->first()?->role_name,
                ],
                'isLocked' => true,
            ],
            message: 'تم إغلاق التقييم الذاتي واعتماده بنجاح وقفل العمليات التعديلية (BR-SCH-03).'
        );
    }

    /**
     * إغلاق وتقديم التقييم الذاتي عبر مسار المدرسة المباشر.
     *
     * POST /api/v1/schools/{school}/assessments/{assessment}/submit
     */
    public function submitBySchool(Request $request, int $schoolId, int $assessmentId): JsonResponse
    {
        $evaluation = Evaluation::find($assessmentId);
        if (!$evaluation || (int) $evaluation->school_id !== (int) $schoolId) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        return $this->submit($request, $assessmentId);
    }

    /**
     * إفراغ التقييم التجريبي من كافة الدرجات والشواهد الوهمية (مخصص للتطوير والاختبار التجريبي).
     *
     * POST /api/v1/evaluations/{id}/dev-reset
     */
    public function devReset(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $evaluation = Evaluation::find($id);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        if ($evaluation->status === 'Completed' || EvaluationLockChecker::isEvaluationLocked($evaluation)) {
            return ApiResponse::validationError([
                'evaluation' => ['لا يمكن إفراغ تقييم مقفل ومكتمل مسبقاً.'],
            ], 'التقييم مقفل ومكتمل مسبقاً ولا يمكن تعديله أو إفراغه.');
        }

        DB::transaction(function () use ($evaluation) {
            $results = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)->get();
            $resultIds = $results->pluck('result_id')->toArray();

            if (!empty($resultIds)) {
                $areaIds = \App\Models\ImprovementArea::whereIn('result_id', $resultIds)->pluck('area_id')->toArray();
                if (!empty($areaIds)) {
                    \App\Models\ImprovementAction::whereIn('area_id', $areaIds)->delete();
                    DB::table('plan_improvement_areas')->whereIn('area_id', $areaIds)->delete();
                    \App\Models\ImprovementArea::whereIn('area_id', $areaIds)->delete();
                }

                foreach ($results as $result) {
                    $evidences = \App\Models\Evidence::where('result_id', $result->result_id)->get();
                    foreach ($evidences as $evidence) {
                        $versions = \App\Models\EvidenceVersion::where('evidence_id', $evidence->evidence_id)->get();
                        foreach ($versions as $version) {
                            \App\Models\Attachment::where('target_type', 'evidence_version')
                                ->where('target_id', $version->evidence_version_id)
                                ->delete();
                            $version->delete();
                        }
                        $evidence->delete();
                    }

                    DB::table('evaluation_result_verification_methods')->where('evaluation_result_id', $result->result_id)->delete();
                    \App\Models\Note::where('result_id', $result->result_id)->delete();
                    $result->delete();
                }
            }
        });

        return ApiResponse::success(
            data: null,
            message: 'تم إفراغ التقييم التجريبي بنجاح.'
        );
    }
}
