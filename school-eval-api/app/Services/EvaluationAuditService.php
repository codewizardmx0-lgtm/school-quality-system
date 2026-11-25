<?php

namespace App\Services;

use App\Models\CompletionRequest;
use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\EvaluationSubmission;
use App\Models\EvidenceLink;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\Report;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\User;

/**
 * خدمة التدقيق المنطقي الحتمي ومركز المراجعة الإدارية للتقييم الذاتي المدرسي.
 */
class EvaluationAuditService
{
    /**
     * تنفيذ محرك التدقيق المنطقي الحتمي للاكتشاف المبكر للمفارقات والتناقضات المنهجية (الحالات الخمس).
     */
    public function auditDiscrepancies(Evaluation $evaluation): array
    {
        // تحميل جميع المؤشرات مع معاييرها ومتطلباتها الإلزامية
        $indicators = Indicator::with([
            'subStandard.standard',
            'evidenceRequirements',
        ])->orderBy('indicator_id')->get();

        // جلب نتائج التقييم الحالي
        $results = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->with(['verificationTools'])
            ->get()
            ->keyBy('indicator_id');

        // جلب روابط الشواهد مجمعة حسب المؤشر
        $evidenceLinks = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
            ->with('documentVersion.document')
            ->get();

        $evidenceCountsByIndicator = $evidenceLinks->groupBy('indicator_id');

        // حساب المتطلبات المغطاة بدقة من خدمة الكفاية أو من روابط الشواهد
        try {
            $sufficiencyData = app(EvidenceSufficiencyService::class)->evaluateEvaluation($evaluation);
            $suffIndMap = collect($sufficiencyData['standards'] ?? [])
                ->flatMap(fn ($s) => $s['indicators'] ?? [])
                ->keyBy('indicator_id');
        } catch (\Throwable) {
            $suffIndMap = collect();
        }

        $case1Items = []; // درجة عالية بلا شواهد
        $case2Items = []; // درجة 3 بمتطلبات ناقصة
        $case3Items = []; // درجة مرتفعة بلا مبرر نصي
        $case5Items = []; // تناقض أساليب التحقق

        foreach ($indicators as $ind) {
            $res = $results->get($ind->indicator_id);
            if (!$res || $res->score === null || $res->completion_status === 'Pending') {
                continue;
            }

            $score = (int) $res->score;
            $linksForInd = $evidenceCountsByIndicator->get($ind->indicator_id) ?? collect();
            $evCount = $linksForInd->count();

            $stdName = $ind->subStandard?->standard?->name ?? 'المعايير الوطنية';
            $indCode = $ind->code;
            $indName = $ind->name;

            // الحالة 1: درجة عالية بلا شواهد (درجة >= 2 وعدد الشواهد 0)
            if ($score >= 2 && $evCount === 0) {
                $case1Items[] = [
                    'indicatorId'    => $ind->indicator_id,
                    'standardId'     => $ind->subStandard?->standard_id,
                    'code'           => $indCode,
                    'name'           => $indName,
                    'standardName'   => $stdName,
                    'score'          => $score,
                    'evidenceCount'  => 0,
                    'issue'          => "تم رصد التقدير ({$score}) لكن لا يوجد أي شاهد إثبات مرتبط بالمؤشر.",
                    'recommendation' => 'يرجى إرفاق وثيقة أو شاهد معتمد لإثبات استحقاق هذا التقدير المتقدم.',
                ];
            }

            // الحالة 2: درجة 3 بمتطلبات ناقصة (درجة = 3 ومتطلبات ناقصة عن الإلزامية)
            $indSuff = $suffIndMap->get($ind->indicator_id);
            $mandatoryCnt = (int) ($indSuff['mandatory_required_count'] ?? $ind->evidenceRequirements->where('is_mandatory', true)->count());
            $coveredCnt = (int) ($indSuff['effective_covered_count'] ?? $evCount);

            if ($score === 3 && $mandatoryCnt > 0 && $coveredCnt < $mandatoryCnt) {
                $case2Items[] = [
                    'indicatorId'    => $ind->indicator_id,
                    'standardId'     => $ind->subStandard?->standard_id,
                    'code'           => $indCode,
                    'name'           => $indName,
                    'standardName'   => $stdName,
                    'score'          => 3,
                    'mandatoryCount' => $mandatoryCnt,
                    'coveredCount'   => $coveredCnt,
                    'issue'          => "تم رصد الدرجة القصوى (3) ولكن تم تغطية ({$coveredCnt}) فقط من أصل ({$mandatoryCnt}) متطلبات إلزامية.",
                    'recommendation' => 'لاستحقاق المستوى 3 يلزم تغطية 100% من المتطلبات الإلزامية للشواهد.',
                ];
            }

            // الحالة 3: درجة مرتفعة بلا مبرر نصي (درجة >= 2 والمبرر فارغ أو أقل من 10 أحرف)
            $justification = trim((string) ($res->textual_result ?? ''));
            if ($score >= 2 && mb_strlen($justification) < 10) {
                $case3Items[] = [
                    'indicatorId'    => $ind->indicator_id,
                    'standardId'     => $ind->subStandard?->standard_id,
                    'code'           => $indCode,
                    'name'           => $indName,
                    'standardName'   => $stdName,
                    'score'          => $score,
                    'textLength'     => mb_strlen($justification),
                    'issue'          => 'تم رصد التقدير (' . $score . ') ولكن المبرر النصي للمقيم ' . (empty($justification) ? 'فارغ تماماً' : 'مقتضب جداً (أقل من 10 أحرف)') . '.',
                    'recommendation' => 'يرجى كتابة تبرير مهني واضح يوضح ممارسات المدرسة التي استند إليها هذا التقدير.',
                ];
            }

            // الحالة 5: تناقض أساليب التحقق (اختيار أسلوب وثائق وسجلات دون إرفاق أي وثيقة)
            $hasDocTool = $res->verificationTools->contains(function ($tool) {
                $tName = $tool->name ?? '';
                $tType = $tool->tool_type ?? '';
                return str_contains($tName, 'وثائق') || str_contains($tName, 'سجلات')
                    || str_contains($tType, 'وثائق') || str_contains($tType, 'سجلات');
            });

            if ($hasDocTool && $evCount === 0) {
                $case5Items[] = [
                    'indicatorId'    => $ind->indicator_id,
                    'standardId'     => $ind->subStandard?->standard_id,
                    'code'           => $indCode,
                    'name'           => $indName,
                    'standardName'   => $stdName,
                    'score'          => $score,
                    'toolName'       => 'فحص الوثائق والسجلات',
                    'issue'          => 'تم تحديد "فحص الوثائق والسجلات" كأداة تحقق معتمدة للمؤشر، ومع ذلك لم يتم ربط أي وثيقة إثبات.',
                    'recommendation' => 'إما إرفاق الوثيقة المفحوصة أو إلغاء تحديد أداة فحص الوثائق من بطاقة المؤشر.',
                ];
            }
        }

        // الحالة 4: ارتباط وثيقة واحدة بـ 10+ مؤشرات (تكرار مستند مفرط)
        $case4Items = [];
        $documentIndicatorCounts = $evidenceLinks
            ->filter(fn ($l) => !empty($l->document_version_id))
            ->groupBy('document_version_id');

        foreach ($documentIndicatorCounts as $versionId => $links) {
            $uniqueIndicators = $links->pluck('indicator_id')->unique();
            if ($uniqueIndicators->count() >= 10) {
                $firstLink = $links->first();
                $docVersion = $firstLink?->documentVersion;
                $doc = $docVersion?->document;
                $docTitle = $doc?->document_name ?? $docVersion?->file_name ?? "وثيقة #{$versionId}";
                $linkedCodes = $indicators->whereIn('indicator_id', $uniqueIndicators)->pluck('code')->take(5)->implode('، ');

                $case4Items[] = [
                    'documentVersionId'     => $versionId,
                    'documentTitle'         => $docTitle,
                    'linkedIndicatorsCount' => $uniqueIndicators->count(),
                    'sampleIndicatorCodes'  => $linkedCodes . ($uniqueIndicators->count() > 5 ? '...' : ''),
                    'issue'                 => "الوثيقة '{$docTitle}' مرتبطة بـ ({$uniqueIndicators->count()}) مؤشراً مختلفاً في نفس التقييم.",
                    'recommendation'        => 'توزيع الشاهد على أكثر من 10 مؤشرات يشير لتكرار مفرط؛ يفضل تخصيص شواهد نوعية لكل مؤشر.',
                ];
            }
        }

        $totalIssues = count($case1Items) + count($case2Items) + count($case3Items) + count($case4Items) + count($case5Items);
        $criticalCount = count($case1Items) + count($case2Items);
        $mediumCount = count($case3Items) + count($case5Items);
        $warningCount = count($case4Items);

        return [
            'summary' => [
                'totalDiscrepancies'       => $totalIssues,
                'criticalCount'            => $criticalCount,
                'mediumCount'              => $mediumCount,
                'warningCount'             => $warningCount,
                'evaluatedIndicatorsCount' => $results->filter(fn ($r) => $r->score !== null && $r->completion_status !== 'Pending')->count(),
                'auditPassed'              => $totalIssues === 0,
            ],
            'cases' => [
                [
                    'caseId'        => 'case_1',
                    'title'         => 'درجة عالية بلا شواهد داعمة',
                    'severity'      => 'critical',
                    'severityLabel' => 'حرجة',
                    'description'   => 'مؤشرات تم رصدها بتقدير متقدم (2 أو 3) دون ربط أي شاهد أو وثيقة إثبات.',
                    'count'         => count($case1Items),
                    'items'         => $case1Items,
                ],
                [
                    'caseId'        => 'case_2',
                    'title'         => 'درجة 3 بمتطلبات ناقصة',
                    'severity'      => 'critical',
                    'severityLabel' => 'حرجة',
                    'description'   => 'مؤشرات تم منحها التقدير 3 (التميز) رغم عدم استيفاء كامل المتطلبات الإلزامية.',
                    'count'         => count($case2Items),
                    'items'         => $case2Items,
                ],
                [
                    'caseId'        => 'case_3',
                    'title'         => 'درجة مرتفعة بلا مبرر نصي',
                    'severity'      => 'medium',
                    'severityLabel' => 'متوسطة',
                    'description'   => 'مؤشرات ذات تقدير 2 أو 3 ولكن المبرر النصي للمقيم فارغ أو مقتضب جداً.',
                    'count'         => count($case3Items),
                    'items'         => $case3Items,
                ],
                [
                    'caseId'        => 'case_4',
                    'title'         => 'ارتباط وثيقة واحدة بـ 10+ مؤشرات',
                    'severity'      => 'warning',
                    'severityLabel' => 'تنبيه',
                    'description'   => 'مستندات تم استخدامها كشاهد في 10 مؤشرات أو أكثر، مما يشير لتعميم مفرط.',
                    'count'         => count($case4Items),
                    'items'         => $case4Items,
                ],
                [
                    'caseId'        => 'case_5',
                    'title'         => 'تناقض أساليب التحقق',
                    'severity'      => 'medium',
                    'severityLabel' => 'متوسطة',
                    'description'   => 'مؤشرات تم تحديد "فحص الوثائق والسجلات" كأداة تحقق لها دون إرفاق أي وثيقة.',
                    'count'         => count($case5Items),
                    'items'         => $case5Items,
                ],
            ],
        ];
    }

