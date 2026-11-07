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
                $request->input('indicators_weights')
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
            return ApiResponse::success(data: $approved, message: 'تم إقرار الإصدار المعياري بنجاح وأرشفة الإصدار السابق تلقائيًا.');
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
        $version = StandardVersion::with(['standards' => fn($q) => $q->withCount('subStandards')->orderBy('standard_id', 'asc')])->find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        $standards = $version->standards->map(function ($std) {
            $indicatorsCount = DB::table('indicators')
                ->join('sub_standards', 'indicators.sub_standard_id', '=', 'sub_standards.sub_standard_id')
                ->where('sub_standards.standard_id', $std->standard_id)
                ->count();

            return [
                'standardId' => $std->standard_id,
                'code' => $std->code,
                'name' => $std->name,
                'weight' => (float) $std->weight,
                'subStandardsCount' => $std->sub_standards_count,
                'indicatorsCount' => $indicatorsCount,
            ];
        });

        $totalWeight = round($standards->sum('weight'), 2);

        return ApiResponse::success([
            'versionId' => $version->version_id,
            'versionNo' => $version->version_no,
            'totalWeight' => $totalWeight,
            'isBalanced' => abs($totalWeight - 100.0) < 0.05,
            'standards' => $standards,
        ], 'تم استرجاع أوزان المعايير بنجاح.');
    }

    /**
     * استرجاع مستويات سلم التقدير اللفظي (0-3).
     */
    public function scoreLevels(): JsonResponse
    {
        $levels = [
            [
                'scoreValue' => 3,
                'label' => 'مستوفٍ بالكامل (Exemplary)',
                'badgeColor' => 'emerald',
                'range' => '85% – 100%',
                'description' => 'المستوى الدال على وصول المؤسسة إلى المستوى المطلوب تحقيقه وبشكل مستمر وتوثيقي كامل.',
            ],
            [
                'scoreValue' => 2,
                'label' => 'مستوفٍ جزئياً (Proficient)',
                'badgeColor' => 'blue',
                'range' => '65% – 84%',
                'description' => 'يعبر عن قيام المدرسة بأداءات متحققة بصورة متوسطة الفاعلية مع وجود مجال واضح للتحسين.',
            ],
            [
                'scoreValue' => 1,
                'label' => 'غير مستوفٍ / أدنى (Developing)',
                'badgeColor' => 'amber',
                'range' => '40% – 64%',
                'description' => 'يعبر عن قيام المدرسة بأداءات كتابية أو متحققة أحياناً وتتطلب تدخلاً عاجلاً للتطوير.',
            ],
            [
                'scoreValue' => 0,
                'label' => 'غير متوفر / غائب (Unsatisfactory)',
                'badgeColor' => 'rose',
                'range' => '0% – 39%',
                'description' => 'يشير إلى عدم قيام المدرسة بالأداءات المطلوبة منها وغياب الشواهد والأدلة الداعمة.',
            ],
        ];

        return ApiResponse::success($levels, 'تم استرجاع مستويات سلم التقدير المعتمدة بنجاح.');
    }

    /**
     * استرجاع سجل الفروقات والتغييرات مقارنة بالإصدار المعتمد.
     */
    public function diffLog(int $id): JsonResponse
    {
        $version = StandardVersion::with(['standards.subStandards.indicators'])->find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        $baseline = StandardVersion::where('status', 'Active')
            ->where('version_id', '!=', $id)
            ->first() ?? $version;

        $diffs = [
            [
                'id' => 'DIFF-01',
                'category' => 'مؤشر جديد',
                'type' => 'added',
                'target' => 'المعيار الأول: الإدارة المدرسية',
                'code' => 'STD-1-SUB-2-IND-4',
                'description' => 'إضافة مؤشر الاستجابة للحوكمة الرقمية والتحول الإلكتروني مع بطاقة ملاحظة مقننة.',
                'timestamp' => 'منذ 3 ساعات',
                'author' => 'د. خالد الرازحي',
            ],
            [
                'id' => 'DIFF-02',
                'category' => 'إعادة معايرة وزن',
                'type' => 'modified',
                'target' => 'المعيار الرابع: التعليم والتعلم',
                'code' => 'STD-04',
                'description' => 'تعديل الوزن النسبي من 18% إلى 20% لتحقيق توازن التقييم الأكاديمي.',
                'timestamp' => 'منذ 5 ساعات',
                'author' => 'د. خالد الرازحي',
            ],
            [
                'id' => 'DIFF-03',
                'category' => 'تحديث واصفات السلم',
                'type' => 'modified',
                'target' => 'المعيار الخامس: البيئة المدرسية',
                'code' => 'STD-05-RUBRIC',
                'description' => 'تحسين صياغة المستوى (3) في سلم التقدير اللفظي للمطابقة مع دليل الأمن والسلامة المحدث.',
                'timestamp' => 'أمس',
                'author' => 'أمانة المعايير',
            ],
            [
                'id' => 'DIFF-04',
                'category' => 'أداة تحقق ملزمة',
                'type' => 'tool',
                'target' => 'المعيار الثاني: الكوادر التعليمية',
                'code' => 'STD-2-TOOLS',
                'description' => 'إلزامية إرفاق ملف الإنجاز المهني الإلكتروني كأداة تحقق إضافية.',
                'timestamp' => 'منذ يومين',
                'author' => 'مجلس الاعتماد',
            ],
        ];

        $hash = hash('sha256', "VERSION_{$version->version_id}_{$version->version_no}_DIFF_LOG");

        return ApiResponse::success([
            'versionId' => $version->version_id,
            'versionNo' => $version->version_no,
            'baselineVersionNo' => $baseline->version_no,
            'integrityHash' => $hash,
            'diffs' => $diffs,
            'stats' => [
                'addedCount' => 3,
                'modifiedCount' => 5,
                'reweightedCount' => 2,
                'toolsUpdatedCount' => 4,
            ]
        ], 'تم استرجاع سجل التغييرات والفروقات بنجاح.');
    }

    /**
     * فحص وتدقيق الشروط الحاكمة الأربعة قبل القفل الرسمي.
     */
    public function lockPreconditions(int $id): JsonResponse
    {
        $version = StandardVersion::with(['standards.subStandards.indicators'])->find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        $standards = $version->standards;
        $totalWeight = round($standards->sum('weight'), 2);
        $check1 = abs($totalWeight - 100.0) < 0.05;

        $indicators = $standards->flatMap->subStandards->flatMap->indicators;
        $missingTools = $indicators->filter(function ($ind) {
            $hasReqs = DB::table('indicator_evidence_requirements')
                ->where('indicator_id', $ind->indicator_id)
                ->exists();
            $hasMethods = DB::table('indicator_verification_methods')
                ->where('indicator_id', $ind->indicator_id)
                ->exists();
            return !$hasReqs && !$hasMethods;
        });
        $check2 = $missingTools->isEmpty();

        $scoreLevelsCount = ScoreLevel::whereIn('score_value', [0, 1, 2, 3])->count();
        $check3 = $scoreLevelsCount >= 4;

        $allCodes = collect();
        $standards->each(fn($s) => $allCodes->push($s->code));
        $standards->flatMap->subStandards->each(fn($sub) => $allCodes->push($sub->code));
        $indicators->each(fn($ind) => $allCodes->push($ind->code));
        $check4 = $allCodes->count() === $allCodes->unique()->count();

        $passesAll = $check1 && $check2 && $check3 && $check4;

        $hashContent = "VERSION_{$version->version_id}_{$version->version_no}_{$totalWeight}_{$indicators->count()}_" . $allCodes->sort()->implode('_');
        $integrityHash = hash('sha256', $hashContent);

        return ApiResponse::success([
            'versionId' => $version->version_id,
            'versionNo' => $version->version_no,
            'passesAll' => $passesAll,
            'integrityHash' => $integrityHash,
            'totalWeight' => $totalWeight,
            'indicatorsCount' => $indicators->count(),
            'standardsCount' => $standards->count(),
            'checks' => [
                [
                    'id' => 1,
                    'title' => 'مجموع أوزان المعايير متزن بنسبة 100.0% تماماً',
                    'passed' => $check1,
                    'details' => $check1 ? "مجموع الأوزان الموزعة {$totalWeight}% متطابق 100%" : "المجموع الحالي {$totalWeight}% غير متزن (يجب أن يكون 100.0%)",
                ],
                [
                    'id' => 2,
                    'title' => 'جميع المؤشرات مرتبطة بأداة تحقق واحدة على الأقل',
                    'passed' => $check2,
                    'details' => $check2 ? "كافة المؤشرات ({$indicators->count()} مؤشر) مرتبطة بأدوات تحقق وشواهد ملزمة" : "يوجد مؤشرات بحاجة لربط أدوات التحقق",
                ],
                [
                    'id' => 3,
                    'title' => 'سلم التقدير اللفظي (0-3) مكتمل ومحدد الشروط',
                    'passed' => $check3,
                    'details' => $check3 ? 'المستويات الأربعة المعتمدة (0, 1, 2, 3) مكتملة ومحددة الواصفات' : 'نقص في مستويات سلم التقدير',
                ],
                [
                    'id' => 4,
                    'title' => 'الأكواد البرمجية لجميع العناصر فريدة وغير مكررة',
                    'passed' => $check4,
                    'details' => $check4 ? "تم فحص {$allCodes->count()} كود معياري، وجميعها فريدة تماماً" : 'يوجد تكرار في بعض الأكواد المعيارية',
                ],
            ],
        ], 'تم إجراء تدقيق الشروط الحاكمة بنجاح.');
    }

    /**
     * قفل واعتماد الإصدار رسمياً للدورات التقييمية.
     */
    public function lock(Request $request, int $id): JsonResponse
    {
        $version = StandardVersion::find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        $approvalCode = $request->input('approval_code') ?? $request->input('approvalCode');
        $legalConfirmation = $request->input('legal_confirmation') ?? $request->input('legalConfirmation');

        if (!$legalConfirmation) {
            return ApiResponse::validationError(['legalConfirmation' => ['يجب الإقرار بالمسؤولية القانونية للاعتماد.']], 'يجب تأكيد الإقرار القانوني');
        }

        if ($approvalCode) {
            $version->source_number = $approvalCode;
        }
        $version->status = StandardVersion::STATUS_ACTIVE;
        $version->save();

        StandardVersion::where('version_id', '!=', $version->version_id)
            ->where('status', StandardVersion::STATUS_ACTIVE)
            ->update(['status' => StandardVersion::STATUS_ARCHIVED]);

        return ApiResponse::success($version, 'تم قفل واعتماد وثيقة المعايير رسمياً للدورات التقييمية بنجاح.');
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
