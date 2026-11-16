<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Governorate;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GovernorateController extends Controller
{
    /**
     * استرجاع قائمة محافظات الجمهورية اليمنية الـ 22.
     */
    public function index(Request $request): JsonResponse
    {
        $governorates = Governorate::withCount('directorates')
            ->orderBy('governorate_id', 'asc')
            ->get()
            ->map(function ($gov) {
                return [
                    'governorateId'     => $gov->governorate_id,
                    'nameAr'            => $gov->name_ar,
                    'nameEn'            => $gov->name_en,
                    'code'              => $gov->code,
                    'directoratesCount' => $gov->directorates_count,
                ];
            });

        return ApiResponse::success($governorates);
    }

    /**
     * استرجاع تفاصيل محافظة مع مديرياتها التابعة.
     */
    public function show(int $id): JsonResponse
    {
        $governorate = Governorate::with('directorates')->find($id);

        if (!$governorate) {
            return ApiResponse::notFound('المحافظة المطلوبة غير موجودة.');
        }

        return ApiResponse::success([
            'governorateId'     => $governorate->governorate_id,
            'nameAr'            => $governorate->name_ar,
            'nameEn'            => $governorate->name_en,
            'code'              => $governorate->code,
            'directoratesCount' => $governorate->directorates->count(),
            'directorates'      => $governorate->directorates->map(fn ($d) => [
                'directorateId'   => $d->directorate_id,
                'governorateId'   => $d->governorate_id,
                'directorateName' => $d->name_ar,
                'nameAr'          => $d->name_ar,
                'nameEn'          => $d->name_en,
                'code'            => $d->code,
                'isActive'        => $d->is_active,
            ]),
        ]);
    }
}
