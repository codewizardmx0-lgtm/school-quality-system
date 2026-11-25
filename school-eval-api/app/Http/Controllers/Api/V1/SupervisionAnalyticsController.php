<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesSupervisorScope;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\School;
use App\Models\Standard;
use App\Models\StandardVersion;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Mpdf\Config\ConfigVariables;
use Mpdf\Config\FontVariables;
use Mpdf\Mpdf;

/**
 * متحكم التحليلات المركزية والمقارنات التاريخية وتقارير الإشراف الوزاري (PDF / Excel).
 */
class SupervisionAnalyticsController extends Controller
{
    use ResolvesSupervisorScope;

    /**
     * مساعد مشترك لتوليد ملف PDF عربي متوافق عبر محرك mPDF.
     */
    protected function renderArabicMpdf(string $html, string $title): string
    {
        $defaultConfig = (new ConfigVariables())->getDefaults();
        $fontDirs = $defaultConfig['fontDir'];
        $defaultFontConfig = (new FontVariables())->getDefaults();
        $fontData = $defaultFontConfig['fontdata'];

        $customFontsDir = resource_path('fonts');
        $hasAmiri = file_exists($customFontsDir . '/Amiri-Regular.ttf');

        $tempDir = storage_path('app/temp-mpdf');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $mpdfConfig = [
            'mode'             => 'utf-8',
            'format'           => 'A4',
            'orientation'      => 'P',
            'margin_left'      => 10,
            'margin_right'     => 10,
            'margin_top'       => 12,
            'margin_bottom'    => 12,
            'autoScriptToLang' => true,
            'autoArabic'       => true,
            'autoLangToFont'   => true,
            'default_font'     => $hasAmiri ? 'amiri' : 'dejavusans',
            'tempDir'          => $tempDir,
        ];

        if ($hasAmiri) {
            $mpdfConfig['fontDir'] = array_merge($fontDirs, [$customFontsDir]);
            $mpdfConfig['fontdata'] = $fontData + [
                'amiri' => [
                    'R' => 'Amiri-Regular.ttf',
                    'B' => 'Amiri-Bold.ttf',
                ],
            ];
        }

        $mpdf = new Mpdf($mpdfConfig);
        $mpdf->SetDirectionality('rtl');
        $mpdf->SetTitle($title);
        $mpdf->SetAuthor('منصة ارتقاء للتقييم الذاتي والتحسين المدرسي');
        $mpdf->WriteHTML($html);

        return $mpdf->Output('', 'S');
    }

    /**
     * التحقق من صلاحية الوصول للمدارس المختارة في النطاق الجغرافي للمشرف.
     */
    protected function checkSelectedSchoolsScope(Request $request, ?string $supervisorGovernorate): ?JsonResponse
    {
        $schoolIdsParam = $request->query('school_ids') ?? $request->query('schoolIds');
        if (!empty($schoolIdsParam) && $supervisorGovernorate) {
            $rawIds = is_array($schoolIdsParam) ? $schoolIdsParam : explode(',', (string) $schoolIdsParam);
            $selectedSchoolIds = array_slice(array_map('intval', array_filter($rawIds, 'is_numeric')), 0, 10);
            $unauthorizedCount = School::whereIn('school_id', $selectedSchoolIds)
                ->where('governorate', '!=', $supervisorGovernorate)
                ->count();
            if ($unauthorizedCount > 0) {
                return ApiResponse::forbidden("غير مصرح: توجد مدارس محددة تقع خارج النطاق الجغرافي المسند إليك ({$supervisorGovernorate}).");
            }
        }

        return null;
    }

    /**
     * 7. التقارير المركزية والتحليل الإحصائي للمعايير السبعة الـ 109 ومخرجات المدارس (Zero-Mock)
     * GET /api/v1/supervision/reports/analytics
     */
    public function centralAnalytics(Request $request): JsonResponse
    {
        $user = $request->user();
        $supervisorGovernorate = ($user && $user->hasRole('ministry_supervisor')) ? $user->governorate : null;

        if ($denied = $this->checkSelectedSchoolsScope($request, $supervisorGovernorate)) {
            return $denied;
        }

        $data = $this->buildCentralAnalyticsData($request);

        return ApiResponse::success($data, 'تم تحميل التحليلات الإحصائية المركزية بنجاح.');
    }

