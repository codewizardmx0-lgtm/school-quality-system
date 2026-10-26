<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Evaluation;
use App\Models\School;
use App\Models\Standard;
use App\Models\User;
use App\Services\ReportsAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * متحكم التقارير والتحليلات وحساب النتائج (ReportsAnalyticsController) - الشريحة 4.
 *
 * يوفر نقاط النهاية المعتمدة لحساب نتائج التقييم ومؤشراته ومعاييره ونسب إنجاز الشواهد،
 * ولوحة معلومات المدرسة وخلاصة خطط التحسين وتصدير التقارير بصيغة JSON.
 *
 * قواعد الأمان والعزل المؤسسي (Decision #9):
 * 1. مسؤول النظام: يرى تقارير ولوحات جميع المدارس.
 * 2. المشرف الوزاري: يرى تقارير جميع المدارس ضمن صلاحياته الرقابية.
 * 3. مدير المدرسة والمقيم: محصورون بمدرستهم فقط. أي محاولة لطلب مدرسة أخرى تُرجع 404 فوراً.
 * 4. أي مستخدم غير مصرح أو مسؤول معايير (BR-MIN-01): يُرجع 403 ('غير مصرح').
 * 5. عدم السماح بحساب النتائج لتقييم غير مكتمل (Rule #8): يُرجع 422 مع تفاصيل النقص.
 */
class ReportsAnalyticsController extends Controller
{
    public function __construct(
        protected ReportsAnalyticsService $analyticsService
    ) {}

    /**
     * حساب وعرض النتائج النهائية للتقييم المدرسي الذاتي.
     *
     * GET /api/v1/schools/{school}/assessments/{assessment}/results
     */
    public function assessmentResults(Request $request, int $schoolId, int $assessmentId): JsonResponse
    {
        $authError = $this->authorizeReportAccess($request->user(), $schoolId);
        if ($authError) {
            return $authError;
        }

        $school = School::find($schoolId);
        if (!$school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $evaluation = Evaluation::with(['cycle', 'school'])->find($assessmentId);
        if (!$evaluation || (int) $evaluation->school_id !== (int) $schoolId) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        // التحقق من اكتمال التقييم وفق القاعدة 8
        $completeness = $this->analyticsService->checkEvaluationCompleteness($evaluation);
        if (!$completeness['is_complete']) {
            return ApiResponse::validationError(
                errors: [
                    'evaluation' => [
                        "التقييم غير مكتمل. تم تقييم {$completeness['evaluated_count']} من أصل {$completeness['total_indicators']} مؤشر معتمد.",
                    ],
                ],
                message: 'لا يمكن حساب النتائج النهائية لتقييم غير مكتمل.'
            );
        }

        $results = $this->analyticsService->calculateAssessmentResults($evaluation);

        return ApiResponse::success(
            data: $results,
            message: 'تم حساب نتائج التقييم بنجاح.'
        );
    }

    /**
     * حساب وعرض النتيجة المفصلة لمعيار محدد مع مؤشراته.
     *
     * GET /api/v1/schools/{school}/assessments/{assessment}/standards/{standard}/results
     */
    public function standardResults(Request $request, int $schoolId, int $assessmentId, string|int $standardId): JsonResponse
    {
        $authError = $this->authorizeReportAccess($request->user(), $schoolId);
        if ($authError) {
            return $authError;
        }

        $school = School::find($schoolId);
        if (!$school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $evaluation = Evaluation::with(['cycle', 'school'])->find($assessmentId);
        if (!$evaluation || (int) $evaluation->school_id !== (int) $schoolId) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        $standard = is_numeric($standardId)
            ? Standard::find($standardId)
            : Standard::where('code', $standardId)->first();

        if (!$standard) {
            return ApiResponse::notFound('المعيار المطلوب غير موجود.');
        }

        // التحقق من اكتمال مؤشرات هذا المعيار وفق القاعدة 8
        $completeness = $this->analyticsService->checkStandardCompleteness($evaluation, $standard);
        if (!$completeness['is_complete']) {
            return ApiResponse::validationError(
                errors: [
                    'standard' => [
                        "المعيار ({$standard->code}) غير مكتمل. تم تقييم {$completeness['evaluated_count']} من أصل {$completeness['total_indicators']} مؤشر.",
                    ],
                ],
                message: 'لا يمكن حساب نتيجة المعيار لأن بعض مؤشراته لم تُقيّم بعد.'
            );
        }

        $results = $this->analyticsService->calculateStandardResults($evaluation, $standard);

        return ApiResponse::success(
            data: $results,
            message: 'تم حساب نتيجة المعيار بنجاح.'
        );
    }

    /**
     * حساب ملخص ونسبة اكتمال الشواهد لكل مؤشر ومعيار.
     *
     * GET /api/v1/schools/{school}/assessments/{assessment}/evidence-summary
     */
    public function evidenceSummary(Request $request, int $schoolId, int $assessmentId): JsonResponse
    {
        $authError = $this->authorizeReportAccess($request->user(), $schoolId);
        if ($authError) {
            return $authError;
        }

        $school = School::find($schoolId);
        if (!$school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $evaluation = Evaluation::with(['cycle', 'school'])->find($assessmentId);
        if (!$evaluation || (int) $evaluation->school_id !== (int) $schoolId) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        $summary = $this->analyticsService->calculateEvidenceSummary($evaluation);

        return ApiResponse::success(
            data: $summary,
            message: 'تم حساب ملخص الشواهد بنجاح.'
        );
    }

    /**
     * حساب ملخص وحالة خطط التحسين المدرسي (قيد التنفيذ، مكتملة، متأخرة).
     *
     * GET /api/v1/schools/{school}/improvement-plans/summary
     */
    public function improvementPlansSummary(Request $request, int $schoolId): JsonResponse
    {
        $authError = $this->authorizeReportAccess($request->user(), $schoolId);
        if ($authError) {
            return $authError;
        }

        $school = School::find($schoolId);
        if (!$school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $summary = $this->analyticsService->calculateImprovementPlansSummary($school);

        return ApiResponse::success(
            data: $summary,
            message: 'تم حساب ملخص خطط التحسين بنجاح.'
        );
    }

    /**
     * لوحة معلومات المدرسة الموحدة (School Dashboard).
     *
     * GET /api/v1/schools/{school}/dashboard
     */
    public function dashboard(Request $request, int $schoolId): JsonResponse
    {
        $authError = $this->authorizeReportAccess($request->user(), $schoolId);
        if ($authError) {
            return $authError;
        }

        $school = School::find($schoolId);
        if (!$school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $dashboard = $this->analyticsService->getSchoolDashboard($school);

        return ApiResponse::success(
            data: $dashboard,
            message: 'تم تحميل لوحة بيانات المدرسة بنجاح.'
        );
    }

    /**
     * تصدير تقرير التقييم المكتمل بصيغة JSON مهيكلة للفرونت إند.
     *
     * GET /api/v1/schools/{school}/assessments/{assessment}/export
     */
    public function exportAssessment(Request $request, int $schoolId, int $assessmentId): JsonResponse
    {
        $authError = $this->authorizeReportAccess($request->user(), $schoolId);
        if ($authError) {
            return $authError;
        }

        $school = School::find($schoolId);
        if (!$school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $evaluation = Evaluation::with(['cycle', 'school'])->find($assessmentId);
        if (!$evaluation || (int) $evaluation->school_id !== (int) $schoolId) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        $completeness = $this->analyticsService->checkEvaluationCompleteness($evaluation);
        if (!$completeness['is_complete']) {
            return ApiResponse::validationError(
                errors: [
                    'evaluation' => [
                        "لا يمكن تصدير تقرير لتقييم غير مكتمل. تم تقييم {$completeness['evaluated_count']} من أصل {$completeness['total_indicators']} مؤشر.",
                    ],
                ],
                message: 'لا يمكن تصدير تقرير التقييم لملف غير مكتمل.'
            );
        }

        $exportedReport = $this->analyticsService->exportAssessmentReport($evaluation);

        return ApiResponse::success(
            data: $exportedReport,
            message: 'تم تصدير تقرير التقييم بنجاح.'
        );
    }

    /**
     * التحقق الصارم من الصلاحيات وقاعدة العزل المؤسسي للمدارس (القرار المعماري 9).
     */
    protected function authorizeReportAccess(?User $user, int $schoolId): ?JsonResponse
    {
        if (!$user) {
            return ApiResponse::unauthorized();
        }

        // مسؤول المعايير بالوزارة ممنوع صراحة من مراجعة مخرجات المدارس وفق BR-MIN-01
        if ($user->hasRole('ministry_standards_manager')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        // فحص امتلاك أي من الصلاحيات المعنية بالتقارير والتحليلات والتقييمات أو صفة المسؤول
        $hasReportingAccess = $user->hasRole('admin')
            || $user->user_type === 'admin'
            || $user->user_type === 'system'
            || $user->hasPermission('reports.view')
            || $user->hasPermission('analytics.view')
            || $user->hasPermission('evaluations.view')
            || $user->hasPermission('plans.view');

        if (!$hasReportingAccess) {
            return ApiResponse::forbidden('غير مصرح');
        }

        // القرار المعماري 9: عزل المدارس
        // إذا كان الفاعل مستخدم مدرسة، يجب أن يطابق school_id المدرسة المطلوبة حصراً،
        // وأي محاولة للوصول لمدرسة أخرى تُرجع 404 لمنع كشف وجودها.
        if ($user->user_type === 'school') {
            if ((int) $user->school_id !== (int) $schoolId) {
                return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
            }
        }

        return null;
    }
}