    /**
     * تجميع بيانات مركز التدقيق والمراجعة الإدارية الشاملة للمدرسة.
     */
    public function getAuditHubData(Evaluation $evaluation): array
    {
        $schoolId = $evaluation->school_id;

        // 1. تحديد المستخدمين المعنيين (مدير المدرسة والمقيم)
        $principalUser = User::where('school_id', $schoolId)
            ->whereHas('roles', fn ($q) => $q->where('role_name', 'school_principal'))
            ->first();

        // 2. جلب شجرة المعايير والمؤشرات الـ 109
        $version = StandardVersion::where('status', 'Active')->orderBy('version_id', 'desc')->first()
            ?? StandardVersion::orderBy('version_id', 'desc')->first();

        $standards = Standard::where('version_id', $version?->version_id ?? 1)
            ->with(['subStandards.indicators.evidenceRequirements'])
            ->orderBy('code')
            ->get();

        // 3. جلب نتائج التقييم مع الملاحظات وكتابها
        $results = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->with(['notes.author'])
            ->get()
            ->keyBy('indicator_id');

        // 4. جلب روابط الشواهد المربوطة لحساب تغطية المتطلبات بدقة
        $linksByIndicator = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
            ->get()
            ->groupBy('indicator_id');

        // 5. بناء قائمة المؤشرات الـ 109 مع فحص مراجعة المدير وتغطية المتطلبات
        $indicatorsList = [];
        $reviewedCount = 0;

        foreach ($standards as $std) {
            foreach ($std->subStandards as $sub) {
                foreach ($sub->indicators as $ind) {
                    $res = $results->get($ind->indicator_id);
                    $notes = $res ? $res->notes : collect();

                    // حساب تغطية المتطلبات لهذا المؤشر بدقة
                    $indLinks = $linksByIndicator->get($ind->indicator_id, collect());
                    $evCount = $indLinks->count();
                    $mandatoryIds = $ind->evidenceRequirements->where('required', true)->pluck('requirement_id')->map(fn ($x) => (int) $x)->all();
                    $mandatoryCnt = count($mandatoryIds);
                    $totalReqsCnt = $ind->evidenceRequirements->count();

                    $explicitIds = [];
                    $legacyCnt = 0;
                    foreach ($indLinks as $lnk) {
                        if (strtolower($lnk->status ?? '') !== 'completed') {
                            continue;
                        }
                        $cov = $lnk->covered_requirements;
                        if (is_array($cov)) {
                            foreach ($cov as $rid) {
                                $intId = (int) $rid;
                                if (in_array($intId, $mandatoryIds, true)) {
                                    $explicitIds[$intId] = true;
                                }
                            }
                        } elseif ($cov === null) {
                            $legacyCnt++;
                        }
                    }

                    $coveredCnt = $mandatoryCnt > 0
                        ? min($mandatoryCnt, count($explicitIds) + $legacyCnt)
                        : ($totalReqsCnt > 0 ? min($totalReqsCnt, count($explicitIds) + $legacyCnt) : $evCount);

                    $isFullyCovered = $mandatoryCnt > 0 ? ($coveredCnt >= $mandatoryCnt) : ($evCount > 0);

                    // فحص هل توجد ملاحظة مدونة من قبل مدير المدرسة
                    $principalNotes = $notes->filter(function ($n) use ($principalUser) {
                        if ($principalUser && (int) $n->author_user_id === (int) $principalUser->user_id) {
                            return true;
                        }
                        $author = $n->author;
                        if (!$author) {
                            return false;
                        }
                        return in_array($author->role ?? '', ['school_principal', 'principal'])
                            || ($author->user_type === 'school' && $author->hasRole('school_principal'));
                    })->values();

                    $hasReview = $principalNotes->isNotEmpty();
                    if ($hasReview) {
                        $reviewedCount++;
                    }

                    $latestPrincipalNote = $principalNotes->sortByDesc('note_id')->first();
                    $allFormattedNotes = $notes->map(fn ($n) => [
                        'noteId'      => $n->note_id,
                        'authorName'  => $n->author?->full_name ?? $n->author?->username ?? 'مراجع',
                        'authorRole'  => $n->author?->hasRole('school_principal') ? 'مدير المدرسة' : 'مقيم جودة',
                        'isPrincipal' => $n->author?->hasRole('school_principal') || ($principalUser && (int) $n->author_user_id === (int) $principalUser->user_id),
                        'text'        => $n->text ?? $n->content ?? '',
                        'createdAt'   => $n->created_at?->toIso8601String(),
                    ])->values()->all();

                    $score = $res?->score;
                    $scoreLabel = match ($score) {
                        3       => 'متقدم',
                        2       => 'كافٍ',
                        1       => 'محدود',
                        0       => 'غير متوفر',
                        default => 'غير مرصود',
                    };

                    $indicatorsList[] = [
                        'indicatorId'                => (int) $ind->indicator_id,
                        'indicatorCode'              => $ind->code,
                        'indicatorName'              => $ind->name,
                        'standardId'                 => (int) $std->standard_id,
                        'standardCode'               => $std->code,
                        'standardName'               => $std->name,
                        'subStandardCode'            => $sub->code,
                        'subStandardName'            => $sub->name,
                        'resultId'                   => $res ? (int) $res->result_id : null,
                        'score'                      => $score !== null ? (int) $score : null,
                        'scoreLabel'                 => $scoreLabel,
                        'evidenceCount'              => $evCount,
                        'mandatoryRequirementsCount' => $mandatoryCnt,
                        'totalRequirementsCount'     => $totalReqsCnt,
                        'coveredRequirementsCount'   => $coveredCnt,
                        'isRequirementFullyCovered'  => $isFullyCovered,
                        'hasPrincipalReview'         => $hasReview,
                        'principalNotesCount'        => $principalNotes->count(),
                        'latestPrincipalNote'        => $latestPrincipalNote ? [
                            'noteId'     => $latestPrincipalNote->note_id,
                            'authorName' => $latestPrincipalNote->author?->full_name ?? 'مدير المدرسة',
                            'text'       => $latestPrincipalNote->text ?? $latestPrincipalNote->content ?? '',
                            'createdAt'  => $latestPrincipalNote->created_at?->toIso8601String(),
                        ] : null,
                        'allNotes' => $allFormattedNotes,
                    ];
                }
            }
        }

        $totalIndicators = count($indicatorsList);
        $pendingIndicators = max(0, $totalIndicators - $reviewedCount);
        $coveragePercentage = $totalIndicators > 0 ? round(($reviewedCount / $totalIndicators) * 100) : 0;

        // 6. جلب خطط التحسين المدرسية الثلاث مع مراجعاتها
        $todayStr = now()->toDateString();
        $totalOverdueActions = 0;

        $plans = ImprovementPlan::where('school_id', $schoolId)
            ->where('cycle_id', $evaluation->cycle_id)
            ->with(['reviewNotes.author', 'actions'])
            ->orderBy('plan_id', 'desc')
            ->get()
            ->map(function ($p) use ($principalUser, $todayStr, &$totalOverdueActions) {
                $pNotes = $p->reviewNotes->filter(function ($n) use ($principalUser) {
                    if ($principalUser && (int) $n->author_user_id === (int) $principalUser->user_id) {
                        return true;
                    }
                    return in_array($n->reviewer_role ?? '', ['school_principal', 'principal']);
                })->values();

                $latestNote = $pNotes->sortByDesc('note_id')->first() ?? $p->reviewNotes->sortByDesc('note_id')->first();

                $pOverdueCount = $p->actions->filter(function ($a) use ($todayStr) {
                    if (in_array($a->status, ['Completed', 'Cancelled', 'Done'])) {
                        return false;
                    }
                    return $a->due_date && $a->due_date->format('Y-m-d') < $todayStr;
                })->count();

                $totalOverdueActions += $pOverdueCount;

                return [
                    'planId'              => (int) $p->plan_id,
                    'title'               => $p->title,
                    'planType'            => $p->plan_type,
                    'versionNumber'       => (int) ($p->version_number ?? 1),
                    'versionTag'          => $p->version_tag,
                    'status'              => $p->status,
                    'progressDescription' => $p->progress_description,
                    'actionsCount'        => $p->actions->count(),
                    'overdueActionsCount' => $pOverdueCount,
                    'hasPrincipalReview'  => $pNotes->isNotEmpty(),
                    'reviewNotesCount'    => $p->reviewNotes->count(),
                    'principalNotesCount' => $pNotes->count(),
                    'latestNote'          => $latestNote ? [
                        'authorName' => $latestNote->author?->full_name ?? 'المراجع',
                        'role'       => $latestNote->reviewer_role ?? 'مدير المدرسة',
                        'text'       => $latestNote->text ?? '',
                        'createdAt'  => $latestNote->created_at?->toIso8601String(),
                    ] : null,
                ];
            });

        // 7. طلبات الاستكمال المفتوحة
        $submission = EvaluationSubmission::whereHas('report', fn ($q) => $q->where('evaluation_id', $evaluation->evaluation_id))
            ->orderBy('submission_id', 'desc')
            ->first();

        $completionRequestData = null;
        if ($submission) {
            $req = CompletionRequest::where('submission_id', $submission->submission_id)
                ->with(['items.indicator', 'issuedBy'])
                ->first();

            if ($req) {
                $completionRequestData = [
                    'requestId'      => (int) $req->request_id,
                    'status'         => $req->status,
                    'supervisorName' => $req->issuedBy?->full_name ?? 'المشرف الوزاري',
                    'notes'          => $req->notes ?? '',
                    'totalItems'     => $req->items->count(),
                    'pendingItems'   => $req->items->where('status', 'Pending')->count(),
                    'completedItems' => $req->items->where('status', 'Completed')->count(),
                ];
            }
        }

        // 8. حالة المراجعة النهائية والإقرار الإداري
        $report = Report::where('evaluation_id', $evaluation->evaluation_id)
            ->with(['internalReviewNotes.author'])
            ->orderBy('report_id', 'desc')
            ->first();

        $principalAckNote = null;
        if ($report) {
            $principalAckNote = $report->internalReviewNotes->first(function ($n) use ($principalUser) {
                if ($principalUser && (int) $n->author_user_id === (int) $principalUser->user_id) {
                    return true;
                }
                return $n->author?->hasRole('school_principal');
            });
        }

        $finalReviewData = [
            'reportId'                   => $report ? (int) $report->report_id : null,
            'isGenerated'                => (bool) $report,
            'isLocked'                   => (bool) ($evaluation->status === 'Completed' || $submission),
            'hasPrincipalAcknowledgment' => (bool) $principalAckNote,
            'acknowledgedAt'             => $principalAckNote?->created_at?->toIso8601String(),
            'acknowledgmentText'         => $principalAckNote?->content ?? $principalAckNote?->text ?? null,
        ];

        return [
            'schoolId'   => (int) $schoolId,
            'schoolName' => $evaluation->school?->school_name ?? 'مدرسة الفاروق الأساسية للبنين',
            'summary'    => [
                'totalIndicators'          => $totalIndicators,
                'reviewedIndicatorsCount'  => $reviewedCount,
                'pendingIndicatorsCount'   => $pendingIndicators,
                'reviewCoveragePercentage' => $coveragePercentage,
                'plansCount'               => $plans->count(),
                'reviewedPlansCount'       => $plans->where('hasPrincipalReview', true)->count(),
                'overdueActionsCount'      => $totalOverdueActions,
                'hasOpenCompletionRequest' => $completionRequestData !== null && $completionRequestData['status'] === 'Pending',
                'finalReviewAcknowledged'  => $finalReviewData['hasPrincipalAcknowledgment'],
            ],
            'indicators'        => $indicatorsList,
            'plans'             => $plans,
            'completionRequest' => $completionRequestData,
            'finalReview'       => $finalReviewData,
        ];
    }
}