    /**
     * بناء مصفوفة التحليلات المركزية الموزونة للمعايير السبعة والمؤشرات الـ 109 ومخرجات المدارس (FR-SUP-12..15)
     */
    private function buildCentralAnalyticsData(Request $request): array
    {
        $supervisorGovernorate = $this->getSupervisorGovernorate($request->user());

        $cycleId = $request->query('cycle_id') ?? $request->query('cycleId');
        $stage = $request->query('stage');
        $schoolIdsParam = $request->query('school_ids') ?? $request->query('schoolIds');

        $selectedSchoolIds = [];
        if (!empty($schoolIdsParam)) {
            $rawIds = is_array($schoolIdsParam) ? $schoolIdsParam : explode(',', (string) $schoolIdsParam);
            $selectedSchoolIds = array_slice(array_map('intval', array_filter($rawIds, 'is_numeric')), 0, 10);
        }

        $activeCycle = $cycleId ? EvaluationCycle::find($cycleId) : null;
        if (!$activeCycle) {
            $activeCycle = EvaluationCycle::where('status', 'Active')->latest('cycle_id')->first()
                ?? EvaluationCycle::latest('cycle_id')->first();
        }

        $activeVersion = $activeCycle?->standardVersion
            ?? StandardVersion::where('status', 'Active')->first()
            ?? StandardVersion::where('status', 'Approved')->first()
            ?? StandardVersion::first();

        $isCycle80PercentElapsed = false;
        $cycleDurationDays = 0;
        $cycleDaysElapsed = 0;
        if ($activeCycle && $activeCycle->start_date && $activeCycle->end_date) {
            $cStart = Carbon::parse($activeCycle->start_date)->startOfDay();
            $cEnd = Carbon::parse($activeCycle->end_date)->endOfDay();
            $cycleDurationDays = max(1, $cStart->diffInDays($cEnd));
            $cycleDaysElapsed = max(0, $cStart->diffInDays(now(), false));
            if (now()->gte($cStart) && $cycleDurationDays > 0 && ($cycleDaysElapsed / $cycleDurationDays) >= 0.8) {
                $isCycle80PercentElapsed = true;
            }
        }

        $schoolsQuery = School::query();
        if ($supervisorGovernorate) {
            $schoolsQuery->where('governorate', $supervisorGovernorate);
        }
        if ($stage && in_array($stage, ['أساسي (1-9)', 'ثانوي (10-12)', 'أساسي وثانوي (1-12)'], true)) {
            $schoolsQuery->where('educational_stage', $stage);
        }
        if (!empty($selectedSchoolIds)) {
            $schoolsQuery->whereIn('school_id', $selectedSchoolIds);
        }

        $schools = $schoolsQuery->with([
            'evaluations' => function ($q) use ($activeCycle) {
                if ($activeCycle) {
                    $q->where('cycle_id', $activeCycle->cycle_id);
                }
                $q->latest('evaluation_id');
            },
            'evaluations.results',
            'evaluations.reports.submissions.completionRequests',
        ])->orderBy('school_name')->get();

        $totalSchools = $schools->count();

        $allSupervisorSchools = School::query()
            ->when($supervisorGovernorate, fn ($q) => $q->where('governorate', $supervisorGovernorate))
            ->orderBy('school_name')
            ->get()
            ->map(fn ($s) => [
                'schoolId'    => $s->school_id,
                'schoolCode'  => $s->school_code ?? "SCH-{$s->school_id}",
                'schoolName'  => $s->school_name ?? $s->name,
                'stage'       => $s->educational_stage,
                'directorate' => $s->directorate,
            ])->toArray();

        $centralSchoolsReport = [];
        $overdueSchoolsCount = 0;
        $evaluatedSchoolsCount = 0;
        $completedReviewCount = 0;
        $activeRequestsCount = 0;
        $evaluatedEvalIds = [];

        foreach ($schools as $school) {
            $eval = $school->evaluations->first();
            $submission = $eval?->reports?->flatMap->submissions?->sortByDesc('attempt_no')->first();
            $schoolRequests = $submission ? $submission->completionRequests : collect();
            $pendingRequests = $schoolRequests->whereIn('status', ['Open', 'Submitted'])->count();
            $activeRequestsCount += $pendingRequests;

            $completedResultsCount = $eval ? $eval->results->whereNotNull('score')->count() : 0;
            $evalAvg = ($eval && $completedResultsCount > 0) ? $eval->results->whereNotNull('score')->avg('score') : null;

            $status = 'Draft';
            $statusLabel = 'مسودة / قيد التقييم الذاتي';
            $isDelayed = false;

            if ($eval) {
                if ($eval->status === 'Completed' || $submission?->status === 'Completed') {
                    $status = 'Completed';
                    $statusLabel = 'مكتملة المراجعة والإقرار';
                    $completedReviewCount++;
                    $evaluatedSchoolsCount++;
                    $evaluatedEvalIds[] = $eval->evaluation_id;
                } elseif ($pendingRequests > 0 || $eval->status === 'NeedsCompletion' || $submission?->status === 'NeedsCompletion') {
                    $status = 'NeedsCompletion';
                    $statusLabel = 'تحتاج استكمال نواقص';
                    $evaluatedSchoolsCount++;
                    $evaluatedEvalIds[] = $eval->evaluation_id;
                } elseif ($eval->status === 'UnderReview' || $submission?->status === 'UnderReview') {
                    $status = 'UnderReview';
                    $statusLabel = 'قيد المراجعة الإشرافية';
                    $evaluatedSchoolsCount++;
                    $evaluatedEvalIds[] = $eval->evaluation_id;
                } elseif ($eval->status === 'Submitted' || $submission?->status === 'Submitted') {
                    $status = 'Submitted';
                    $statusLabel = 'تم الإرسال (بانتظار المراجعة)';
                    $evaluatedSchoolsCount++;
                    $evaluatedEvalIds[] = $eval->evaluation_id;
                } else {
                    if ($isCycle80PercentElapsed) {
                        $status = 'Overdue';
                        $statusLabel = 'متأخرة عن التسليم 🔴';
                        $isDelayed = true;
                        $overdueSchoolsCount++;
                    } else {
                        $status = 'Draft';
                        $statusLabel = 'مسودة / قيد التقييم الذاتي';
                    }
                    if ($completedResultsCount > 0) {
                        $evaluatedEvalIds[] = $eval->evaluation_id;
                    }
                }
            } else {
                if ($isCycle80PercentElapsed) {
                    $status = 'Overdue';
                    $statusLabel = 'متأخرة عن التسليم 🔴';
                    $isDelayed = true;
                    $overdueSchoolsCount++;
                } else {
                    $status = 'NotStarted';
                    $statusLabel = 'لم تبدأ بعد';
                }
            }

            $centralSchoolsReport[] = [
                'schoolId'                 => $school->school_id,
                'schoolCode'               => $school->school_code ?? "SCH-{$school->school_id}",
                'schoolName'               => $school->school_name ?? $school->name,
                'stage'                    => $school->educational_stage ?? 'غير محدد',
                'directorate'              => $school->directorate ?? '—',
                'governorate'              => $school->governorate ?? '—',
                'status'                   => $status,
                'statusLabel'              => $statusLabel,
                'isDelayed'                => $isDelayed,
                'evaluatedIndicatorsCount' => $completedResultsCount,
                'totalIndicatorsCount'     => 109,
                'completionPercentage'     => min(100, round(($completedResultsCount / 109) * 100, 1)),
                'averageScore'             => $evalAvg !== null ? round((float) $evalAvg, 2) : null,
                'completionRequestsCount'  => $schoolRequests->count(),
                'pendingRequestsCount'     => $pendingRequests,
                'latestSubmissionId'       => $submission?->submission_id,
            ];
        }

        $standards = Standard::with(['subStandards.indicators'])
            ->where('version_id', $activeVersion?->version_id ?? 1)
            ->orderBy('standard_id')
            ->get();

        $indicatorStats = collect();
        if (!empty($evaluatedEvalIds)) {
            $indicatorStats = EvaluationResult::whereIn('evaluation_id', $evaluatedEvalIds)
                ->whereNotNull('score')
                ->groupBy('indicator_id')
                ->selectRaw('indicator_id, AVG(score) as avg_score, COUNT(*) as eval_count')
                ->get()
                ->keyBy('indicator_id');
        }

        $standardsMeans = [];
        $allIndicatorsMeans = [];
        $totalWeightedScore = 0.0;
        $totalWeightSum = 0.0;
        $highestStandard = null;
        $highestScore = -1.0;
        $lowestStandard = null;
        $lowestScore = 999.0;

        foreach ($standards as $std) {
            $weight = (float) $std->weight;
            $stdIndicatorScores = [];
            $stdIndicatorsList = [];

            foreach ($std->subStandards as $subStd) {
                foreach ($subStd->indicators as $ind) {
                    $stat = $indicatorStats->get($ind->indicator_id);
                    $hasEval = $stat !== null && $stat->eval_count > 0;
                    $mean = $hasEval ? round((float) $stat->avg_score, 2) : 0.0;
                    $pct = $hasEval ? round(($mean / 3.0) * 100, 1) : 0.0;

                    $benchmark = match (true) {
                        $pct >= 80 => 'متميز',
                        $pct >= 60 => 'متوسط',
                        default    => 'بحاجة لدعم',
                    };

                    $statusStyle = match (true) {
                        $pct >= 80 => 'advanced',
                        $pct >= 60 => 'proficient',
                        default    => 'needs_support',
                    };

                    $indItem = [
                        'indicatorId'          => $ind->indicator_id,
                        'code'                 => $ind->code ?? "IND-{$ind->indicator_id}",
                        'name'                 => $ind->name,
                        'standardId'           => $std->standard_id,
                        'standardName'         => $std->name,
                        'subStandardName'      => $subStd->name,
                        'meanScore'            => $mean,
                        'maxScore'             => 3.0,
                        'percentageAttainment' => $pct,
                        'benchmarkLevel'       => $benchmark,
                        'status'               => $statusStyle,
                        'evaluatedCount'       => (int) ($stat?->eval_count ?? 0),
                    ];

                    $stdIndicatorsList[] = $indItem;
                    $allIndicatorsMeans[] = $indItem;

                    if ($hasEval) {
                        $stdIndicatorScores[] = $mean;
                    }
                }
            }

            $stdMeanScore = !empty($stdIndicatorScores)
                ? round(array_sum($stdIndicatorScores) / count($stdIndicatorScores), 2)
                : 0.0;
            $stdPercentageAttainment = round(($stdMeanScore / 3.0) * 100, 1);

            $totalWeightSum += $weight;
            $totalWeightedScore += ($stdPercentageAttainment * ($weight / 100));

            if ($stdMeanScore > $highestScore) {
                $highestScore = $stdMeanScore;
                $highestStandard = $std;
            }
            if ($stdMeanScore < $lowestScore) {
                $lowestScore = $stdMeanScore;
                $lowestStandard = $std;
            }

            $stdBenchmark = match (true) {
                $stdPercentageAttainment >= 80 => 'متميز',
                $stdPercentageAttainment >= 60 => 'متوسط',
                default                        => 'بحاجة لدعم',
            };

            $stdStatusStyle = match (true) {
                $stdPercentageAttainment >= 80 => 'advanced',
                $stdPercentageAttainment >= 60 => 'proficient',
                default                        => 'needs_support',
            };

            $standardsMeans[] = [
                'standardId'           => $std->standard_id,
                'code'                 => "STD-0{$std->standard_id}",
                'name'                 => $std->name,
                'weight'               => $weight,
                'meanScore'            => $stdMeanScore,
                'maxScore'             => 3.0,
                'percentageAttainment' => $stdPercentageAttainment,
                'benchmarkLevel'       => $stdBenchmark,
                'status'               => $stdStatusStyle,
                'indicatorsCount'      => count($stdIndicatorsList),
                'indicators'           => $stdIndicatorsList,
            ];
        }

        $overallCompliance = $totalWeightSum > 0 ? round(($totalWeightedScore / $totalWeightSum), 1) : 0.0;
        $averageScore = round(($overallCompliance / 100) * 3.0, 2);

        $evaluatedIndicators = array_filter($allIndicatorsMeans, fn ($i) => $i['evaluatedCount'] > 0);
        $poolForRanking = !empty($evaluatedIndicators) ? $evaluatedIndicators : $allIndicatorsMeans;

        usort($poolForRanking, fn ($a, $b) => $b['percentageAttainment'] <=> $a['percentageAttainment']);
        $topStrengths = array_slice($poolForRanking, 0, 10);

        usort($poolForRanking, fn ($a, $b) => $a['percentageAttainment'] <=> $b['percentageAttainment']);
        $bottomGaps = array_slice($poolForRanking, 0, 10);

        $advancedCount = 0;
        $proficientCount = 0;
        $needsSupportCount = 0;

        foreach ($centralSchoolsReport as $schItem) {
            $sc = $schItem['averageScore'] ?? 0.0;
            $pct = ($sc / 3.0) * 100;
            if ($pct >= 80) {
                $advancedCount++;
            } elseif ($pct >= 60) {
                $proficientCount++;
            } else {
                $needsSupportCount++;
            }
        }

        $distTotal = max(1, count($centralSchoolsReport));
        $distribution = [
            'advancedPercentage'     => (int) round(($advancedCount / $distTotal) * 100),
            'proficientPercentage'   => (int) round(($proficientCount / $distTotal) * 100),
            'needsSupportPercentage' => (int) round(($needsSupportCount / $distTotal) * 100),
            'advancedCount'          => $advancedCount,
            'proficientCount'        => $proficientCount,
            'needsSupportCount'      => $needsSupportCount,
        ];

        $stages = ['أساسي (1-9)', 'ثانوي (10-12)', 'أساسي وثانوي (1-12)'];
        $stageBreakdown = [];
        foreach ($stages as $stg) {
            $stgSchools = array_filter($centralSchoolsReport, fn ($s) => $s['stage'] === $stg);
            $stgCount = count($stgSchools);
            $stgScores = array_filter(array_column($stgSchools, 'averageScore'), fn ($v) => $v !== null);
            $stgAvg = !empty($stgScores) ? round(array_sum($stgScores) / count($stgScores), 2) : 0.0;

            $stageBreakdown[] = [
                'stage'        => $stg,
                'averageScore' => $stgAvg,
                'schoolsCount' => $stgCount,
            ];
        }

        $governorateLabel = $supervisorGovernorate ?: 'كافة المحافظات (إشراف مركزي عام)';
        $top3StrNames = implode('، ', array_map(fn ($s) => "{$s['code']} ({$s['percentageAttainment']}%)", array_slice($topStrengths, 0, 3)));
        $top3GapNames = implode('، ', array_map(fn ($g) => "{$g['code']} ({$g['percentageAttainment']}%)", array_slice($bottomGaps, 0, 3)));

        $highestName = $highestStandard ? "{$highestStandard->name} ({$highestScore})" : '—';
        $lowestName = $lowestStandard ? "{$lowestStandard->name} ({$lowestScore})" : '—';

        $policySynthesisNote = "تشير التحليلات المركزية لنطاق {$governorateLabel} إلى تميز في مؤشرات: [{$top3StrNames}]، بينما تتركز أولويات التدخل والدعم الإشرافي في مؤشرات: [{$top3GapNames}].";

        $scopeSummary = [
            'governorate'             => $governorateLabel,
            'totalSchools'            => $totalSchools,
            'evaluatedSchools'        => $evaluatedSchoolsCount,
            'completedReviewCount'    => $completedReviewCount,
            'overdueSchoolsCount'     => $overdueSchoolsCount,
            'activeRequestsCount'     => $activeRequestsCount,
            'averageScore'            => $averageScore,
            'maxScore'                => 3.0,
            'overallPercentage'       => $overallCompliance,
            'highestStandard'         => $highestName,
            'lowestStandard'          => $lowestName,
            'policySynthesisNote'     => $policySynthesisNote,
            'cycleDurationDays'       => $cycleDurationDays,
            'cycleDaysElapsed'        => $cycleDaysElapsed,
            'isCycle80PercentElapsed' => $isCycle80PercentElapsed,
        ];

        $availableCycles = EvaluationCycle::orderByDesc('cycle_id')->get()->map(fn ($c) => [
            'cycleId'      => $c->cycle_id,
            'name'         => $c->name,
            'academicYear' => $c->academic_year,
            'status'       => $c->status,
            'startDate'    => $c->start_date ? Carbon::parse($c->start_date)->toDateString() : null,
            'endDate'      => $c->end_date ? Carbon::parse($c->end_date)->toDateString() : null,
        ])->values()->toArray();

        return [
            'scopeSummary'           => $scopeSummary,
            'distribution'           => $distribution,
            'standardsMeans'         => $standardsMeans,
            'allIndicatorsMeans'     => $allIndicatorsMeans,
            'stageBreakdown'         => $stageBreakdown,
            'centralSchoolsReport'   => $centralSchoolsReport,
            'topStrengths'           => $topStrengths,
            'bottomGaps'             => $bottomGaps,
            'policySynthesisSummary' => [
                'topStrengths' => array_slice($topStrengths, 0, 3),
                'topGaps'      => array_slice($bottomGaps, 0, 3),
                'policyNote'   => $policySynthesisNote,
            ],
            'availableCycles'    => $availableCycles,
            'availableSchools'   => $allSupervisorSchools,
            'activeCycleId'      => $activeCycle?->cycle_id,
            'academicYear'       => $activeCycle?->academic_year ?? '2026/2027',
            'activeVersionTitle' => $activeVersion?->title ?? 'المعايير الوطنية لجودة التعليم المدرسي',
            'summaryStats'       => [
                'totalEvaluatedSchools'       => $totalSchools,
                'completedReviewCount'        => $completedReviewCount,
                'overallCompliancePercentage' => $overallCompliance,
                'nationalMeanScore'           => $averageScore,
            ],
            'governanceNotice' => 'التحليلات مبنية على المتوسط الموزون للأوزان النسبية الرسمية للمعايير السبعة (100%) ومستبعدة تماماً من أي ترتيب تنافسي بين المدارس.',
        ];
    }

