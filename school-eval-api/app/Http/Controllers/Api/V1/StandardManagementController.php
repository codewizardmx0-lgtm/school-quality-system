<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Standards\CloneStandardVersionRequest;
use App\Http\Requests\Standards\CreateStandardVersionRequest;
use App\Http\Requests\Standards\SaveEvidenceRequirementRequest;
use App\Http\Requests\Standards\StoreIndicatorRequest;
use App\Http\Requests\Standards\StoreStandardRequest;
use App\Http\Requests\Standards\StoreSubStandardRequest;
use App\Http\Requests\Standards\UpdateIndicatorDescriptorsRequest;
use App\Http\Requests\Standards\UpdateIndicatorRequest;
use App\Http\Requests\Standards\UpdateStandardRequest;
use App\Http\Requests\Standards\UpdateStandardVersionRequest;
use App\Http\Requests\Standards\UpdateSubStandardRequest;
use App\Http\Requests\Standards\UpdateWeightsRequest;
use App\Http\Resources\StandardVersionResource;
use App\Http\Responses\ApiResponse;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\ScoreLevel;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\SubStandard;
use App\Models\VerificationTool;
use App\Services\StandardManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * متحكم إدارة معايير الجودة المدرسية وإصداراتها وبناء الهيكل المعياري (الشريحة 7).
 * تم فصل عمليات الحوكمة والمقارنة والقفل والتصدير إلى StandardGovernanceController.
 */
class StandardManagementController extends Controller
{
    public function __construct(
        protected StandardManagementService $service
    ) {}

    /**
     * قائمة الإصدارات المعيارية مع إحصاءات ملخصة.
     * الصلاحية المطلوبة: standards.view
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission('standards.view')) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض المعايير.');
        }

        $versions = $this->service->listVersions($request->query('status'));

        return ApiResponse::success(data: StandardVersionResource::collection($versions)->resolve($request), message: 'تم استرجاع الإصدارات المعيارية بنجاح.');
    }

    /**
     * إنشاء مسودة إصدار جديدة فارغة.
     * الصلاحية المطلوبة: standards.manage
     */
    public function store(CreateStandardVersionRequest $request): JsonResponse
    {
        $version = $this->service->createDraft($request->validated());

        return ApiResponse::success(data: (new StandardVersionResource($version))->resolve($request), message: 'تم إنشاء مسودة الإصدار المعياري بنجاح.', status: 201);
    }

