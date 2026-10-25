<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSchoolRequest;
use App\Http\Requests\Admin\UpdateSchoolRequest;
use App\Http\Resources\SchoolResource;
use App\Http\Responses\ApiResponse;
use App\Models\School;
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

        $school = School::create([
            'school_name'          => $data['schoolName'],
            'educational_stage'    => $data['educationalStage'],
            'identification_data'  => $data['identificationData'] ?? null,
            'educational_district' => $data['educationalDistrict'],
            'governorate'         => $data['governorate'],
            'status'              => $data['status'],
        ]);

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
        if (isset($data['educationalStage'])) {
            $fields['educational_stage'] = $data['educationalStage'];
        }
        if (array_key_exists('identificationData', $data)) {
            $fields['identification_data'] = $data['identificationData'];
        }
        if (isset($data['educationalDistrict'])) {
            $fields['educational_district'] = $data['educationalDistrict'];
        }
        if (isset($data['governorate'])) {
            $fields['governorate'] = $data['governorate'];
        }
        if (isset($data['status'])) {
            $fields['status'] = $data['status'];
        }

        $school->update($fields);

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
