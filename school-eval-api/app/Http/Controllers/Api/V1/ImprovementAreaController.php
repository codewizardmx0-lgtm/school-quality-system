<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\EvaluationResult;
use App\Models\ImprovementArea;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * متحكم مجالات التحسين (Improvement Areas).
 *
 * يوفر إدارة مجالات التحسين المستخلصة من نتائج التقييم الذاتي أو المدخلة يدويًا،
 * ويضمن العزل المؤسسي الدقيق عبر ربط كل مجال بنتيجة مؤشر مدرسة المستخدم.
 */
class ImprovementAreaController extends Controller
{
    /**
     * استعراض قائمة مجالات التحسين الخاصة بمدرسة المستخدم.
     *
     * GET /api/v1/improvement-areas
     * الصلاحية: plans.view أو plans.manage
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('plans.view') && !$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض مجالات التحسين.');
        }

        $query = ImprovementArea::with(['result.evaluation', 'indicator', 'plans'])
            ->orderBy('area_id', 'desc');

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school') {
            $query->whereHas('result.evaluation', function ($q) use ($user) {
                $q->where('school_id', $user->school_id);
            });
        }

        $areas = $query->get()->map(function ($area) {
            return $this->formatArea($area);
        });

        return ApiResponse::success(
            data: $areas,
            message: null
        );
    }

    /**
     * إنشاء مجال تحسين جديد (أو تبني اقتراح).
     *
     * POST /api/v1/improvement-areas
     * الصلاحية: plans.manage
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بإدارة مجالات التحسين.');
        }

        $validator = Validator::make($request->all(), [
            'resultId'    => ['required', 'integer'],
            'name'        => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'priority'    => ['required', 'string', 'in:Low,Medium,High'],
        ], [
            'resultId.required' => 'معرف نتيجة التقييم إلزامي لربط مجال التحسين.',
            'name.required'     => 'اسم أو عنوان مجال التحسين إلزامي.',
            'name.max'          => 'لا يمكن أن يتجاوز اسم مجال التحسين 200 حرف.',
            'priority.required' => 'أولوية مجال التحسين إلزامية.',
            'priority.in'       => 'قيمة الأولوية غير صالحة. القيم المسموحة: Low, Medium, High.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        // التحقق من وجود النتيجة والعزل المؤسسي (404 لمدرسة أخرى)
        $result = EvaluationResult::with('evaluation')->find($request->resultId);
        if (!$result || !$result->evaluation) {
            return ApiResponse::notFound('نتيجة المؤشر المطلوبة غير موجودة.');
        }

        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $result->evaluation->school_id) {
            return ApiResponse::notFound('نتيجة المؤشر المطلوبة غير موجودة.');
        }

        $area = ImprovementArea::create([
            'result_id'    => $result->result_id,
            'indicator_id' => $result->indicator_id,
            'name'         => $request->name,
            'description'  => $request->description,
            'priority'     => $request->priority,
        ]);

        $area->load(['result.evaluation', 'indicator', 'plans']);

        return ApiResponse::success(
            data: $this->formatArea($area),
            message: 'تم إنشاء مجال التحسين بنجاح.',
            status: 201
        );
    }

    /**
     * تحديث بيانات مجال التحسين القائم.
     *
     * PATCH /api/v1/improvement-areas/{id}
     * الصلاحية: plans.manage
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بتعديل مجالات التحسين.');
        }

        $area = ImprovementArea::with('result.evaluation')->find($id);
        if (!$area || !$area->result || !$area->result->evaluation) {
            return ApiResponse::notFound('مجال التحسين المطلوب غير موجود.');
        }

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $area->result->evaluation->school_id) {
            return ApiResponse::notFound('مجال التحسين المطلوب غير موجود.');
        }

        $validator = Validator::make($request->all(), [
            'name'        => ['sometimes', 'required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'priority'    => ['sometimes', 'required', 'string', 'in:Low,Medium,High'],
        ], [
            'name.required'     => 'اسم أو عنوان مجال التحسين إلزامي.',
            'name.max'          => 'لا يمكن أن يتجاوز اسم مجال التحسين 200 حرف.',
            'priority.required' => 'أولوية مجال التحسين إلزامية.',
            'priority.in'       => 'قيمة الأولوية غير صالحة. القيم المسموحة: Low, Medium, High.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        if ($request->has('name')) {
            $area->name = $request->name;
        }
        if ($request->has('description')) {
            $area->description = $request->description;
        }
        if ($request->has('priority')) {
            $area->priority = $request->priority;
        }

        $area->save();
        $area->load(['result.evaluation', 'indicator', 'plans']);

        return ApiResponse::success(
            data: $this->formatArea($area),
            message: 'تم تحديث مجال التحسين بنجاح.'
        );
    }

    /**
     * تنسيق بيانات مجال التحسين للاستجابة.
     */
    private function formatArea(ImprovementArea $area): array
    {
        $priorityLabels = [
            'High'   => 'عالية',
            'Medium' => 'متوسطة',
            'Low'    => 'منخفضة',
        ];

        return [
            'areaId'           => (int) $area->area_id,
            'resultId'         => (int) $area->result_id,
            'indicatorId'      => (int) $area->indicator_id,
            'indicatorCode'    => $area->indicator?->indicator_number ?? '',
            'indicatorName'    => $area->indicator?->name ?? '',
            'name'             => $area->name,
            'description'      => $area->description,
            'priority'         => $area->priority,
            'priorityLabel'    => $priorityLabels[$area->priority] ?? $area->priority,
            'linkedPlansCount' => $area->plans->count(),
            'createdAt'        => $area->created_at?->toIso8601String(),
        ];
    }
}