    /**
     * استنساخ إصدار مُقرّ كمسودة جديدة كاملة.
     * الصلاحية المطلوبة: standards.manage
     */
    public function clone(CloneStandardVersionRequest $request, int $id): JsonResponse
    {
        $sourceVersion = StandardVersion::find($id);
        if (!$sourceVersion) {
            return ApiResponse::notFound('الإصدار المعياري المصدر غير موجود.');
        }

        try {
            $newVersion = $this->service->cloneVersion($sourceVersion, $request->validated());
            return ApiResponse::success(data: (new StandardVersionResource($newVersion))->resolve($request), message: 'تم استنساخ الإصدار بنجاح وإنشاء مسودة مطابقة قابلة للتطوير.', status: 201);
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * تحديث البيانات الوصفية للمسودة.
     * الصلاحية المطلوبة: standards.manage
     */
    public function update(UpdateStandardVersionRequest $request, int $id): JsonResponse
    {
        $version = StandardVersion::find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        try {
            $updated = $this->service->updateVersion($version, $request->validated());
            return ApiResponse::success(data: $updated, message: 'تم تحديث بيانات مسودة الإصدار بنجاح.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * حذف مسودة إصدار معياري (Draft فقط).
     * الصلاحية المطلوبة: standards.manage
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission('standards.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بحذف الإصدارات المعيارية.');
        }

        $version = StandardVersion::find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        try {
            $this->service->deleteVersion($version);
            return ApiResponse::success(data: null, message: 'تم حذف مسودة الإصدار المعياري بنجاح.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * تحديث أوزان المعايير للمسودة مع التحقق الحتمي أن المجموع = 100.00%.
     * الصلاحية المطلوبة: standards.manage
     */
    public function updateWeights(UpdateWeightsRequest $request, int $id): JsonResponse
    {
        $version = StandardVersion::find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        try {
            $updated = $this->service->updateWeights(
                $version,
                $request->input('standards_weights'),
                $request->input('indicators_weights'),
                $request->input('sub_standards_weights')
            );
            return ApiResponse::success(data: $updated, message: 'تم تحديث أوزان المعايير بنجاح واستيفاء شرط المجموع 100%.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * إضافة معيار رئيسي جديد لمسودة الإصدار.
     * الصلاحية المطلوبة: standards.manage
     */
    public function storeStandard(StoreStandardRequest $request, int $versionId): JsonResponse
    {
        $version = StandardVersion::find($versionId);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        try {
            $standard = $this->service->storeStandard($version, $request->validated());
            return ApiResponse::success(data: $standard, message: 'تمت إضافة المعيار الرئيسي بنجاح.', status: 201);
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * تحديث معيار رئيسي داخل مسودة.
     * الصلاحية المطلوبة: standards.manage
     */
    public function updateStandard(UpdateStandardRequest $request, int $id): JsonResponse
    {
        $standard = Standard::find($id);
        if (!$standard) {
            return ApiResponse::notFound('المعيار المطلوب غير موجود.');
        }

        try {
            $updated = $this->service->updateStandard($standard, $request->validated());
            return ApiResponse::success(data: $updated, message: 'تم تحديث بيانات المعيار بنجاح.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * حذف معيار رئيسي من مسودة الإصدار.
     * الصلاحية المطلوبة: standards.manage
     */
    public function deleteStandard(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission('standards.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بحذف المعايير.');
        }

        $standard = Standard::find($id);
        if (!$standard) {
            return ApiResponse::notFound('المعيار المطلوب غير موجود.');
        }

        try {
            $this->service->deleteStandard($standard);
            return ApiResponse::success(message: 'تم حذف المعيار وما يتبعه بنجاح.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * إضافة معيار فرعي / مجال لمسودة الإصدار.
     * الصلاحية المطلوبة: standards.manage
     */
    public function storeSubStandard(StoreSubStandardRequest $request, int $standardId): JsonResponse
    {
        $standard = Standard::find($standardId);
        if (!$standard) {
            return ApiResponse::notFound('المعيار المطلوب غير موجود.');
        }

        try {
            $subStandard = $this->service->storeSubStandard($standard, $request->validated());
            return ApiResponse::success(data: $subStandard, message: 'تمت إضافة المعيار الفرعي بنجاح.', status: 201);
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * تحديث معيار فرعي / مجال داخل مسودة.
     * الصلاحية المطلوبة: standards.manage
     */
    public function updateSubStandard(UpdateSubStandardRequest $request, int $id): JsonResponse
    {
        $subStandard = SubStandard::find($id);
        if (!$subStandard) {
            return ApiResponse::notFound('المعيار الفرعي المطلوب غير موجود.');
        }

        try {
            $updated = $this->service->updateSubStandard($subStandard, $request->validated());
            return ApiResponse::success(data: $updated, message: 'تم تحديث بيانات المعيار الفرعي بنجاح.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * حذف معيار فرعي من مسودة الإصدار.
     * الصلاحية المطلوبة: standards.manage
     */
    public function deleteSubStandard(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission('standards.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بحذف المعايير الفرعية.');
        }

        $subStandard = SubStandard::find($id);
        if (!$subStandard) {
            return ApiResponse::notFound('المعيار الفرعي المطلوب غير موجود.');
        }

        try {
            $this->service->deleteSubStandard($subStandard);
            return ApiResponse::success(message: 'تم حذف المعيار الفرعي وما يتبعه بنجاح.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * إضافة مؤشر لمسودة الإصدار.
     * الصلاحية المطلوبة: standards.manage
     */
    public function storeIndicator(StoreIndicatorRequest $request, int $subStandardId): JsonResponse
    {
        $subStandard = SubStandard::find($subStandardId);
        if (!$subStandard) {
            return ApiResponse::notFound('المعيار الفرعي المطلوب غير موجود.');
        }

        try {
            $indicator = $this->service->storeIndicator($subStandard, $request->validated());
            return ApiResponse::success(data: $indicator, message: 'تمت إضافة المؤشر وتوليد واصفات درجاته بنجاح.', status: 201);
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * تحديث مؤشر داخل مسودة.
     * الصلاحية المطلوبة: standards.manage
     */
    public function updateIndicator(UpdateIndicatorRequest $request, int $id): JsonResponse
    {
        $indicator = Indicator::find($id);
        if (!$indicator) {
            return ApiResponse::notFound('المؤشر المطلوب غير موجود.');
        }

        try {
            $updated = $this->service->updateIndicator($indicator, $request->validated());
            return ApiResponse::success(data: $updated, message: 'تم تحديث بيانات المؤشر بنجاح.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * حذف مؤشر من مسودة الإصدار.
     * الصلاحية المطلوبة: standards.manage
     */
    public function deleteIndicator(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission('standards.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بحذف المؤشرات.');
        }

        $indicator = Indicator::find($id);
        if (!$indicator) {
            return ApiResponse::notFound('المؤشر المطلوب غير موجود.');
        }

        try {
            $this->service->deleteIndicator($indicator);
            return ApiResponse::success(message: 'تم حذف المؤشر بنجاح.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * تحديث واصفات درجات المؤشر داخل مسودة.
     * الصلاحية المطلوبة: standards.manage
     */
    public function updateIndicatorDescriptors(UpdateIndicatorDescriptorsRequest $request, int $id): JsonResponse
    {
        $indicator = Indicator::find($id);
        if (!$indicator) {
            return ApiResponse::notFound('المؤشر المطلوب غير موجود.');
        }

        try {
            $descriptors = $this->service->updateIndicatorDescriptors($indicator, $request->input('descriptors'));
            return ApiResponse::success(data: $descriptors, message: 'تم تحديث واصفات درجات المؤشر بنجاح.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * إضافة متطلب شاهد لمؤشر داخل مسودة.
     * الصلاحية المطلوبة: standards.manage
     */
    public function storeRequirement(SaveEvidenceRequirementRequest $request, int $id): JsonResponse
    {
        $indicator = Indicator::find($id);
        if (!$indicator) {
            return ApiResponse::notFound('المؤشر المطلوب غير موجود.');
        }

        try {
            $requirement = $this->service->storeRequirement($indicator, $request->validated());
            return ApiResponse::success(data: $requirement, message: 'تمت إضافة متطلب الشاهد بنجاح.', status: 201);
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * تعديل متطلب شاهد داخل مسودة.
     * الصلاحية المطلوبة: standards.manage
     */
    public function updateRequirement(SaveEvidenceRequirementRequest $request, int $indicatorId, int $requirementId): JsonResponse
    {
        $requirement = IndicatorEvidenceRequirement::where('indicator_id', $indicatorId)
            ->where('requirement_id', $requirementId)
            ->first();

        if (!$requirement) {
            return ApiResponse::notFound('متطلب الشاهد المطلوب غير موجود.');
        }

        try {
            $updated = $this->service->updateRequirement($requirement, $request->validated());
            return ApiResponse::success(data: $updated, message: 'تم تحديث متطلب الشاهد بنجاح.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * حذف متطلب شاهد داخل مسودة.
     * الصلاحية المطلوبة: standards.manage
     */
    public function deleteRequirement(Request $request, int $indicatorId, int $requirementId): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission('standards.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بحذف متطلبات الشواهد.');
        }

        $requirement = IndicatorEvidenceRequirement::where('indicator_id', $indicatorId)
            ->where('requirement_id', $requirementId)
            ->first();

        if (!$requirement) {
            return ApiResponse::notFound('متطلب الشاهد المطلوب غير موجود.');
        }

        try {
            $this->service->deleteRequirement($requirement);
            return ApiResponse::success(data: null, message: 'تم حذف متطلب الشاهد بنجاح.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * استرجاع شجرة المعايير والمؤشرات كاملة للإصدار.
     */
    public function tree(Request $request, int $id): JsonResponse
    {
        return app(StandardVersionController::class)->show($request, $id);
    }

    /**
     * استرجاع أوزان المعايير وتوزيعها للإصدار.
     */
    public function getWeights(int $id): JsonResponse
    {
        $version = StandardVersion::with([
            'standards.subStandards' => fn($q) => $q->withCount('indicators')->orderBy('sub_standard_id', 'asc'),
            'standards.subStandards.indicators' => fn($q) => $q->orderBy('indicator_id', 'asc'),
        ])->find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        $standards = $version->standards->map(function ($std) {
            $subStandards = $std->subStandards->map(function ($sub) {
                $indicators = $sub->indicators->map(function ($ind) {
                    return [
                        'indicatorId' => $ind->indicator_id,
                        'code' => $ind->code,
                        'name' => $ind->title ?? $ind->name,
                        'weight' => (float) $ind->weight,
                    ];
                });

                return [
                    'subStandardId' => $sub->sub_standard_id,
                    'code' => $sub->code,
                    'name' => $sub->name,
                    'weight' => (float) $sub->weight,
                    'indicatorsCount' => $sub->indicators_count,
                    'indicators' => $indicators,
                ];
            });

            $indicatorsCount = $subStandards->sum('indicatorsCount');

            return [
                'standardId' => $std->standard_id,
                'code' => $std->code,
                'name' => $std->name,
                'weight' => (float) $std->weight,
                'subStandardsCount' => $subStandards->count(),
                'indicatorsCount' => $indicatorsCount,
                'subStandards' => $subStandards,
            ];
        });

        $totalWeight = round($standards->sum('weight'), 2);

        return ApiResponse::success([
            'versionId' => $version->version_id,
            'versionNo' => $version->version_no,
            'status' => $version->status,
            'isDraft' => $version->isDraft(),
            'totalWeight' => $totalWeight,
            'isBalanced' => abs($totalWeight - 100.0) < 0.05,
            'standards' => $standards,
        ], 'تم استرجاع أوزان المعايير بنجاح.');
    }

    /**
     * استرجاع مستويات سلم التقدير اللفظي للإصدار المعتمد أو المحدد.
     */
    public function scoreLevels(Request $request): JsonResponse
    {
        $versionId = $request->query('version_id');
        $query = ScoreLevel::query();

        if ($versionId) {
            $query->where('standard_version_id', $versionId);
        } else {
            $activeVersion = StandardVersion::where('status', StandardVersion::STATUS_ACTIVE)->first()
                ?? StandardVersion::where('status', StandardVersion::STATUS_APPROVED)->first();
            if ($activeVersion) {
                $query->where('standard_version_id', $activeVersion->version_id);
            }
        }

        $levels = $query->orderBy('display_order')->orderBy('score_value')->get();

        if ($levels->isEmpty()) {
            $levels = ScoreLevel::where('standard_version_id', 1)->orderBy('display_order')->get();
        }

        $mapped = $levels->map(function ($lvl) {
            $colorMap = [
                3 => 'emerald',
                2 => 'blue',
                1 => 'amber',
                0 => 'rose',
            ];
            return [
                'scoreLevelId'       => $lvl->score_level_id,
                'standardVersionId'  => $lvl->standard_version_id,
                'scoreValue'         => $lvl->score_value,
                'label'              => $lvl->label,
                'badgeColor'         => $colorMap[$lvl->score_value] ?? 'slate',
                'description'        => $lvl->general_description,
                'displayOrder'       => $lvl->display_order,
            ];
        });

        return ApiResponse::success($mapped, 'تم استرجاع مستويات سلم التقدير المعتمدة بنجاح.');
    }

    /**
     * تحديث أو إعادة تهيئة مستويات سلم التقدير اللفظي للإصدار (مسودة فقط).
     */
    public function updateScoreLevels(Request $request, int $id): JsonResponse
    {
        $version = StandardVersion::find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        $request->validate([
            'levels'                       => 'required|array|min:2',
            'levels.*.score_value'         => 'required|integer',
            'levels.*.label'               => 'required|string|max:100',
            'levels.*.general_description' => 'nullable|string',
            'levels.*.display_order'       => 'nullable|integer',
        ]);

        try {
            $updated = $this->service->updateVersionScoreLevels($version, $request->input('levels'));
            return ApiResponse::success($updated, 'تم تحديث مستويات سلم التقدير للإصدار بنجاح.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * استرجاع كافة أدوات ووسائل التحقق المعتمدة مع إحصاءات ارتباطها بالمؤشرات.
     * الصلاحية المطلوبة: standards.view
     */
    public function getVerificationTools(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission('standards.view')) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض أدوات التحقق.');
        }

        $tools = VerificationTool::withCount('indicatorVerificationMethods')
            ->orderBy('tool_id', 'asc')
            ->get()
            ->map(function ($tool) {
                return [
                    'toolId'          => $tool->tool_id,
                    'name'            => $tool->name,
                    'toolType'        => $tool->tool_type,
                    'description'     => $tool->description,
                    'approved'        => (bool) $tool->approved,
                    'indicatorsCount' => $tool->indicator_verification_methods_count,
                    'createdAt'       => $tool->created_at?->toIso8601ZuluString(),
                ];
            });

        return ApiResponse::success([
            'tools'      => $tools,
            'totalCount' => $tools->count(),
        ], 'تم استرجاع قائمة أدوات التحقق المعتمدة بنجاح.');
    }

    /**
     * إضافة أداة تحقق جديدة معتمدة في النظام.
     * الصلاحية المطلوبة: standards.manage
     */
    public function storeVerificationTool(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission('standards.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بإضافة أدوات تحقق.');
        }

        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:100', 'unique:verification_tools,name'],
            'tool_type'   => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:1000'],
        ], [
            'name.required' => 'يرجى إدخال اسم أداة التحقق.',
            'name.unique'   => 'اسم أداة التحقق مسجل مسبقاً في النظام.',
        ]);

        $tool = VerificationTool::create([
            'name'        => trim($validated['name']),
            'tool_type'   => $validated['tool_type'] ?? 'أداة مساندة',
            'description' => $validated['description'] ?? null,
            'approved'    => true,
        ]);

        return ApiResponse::created([
            'toolId'          => $tool->tool_id,
            'name'            => $tool->name,
            'toolType'        => $tool->tool_type,
            'description'     => $tool->description,
            'approved'        => (bool) $tool->approved,
            'indicatorsCount' => 0,
        ], 'تمت إضافة أداة التحقق المعتمدة بنجاح.');
    }

    /**
     * حذف أداة تحقق غير مرتبطة بمؤشرات أو نتائج تقييم.
     * الصلاحية المطلوبة: standards.manage
     */
    public function deleteVerificationTool(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission('standards.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بحذف أدوات التحقق.');
        }

        $tool = VerificationTool::find($id);
        if (!$tool) {
            return ApiResponse::notFound('أداة التحقق المطلوبة غير موجودة.');
        }

        $linkedIndicators = DB::table('indicator_verification_methods')
            ->where('tool_id', $id)
            ->count();

        $linkedResults = DB::table('evaluation_result_verification_methods')
            ->where('tool_id', $id)
            ->count();

        if ($linkedIndicators > 0 || $linkedResults > 0) {
            return ApiResponse::unprocessable("لا يمكن حذف أداة التحقق '{$tool->name}' لأنها مرتبطة حالياً بـ ({$linkedIndicators}) مؤشراً معيارياً و ({$linkedResults}) نتيجة تقييم مسجلة.");
        }

        $tool->delete();

        return ApiResponse::success(null, "تم حذف أداة التحقق '{$tool->name}' بنجاح.");
    }

    /**
     * إضافة معيار فرعي عبر مسار النسخة المعيارية المتداخل.
     */
    public function storeSubStandardNested(StoreSubStandardRequest $request, int $versionId, int $stdId): JsonResponse
    {
        return $this->storeSubStandard($request, $stdId);
    }
}