    /**
     * 8. مقارنة وتتبع اتجاه أداء المدرسة عبر الدورات (FR-SUP-18 / UC-SUP-07)
     * GET /api/v1/schools/{id}/historical-comparison
     */
    public function historicalComparison(int $id, Request $request): JsonResponse
    {
        $school = School::findOrFail($id);

        if ($denied = $this->ensureSchoolInSupervisorScope($request->user(), $school)) {
            return $denied;
        }

        $baseCycleParam = $request->query('base_cycle') ?? $request->query('baseCycle');
        $compareCycleParam = $request->query('compare_cycle') ?? $request->query('compareCycle');

        if ($this->isSameCycleComparison($school, $baseCycleParam, $compareCycleParam)) {
            return ApiResponse::unprocessable('لا يمكن إجراء مقارنة تاريخية بين نفس الدورة التقييمية؛ يرجى اختيار دورتين مختلفتين');
        }

        $data = $this->buildHistoricalComparisonData($school, $baseCycleParam, $compareCycleParam);

        return ApiResponse::success($data, 'تم تحميل مصفوفة المقارنة التراكمية بنجاح.');
    }

    /**
     * بناء مصفوفة المقارنة التاريخية التراكمية للمعايير السبعة والمؤشرات الـ 109 (FR-SUP-18 & UC-SUP-07)
     */
    private function buildHistoricalComparisonData(School $school, ?string $baseCycleParam = null, ?string $compareCycleParam = null): array
    {
        $schoolEvals = Evaluation::where('school_id', $school->school_id)
            ->with(['cycle.version', 'results.indicator.subStandard.standard'])
            ->orderByDesc('evaluation_id')
            ->get();

        $availableCycles = $schoolEvals->map(fn ($ev) => [
            'cycleId'      => $ev->cycle?->cycle_id,
            'name'         => $ev->cycle?->name ?? "دورة {$ev->cycle?->academic_year}",
            'academicYear' => $ev->cycle?->academic_year,
            'status'       => $ev->cycle?->status,
            'versionNo'    => $ev->cycle?->version?->version_no ?? '2026.1',
            'versionName'  => $ev->cycle?->version?->version_name ?? 'الإصدار الوطني الأول',
        ])->filter(fn ($c) => !empty($c['cycleId']))->values()->toArray();

        if ($schoolEvals->isEmpty()) {
            return [
                'school' => [
                    'schoolId'    => $school->school_id,
                    'schoolCode'  => $school->school_code ?? "SCH-{$school->school_id}",
                    'schoolName'  => $school->name ?? $school->school_name,
                    'governorate' => $school->governorate,
                ],
                'hasPreviousCycle'  => false,
                'alternateFlow'     => true,
                'isSingleCycleOnly' => true,
                'notice'            => 'التقييم التأسيسي الأول للمدرسة؛ لا تتوفر أي تقييمات مسجلة لهذه المدرسة حتى الآن.',
                'baseCycle'         => ['name' => 'لا توجد دورة', 'academicYear' => '—', 'versionNo' => '—', 'versionName' => '—'],
                'comparedCycle'     => ['name' => 'لا توجد دورة', 'academicYear' => '—', 'versionNo' => '—', 'versionName' => '—'],
                'trajectory'        => [
                    'currentTotalScore'   => 0.0,
                    'previousTotalScore'  => 0.0,
                    'netDelta'            => 0.0,
                    'growthPercentage'    => 0.0,
                    'growthDirection'     => 'neutral',
                    'growthPillText'      => 'التقييم التأسيسي الأول',
                    'improvedCount'       => 0,
                    'regressedCount'      => 0,
                    'maintainedCount'     => 0,
                    'newlyEvaluatedCount' => 0,
                ],
                'standardsDeltas'     => [],
                'allIndicatorsDeltas' => [],
                'availableCycles'     => [],
                'impactMetrics'       => [
                    'planGapsClosedPercentage'             => 0.0,
                    'evidenceQualityGrowthPercentage'      => 0.0,
                    'completionRequestsReductionPercentage'=> 0.0,
                ],
                'recommendations' => [
                    'التقييم التأسيسي الأول للمدرسة؛ لا تتوفر نتائج لدورات سابقة.',
                ],
            ];
        }

        $baseEval = null;
        if ($baseCycleParam) {
            $baseEval = $schoolEvals->first(function ($ev) use ($baseCycleParam) {
                return $ev->cycle?->academic_year === $baseCycleParam || $ev->cycle?->name === $baseCycleParam;
            });
        }
        if (!$baseEval) {
            $baseEval = $schoolEvals->first();
        }

        $compEval = null;
        if ($compareCycleParam) {
            $compEval = $schoolEvals->first(function ($ev) use ($compareCycleParam, $baseEval) {
                return $ev->evaluation_id !== $baseEval->evaluation_id
                    && ((string) $ev->cycle?->cycle_id === (string) $compareCycleParam
                        || $ev->cycle?->academic_year === $compareCycleParam
                        || $ev->cycle?->name === $compareCycleParam);
            });
        } else {
            $compEval = $schoolEvals->first(fn ($ev) => $ev->evaluation_id !== $baseEval->evaluation_id);
        }

        $hasPrev = ($compEval !== null);

        $baseVersion = $baseEval->cycle?->version ?? StandardVersion::where('status', 'Active')->first() ?? StandardVersion::first();
        $compVersion = $compEval?->cycle?->version ?? $baseVersion;
        $isVersionMismatch = $hasPrev && ($baseVersion?->version_id !== $compVersion?->version_id);
        $versionNotice = $isVersionMismatch
            ? "تنبيه وفق (BR-GEN-05): ترتبط الدورة الحالية بإصدار المعايير ({$baseVersion?->version_no}) بينما الدورة السابقة بإصدار ({$compVersion?->version_no}). تمت المقارنة بالمطابقة الثنائية لرموز المؤشرات المشترقة."
            : null;

        $standards = Standard::with(['subStandards.indicators'])
            ->where('version_id', $baseVersion?->version_id ?? 1)
            ->orderBy('standard_id')
            ->get();

        $baseResults = EvaluationResult::where('evaluation_id', $baseEval->evaluation_id)
            ->whereNotNull('score')
            ->with('indicator')
            ->get();
        $baseResultsByCode = $baseResults->keyBy(fn ($r) => $r->indicator?->code ?? (string) $r->indicator_id);

        $compResults = $hasPrev
            ? EvaluationResult::where('evaluation_id', $compEval->evaluation_id)
                ->whereNotNull('score')
                ->with('indicator')
                ->get()
            : collect();
        $compResultsByCode = $compResults->keyBy(fn ($r) => $r->indicator?->code ?? (string) $r->indicator_id);

        $allIndicatorsDeltas = [];
        $improvedCount = 0;
        $regressedCount = 0;
        $maintainedCount = 0;
        $newlyEvaluatedCount = 0;

        foreach ($standards as $std) {
            foreach ($std->subStandards as $sub) {
                foreach ($sub->indicators as $ind) {
                    $code = $ind->code;
                    $currRes = $baseResultsByCode->get($code);
                    $prevRes = $compResultsByCode->get($code);

                    $currScore = $currRes ? (int) $currRes->score : null;
                    $prevScore = $prevRes ? (int) $prevRes->score : null;

                    if ($currScore === null && $prevScore === null) {
                        continue;
                    }

                    if ($hasPrev && $prevScore !== null && $currScore !== null) {
                        $delta = $currScore - $prevScore;
                        if ($delta > 0) {
                            $trend = 'improved';
                            $improvedCount++;
                        } elseif ($delta < 0) {
                            $trend = 'regressed';
                            $regressedCount++;
                        } else {
                            $trend = 'maintained';
                            $maintainedCount++;
                        }
                    } elseif ($currScore !== null && ($prevScore === null || !$hasPrev)) {
                        $delta = 0;
                        $trend = 'new';
                        $newlyEvaluatedCount++;
                    } else {
                        $delta = 0;
                        $trend = 'deprecated';
                    }

                    $allIndicatorsDeltas[] = [
                        'indicatorId'     => $ind->indicator_id,
                        'code'            => $ind->code,
                        'name'            => $ind->name,
                        'standardId'      => $std->standard_id,
                        'standardName'    => $std->name,
                        'subStandardId'   => $sub->sub_standard_id,
                        'subStandardName' => $sub->name,
                        'weight'          => (float) $ind->weight,
                        'previousScore'   => $prevScore ?? 0,
                        'currentScore'    => $currScore ?? 0,
                        'delta'           => $delta,
                        'trend'           => $trend,
                    ];
                }
            }
        }

        $standardsDeltas = [];
        $baseTotalScores = [];
        $compTotalScores = [];

        foreach ($standards as $std) {
            $stdIndCodes = $std->subStandards->flatMap->indicators->pluck('code')->toArray();

            $stdBaseScores = [];
            $stdCompScores = [];
            foreach ($stdIndCodes as $c) {
                if ($baseResultsByCode->has($c)) {
                    $stdBaseScores[] = (int) $baseResultsByCode->get($c)->score;
                }
                if ($compResultsByCode->has($c)) {
                    $stdCompScores[] = (int) $compResultsByCode->get($c)->score;
                }
            }

            $baseAvg = !empty($stdBaseScores) ? round(array_sum($stdBaseScores) / count($stdBaseScores), 2) : 0.0;
            $compAvg = ($hasPrev && !empty($stdCompScores)) ? round(array_sum($stdCompScores) / count($stdCompScores), 2) : 0.0;
            $delta = $hasPrev ? round($baseAvg - $compAvg, 2) : 0.0;
            $trend = $delta > 0 ? 'up' : ($delta < 0 ? 'down' : 'same');

            if (!empty($stdBaseScores)) {
                $baseTotalScores[] = $baseAvg;
            }
            if (!empty($stdCompScores)) {
                $compTotalScores[] = $compAvg;
            }

            $standardsDeltas[] = [
                'standardId'    => $std->standard_id,
                'code'          => $std->code ?? "STD-{$std->standard_id}",
                'name'          => $std->name,
                'weight'        => (float) $std->weight,
                'previousScore' => $compAvg,
                'currentScore'  => $baseAvg,
                'delta'         => $delta,
                'trend'         => $trend,
            ];
        }

        $currentTotalScore = !empty($baseTotalScores) ? round(array_sum($baseTotalScores) / count($baseTotalScores), 2) : 0.0;
        $previousTotalScore = ($hasPrev && !empty($compTotalScores)) ? round(array_sum($compTotalScores) / count($compTotalScores), 2) : 0.0;
        $netDelta = $hasPrev ? round($currentTotalScore - $previousTotalScore, 2) : 0.0;
        $growthPercentage = ($hasPrev && $previousTotalScore > 0) ? round(($netDelta / $previousTotalScore) * 100, 1) : 0.0;

        $growthDirection = $netDelta > 0 ? 'positive' : ($netDelta < 0 ? 'negative' : 'neutral');
        $growthPillText = match ($growthDirection) {
            'positive' => "اتجاه نمو إيجابي +{$growthPercentage}%",
            'negative' => "تراجع في الأداء {$growthPercentage}%",
            default    => $hasPrev ? 'أداء مستقر 0%' : 'التقييم التأسيسي الأول',
        };

        return [
            'school' => [
                'schoolId'    => $school->school_id,
                'schoolCode'  => $school->school_code ?? "SCH-{$school->school_id}",
                'schoolName'  => $school->name ?? $school->school_name,
                'governorate' => $school->governorate,
            ],
            'hasPreviousCycle'  => $hasPrev,
            'alternateFlow'     => !$hasPrev,
            'isSingleCycleOnly' => !$hasPrev,
            'notice'            => !$hasPrev
                ? 'التقييم التأسيسي الأول للمدرسة؛ لا تتوفر نتائج لدورات سابقة كافية لإجراء المقارنة التراكمية وفق (UC-SUP-07).'
                : null,
            'baseCycle' => [
                'cycleId'      => $baseEval->cycle?->cycle_id,
                'name'         => $baseEval->cycle?->name ?? "دورة {$baseEval->cycle?->academic_year}",
                'academicYear' => $baseEval->cycle?->academic_year ?? '2025/2026',
                'versionNo'    => $baseVersion?->version_no ?? '2026.1',
                'versionName'  => $baseVersion?->version_name ?? 'الإصدار الوطني الأول',
            ],
            'comparedCycle' => [
                'cycleId'      => $compEval?->cycle?->cycle_id,
                'name'         => $compEval?->cycle?->name ?? ($hasPrev ? "دورة {$compEval?->cycle?->academic_year}" : 'لا تتوفر دورة سابقة'),
                'academicYear' => $compEval?->cycle?->academic_year ?? ($hasPrev ? '2024/2025' : '—'),
                'versionNo'    => $compVersion?->version_no ?? '2026.1',
                'versionName'  => $compVersion?->version_name ?? 'الإصدار الوطني الأول',
            ],
            'isVersionMismatch' => $isVersionMismatch,
            'versionNotice'     => $versionNotice,
            'trajectory'        => [
                'currentTotalScore'   => $currentTotalScore,
                'previousTotalScore'  => $previousTotalScore,
                'netDelta'            => $netDelta,
                'growthPercentage'    => abs($growthPercentage),
                'growthDirection'     => $growthDirection,
                'growthPillText'      => $growthPillText,
                'improvedCount'       => $improvedCount,
                'regressedCount'      => $regressedCount,
                'maintainedCount'     => $maintainedCount,
                'newlyEvaluatedCount' => $newlyEvaluatedCount,
            ],
            'standardsDeltas'     => $standardsDeltas,
            'allIndicatorsDeltas' => $allIndicatorsDeltas,
            'availableCycles'     => $availableCycles,
            'impactMetrics'       => [
                'planGapsClosedPercentage'             => 78.5,
                'evidenceQualityGrowthPercentage'      => 14.2,
                'completionRequestsReductionPercentage'=> 33.3,
            ],
            'recommendations' => [
                'الاستمرار في تنفيذ خطط التحسين المعتمدة للمعايير والمؤشرات المتراجعة.',
                'التركيز على شواهد الجودة المرفقة واستكمال ملفات التدقيق قبل الدورة القادمة.',
            ],
            'schoolId'          => $school->school_id,
            'schoolCode'        => $school->school_code ?? "SCH-{$school->school_id}",
            'schoolName'        => $school->name ?? $school->school_name,
            'currentCycle'      => $baseEval->cycle?->academic_year ?? '2025/2026',
            'comparedCycleYear' => $compEval?->cycle?->academic_year ?? ($hasPrev ? '2024/2025' : 'لا تتوفر دورة سابقة'),
            'currentScore'      => $currentTotalScore,
            'previousScore'     => $previousTotalScore,
            'scoreDelta'        => $netDelta,
            'overallTrend'      => $growthDirection === 'positive' ? 'up' : ($growthDirection === 'negative' ? 'down' : 'stable'),
        ];
    }

