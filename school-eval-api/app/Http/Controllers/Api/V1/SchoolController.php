<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSchoolRequest;
use App\Http\Requests\Admin\UpdateSchoolRequest;
use App\Http\Resources\SchoolResource;
use App\Http\Responses\ApiResponse;
use App\Models\Directorate;
use App\Models\Governorate;
use App\Models\School;
use App\Services\AuditLoggerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * متحكم استعراض وإدارة المدارس (SchoolController).
 *
 * يطبق العزل المؤسسي الدقيق (Tenant Isolation) وفق NFR-SEC-03 و BR-GEN-04:
 * - مسؤول النظام والوزارة: استعراض المدارس المصرح بها.
 * - مسؤول النظام: إضافة وتعديل وتفعيل/تعطيل المدارس (سياسة تعطيل لا حذف).
 * - مستخدم المدرسة: استعراض مدرسته فقط؛ وفي حال طلب مورد مدرسة أخرى يُرجع 404 بدلاً من 403 لمنع كشف وجوده (القرار 9).
 */
class SchoolController extends Controller
{
    /**
     * استعراض قائمة المدارس مع العزل بحسب دور ونطاق المستخدم.
     */
        /**
     * اقتراح كود المدرسة تلقائيًا وفق الصيغة SCH-{GOV_CODE}-2026-{serial}
     */
    public function suggestCode(Request $request): JsonResponse
    {
        $govId = (int) $request->query('governorateId', 1);
        $gov = Governorate::find($govId);
        $govCode = $gov?->code ?? 'AMANA';

        $prefix = "SCH-{$govCode}-2026-";
        $schools = School::where('governorate_id', $govId)
            ->orWhere('identification_data', 'like', "{$prefix}%")
            ->get();

        $maxSerial = 0;
        foreach ($schools as $school) {
            $code = $school->identification_data ?? '';
            if (preg_match('/' . preg_quote($prefix, '/') . '(\d+)/', $code, $matches)) {
                $num = (int) $matches[1];
                if ($num > $maxSerial) {
                    $maxSerial = $num;
                }
            }
        }

        $nextCode = sprintf('%s%03d', $prefix, $maxSerial + 1);

        return ApiResponse::success([
            'code'       => $nextCode,
            'govCode'    => $govCode,
            'nextSerial' => $maxSerial + 1,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = School::query();

        // عزل النطاق لمستخدمي المدارس: حصر القائمة في مدرسة المستخدم فقط
        if ($user->user_type === 'school') {
            $query->where('school_id', $user->school_id);
        }

        // إمكانية التصفية بحسب الحالة أو المحافظة
        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->has('governorate')) {
            $query->where('governorate', $request->query('governorate'));
        }
        if ($request->has('q')) {
            $term = $request->query('q');
            $query->where(function ($q) use ($term) {
                $q->where('school_name', 'like', "%{$term}%")
                  ->orWhere('identification_data', 'like', "%{$term}%")
                  ->orWhere('educational_district', 'like', "%{$term}%");
            });
        }

        $schools = $query->orderBy('school_id')->get();

        return ApiResponse::success(
            data: SchoolResource::collection($schools)->resolve($request),
            message: null
        );
    }

    /**
     * استعراض تفاصيل مدرسة محددة مع تطبيق العزل الصارم وحجب وجود المدارس الأخرى (404).
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $school = School::find($id);

        if (!$school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        // عزل المدارس: إذا كان المستخدم يتبع مدرسة وطلب مدرسة أخرى، أرجع 404 لمنع كشف وجود المورد (القرار 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $school->school_id) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        // فحص السياسة المعتمدة
        if ($user->cannot('view', $school)) {
            return ApiResponse::forbidden('غير مصرح');
        }

        return ApiResponse::success(
            data: (new SchoolResource($school))->resolve($request),
            message: null
        );
    }

    /**
     * إنشاء مدرسة جديدة (UI-ADM-02 / UC-ADM-01).
     */
    public function store(StoreSchoolRequest $request): JsonResponse
    {
        $data = $request->validated();

        $govId = $data['governorateId'] ?? null;
        if (!$govId && !empty($data['governorate'])) {
            $gov = Governorate::where('name_ar', $data['governorate'])
                ->orWhere('name_ar', 'like', '%' . $data['governorate'] . '%')
                ->first();
            $govId = $gov?->governorate_id;
        }

        $dirId = $data['directorateId'] ?? null;
        if (!$dirId && !empty($data['educationalDistrict'])) {
            $cleanName = str_replace('مديرية ', '', $data['educationalDistrict']);
            $dir = Directorate::where(function ($q) use ($data, $cleanName) {
                $q->where('name_ar', $data['educationalDistrict'])
                  ->orWhere('name_ar', "مديرية {$cleanName}")
                  ->orWhere('name_ar', $cleanName);
            });
            if ($govId) {
                $dir->where('governorate_id', $govId);
            }
            $dirId = $dir->first()?->directorate_id;
        }

        $school = School::create([
            'school_name'          => $data['schoolName'],
            'school_type'          => $data['schoolType'] ?? 'government',
            'educational_stage'    => $data['educationalStage'],
            'identification_data'  => $data['identificationData'] ?? null,
            'governorate_id'       => $govId,
            'directorate_id'       => $dirId,
            'educational_district' => $data['educationalDistrict'],
            'governorate'          => $data['governorate'],
            'status'               => $data['status'],
        ]);

        // توثيق في سجل التدقيق بقاعدة البيانات
        (new AuditLoggerService())->log(
            action: 'school.created',
            targetType: 'school',
            targetId: $school->school_id,
            newValues: ['name' => $school->school_name, 'type' => $school->school_type],
            schoolId: $school->school_id,
            descriptionAr: "تسجيل مدرسة جديدة في المنظومة: {$school->school_name}"
        );

        return ApiResponse::created(
            data: (new SchoolResource($school))->resolve($request),
            message: 'تم إضافة المدرسة بنجاح في دليل المدارس.'
        );
    }

    /**
     * تعديل بيانات مدرسة (UI-ADM-03).
     */
    public function update(UpdateSchoolRequest $request, int $id): JsonResponse
    {
        $school = School::find($id);

        if (!$school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $data = $request->validated();
        $fields = [];

        if (isset($data['schoolName'])) {
            $fields['school_name'] = $data['schoolName'];
        }
        if (isset($data['schoolType'])) {
            $fields['school_type'] = $data['schoolType'];
        }
        if (isset($data['educationalStage'])) {
            $fields['educational_stage'] = $data['educationalStage'];
        }
        if (array_key_exists('identificationData', $data)) {
            $fields['identification_data'] = $data['identificationData'];
        }
        if (isset($data['governorateId'])) {
            $fields['governorate_id'] = $data['governorateId'];
        }
        if (isset($data['directorateId'])) {
            $fields['directorate_id'] = $data['directorateId'];
        }
        if (isset($data['educationalDistrict'])) {
            $fields['educational_district'] = $data['educationalDistrict'];
            if (!isset($fields['directorate_id'])) {
                $cleanName = str_replace('مديرية ', '', $data['educationalDistrict']);
                $dir = Directorate::where(function ($q) use ($data, $cleanName) {
                    $q->where('name_ar', $data['educationalDistrict'])
                      ->orWhere('name_ar', "مديرية {$cleanName}")
                      ->orWhere('name_ar', $cleanName);
                })->first();
                if ($dir) $fields['directorate_id'] = $dir->directorate_id;
            }
        }
        if (isset($data['governorate'])) {
            $fields['governorate'] = $data['governorate'];
            if (!isset($fields['governorate_id'])) {
                $gov = Governorate::where('name_ar', $data['governorate'])
                    ->orWhere('name_ar', 'like', '%' . $data['governorate'] . '%')
                    ->first();
                if ($gov) $fields['governorate_id'] = $gov->governorate_id;
            }
        }
        if (isset($data['status'])) {
            $fields['status'] = $data['status'];
        }

        $school->update($fields);

        // توثيق في سجل التدقيق بقاعدة البيانات
        (new AuditLoggerService())->log(
            action: 'school.updated',
            targetType: 'school',
            targetId: $school->school_id,
            newValues: $fields,
            schoolId: $school->school_id,
            descriptionAr: "تحديث بيانات المدرسة: {$school->school_name}"
        );

        return ApiResponse::success(
            data: (new SchoolResource($school->fresh()))->resolve($request),
            message: 'تم تحديث بيانات المدرسة بنجاح.'
        );
    }

    /**
     * تفعيل أو تعطيل مدرسة (سياسة تعطيل لا حذف BR-GEN-04).
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('schools.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $school = School::find($id);
        if (!$school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $newStatus = $school->status === 'Active' ? 'Inactive' : 'Active';
        $school->update(['status' => $newStatus]);

        $message = $newStatus === 'Active' 
            ? 'تم تفعيل المدرسة بنجاح.' 
            : 'تم تعطيل المدرسة بنجاح.';

        return ApiResponse::success(
            data: (new SchoolResource($school->fresh()))->resolve($request),
            message: $message
        );
    }
}
