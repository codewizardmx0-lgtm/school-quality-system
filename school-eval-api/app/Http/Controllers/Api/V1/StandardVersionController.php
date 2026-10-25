<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\StandardVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * متحكم استعراض الإصدارات المعيارية وشجرة المعايير والمؤشرات والواصفات (StandardVersionController).
 */
class StandardVersionController extends Controller
{
    /**
     * استعراض شجرة الإصدار المعياري الخام (Standards Tree Raw).
     *
     * الصلاحية المطلوبة: standards.view
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('standards.view')) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض المعايير.');
        }

        $version = StandardVersion::with([
            'standards' => function ($q) {
                $q->orderBy('standard_id', 'asc');
            },
            'standards.subStandards' => function ($q) {
                $q->orderBy('sub_standard_id', 'asc');
            },
            'standards.subStandards.indicators' => function ($q) {
                $q->orderBy('indicator_id', 'asc');
            },
            'standards.subStandards.indicators.scoreDescriptors' => function ($q) {
                $q->orderBy('display_order', 'asc');
            },
            'standards.subStandards.indicators.scoreDescriptors.scoreLevel',
        ])->find($id);

        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري المطلوب غير موجود.');
        }

        $data = [
            'versionId'   => $version->version_id,
            'versionName' => $version->version_name,
            'issueYear'   => $version->issue_year,
            'status'      => $version->status,
            'createdAt'   => $version->created_at?->toIso8601ZuluString(),
            'standards'   => $version->standards->map(function ($std) {
                return [
                    'standardId'   => $std->standard_id,
                    'code'         => $std->code,
                    'name'         => $std->name,
                    'description'  => $std->description,
                    'weight'       => (float) $std->weight,
                    'subStandards' => $std->subStandards->map(function ($sub) {
                        return [
                            'subStandardId' => $sub->sub_standard_id,
                            'code'          => $sub->code,
                            'name'          => $sub->name,
                            'description'   => $sub->description,
                            'indicators'    => $sub->indicators->map(function ($ind) {
                                return [
                                    'indicatorId'      => $ind->indicator_id,
                                    'code'             => $ind->code,
                                    'name'             => $ind->name,
                                    'description'      => $ind->description,
                                    'weight'           => (float) $ind->weight,
                                    'status'           => $ind->status,
                                    'scoreDescriptors' => $ind->scoreDescriptors->map(function ($desc) {
                                        return [
                                            'descriptorId' => $desc->descriptor_id,
                                            'scoreLevelId' => $desc->score_level_id,
                                            'scoreValue'   => $desc->scoreLevel?->score_value,
                                            'label'        => $desc->label,
                                            'description'  => $desc->description,
                                            'displayOrder' => $desc->display_order,
                                        ];
                                    }),
                                ];
                            }),
                        ];
                    }),
                ];
            }),
        ];

        return ApiResponse::success(data: $data, message: null);
    }
}
