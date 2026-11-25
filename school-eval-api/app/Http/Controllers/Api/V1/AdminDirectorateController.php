<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Directorate;
use App\Models\Governorate;
use App\Models\School;
use App\Models\User;
use App\Services\AuditLoggerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * متحكم إدارة المديريات التعليمية والربط الجغرافي لمسؤول النظام المركزي.
 */
class AdminDirectorateController extends Controller
{
    /**
     * قائمة المديريات التعليمية وإحصاءات المدارس التابعة لها فعلياً من قاعدة البيانات.
     */
    public function directorates(Request $request): JsonResponse
    {
        if (Directorate::count() === 0) {
            (new \Database\Seeders\GovernorateSeeder())->run();
            (new \Database\Seeders\DirectorateSeeder())->run();
        }

        $query = Directorate::with('governorate')->where('is_active', true);

        $govId = $request->query('governorateId') ?? $request->query('governorate_id');
        if ($govId && !empty($govId)) {
            $query->where('governorate_id', (int) $govId);
        } elseif ($request->filled('governorate')) {
            $govName = $request->query('governorate');
            $query->whereHas('governorate', function ($q) use ($govName) {
                $q->where('name_ar', $govName)
                  ->orWhere('name_ar', 'like', "%{$govName}%");
            });
        }

        $directorates = $query->orderBy('governorate_id', 'asc')
            ->orderBy('directorate_id', 'asc')
            ->get()
            ->map(function ($dir) {
                $name = $dir->name_ar;
                $shortName = str_replace('مديرية ', '', $name);

                $count = School::where(function ($q) use ($dir, $name, $shortName) {
                    $q->where('directorate_id', $dir->directorate_id)
                      ->orWhere('educational_district', $name)
                      ->orWhere('educational_district', $shortName);
                })->count();

                return [
                    'directorateId'   => $dir->directorate_id,
                    'directorateName' => $dir->name_ar,
                    'governorateId'   => $dir->governorate_id,
                    'governorate'     => $dir->governorate?->name_ar ?? 'أمانة العاصمة',
                    'governorateName' => $dir->governorate?->name_ar ?? 'أمانة العاصمة',
                    'schoolCount'     => $count,
                    'isActive'        => (bool) $dir->is_active,
                    'createdAt'       => $dir->created_at?->toIso8601ZuluString() ?? '2024-01-15T08:00:00Z',
                ];
            })->toArray();

        return ApiResponse::success(data: $directorates);
    }

    /**
     * إضافة مديرية تعليمية جديدة وتوثيقها في قاعدة البيانات وسجل التدقيق.
     */
    public function storeDirectorate(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $validated = $request->validate([
            'directorateName' => 'required|string|max:150',
            'governorateId'   => 'nullable|exists:governorates,governorate_id',
            'governorate'     => 'nullable|string|max:100',
        ]);

        $name = trim($validated['directorateName']);
        $shortName = str_replace('مديرية ', '', $name);

        $governorateId = $validated['governorateId'] ?? null;
        if (!$governorateId && !empty($validated['governorate'])) {
            $gov = Governorate::where('name_ar', $validated['governorate'])
                ->orWhere('name_ar', 'like', '%' . $validated['governorate'] . '%')
                ->first();
            $governorateId = $gov?->governorate_id;
        }
        $governorateId = $governorateId ?: 1;

        $exists = Directorate::where('governorate_id', $governorateId)
            ->where(function ($q) use ($name, $shortName) {
                $q->where('name_ar', $name)
                  ->orWhere('name_ar', "مديرية {$shortName}")
                  ->orWhere('name_ar', $shortName);
            })->exists();

        if ($exists) {
            return ApiResponse::validationError([
                'directorateName' => ['اسم المديرية مسجل مسبقاً.'],
            ], 'اسم المديرية مسجل مسبقاً.');
        }

        $dir = Directorate::create([
            'governorate_id' => $governorateId,
            'name_ar'        => $name,
            'is_active'      => true,
        ]);

        (new AuditLoggerService())->log(
            action: 'directorate.created',
            targetType: 'directorate',
            targetId: $dir->directorate_id,
            newValues: ['name' => $name, 'governorate_id' => $governorateId],
            descriptionAr: "إنشاء مديرية جديدة في النظام: {$name}"
        );

        $govName = $dir->governorate?->name_ar ?? ($validated['governorate'] ?? 'أمانة العاصمة');

        return ApiResponse::created(
            data: [
                'directorateId'   => $dir->directorate_id,
                'directorateName' => $dir->name_ar,
                'governorateId'   => $dir->governorate_id,
                'governorate'     => $govName,
                'schoolCount'     => 0,
                'isActive'        => true,
                'createdAt'       => $dir->created_at?->toIso8601ZuluString() ?? now()->toIso8601ZuluString(),
            ],
            message: 'تمت إضافة المديرية بنجاح.'
        );
    }

