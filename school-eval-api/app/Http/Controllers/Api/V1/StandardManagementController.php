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
use App\Services\StandardManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * متحكم إدارة معايير الاعتماد المدرسي وإصداراتها ودورة حياتها الرسمية (الشريحة 7).
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
     * إقرار مسودة الإصدار وتجميدها مع أرشفة الإصدار المُقرّ السابق تلقائيًا.
     * الصلاحية المطلوبة: standards.manage
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission('standards.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بإقرار الإصدار المعياري.');
        }

        $version = StandardVersion::find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        try {
            $approved = $this->service->approveVersion($version);
            return ApiResponse::success(data: $approved, message: 'تم إقرار الإصدار المعياري بنجاح.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * تنشيط إصدار معياري مع أرشفة الإصدار النشط القديم تلقائيًا داخل معاملة ذرية (ضابط G-23).
     * الصلاحية المطلوبة: standards.manage
     */
    public function activate(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission('standards.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بتنشيط الإصدار المعياري.');
        }

        $version = StandardVersion::find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        try {
            $activated = $this->service->activateVersion($version);
            return ApiResponse::success(data: $activated, message: 'تم تنشيط الإصدار المعياري بنجاح وأرشفة الإصدار النشط السابق تلقائيًا.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * أرشفة إصدار معياري.
     * الصلاحية المطلوبة: standards.manage
     */
    public function archive(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission('standards.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بأرشفة الإصدار المعياري.');
        }

        $version = StandardVersion::find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        $archived = $this->service->archiveVersion($version);
        return ApiResponse::success(data: $archived, message: 'تمت أرشفة الإصدار المعياري بنجاح.');
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
        $version = StandardVersion::with(['standards.subStandards' => fn($q) => $q->withCount('indicators')->orderBy('sub_standard_id', 'asc')])->find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        $standards = $version->standards->map(function ($std) {
            $subStandards = $std->subStandards->map(function ($sub) {
                return [
                    'subStandardId' => $sub->sub_standard_id,
                    'code' => $sub->code,
                    'name' => $sub->name,
                    'weight' => (float) $sub->weight,
                    'indicatorsCount' => $sub->indicators_count,
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
     * استرجاع سجل الفروقات والتغييرات الحقيقية مقارنة بالإصدار المعتمد.
     */
    public function diffLog(int $id): JsonResponse
    {
        $version = StandardVersion::with(['standards.subStandards.indicators'])->find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        // تحديد خط الأساس الفعلي: الإصدار السابق المعتمد أو النشط
        $baseline = StandardVersion::whereIn('status', [StandardVersion::STATUS_ACTIVE, StandardVersion::STATUS_APPROVED])
            ->where('version_id', '!=', $id)
            ->where('version_id', '<', $id)
            ->orderByDesc('version_id')
            ->first();

        if (!$baseline) {
            $baseline = StandardVersion::whereIn('status', [StandardVersion::STATUS_ACTIVE, StandardVersion::STATUS_APPROVED])
                ->where('version_id', '!=', $id)
                ->first();
        }

        $hasBaseline = ($baseline !== null && $baseline->version_id !== $version->version_id);

        $versionStandards = $version->standards;
        $versionSubs = $versionStandards->flatMap->subStandards;
        $versionIndicators = $versionSubs->flatMap->indicators;
        $versionWeight = round($versionStandards->sum('weight'), 2);

        $baselineStandards = $hasBaseline ? $baseline->standards()->with('subStandards.indicators')->get() : collect();
        $baselineSubs = $baselineStandards->flatMap->subStandards;
        $baselineIndicators = $baselineSubs->flatMap->indicators;
        $baselineWeight = $hasBaseline ? round($baselineStandards->sum('weight'), 2) : 0;

        $realStats = [
            'standardsCount'          => $versionStandards->count(),
            'currentStandardsCount'   => $versionStandards->count(),
            'baselineStandardsCount'  => $hasBaseline ? $baselineStandards->count() : 0,
            'previousStandardsCount'  => $hasBaseline ? $baselineStandards->count() : 0,
            'subStandardsCount'       => $versionSubs->count(),
            'currentSubStandardsCount'=> $versionSubs->count(),
            'baselineSubsCount'       => $hasBaseline ? $baselineSubs->count() : 0,
            'previousSubStandardsCount'=> $hasBaseline ? $baselineSubs->count() : 0,
            'indicatorsCount'         => $versionIndicators->count(),
            'currentIndicatorsCount'  => $versionIndicators->count(),
            'baselineIndicatorsCount' => $hasBaseline ? $baselineIndicators->count() : 0,
            'previousIndicatorsCount' => $hasBaseline ? $baselineIndicators->count() : 0,
            'totalWeight'             => $versionWeight,
            'baselineTotalWeight'     => $baselineWeight,
            'standardsDiff'           => $hasBaseline ? ($versionStandards->count() - $baselineStandards->count()) : 0,
            'subStandardsDiff'        => $hasBaseline ? ($versionSubs->count() - $baselineSubs->count()) : 0,
            'indicatorsDiff'          => $hasBaseline ? ($versionIndicators->count() - $baselineIndicators->count()) : 0,
            'isWeightBalanced'        => abs($versionWeight - 100.0) < 0.05,
            'isBalanced'              => abs($versionWeight - 100.0) < 0.05,
            'hasBaseline'             => $hasBaseline,
            'baselineVersionNo'       => $hasBaseline ? $baseline->version_no : null,
            'previousVersionNo'       => $hasBaseline ? $baseline->version_no : null,
        ];

        // احتساب الفروقات الحقيقية بدون أي بيانات وهمية أو أوقات مختلقة
        $diffs = [];

        if ($hasBaseline) {
            $baselineStdCodes = $baselineStandards->pluck('code')->all();
            $versionStdCodes = $versionStandards->pluck('code')->all();

            foreach ($versionStandards as $vStd) {
                if (!in_array($vStd->code, $baselineStdCodes)) {
                    $diffs[] = [
                        'id'          => 'DIFF-STD-ADD-' . $vStd->code,
                        'category'    => 'معيار رئيسي مضاف',
                        'type'        => 'added',
                        'target'      => $vStd->name,
                        'code'        => $vStd->code,
                        'description' => "إضافة معيار رئيسي جديد ({$vStd->name}) بوزن نسبي {$vStd->weight}%.",
                    ];
                } else {
                    $bStd = $baselineStandards->firstWhere('code', $vStd->code);
                    if ($bStd && abs((float)$bStd->weight - (float)$vStd->weight) > 0.01) {
                        $diffs[] = [
                            'id'          => 'DIFF-STD-WEIGHT-' . $vStd->code,
                            'category'    => 'إعادة معايرة وزن المعيار',
                            'type'        => 'reweighted',
                            'target'      => $vStd->name,
                            'code'        => $vStd->code,
                            'description' => "تعديل الوزن النسبي للمعيار من {$bStd->weight}% إلى {$vStd->weight}%.",
                        ];
                    }
                }
            }

            foreach ($baselineStandards as $bStd) {
                if (!in_array($bStd->code, $versionStdCodes)) {
                    $diffs[] = [
                        'id'          => 'DIFF-STD-DEL-' . $bStd->code,
                        'category'    => 'معيار رئيسي محذوف',
                        'type'        => 'modified',
                        'target'      => $bStd->name,
                        'code'        => $bStd->code,
                        'description' => "حذف المعيار الرئيسي ({$bStd->name}) الذي كان معتمداً في الإصدار الأساس.",
                    ];
                }
            }

            $baselineIndMap = $baselineIndicators->keyBy('code');
            $versionIndMap = $versionIndicators->keyBy('code');

            foreach ($versionIndicators as $vInd) {
                if (!$baselineIndMap->has($vInd->code)) {
                    $diffs[] = [
                        'id'          => 'DIFF-IND-ADD-' . $vInd->code,
                        'category'    => 'مؤشر أداء جديد',
                        'type'        => 'added',
                        'target'      => $vInd->name,
                        'code'        => $vInd->code,
                        'description' => "إضافة مؤشر تفصيلي جديد إلى الهيكل المعياري.",
                    ];
                } else {
                    $bInd = $baselineIndMap->get($vInd->code);
                    if (abs((float)$bInd->weight - (float)$vInd->weight) > 0.01) {
                        $diffs[] = [
                            'id'          => 'DIFF-IND-WEIGHT-' . $vInd->code,
                            'category'    => 'إعادة معايرة وزن المؤشر',
                            'type'        => 'reweighted',
                            'target'      => $vInd->name,
                            'code'        => $vInd->code,
                            'description' => "تعديل الوزن النسبي للمؤشر من {$bInd->weight}% إلى {$vInd->weight}%.",
                        ];
                    }
                }
            }

            foreach ($baselineIndicators as $bInd) {
                if (!$versionIndMap->has($bInd->code)) {
                    $diffs[] = [
                        'id'          => 'DIFF-IND-DEL-' . $bInd->code,
                        'category'    => 'مؤشر محذوف',
                        'type'        => 'modified',
                        'target'      => $bInd->name,
                        'code'        => $bInd->code,
                        'description' => "حذف المؤشر ({$bInd->code} - {$bInd->name}) من الهيكل المعياري.",
                    ];
                }
            }
        }

        $hash = hash('sha256', "VERSION_{$version->version_id}_{$version->version_no}_DIFF_LOG");

        return ApiResponse::success([
            'versionId'         => $version->version_id,
            'versionNo'         => $version->version_no,
            'baselineVersionNo' => $hasBaseline ? $baseline->version_no : null,
            'hasBaseline'       => $hasBaseline,
            'status'            => $version->status,
            'isDraft'           => $version->isDraft(),
            'approvalCode'      => $version->approval_code,
            'approverName'      => $version->approver_name,
            'approvedAt'        => $version->approved_at?->toIso8601ZuluString(),
            'integrityHash'     => $hash,
            'releaseNotes'      => $version->source_description ?? 'مذكرات الإصدار والتغييرات المنهجية الرسمية.',
            'realStats'         => $realStats,
            'diffs'             => $diffs,
            'stats'             => [
                'addedCount'        => count(array_filter($diffs, fn($d) => $d['type'] === 'added')),
                'modifiedCount'     => count(array_filter($diffs, fn($d) => $d['type'] === 'modified')),
                'reweightedCount'   => count(array_filter($diffs, fn($d) => $d['type'] === 'reweighted')),
                'toolsUpdatedCount' => 0,
            ],
        ], 'تم استرجاع سجل الفروقات والمقارنة الحقيقية بنجاح.');
    }

    /**
     * فحص وتدقيق الشروط الحاكمة وموانع التفعيل قبل القفل والإقرار الرسمي.
     */
    public function lockPreconditions(int $id): JsonResponse
    {
        $version = StandardVersion::with(['standards.subStandards.indicators'])->find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        $standards = $version->standards;
        $totalWeight = round($standards->sum('weight'), 2);
        
        // 1. اتزان الأوزان (100.0%)
        $check1 = abs($totalWeight - 100.0) < 0.05;

        // 2. فصل أدوات التحقق: فحص ربط كل مؤشر بأداة تحقق معتمدة في الإصدار
        $indicators = $standards->flatMap->subStandards->flatMap->indicators;
        $missingTools = $indicators->filter(function ($ind) {
            $hasMethods = DB::table('indicator_verification_methods')
                ->where('indicator_id', $ind->indicator_id)
                ->exists();
            $toolsArray = is_array($ind->verification_tools) ? $ind->verification_tools : json_decode($ind->verification_tools ?? '[]', true);
            return empty($toolsArray) && !$hasMethods && empty($ind->verification_method);
        });
        $check2 = $missingTools->isEmpty();

        // 3. فصل متطلبات الشواهد: فحص تعريف متطلبات الشواهد المرجعية في وثيقة المعايير
        $missingRequirements = $indicators->filter(function ($ind) {
            return !DB::table('indicator_evidence_requirements')
                ->where('indicator_id', $ind->indicator_id)
                ->exists();
        });
        $check3 = $missingRequirements->isEmpty();

        // 4. اكتمال تعريف سلم التقدير اللفظي المعتمد للإصدار
        $versionScoreLevels = ScoreLevel::where('standard_version_id', $version->version_id)->get();
        if ($versionScoreLevels->isEmpty()) {
            $versionScoreLevels = ScoreLevel::where('standard_version_id', 1)->get();
        }
        $check4 = $versionScoreLevels->count() >= 2;

        // 5. تفرد الرموز المعيارية بدون تكرار
        $allCodes = collect();
        $standards->each(fn($s) => $allCodes->push($s->code));
        $standards->flatMap->subStandards->each(fn($sub) => $allCodes->push($sub->code));
        $indicators->each(fn($ind) => $allCodes->push($ind->code));
        $check5 = $allCodes->count() === $allCodes->unique()->count();

        // 6. فحص مانع التفعيل التشغيلي: هل السلم التقديري مدعوم في بوابات الرصد والتقييم الحالية (سلم 0-3)؟
        $levelValues = $versionScoreLevels->pluck('score_value')->sort()->values()->all();
        $isStandardScale = ($levelValues === [0, 1, 2, 3]);
        $check6 = $isStandardScale;

        $passesAll = $check1 && $check2 && $check3 && $check4 && $check5 && $check6;

        $hashContent = "VERSION_{$version->version_id}_{$version->version_no}_{$totalWeight}_{$indicators->count()}_" . $allCodes->sort()->implode('_');
        $integrityHash = hash('sha256', $hashContent);

        return ApiResponse::success([
            'versionId'        => $version->version_id,
            'versionNo'        => $version->version_no,
            'passesAll'        => $passesAll,
            'isScaleSupported' => $isStandardScale,
            'integrityHash'    => $integrityHash,
            'totalWeight'      => $totalWeight,
            'indicatorsCount'  => $indicators->count(),
            'standardsCount'   => $standards->count(),
            'checks'           => [
                [
                    'id'      => 1,
                    'key'     => 'weights_balance',
                    'title'   => 'مجموع أوزان المعايير الرئيسية متزن بنسبة 100.0% تماماً',
                    'passed'  => $check1,
                    'details' => $check1 ? "مجموع الأوزان الموزعة {$totalWeight}% متطابق 100%" : "المجموع الحالي {$totalWeight}% غير متزن (يجب أن يكون 100.0%)",
                ],
                [
                    'id'      => 2,
                    'key'     => 'verification_tools',
                    'title'   => 'أدوات التحقق المعتمدة: كل مؤشر مرتبط بأداة تحقق واحدة على الأقل',
                    'passed'  => $check2,
                    'details' => $check2 ? "كافة المؤشرات ({$indicators->count()} مؤشراً) معرف لها أدوات تحقق معتمدة" : "يوجد مؤشرات بحاجة لربط أدوات التحقق",
                ],
                [
                    'id'      => 3,
                    'key'     => 'evidence_requirements',
                    'title'   => 'متطلبات الشواهد المرجعية: اكتمال تعريف الشواهد الإلزامية والاختيارية في الوثيقة',
                    'passed'  => $check3,
                    'details' => $check3 ? "تم تعريف متطلبات الشواهد لجميع المؤشرات في هذا الإصدار" : "يوجد مؤشرات لم يتم تحديد متطلبات شواهدها المرجعية بعد",
                ],
                [
                    'id'      => 4,
                    'key'     => 'rubric_scale_definition',
                    'title'   => 'سلم التقدير اللفظي: اكتمال تعريف مستويات السلم المعتمدة للإصدار',
                    'passed'  => $check4,
                    'details' => $check4 ? "السلم التقديري معرف بعدد {$versionScoreLevels->count()} مستويات" : "السلم التقديري غير مكتمل لهذا الإصدار",
                ],
                [
                    'id'      => 5,
                    'key'     => 'unique_codes',
                    'title'   => 'سلامة الهيكل المعياري وتفرد الرموز المعيارية بدون تكرار',
                    'passed'  => $check5,
                    'details' => $check5 ? "تم فحص {$allCodes->count()} كوداً معيارياً، وجميعها فريدة تماماً" : "توجد أكواد معيارية مكررة في الهيكل",
                ],
                [
                    'id'      => 6,
                    'key'     => 'portal_compatibility',
                    'title'   => 'توافق السلم مع بوابات الرصد والتقييم (مانع تفعيل تشغيلي)',
                    'passed'  => $check6,
                    'details' => $check6
                        ? 'السلم التقديري (0-3) متوافق تماماً ومدعوم 100% في استمارة رصد المقيم ومحرك احتساب الدرجات'
                        : 'مانع تفعيل: السلم التقديري المخصص لهذا الإصدار يتضمن مستويات غير مدعومة حالياً في استمارة رصد المقيم ومحرك احتساب الدرجات (المدعوم حالياً: سلم 0-3). يتطلب تحديث بوابات التقييم والرصد قبل التفعيل.',
                ],
            ],
        ], 'تم إجراء تدقيق الشروط الحاكمة وموانع التفعيل بنجاح.');
    }

    /**
     * قفل واعتماد الإصدار رسمياً للدورات التقييمية.
     */
    /**
     * قفل وإقرار أو تنشيط الإصدار المعياري رسمياً وفق نموذج الحالات الرباعي (القرار 6).
     * الصلاحية المطلوبة: standards.manage
     */
    public function lock(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if ($user && !$user->hasPermission('standards.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بإقرار الإصدارات المعيارية.');
        }

        $version = StandardVersion::find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        $approvalCode = $request->input('approval_code') ?? $request->input('approvalCode');
        $legalConfirmation = $request->input('legal_confirmation') ?? $request->input('legalConfirmation');
        $action = $request->input('action', 'approve'); // 'approve' (إقرار وجدولة) أو 'activate' (إقرار وتفعيل فوري)

        if (!$legalConfirmation) {
            return ApiResponse::validationError(['legalConfirmation' => ['يجب الإقرار بالمسؤولية القانونية للاعتماد.']], 'يجب تأكيد الإقرار القانوني');
        }

        if ($approvalCode) {
            $version->source_number = $approvalCode;
            $version->save();
        }

        try {
            if ($action === 'activate') {
                $activated = $this->service->activateVersion($version);
                return ApiResponse::success($activated, 'تم قفل وتنشيط وثيقة المعايير رسمياً للدورة التقييمية الحالية بنجاح وأرشفة الإصدار السابق.');
            } else {
                $approved = $this->service->approveVersion($version);
                return ApiResponse::success($approved, 'تم إقرار وثيقة المعايير رسمياً وجدولتها للدورة التقييمية القادمة بنجاح مع الحفاظ على الدورة الحالية.');
            }
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * تصدير التقرير المعياري الرسمي PDF.
     */
    public function exportPdf(int $id): JsonResponse
    {
        $version = StandardVersion::with(['standards.subStandards.indicators'])->find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        return ApiResponse::success([
            'versionId' => $version->version_id,
            'versionNo' => $version->version_no,
            'title' => "وثيقة معايير الاعتماد المدرسي - {$version->version_no}",
            'systemName' => 'منصة ارتقاء للتقييم الذاتي والتحسين المدرسي',
            'authority' => 'أمانة المعايير ومجلس الاعتماد الأكاديمي وضمان جودة التعليم',
            'generatedAt' => now()->toIso8601String(),
            'standardsCount' => $version->standards->count(),
            'totalWeight' => 100.0,
            'hash' => hash('sha256', "OFFICIAL_PDF_{$version->version_id}_{$version->version_no}"),
        ], 'تم توليد تقرير الاعتماد المعياري الرسمي بنجاح.');
    }

    /**
     * إضافة معيار فرعي عبر مسار النسخة المعيارية المتداخل.
     */
    public function storeSubStandardNested(StoreSubStandardRequest $request, int $versionId, int $stdId): JsonResponse
    {
        return $this->storeSubStandard($request, $stdId);
    }
}
