<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\School\SaveEnrollmentMetricsRequest;
use App\Http\Requests\School\SaveFacilityRequest;
use App\Http\Requests\School\SaveStaffMetricsRequest;
use App\Http\Requests\School\UpdateSchoolProfileRequest;
use App\Http\Resources\SchoolResource;
use App\Http\Responses\ApiResponse;
use App\Models\School;
use App\Models\SchoolEnrollmentMetric;
use App\Models\SchoolFacility;
use App\Models\SchoolStaffMetric;
use App\Services\SchoolMetricsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * متحكم الإدارة الشاملة لبيانات المدرسة وإحصاءاتها ومرافقها (الشريحة 6).
 *
 * يطبق العزل المؤسسي الصارم (القرار 9) بإرجاع 404 عند محاولة الوصول لمدرسة أخرى،
 * ويتحقق من صلاحيات التعديل للمدرسة المصرح بها (403).
 */
class SchoolManagementController extends Controller
{
    /**
     * فحص وجود المدرسة وتطبيق العزل المؤسسي الصارم (القرار 9).
     */
    protected function resolveAuthorizedSchool(Request $request, int $schoolId): ?School
    {
        $school = School::find($schoolId);
        if (! $school) {
            return null;
        }

        $user = $request->user();
        if ($user && $user->user_type === 'school' && (int) $user->school_id !== (int) $school->school_id) {
            // عزل مؤسسي صريح: 404 لمنع كشف وجود مدرسة أخرى
            return null;
        }

        return $school;
    }

    /**
     * التحقق من صلاحية تعديل بيانات المدرسة.
     */
    protected function canManageSchool(Request $request, School $school): bool
    {
        $user = $request->user();
        if (! $user) {
            return false;
        }

        if ($user->hasRole('admin') || $user->hasPermission('schools.manage')) {
            return true;
        }

        if ($user->user_type === 'school' && (int) $user->school_id === (int) $school->school_id) {
            return $user->hasRole('school_principal')
                || $user->hasRole('school_evaluator')
                || $user->hasPermission('evaluations.edit')
                || $user->hasPermission('evaluations.create');
        }

        return false;
    }