    /**
     * تعديل بيانات مديرية قائمة في قاعدة البيانات وتحديث المدارس وسجل التدقيق.
     */
    public function updateDirectorate(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $validated = $request->validate([
            'directorateName' => 'required|string|max:150',
            'governorateId'   => 'nullable|exists:governorates,governorate_id',
            'governorate'     => 'nullable|string|max:100',
        ]);

        $dir = Directorate::find($id);
        if (!$dir) {
            return ApiResponse::notFound('المديرية المطلوبة غير موجودة.');
        }

        $name = trim($validated['directorateName']);
        $shortName = str_replace('مديرية ', '', $name);

        $exists = Directorate::where('directorate_id', '!=', $dir->directorate_id)
            ->where(function ($q) use ($name, $shortName) {
                $q->where('name_ar', $name)
                  ->orWhere('name_ar', "مديرية {$shortName}")
                  ->orWhere('name_ar', $shortName);
            })->exists();

        if ($exists) {
            return ApiResponse::validationError([
                'directorateName' => ['اسم المديرية مسجل مسبقاً.'],
            ], 'اسم المديرية مسجل مسبقاً.');
        }

        $oldName = $dir->name_ar;
        $dir->name_ar = $name;
        if (!empty($validated['governorateId'])) {
            $dir->governorate_id = $validated['governorateId'];
        }
        $dir->save();

        $oldShort = str_replace('مديرية ', '', $oldName);
        School::where('directorate_id', $dir->directorate_id)
            ->orWhere('educational_district', $oldName)
            ->orWhere('educational_district', $oldShort)
            ->update([
                'directorate_id'       => $dir->directorate_id,
                'educational_district' => $name,
            ]);

        (new AuditLoggerService())->log(
            action: 'directorate.updated',
            targetType: 'directorate',
            targetId: $dir->directorate_id,
            oldValues: ['name' => $oldName],
            newValues: ['name' => $name],
            descriptionAr: "تعديل مسمى المديرية التعليمية من ({$oldName}) إلى ({$name})"
        );

        $schoolCount = School::where('directorate_id', $dir->directorate_id)
            ->orWhere('educational_district', $name)
            ->count();

        return ApiResponse::success(
            data: [
                'directorateId'   => $dir->directorate_id,
                'directorateName' => $dir->name_ar,
                'governorateId'   => $dir->governorate_id,
                'governorate'     => $dir->governorate?->name_ar ?? 'أمانة العاصمة',
                'schoolCount'     => $schoolCount,
                'isActive'        => (bool) $dir->is_active,
                'updatedAt'       => now()->toIso8601ZuluString(),
            ],
            message: 'تم تحديث بيانات المديرية بنجاح.'
        );
    }

    /**
     * حذف مديرية تعليمية مع منع حذف أي مديرية مرتبطة بمدارس.
     */
    public function destroyDirectorate(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $dir = Directorate::find($id);
        if (!$dir) {
            return ApiResponse::notFound('المديرية المطلوبة غير موجودة.');
        }

        $name = $dir->name_ar;
        $shortName = str_replace('مديرية ', '', $name);

        $linkedSchoolsCount = School::where('directorate_id', $dir->directorate_id)
            ->orWhere('educational_district', $name)
            ->orWhere('educational_district', $shortName)
            ->count();

        $linkedUsersCount = User::where('directorate_id', $dir->directorate_id)->count();

        if ($linkedSchoolsCount > 0) {
            return ApiResponse::validationError([
                'directorate' => ['لا يمكن حذف المديرية لأنها مرتبطة بمدارس.'],
            ], 'لا يمكن حذف المديرية لأنها مرتبطة بمدارس');
        }

        if ($linkedUsersCount > 0) {
            return ApiResponse::validationError([
                'directorate' => ['لا يمكن حذف المديرية لأنها مرتبطة بمشرفين مسجلين.'],
            ], 'لا يمكن حذف المديرية لأنها مرتبطة بمشرفين مسجلين في النظام.');
        }

        $dir->delete();

        (new AuditLoggerService())->log(
            action: 'directorate.deleted',
            targetType: 'directorate',
            targetId: (int) $id,
            oldValues: ['name' => $name],
            descriptionAr: "حذف المديرية التعليمية ({$name}) من النظام"
        );

        return ApiResponse::success(
            data: null,
            message: 'تم حذف المديرية بنجاح.'
        );
    }
}