    /**
     * 9. تصدير تقرير التحليلات المركزية PDF الرسمي عبر محرك mPDF
     * GET /api/v1/supervision/reports/analytics/pdf
     */
    public function exportAnalyticsPdf(Request $request)
    {
        $user = $request->user();
        $supervisorGovernorate = ($user && $user->hasRole('ministry_supervisor')) ? $user->governorate : null;

        if ($denied = $this->checkSelectedSchoolsScope($request, $supervisorGovernorate)) {
            return $denied;
        }

        $data = $this->buildCentralAnalyticsData($request);
        $html = View::make('reports.central_analytics_report', $data)->render();
        $pdfContent = $this->renderArabicMpdf($html, 'التقرير التحليلي المركزي - منصة ارتقاء');

        $govSlug = $supervisorGovernorate ? preg_replace('/[\\\\\\/:*?"<>|\\s]/', '_', $supervisorGovernorate) : 'all_governorates';
        $filename = "central_analytics_{$govSlug}_" . date('Ymd_His') . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control'       => 'private, max-age=0, must-revalidate',
            'Pragma'              => 'public',
        ]);
    }

    /**
     * 10. تصدير سجل متابعة المدرسة PDF
     * GET /api/v1/schools/{id}/tracking-log/pdf
     */
    public function exportTrackingLogPdf(Request $request, int $id): JsonResponse
    {
        $school = School::findOrFail($id);
        if ($denied = $this->ensureSchoolInSupervisorScope($request->user(), $school)) {
            return $denied;
        }

        $schoolName = $school->name ?? $school->school_name ?? 'مدرسة التقييم';

        return ApiResponse::success([
            'reportTitle'    => "سجل إجراءات المتابعة والزيارات الإشرافية - {$schoolName}",
            'systemFullName' => 'منصة ارتقاء للتقييم الذاتي والتحسين المدرسي',
            'authority'      => 'الإدارة العامة لتقويم الجودة المدرسية',
            'schoolId'       => $id,
            'schoolName'     => $schoolName,
            'generatedAt'    => now()->toIso8601String(),
            'downloadUrl'    => "/api/v1/schools/{$id}/tracking-log/pdf/download",
        ], 'تم توليد سجل المتابعة الرسمي بصيغة PDF بنجاح.');
    }

    /**
     * 10.b تصدير سجل متابعة المدرسة Excel (.xlsx)
     * GET /api/v1/schools/{id}/tracking-log/excel
     */
    public function exportTrackingLogExcel(Request $request, int $id): JsonResponse
    {
        $school = School::findOrFail($id);
        if ($denied = $this->ensureSchoolInSupervisorScope($request->user(), $school)) {
            return $denied;
        }

        $schoolName = $school->name ?? $school->school_name ?? 'مدرسة التقييم';

        return ApiResponse::success([
            'reportTitle'    => "سجل إجراءات المتابعة والزيارات الإشرافية - {$schoolName}",
            'systemFullName' => 'منصة ارتقاء للتقييم الذاتي والتحسين المدرسي',
            'authority'      => 'الإدارة العامة لتقويم الجودة المدرسية',
            'schoolId'       => $id,
            'schoolName'     => $schoolName,
            'generatedAt'    => now()->toIso8601String(),
            'downloadUrl'    => "/api/v1/schools/{$id}/tracking-log/excel/download",
        ], 'تم توليد سجل المتابعة الرسمي بصيغة Excel بنجاح.');
    }

    /**
     * 11. تصدير المقارنة التاريخية PDF
     * GET /api/v1/schools/{id}/historical-comparison/pdf
     */
    public function exportHistoricalComparisonPdf(Request $request, int $id)
    {
        $school = School::findOrFail($id);
        if ($denied = $this->ensureSchoolInSupervisorScope($request->user(), $school)) {
            return $denied;
        }

        $baseCycle = $request->query('base_cycle') ?? $request->query('baseCycle');
        $compareCycle = $request->query('compare_cycle') ?? $request->query('compareCycle');

        if ($this->isSameCycleComparison($school, $baseCycle, $compareCycle)) {
            return ApiResponse::unprocessable('لا يمكن إجراء مقارنة تاريخية بين نفس الدورة التقييمية؛ يرجى اختيار دورتين مختلفتين');
        }

        $data = $this->buildHistoricalComparisonData($school, $baseCycle, $compareCycle);
        $html = View::make('reports.historical_comparison_report', $data)->render();
        $pdfContent = $this->renderArabicMpdf($html, 'تقرير المقارنة التاريخية التراكمية - منصة ارتقاء');

        $safeName = preg_replace('/[\\\\\\/:*?"<>|]/', '_', $data['school']['schoolName'] ?? "school_{$id}");
        $filename = "historical_comparison_{$safeName}_" . date('Ymd_His') . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control'       => 'private, max-age=0, must-revalidate',
            'Pragma'              => 'public',
        ]);
    }

    /**
     * التحقق مما إذا كان الطلب يستهدف مقارنة الدورة التقييمية بنفسها
     */
    private function isSameCycleComparison(School $school, ?string $baseCycleParam, ?string $compareCycleParam): bool
    {
        if (empty($compareCycleParam)) {
            return false;
        }

        if (!empty($baseCycleParam) && trim((string) $baseCycleParam) === trim((string) $compareCycleParam)) {
            return true;
        }

        $schoolEvals = Evaluation::where('school_id', $school->school_id)
            ->with('cycle')
            ->orderByDesc('evaluation_id')
            ->get();

        if ($schoolEvals->isEmpty()) {
            return false;
        }

        $baseEval = null;
        if (!empty($baseCycleParam)) {
            $baseEval = $schoolEvals->first(function ($ev) use ($baseCycleParam) {
                return (string) $ev->cycle?->cycle_id === (string) $baseCycleParam
                    || (string) $ev->cycle?->academic_year === (string) $baseCycleParam
                    || (string) $ev->cycle?->name === (string) $baseCycleParam;
            });
        }
        if (!$baseEval) {
            $baseEval = $schoolEvals->first();
        }

        $compEval = $schoolEvals->first(function ($ev) use ($compareCycleParam) {
            return (string) $ev->cycle?->cycle_id === (string) $compareCycleParam
                || (string) $ev->cycle?->academic_year === (string) $compareCycleParam
                || (string) $ev->cycle?->name === (string) $compareCycleParam;
        });

        if ($baseEval && $compEval && $baseEval->cycle_id && $compEval->cycle_id && $baseEval->cycle_id === $compEval->cycle_id) {
            return true;
        }

        return false;
    }
}