    /**
     * عرض الملف التعريفي وسياق المدرسة العام.
     */
    public function getProfile(Request $request, int $schoolId, SchoolMetricsService $service): JsonResponse
    {
        $school = $this->resolveAuthorizedSchool($request, $schoolId);
        if (! $school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $academicYear = $request->query('academic_year') ?? $request->input('academicYear') ?? '2025/2026';
        $context = $service->getSchoolContext($school, $academicYear);

        return ApiResponse::success(
            data: [
                'school'  => (new SchoolResource($school))->resolve($request),
                'context' => $context,
            ],
            message: 'تم استرجاع الملف التعريفي للمدرسة بنجاح.'
        );
    }

    /**
     * تحديث الملف التعريفي الموسع للمدرسة.
     */
    public function updateProfile(UpdateSchoolProfileRequest $request, int $schoolId): JsonResponse
    {
        $school = $this->resolveAuthorizedSchool($request, $schoolId);
        if (! $school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        if (! $this->canManageSchool($request, $school)) {
            return ApiResponse::forbidden('غير مصرح لك بتعديل بيانات هذه المدرسة.');
        }

        $data = $request->validated();
        $fields = [];

        if (array_key_exists('address', $data)) $fields['address'] = $data['address'];
        if (array_key_exists('phone', $data)) $fields['phone'] = $data['phone'];
        if (array_key_exists('email', $data)) $fields['email'] = $data['email'];
        if (array_key_exists('educationalAdmin', $data)) $fields['educational_admin'] = $data['educationalAdmin'];
        if (array_key_exists('buildingType', $data)) $fields['building_type'] = $data['buildingType'];
        if (array_key_exists('shiftType', $data)) $fields['shift_type'] = $data['shiftType'];
        if (array_key_exists('totalArea', $data)) $fields['total_area'] = $data['totalArea'];
        if (array_key_exists('builtUpArea', $data)) $fields['built_up_area'] = $data['builtUpArea'];

        $school->update($fields);

        return ApiResponse::success(
            data: (new SchoolResource($school->fresh()))->resolve($request),
            message: 'تم تحديث الملف التعريفي للمدرسة بنجاح.'
        );
    }

    /**
     * استعراض إحصاءات الكادر التعليمي والإداري للعام الدراسي.
     */
    public function getStaffMetrics(Request $request, int $schoolId): JsonResponse
    {
        $school = $this->resolveAuthorizedSchool($request, $schoolId);
        if (! $school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $academicYear = $request->query('academic_year') ?? $request->input('academicYear') ?? '2025/2026';
        $metric = $school->staffMetrics()->where('academic_year', $academicYear)->first();

        return ApiResponse::success(
            data: [
                'schoolId'                   => $school->school_id,
                'academicYear'               => $academicYear,
                'totalTeachers'              => $metric ? (int) $metric->total_teachers : 0,
                'qualifiedTeachersCount'     => $metric ? (int) $metric->qualified_teachers_count : 0,
                'permanentTeachersCount'     => $metric ? (int) $metric->permanent_teachers_count : 0,
                'matchedSpecializationCount' => $metric ? (int) $metric->matched_specialization_count : 0,
                'totalAdminStaff'            => $metric ? (int) $metric->total_admin_staff : 0,
                'totalServiceStaff'          => $metric ? (int) $metric->total_service_staff : 0,
                'updatedAt'                  => $metric?->updated_at?->toIso8601ZuluString(),
            ],
            message: 'تم استرجاع إحصاءات الكادر بنجاح.'
        );
    }

    /**
     * حفظ أو تحديث إحصاءات الكادر التعليمي والإداري التجميعية (Upsert).
     */
    public function saveStaffMetrics(SaveStaffMetricsRequest $request, int $schoolId): JsonResponse
    {
        $school = $this->resolveAuthorizedSchool($request, $schoolId);
        if (! $school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        if (! $this->canManageSchool($request, $school)) {
            return ApiResponse::forbidden('غير مصرح لك بتعديل إحصاءات الكادر.');
        }

        $data = $request->validated();

        $metric = SchoolStaffMetric::updateOrCreate(
            [
                'school_id'     => $school->school_id,
                'academic_year' => $data['academicYear'],
            ],
            [
                'total_teachers'               => $data['totalTeachers'],
                'qualified_teachers_count'     => $data['qualifiedTeachersCount'],
                'permanent_teachers_count'     => $data['permanentTeachersCount'],
                'matched_specialization_count' => $data['matchedSpecializationCount'],
                'total_admin_staff'            => $data['totalAdminStaff'],
                'total_service_staff'          => $data['totalServiceStaff'],
            ]
        );

        return ApiResponse::success(
            data: [
                'schoolId'                   => $school->school_id,
                'academicYear'               => $metric->academic_year,
                'totalTeachers'              => (int) $metric->total_teachers,
                'qualifiedTeachersCount'     => (int) $metric->qualified_teachers_count,
                'permanentTeachersCount'     => (int) $metric->permanent_teachers_count,
                'matchedSpecializationCount' => (int) $metric->matched_specialization_count,
                'totalAdminStaff'            => (int) $metric->total_admin_staff,
                'totalServiceStaff'          => (int) $metric->total_service_staff,
                'updatedAt'                  => $metric->updated_at?->toIso8601ZuluString(),
            ],
            message: 'تم حفظ إحصاءات الكادر التعليمي والإداري بنجاح.'
        );
    }

    /**
     * استعراض إحصاءات الطلاب وتوزيع الفصول.
     */
    public function getEnrollmentMetrics(Request $request, int $schoolId): JsonResponse
    {
        $school = $this->resolveAuthorizedSchool($request, $schoolId);
        if (! $school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $academicYear = $request->query('academic_year') ?? $request->input('academicYear') ?? '2025/2026';
        $rows = $school->enrollmentMetrics()
            ->where('academic_year', $academicYear)
            ->orderBy('id')
            ->get();

        $items = $rows->map(function (SchoolEnrollmentMetric $m) {
            return [
                'id'                  => $m->id,
                'educationLevel'      => $m->education_level,
                'gradeLevel'          => $m->grade_level,
                'classesCount'        => (int) $m->classes_count,
                'maleStudentsCount'   => (int) $m->male_students_count,
                'femaleStudentsCount' => (int) $m->female_students_count,
                'totalStudents'       => (int) ($m->male_students_count + $m->female_students_count),
                'specialNeedsCount'   => (int) $m->special_needs_count,
                'talentedCount'       => (int) $m->talented_count,
            ];
        });

        $totalStudents = $rows->sum(fn ($m) => $m->male_students_count + $m->female_students_count);
        $totalClasses = $rows->sum('classes_count');

        return ApiResponse::success(
            data: [
                'schoolId'            => $school->school_id,
                'academicYear'        => $academicYear,
                'totalStudents'       => (int) $totalStudents,
                'totalClasses'        => (int) $totalClasses,
                'specialNeedsTotal'   => (int) $rows->sum('special_needs_count'),
                'talentedTotal'       => (int) $rows->sum('talented_count'),
                'items'               => $items,
            ],
            message: 'تم استرجاع إحصاءات الطلاب وتوزيع الفصول بنجاح.'
        );
    }

    /**
     * حفظ وتحديث إحصاءات قيد وتوزيع الطلاب والفصول (Bulk Upsert).
     */
    public function saveEnrollmentMetrics(SaveEnrollmentMetricsRequest $request, int $schoolId): JsonResponse
    {
        $school = $this->resolveAuthorizedSchool($request, $schoolId);
        if (! $school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        if (! $this->canManageSchool($request, $school)) {
            return ApiResponse::forbidden('غير مصرح لك بتعديل إحصاءات الطلاب.');
        }

        $data = $request->validated();
        $academicYear = $data['academicYear'];

        DB::transaction(function () use ($school, $academicYear, $data) {
            foreach ($data['items'] as $item) {
                SchoolEnrollmentMetric::updateOrCreate(
                    [
                        'school_id'       => $school->school_id,
                        'academic_year'   => $academicYear,
                        'education_level' => $item['educationLevel'],
                        'grade_level'     => $item['gradeLevel'],
                    ],
                    [
                        'classes_count'         => $item['classesCount'],
                        'male_students_count'    => $item['maleStudentsCount'],
                        'female_students_count'  => $item['femaleStudentsCount'],
                        'special_needs_count'    => $item['specialNeedsCount'] ?? 0,
                        'talented_count'         => $item['talentedCount'] ?? 0,
                    ]
                );
            }
        });

        return $this->getEnrollmentMetrics($request, $schoolId);
    }

    /**
     * استعراض قائمة مرافق وتجهيزات المدرسة.
     */
    public function getFacilities(Request $request, int $schoolId): JsonResponse
    {
        $school = $this->resolveAuthorizedSchool($request, $schoolId);
        if (! $school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $facilities = $school->facilities()->orderBy('facility_id')->get();

        $items = $facilities->map(function (SchoolFacility $f) {
            return [
                'facilityId'   => $f->facility_id,
                'facilityType' => $f->facility_type,
                'name'         => $f->name,
                'count'        => (int) $f->count,
                'isUsable'     => (bool) $f->is_usable,
                'details'      => $f->details ?? [],
                'createdAt'    => $f->created_at?->toIso8601ZuluString(),
            ];
        });

        return ApiResponse::success(
            data: [
                'schoolId'   => $school->school_id,
                'facilities' => $items,
            ],
            message: 'تم استرجاع قائمة مرافق المدرسة بنجاح.'
        );
    }

    /**
     * إضافة مرفق جديد للمدرسة.
     */
    public function storeFacility(SaveFacilityRequest $request, int $schoolId): JsonResponse
    {
        $school = $this->resolveAuthorizedSchool($request, $schoolId);
        if (! $school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        if (! $this->canManageSchool($request, $school)) {
            return ApiResponse::forbidden('غير مصرح لك بإضافة مرافق لهذه المدرسة.');
        }

        $data = $request->validated();

        $facility = SchoolFacility::create([
            'school_id'     => $school->school_id,
            'facility_type' => $data['facilityType'],
            'name'          => $data['name'],
            'count'         => $data['count'],
            'is_usable'     => $data['isUsable'],
            'details'       => $data['details'] ?? null,
        ]);

        return ApiResponse::success(
            data: [
                'facilityId'   => $facility->facility_id,
                'facilityType' => $facility->facility_type,
                'name'         => $facility->name,
                'count'        => (int) $facility->count,
                'isUsable'     => (bool) $facility->is_usable,
                'details'      => $facility->details ?? [],
            ],
            message: 'تم إضافة المرفق المدرسي بنجاح.',
            status: 201
        );
    }

    /**
     * تعديل بيانات مرفق موجود.
     */
    public function updateFacility(SaveFacilityRequest $request, int $schoolId, int $facilityId): JsonResponse
    {
        $school = $this->resolveAuthorizedSchool($request, $schoolId);
        if (! $school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        if (! $this->canManageSchool($request, $school)) {
            return ApiResponse::forbidden('غير مصرح لك بتعديل مرافق هذه المدرسة.');
        }

        $facility = SchoolFacility::where('school_id', $school->school_id)
            ->where('facility_id', $facilityId)
            ->first();

        if (! $facility) {
            return ApiResponse::notFound('المرفق المطلوب غير موجود.');
        }

        $data = $request->validated();
        $facility->update([
            'facility_type' => $data['facilityType'],
            'name'          => $data['name'],
            'count'         => $data['count'],
            'is_usable'     => $data['isUsable'],
            'details'       => $data['details'] ?? null,
        ]);

        return ApiResponse::success(
            data: [
                'facilityId'   => $facility->facility_id,
                'facilityType' => $facility->facility_type,
                'name'         => $facility->name,
                'count'        => (int) $facility->count,
                'isUsable'     => (bool) $facility->is_usable,
                'details'      => $facility->details ?? [],
            ],
            message: 'تم تحديث بيانات المرفق بنجاح.'
        );
    }

    /**
     * حذف مرفق مدرسي.
     */
    public function deleteFacility(Request $request, int $schoolId, int $facilityId): JsonResponse
    {
        $school = $this->resolveAuthorizedSchool($request, $schoolId);
        if (! $school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        if (! $this->canManageSchool($request, $school)) {
            return ApiResponse::forbidden('غير مصرح لك بحذف مرافق هذه المدرسة.');
        }

        $facility = SchoolFacility::where('school_id', $school->school_id)
            ->where('facility_id', $facilityId)
            ->first();

        if (! $facility) {
            return ApiResponse::notFound('المرفق المطلوب غير موجود.');
        }

        $facility->delete();

        return ApiResponse::success(
            data: null,
            message: 'تم حذف المرفق المدرسي بنجاح.'
        );
    }
}
