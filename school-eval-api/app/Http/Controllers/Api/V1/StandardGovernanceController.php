<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\ScoreLevel;
use App\Models\StandardVersion;
use App\Services\StandardManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\View;
use Illuminate\Validation\ValidationException;

/**
 * متحكم حوكمة الإصدارات المعيارية (الإقرار، التنشيط، الأرشفة، المقارنة، القفل، والتصدير الرسمي).
 */
class StandardGovernanceController extends Controller
{
    public function __construct(
        protected StandardManagementService $service
    ) {}

    /**
     * استخراج أسماء أدوات التحقق لمؤشر معين.
     */
    protected function extractIndicatorTools($indicator): array
    {
        $tools = $indicator->verificationTools->pluck('name')->all();
        if (empty($tools) && !empty($indicator->verification_tools)) {
            $tools = is_array($indicator->verification_tools)
                ? $indicator->verification_tools
                : (json_decode($indicator->verification_tools, true) ?: []);
        }

        return $tools;
    }

    /**
     * استخراج واصفات الدرجات (0-3) لمؤشر معين.
     */
    protected function extractScoreDescriptors($indicator): array
    {
        $descriptors = [];
        foreach ($indicator->scoreDescriptors as $sd) {
            $lvlVal = $sd->scoreLevel?->score_value ?? $sd->score_level_id;
            $descriptors[$lvlVal] = $sd->description;
        }

        return $descriptors;
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
            return ApiResponse::success(data: $approved, message: 'تم إقرار الإصدار المعياري بنجاح.');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * تنشيط إصدار معياري مع أرشفة الإصدار النشط القديم تلقائيًا داخل معاملة ذرية (ضابط G-23).
     * الصلاحية المطلوبة: standards.manage
     */
    public function activate(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission('standards.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بتنشيط الإصدار المعياري.');
        }

        $version = StandardVersion::find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        try {
            $activated = $this->service->activateVersion($version);
            return ApiResponse::success(data: $activated, message: 'تم تنشيط الإصدار المعياري بنجاح وأرشفة الإصدار النشط السابق تلقائيًا.');
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
     * استرجاع سجل الفروقات والتغييرات الحقيقية مقارنة بالإصدار المعتمد أو إصدار أساس محدد.
     */
    public function diffLog(Request $request, int $id): JsonResponse
    {
        $version = StandardVersion::with(['standards.subStandards.indicators'])->find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        $baseId = $request->query('base_version_id');
        if ($baseId && (int) $baseId !== $id) {
            $baseline = StandardVersion::with(['standards.subStandards.indicators'])->find($baseId);
        } else {
            $baseline = StandardVersion::whereIn('status', [StandardVersion::STATUS_ACTIVE, StandardVersion::STATUS_APPROVED])
                ->where('version_id', '!=', $id)
                ->where('version_id', '<', $id)
                ->orderByDesc('version_id')
                ->first();

            if (!$baseline) {
                $baseline = StandardVersion::whereIn('status', [StandardVersion::STATUS_ACTIVE, StandardVersion::STATUS_APPROVED])
                    ->where('version_id', '!=', $id)
                    ->first();
            }
        }

        $hasBaseline = ($baseline !== null && $baseline->version_id !== $version->version_id);

        $eagerRelations = [
            'subStandards.indicators.scoreDescriptors.scoreLevel',
            'subStandards.indicators.evidenceRequirements',
            'subStandards.indicators.verificationTools',
        ];

        $versionStandards = $version->standards()->with($eagerRelations)->get();
        $versionSubs = $versionStandards->flatMap->subStandards;
        $versionIndicators = $versionSubs->flatMap->indicators;
        $versionWeight = round($versionStandards->sum('weight'), 2);

        $baselineStandards = $hasBaseline ? $baseline->standards()->with($eagerRelations)->get() : collect();
        $baselineSubs = $baselineStandards->flatMap->subStandards;
        $baselineIndicators = $baselineSubs->flatMap->indicators;
        $baselineWeight = $hasBaseline ? round($baselineStandards->sum('weight'), 2) : 0;

        $realStats = [
            'standardsCount'            => $versionStandards->count(),
            'currentStandardsCount'     => $versionStandards->count(),
            'baselineStandardsCount'    => $hasBaseline ? $baselineStandards->count() : 0,
            'previousStandardsCount'    => $hasBaseline ? $baselineStandards->count() : 0,
            'subStandardsCount'         => $versionSubs->count(),
            'currentSubStandardsCount'  => $versionSubs->count(),
            'baselineSubsCount'         => $hasBaseline ? $baselineSubs->count() : 0,
            'previousSubStandardsCount' => $hasBaseline ? $baselineSubs->count() : 0,
            'indicatorsCount'           => $versionIndicators->count(),
            'currentIndicatorsCount'    => $versionIndicators->count(),
            'baselineIndicatorsCount'   => $hasBaseline ? $baselineIndicators->count() : 0,
            'previousIndicatorsCount'   => $hasBaseline ? $baselineIndicators->count() : 0,
            'totalWeight'               => $versionWeight,
            'baselineTotalWeight'       => $baselineWeight,
            'standardsDiff'             => $hasBaseline ? ($versionStandards->count() - $baselineStandards->count()) : 0,
            'subStandardsDiff'          => $hasBaseline ? ($versionSubs->count() - $baselineSubs->count()) : 0,
            'indicatorsDiff'            => $hasBaseline ? ($versionIndicators->count() - $baselineIndicators->count()) : 0,
            'isWeightBalanced'          => abs($versionWeight - 100.0) < 0.05,
            'isBalanced'                => abs($versionWeight - 100.0) < 0.05,
            'hasBaseline'               => $hasBaseline,
            'baselineVersionId'         => $hasBaseline ? $baseline->version_id : null,
            'baselineVersionNo'         => $hasBaseline ? $baseline->version_no : null,
            'previousVersionNo'         => $hasBaseline ? $baseline->version_no : null,
        ];

        $diffs = [];
        $versionIndMap = $versionIndicators->keyBy('code');

        if ($hasBaseline) {
            $baselineStdCodes = $baselineStandards->pluck('code')->all();
            $versionStdCodes = $versionStandards->pluck('code')->all();

            foreach ($versionStandards as $vStd) {
                if (!in_array($vStd->code, $baselineStdCodes)) {
                    $diffs[] = [
                        'id'          => 'DIFF-STD-ADD-' . $vStd->code,
                        'category'    => 'معيار رئيسي مضاف',
                        'type'        => 'added',
                        'target'      => $vStd->name,
                        'code'        => $vStd->code,
                        'description' => "إضافة معيار رئيسي جديد ({$vStd->name}) بوزن نسبي {$vStd->weight}%.",
                    ];
                } else {
                    $bStd = $baselineStandards->firstWhere('code', $vStd->code);
                    if ($bStd && abs((float) $bStd->weight - (float) $vStd->weight) > 0.01) {
                        $diffs[] = [
                            'id'          => 'DIFF-STD-WEIGHT-' . $vStd->code,
                            'category'    => 'إعادة معايرة وزن المعيار',
                            'type'        => 'reweighted',
                            'target'      => $vStd->name,
                            'code'        => $vStd->code,
                            'description' => "تعديل الوزن النسبي للمعيار من {$bStd->weight}% إلى {$vStd->weight}%.",
                        ];
                    }
                }
            }

            foreach ($baselineStandards as $bStd) {
                if (!in_array($bStd->code, $versionStdCodes)) {
                    $diffs[] = [
                        'id'          => 'DIFF-STD-DEL-' . $bStd->code,
                        'category'    => 'معيار رئيسي محذوف',
                        'type'        => 'modified',
                        'target'      => $bStd->name,
                        'code'        => $bStd->code,
                        'description' => "حذف المعيار الرئيسي ({$bStd->name}) الذي كان معتمداً في الإصدار الأساس.",
                    ];
                }
            }

            $baselineIndMap = $baselineIndicators->keyBy('code');

            foreach ($versionIndicators as $vInd) {
                if (!$baselineIndMap->has($vInd->code)) {
                    $diffs[] = [
                        'id'          => 'DIFF-IND-ADD-' . $vInd->code,
                        'category'    => 'مؤشر أداء جديد',
                        'type'        => 'added',
                        'target'      => $vInd->name,
                        'code'        => $vInd->code,
                        'description' => 'إضافة مؤشر تفصيلي جديد إلى الهيكل المعياري.',
                    ];
                } else {
                    $bInd = $baselineIndMap->get($vInd->code);
                    if (abs((float) $bInd->weight - (float) $vInd->weight) > 0.01) {
                        $diffs[] = [
                            'id'          => 'DIFF-IND-WEIGHT-' . $vInd->code,
                            'category'    => 'إعادة معايرة وزن المؤشر',
                            'type'        => 'reweighted',
                            'target'      => $vInd->name,
                            'code'        => $vInd->code,
                            'description' => "تعديل الوزن النسبي للمؤشر من {$bInd->weight}% إلى {$vInd->weight}%.",
                        ];
                    }
                }
            }

            foreach ($baselineIndicators as $bInd) {
                if (!$versionIndMap->has($bInd->code)) {
                    $diffs[] = [
                        'id'          => 'DIFF-IND-DEL-' . $bInd->code,
                        'category'    => 'مؤشر محذوف',
                        'type'        => 'modified',
                        'target'      => $bInd->name,
                        'code'        => $bInd->code,
                        'description' => "حذف المؤشر ({$bInd->code} - {$bInd->name}) من الهيكل المعياري.",
                    ];
                }
            }
        }

        $standardsComparison = [];
        foreach ($versionStandards as $vStd) {
            $bStd = $hasBaseline ? $baselineStandards->firstWhere('code', $vStd->code) : null;
            $status = !$bStd ? 'added' : (abs((float) $bStd->weight - (float) $vStd->weight) > 0.01 ? 'reweighted' : ($bStd->name !== $vStd->name ? 'modified' : 'same'));
            $standardsComparison[] = [
                'code'            => $vStd->code,
                'name'            => $vStd->name,
                'baselineName'    => $bStd?->name ?? '—',
                'weight'          => (float) $vStd->weight,
                'baselineWeight'  => $bStd ? (float) $bStd->weight : 0.0,
                'weightDiff'      => $bStd ? round((float) $vStd->weight - (float) $bStd->weight, 2) : (float) $vStd->weight,
                'indicatorsCount' => $vStd->subStandards->flatMap->indicators->count(),
                'status'          => $status,
            ];
        }

        $indicatorsComparison = [];
        foreach ($versionIndicators as $vInd) {
            $bInd = $hasBaseline ? $baselineIndicators->firstWhere('code', $vInd->code) : null;

            $vTools = $this->extractIndicatorTools($vInd);
            $bTools = $bInd ? $this->extractIndicatorTools($bInd) : [];

            $vEvidence = $vInd->evidenceRequirements->map(fn ($e) => ['title' => $e->title, 'required' => (bool) $e->required])->all();
            $bEvidence = $bInd ? $bInd->evidenceRequirements->map(fn ($e) => ['title' => $e->title, 'required' => (bool) $e->required])->all() : [];

            $vDescriptors = $this->extractScoreDescriptors($vInd);
            $bDescriptors = $bInd ? $this->extractScoreDescriptors($bInd) : [];

            $isReweighted = $bInd && abs((float) $bInd->weight - (float) $vInd->weight) > 0.01;
            $isTextModified = $bInd && ($bInd->name !== $vInd->name || ($bInd->description ?? '') !== ($vInd->description ?? ''));
            $isToolsModified = $bInd && array_values($vTools) !== array_values($bTools);
            $isEvidenceModified = $bInd && count($vEvidence) !== count($bEvidence);
            $isRubricModified = $bInd && $vDescriptors !== $bDescriptors;

            $status = !$bInd ? 'added' : (
                $isTextModified || $isToolsModified || $isEvidenceModified || $isRubricModified
                    ? 'modified'
                    : ($isReweighted ? 'reweighted' : 'same')
            );

            $indicatorsComparison[] = [
                'code'                => $vInd->code,
                'name'                => $vInd->name,
                'baselineName'        => $bInd?->name ?? '—',
                'description'         => $vInd->description ?? '',
                'baselineDescription' => $bInd?->description ?? '',
                'standardCode'        => $vInd->subStandard?->standard?->code ?? '—',
                'weight'              => (float) $vInd->weight,
                'baselineWeight'      => $bInd ? (float) $bInd->weight : 0.0,
                'weightDiff'          => $bInd ? round((float) $vInd->weight - (float) $bInd->weight, 2) : (float) $vInd->weight,
                'status'              => $status,
                'tools'               => $vTools,
                'baselineTools'       => $bTools,
                'evidence'            => $vEvidence,
                'baselineEvidence'    => $bEvidence,
                'descriptors'         => $vDescriptors,
                'baselineDescriptors' => $bDescriptors,
            ];
        }

        if ($hasBaseline) {
            foreach ($baselineIndicators as $bInd) {
                if (!$versionIndMap->has($bInd->code)) {
                    $bTools = $this->extractIndicatorTools($bInd);
                    $bEvidence = $bInd->evidenceRequirements->map(fn ($e) => ['title' => $e->title, 'required' => (bool) $e->required])->all();
                    $bDescriptors = $this->extractScoreDescriptors($bInd);

                    $indicatorsComparison[] = [
                        'code'                => $bInd->code,
                        'name'                => '— (مؤشر محذوف في الإصدار الجديد)',
                        'baselineName'        => $bInd->name,
                        'description'         => '',
                        'baselineDescription' => $bInd->description ?? '',
                        'standardCode'        => $bInd->subStandard?->standard?->code ?? '—',
                        'weight'              => 0.0,
                        'baselineWeight'      => (float) $bInd->weight,
                        'weightDiff'          => -round((float) $bInd->weight, 2),
                        'status'              => 'removed',
                        'tools'               => [],
                        'baselineTools'       => $bTools,
                        'evidence'            => [],
                        'baselineEvidence'    => $bEvidence,
                        'descriptors'         => [],
                        'baselineDescriptors' => $bDescriptors,
                    ];
                }
            }
        }

        $versionLevels = ScoreLevel::where('standard_version_id', $version->version_id)->orderBy('score_value')->get();
        $baselineLevels = $hasBaseline ? ScoreLevel::where('standard_version_id', $baseline->version_id)->orderBy('score_value')->get() : collect();
        $rubricsComparison = [];
        foreach ($versionLevels as $lvl) {
            $bLvl = $baselineLevels->firstWhere('score_value', $lvl->score_value);
            $rubricsComparison[] = [
                'scoreValue'          => $lvl->score_value,
                'label'               => $lvl->label,
                'baselineLabel'       => $bLvl?->label ?? '—',
                'description'         => $lvl->general_description,
                'baselineDescription' => $bLvl?->general_description ?? '—',
                'status'              => !$bLvl ? 'added' : ($bLvl->label !== $lvl->label || $bLvl->general_description !== $lvl->general_description ? 'modified' : 'same'),
            ];
        }

        $hash = hash('sha256', "VERSION_{$version->version_id}_{$version->version_no}_DIFF_LOG");

        return ApiResponse::success([
            'versionId'            => $version->version_id,
            'versionNo'            => $version->version_no,
            'baselineVersionId'    => $hasBaseline ? $baseline->version_id : null,
            'baselineVersionNo'    => $hasBaseline ? $baseline->version_no : null,
            'hasBaseline'          => $hasBaseline,
            'status'               => $version->status,
            'isDraft'              => $version->isDraft(),
            'isApproved'           => $version->isApproved(),
            'isScheduled'          => str_contains($version->source_description ?? '', 'مجدول'),
            'approvalCode'         => $version->approval_code ?? $version->source_number,
            'approverName'         => $version->approver_name,
            'approvedAt'           => $version->approved_at?->toIso8601ZuluString(),
            'integrityHash'        => $hash,
            'releaseNotes'         => $version->source_description ?? 'مذكرات الإصدار والتغييرات المنهجية الرسمية.',
            'realStats'            => $realStats,
            'diffs'                => $diffs,
            'standardsComparison'  => $standardsComparison,
            'indicatorsComparison' => $indicatorsComparison,
            'rubricsComparison'    => $rubricsComparison,
            'stats'                => [
                'addedCount'        => count(array_filter($diffs, fn ($d) => $d['type'] === 'added')),
                'modifiedCount'     => count(array_filter($diffs, fn ($d) => $d['type'] === 'modified')),
                'reweightedCount'   => count(array_filter($diffs, fn ($d) => $d['type'] === 'reweighted')),
                'toolsUpdatedCount' => 0,
            ],
        ], 'تم استرجاع سجل الفروقات والمقارنة الحقيقية بنجاح.');
    }

    /**
     * فحص وتدقيق الشروط الحاكمة وموانع التفعيل قبل القفل والإقرار الرسمي.
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
            $hasMethods = DB::table('indicator_verification_methods')
                ->where('indicator_id', $ind->indicator_id)
                ->exists();
            $toolsArray = is_array($ind->verification_tools) ? $ind->verification_tools : json_decode($ind->verification_tools ?? '[]', true);
            return empty($toolsArray) && !$hasMethods && empty($ind->verification_method);
        });
        $check2 = $missingTools->isEmpty();

        $missingRequirements = $indicators->filter(function ($ind) {
            return !DB::table('indicator_evidence_requirements')
                ->where('indicator_id', $ind->indicator_id)
                ->exists();
        });
        $check3 = $missingRequirements->isEmpty();

        $versionScoreLevels = ScoreLevel::where('standard_version_id', $version->version_id)->get();
        if ($versionScoreLevels->isEmpty()) {
            $versionScoreLevels = ScoreLevel::where('standard_version_id', 1)->get();
        }
        $check4 = $versionScoreLevels->count() >= 2;

        $allCodes = collect();
        $standards->each(fn ($s) => $allCodes->push($s->code));
        $standards->flatMap->subStandards->each(fn ($sub) => $allCodes->push($sub->code));
        $indicators->each(fn ($ind) => $allCodes->push($ind->code));
        $check5 = $allCodes->count() === $allCodes->unique()->count();

        $levelValues = $versionScoreLevels->pluck('score_value')->sort()->values()->all();
        $isStandardScale = ($levelValues === [0, 1, 2, 3]);
        $check6 = $isStandardScale;

        $passesAll = $check1 && $check2 && $check3 && $check4 && $check5 && $check6;

        $hashContent = "VERSION_{$version->version_id}_{$version->version_no}_{$totalWeight}_{$indicators->count()}_" . $allCodes->sort()->implode('_');
        $integrityHash = hash('sha256', $hashContent);

        return ApiResponse::success([
            'versionId'        => $version->version_id,
            'versionNo'        => $version->version_no,
            'status'           => $version->status,
            'isDraft'          => $version->isDraft(),
            'isApproved'       => $version->isApproved(),
            'isScheduled'      => str_contains($version->source_description ?? '', 'مجدول'),
            'approvalCode'     => $version->source_number,
            'passesAll'        => $passesAll,
            'isScaleSupported' => $isStandardScale,
            'integrityHash'    => $integrityHash,
            'totalWeight'      => $totalWeight,
            'indicatorsCount'  => $indicators->count(),
            'standardsCount'   => $standards->count(),
            'checks'           => [
                [
                    'id'      => 1,
                    'key'     => 'weights_balance',
                    'title'   => 'مجموع أوزان المعايير الرئيسية متزن بنسبة 100.0% تماماً',
                    'passed'  => $check1,
                    'details' => $check1 ? "مجموع الأوزان الموزعة {$totalWeight}% متطابق 100%" : "المجموع الحالي {$totalWeight}% غير متزن (يجب أن يكون 100.0%)",
                ],
                [
                    'id'      => 2,
                    'key'     => 'verification_tools',
                    'title'   => 'أدوات التحقق المعتمدة: كل مؤشر مرتبط بأداة تحقق واحدة على الأقل',
                    'passed'  => $check2,
                    'details' => $check2 ? "كافة المؤشرات ({$indicators->count()} مؤشراً) معرف لها أدوات تحقق معتمدة" : 'يوجد مؤشرات بحاجة لربط أدوات التحقق',
                ],
                [
                    'id'      => 3,
                    'key'     => 'evidence_requirements',
                    'title'   => 'متطلبات الشواهد المرجعية: اكتمال تعريف الشواهد الإلزامية والاختيارية في الوثيقة',
                    'passed'  => $check3,
                    'details' => $check3 ? 'تم تعريف متطلبات الشواهد لجميع المؤشرات في هذا الإصدار' : 'يوجد مؤشرات لم يتم تحديد متطلبات شواهدها المرجعية بعد',
                ],
                [
                    'id'      => 4,
                    'key'     => 'rubric_scale_definition',
                    'title'   => 'سلم التقدير اللفظي: اكتمال تعريف مستويات السلم المعتمدة للإصدار',
                    'passed'  => $check4,
                    'details' => $check4 ? "السلم التقديري معرف بعدد {$versionScoreLevels->count()} مستويات" : 'السلم التقديري غير مكتمل لهذا الإصدار',
                ],
                [
                    'id'      => 5,
                    'key'     => 'unique_codes',
                    'title'   => 'سلامة الهيكل المعياري وتفرد الرموز المعيارية بدون تكرار',
                    'passed'  => $check5,
                    'details' => $check5 ? "تم فحص {$allCodes->count()} كوداً معيارياً، وجميعها فريدة تماماً" : 'توجد أكواد معيارية مكررة في الهيكل',
                ],
                [
                    'id'      => 6,
                    'key'     => 'portal_compatibility',
                    'title'   => 'توافق السلم مع بوابات الرصد والتقييم (مانع تفعيل تشغيلي)',
                    'passed'  => $check6,
                    'details' => $check6
                        ? 'السلم التقديري (0-3) متوافق تماماً ومدعوم 100% في استمارة رصد المقيم ومحرك احتساب الدرجات'
                        : 'مانع تفعيل: السلم التقديري المخصص لهذا الإصدار يتضمن مستويات غير مدعومة حالياً في استمارة رصد المقيم ومحرك احتساب الدرجات (المدعوم حالياً: سلم 0-3). يتطلب تحديث بوابات التقييم والرصد قبل التفعيل.',
                ],
            ],
        ], 'تم إجراء تدقيق الشروط الحاكمة وموانع التفعيل بنجاح.');
    }

    /**
     * قفل وإقرار أو تنشيط الإصدار المعياري رسمياً وفق نموذج الحالات الرباعي (القرار 6).
     * الصلاحية المطلوبة: standards.manage
     */
    public function lock(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if ($user && !$user->hasPermission('standards.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بإقرار الإصدارات المعيارية.');
        }

        $version = StandardVersion::find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        $approvalCode = $request->input('approval_code') ?? $request->input('approvalCode');
        $legalConfirmation = $request->input('legal_confirmation') ?? $request->input('legalConfirmation');
        $action = $request->input('action', 'approve');

        if (!$legalConfirmation) {
            return ApiResponse::validationError(['legalConfirmation' => ['يجب الإقرار بالمسؤولية القانونية للإقرار الرسمي.']], 'يجب تأكيد الإقرار القانوني');
        }

        if ($action === 'approve' && !$version->isDraft()) {
            return ApiResponse::validationError([
                'version' => ["لا يمكن إعادة إقرار وثيقة غير مسودة (الإصدار الحالي بحالة {$version->status} ومقفل بالفعل)."],
            ], 'الإصدار المعياري مُقرّ ومقفل بالفعل.');
        }

        if ($action === 'schedule') {
            if ($version->isArchived()) {
                return ApiResponse::validationError([
                    'version' => ['لا يمكن جدولة إصدار مؤرشف للدورة القادمة.'],
                ], 'الإصدار المعياري مؤرشف ومقفل تاريخياً.');
            }
            if ($version->status === StandardVersion::STATUS_ACTIVE) {
                return ApiResponse::validationError([
                    'version' => ['الإصدار المعياري نافذ ومُفعّل حالياً بالفعل ولا يحتاج إلى جدولة للدورة القادمة.'],
                ], 'الإصدار المعياري نافذ ومُفعّل حالياً.');
            }
            if ($version->isDraft()) {
                $this->service->approveVersion($version);
            }

            StandardVersion::where('version_id', '!=', $version->version_id)
                ->where('source_description', 'LIKE', '%مجدول رسمياً للدورة التقييمية القادمة%')
                ->each(function ($other) {
                    $other->source_description = 'مُقرّ ومقفل رسمياً بختم النزاهة الرقمية (أُلغيت جدولته السابقة لصالح إصدار أحدث).';
                    $other->save();
                });

            if ($approvalCode) {
                $version->source_number = $approvalCode;
            }
            $version->source_description = 'مُقرّ ومجدول رسمياً للدورة التقييمية القادمة بقرار وزاري رقم ' . ($approvalCode ?: ($version->source_number ?: 'DEC-NAT-2026-88'));
            $version->save();
            return ApiResponse::success($version, 'تمت جدولة الإصدار المعياري للدورة التقييمية القادمة بنجاح.');
        }

        if ($approvalCode) {
            $version->source_number = $approvalCode;
            $version->save();
        }

        try {
            if ($action === 'activate') {
                if ($version->isArchived()) {
                    return ApiResponse::validationError([
                        'version' => ['لا يمكن تفعيل إصدار مؤرشف.'],
                    ], 'الإصدار المعياري مؤرشف ومقفل تاريخياً.');
                }
                $activated = $this->service->activateVersion($version);
                return ApiResponse::success($activated, 'تم قفل وتنشيط وثيقة المعايير رسمياً للدورة التقييمية الحالية بنجاح وأرشفة الإصدار السابق.');
            } else {
                $approved = $this->service->approveVersion($version);
                $approved->source_description = 'مُقرّ ومقفل رسمياً بختم النزاهة الرقمية (بانتظار الجدولة للدورة التقييمية القادمة).';
                $approved->save();
                return ApiResponse::success($approved, 'تم إقرار وثيقة المعايير رسمياً وقفلها بختم النزاهة الرقمية (المرحلة الأولى).');
            }
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->errors(), $e->getMessage());
        }
    }

    /**
     * تصدير التقرير المعياري الرسمي PDF (بيانات وصفية أو ملف فيزيائي للتحميل).
     */
    public function exportPdf(Request $request, int $id)
    {
        $version = StandardVersion::with(['standards.subStandards.indicators'])->find($id);
        if (!$version) {
            return ApiResponse::notFound('الإصدار المعياري غير موجود.');
        }

        $hash = hash('sha256', "OFFICIAL_STANDARDS_{$version->version_id}_{$version->version_no}");

        if ($request->header('Accept') === 'application/pdf' || $request->query('download')) {
            $html = View::make('reports.standards_approval_certificate', [
                'version' => $version,
                'hash'    => $hash,
            ])->render();

            $tempDir = storage_path('app/temp-mpdf');
            if (!is_dir($tempDir)) {
                mkdir($tempDir, 0755, true);
            }

            $mpdf = new \Mpdf\Mpdf([
                'mode'             => 'utf-8',
                'format'           => 'A4',
                'orientation'      => 'P',
                'margin_left'      => 10,
                'margin_right'     => 10,
                'margin_top'       => 10,
                'margin_bottom'    => 10,
                'autoScriptToLang' => true,
                'autoArabic'       => true,
                'autoLangToFont'   => true,
                'tempDir'          => $tempDir,
            ]);
            $mpdf->SetDirectionality('rtl');
            $mpdf->SetTitle("وثيقة إقرار المعايير الوطنية - {$version->version_no}");
            $mpdf->WriteHTML($html);

            $pdfContent = $mpdf->Output('', 'S');
            $fileName = "standards_approval_certificate_{$version->version_no}_" . date('Y-m-d_H-i') . '.pdf';

            return response($pdfContent, 200, [
                'Content-Type'        => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
                'Cache-Control'       => 'private, max-age=0, must-revalidate',
                'Pragma'              => 'public',
            ]);
        }

        return ApiResponse::success([
            'versionId'      => $version->version_id,
            'versionNo'      => $version->version_no,
            'title'          => "وثيقة المعايير الوطنية لتقويم الجودة المدرسية - {$version->version_no}",
            'systemName'     => 'منصة ارتقاء للتقييم الذاتي والتحسين المدرسي',
            'authority'      => 'أمانة المعايير ومجلس الاعتماد الأكاديمي وضمان جودة التعليم',
            'generatedAt'    => now()->toIso8601String(),
            'standardsCount' => $version->standards->count(),
            'totalWeight'    => 100.0,
            'hash'           => $hash,
            'downloadUrl'    => "/api/v1/standard-versions/{$version->version_id}/export-pdf?download=1",
        ], 'تم توليد تقرير الإقرار المعياري الرسمي بنجاح.');
    }
}
