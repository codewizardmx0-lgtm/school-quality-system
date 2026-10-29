<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Standards\CloneStandardVersionRequest;
use App\Http\Requests\Standards\CreateStandardVersionRequest;
use App\Http\Requests\Standards\SaveEvidenceRequirementRequest;
use App\Http\Requests\Standards\UpdateIndicatorDescriptorsRequest;
use App\Http\Requests\Standards\UpdateIndicatorRequest;
use App\Http\Requests\Standards\UpdateStandardRequest;
use App\Http\Requests\Standards\UpdateStandardVersionRequest;
use App\Http\Requests\Standards\UpdateSubStandardRequest;
use App\Http\Requests\Standards\UpdateWeightsRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\SubStandard;
use App\Services\StandardManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        return ApiResponse::success(data: $versions, message: 'تم استرجاع الإصدارات المعيارية بنجاح.');
    }

    /**
     * إنشاء مسودة إصدار جديدة فارغة.
     * الصلاحية المطلوبة: standards.manage
     */
    public function store(CreateStandardVersionRequest $request): JsonResponse
    {
        $version = $this->service->createDraft($request->validated());

        return ApiResponse::success(data: $version, message: 'تم إنشاء مسودة الإصدار المعياري بنجاح.', status: 201);
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
            return ApiResponse::success(data: $newVersion, message: 'تم استنساخ الإصدار بنجاح وإنشاء مسودة مطابقة قابلة للتطوير.', status: 201);
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
}
