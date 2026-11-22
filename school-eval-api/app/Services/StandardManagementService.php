<?php

namespace App\Services;

use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\IndicatorScoreDescriptor;
use App\Models\IndicatorVerificationMethod;
use App\Models\ScoreLevel;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\SubStandard;
use App\Models\VerificationTool;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * خدمة إدارة المعايير وإصداراتها الرسمية ودورة حياتها (الشريحة 7).
 *
 * تتولى:
 * - استعراض وسرد الإصدارات المعيارية
 * - إنشاء المسودات، استنساخ الإصدارات المُقرّة، الإقرار، والأرشفة
 * - تعديل نصوص المعايير والمجالات والمؤشرات والواصفات ومتطلبات الشواهد
 * - حوكمة وتدقيق الأوزان مع فرض شرط (المجموع = 100.00%)
 * - ضمان مناعة الإصدارات المُقرّة (Immutability) ومنع تعديل أي عنصر خارج حالة Draft
 */
class StandardManagementService
{
    /**
     * التحقق الصارم من أن الكيان يتبع إصدارًا في حالة مسودة (Draft) عبر علاقته الفعلية.
     *
     * @param StandardVersion|null $version
     * @return StandardVersion
     * @throws ValidationException
     */
    public function ensureIsDraft(?StandardVersion $version): StandardVersion
    {
        if (!$version || !$version->isDraft()) {
            throw ValidationException::withMessages([
                'version' => ['لا يمكن تعديل إصدار مُقرّ أو مؤرشف.'],
            ]);
        }

        return $version;
    }

    /**
     * استرجاع قائمة الإصدارات المعيارية مع إحصاءات ملخصة.
     *
     * @param string|null $status
     * @return Collection
     */
    public function listVersions(?string $status = null): Collection
    {
        $query = StandardVersion::query()
            ->withCount(['standards', 'evaluationCycles'])
            ->orderBy('version_id', 'desc');

        if ($status) {
            $query->where('status', $status);
        }

        return $query->get()->map(function (StandardVersion $v) {
            $indicatorsCount = DB::table('indicators')
                ->join('sub_standards', 'indicators.sub_standard_id', '=', 'sub_standards.sub_standard_id')
                ->join('standards', 'sub_standards.standard_id', '=', 'standards.standard_id')
                ->where('standards.version_id', $v->version_id)
                ->count();

            $v->indicators_count = $indicatorsCount;
            $v->total_weight = (float) $v->standards()->sum('weight');
            return $v;
        });
    }

    /**
     * إنشاء مسودة إصدار جديدة.
     *
     * @param array<string, mixed> $data
     * @return StandardVersion
     */
    public function createDraft(array $data): StandardVersion
    {
        return DB::transaction(function () use ($data) {
            $version = StandardVersion::create([
                'version_no'          => $data['version_no'],
                'issue_date'          => $data['issue_date'] ?? now()->toDateString(),
                'source_organization' => $data['source_organization'] ?? 'وزارة التربية والتعليم والبحث العلمي',
                'source_number'       => $data['source_number'] ?? null,
                'source_description'  => $data['source_description'] ?? null,
                'status'              => StandardVersion::STATUS_DRAFT,
            ]);

            // تهيئة مستويات سلم التقدير اللفظي الافتراضية للإصدار الجديد
            $defaultLevels = [
                ['score_value' => 0, 'label' => 'غير متوفر / غائب', 'general_description' => 'يشير إلى عدم قيام المدرسة بالأداءات المطلوبة وغياب الشواهد.', 'display_order' => 1],
                ['score_value' => 1, 'label' => 'متحقق جزئياً / أدنى', 'general_description' => 'يعبر عن أداءات متحققة بصورة جزئية أو غير مستقرة.', 'display_order' => 2],
                ['score_value' => 2, 'label' => 'متحقق / ملائم', 'general_description' => 'يعبر عن أداءات متحققة بفاعلية ومستوفية للشواهد المعتمدة.', 'display_order' => 3],
                ['score_value' => 3, 'label' => 'مستوفٍ بالكامل / متميز', 'general_description' => 'المستوى الدال على وصول المؤسسة إلى التميز والنمذجة والتطوير المستمر.', 'display_order' => 4],
            ];
            foreach ($defaultLevels as $lvl) {
                ScoreLevel::create(array_merge($lvl, ['standard_version_id' => $version->version_id]));
            }

            return $version;
        });
    }

    /**
     * استنساخ إصدار مُقرّ بالكامل لإنشاء مسودة إصدار جديدة.
     *
     * @param StandardVersion $sourceVersion
     * @param array<string, mixed> $data
     * @return StandardVersion
     * @throws ValidationException
     */
    public function cloneVersion(StandardVersion $sourceVersion, array $data): StandardVersion
    {
        if ($sourceVersion->isDraft()) {
            throw ValidationException::withMessages([
                'source_version' => ['لا يمكن استنساخ إصدار مسودة؛ الاستنساخ متاح للإصدارات المُقرّة فقط.'],
            ]);
        }

        return DB::transaction(function () use ($sourceVersion, $data) {
            // 1. إنشاء رأس الإصدار الجديد
            $newVersion = StandardVersion::create([
                'version_no'          => $data['version_no'],
                'issue_date'          => $data['issue_date'] ?? now()->toDateString(),
                'source_organization' => $data['source_organization'] ?? $sourceVersion->source_organization,
                'source_number'       => $data['source_number'] ?? null,
                'source_description'  => $data['source_description'] ?? ("نسخة مستنسخة من الإصدار " . $sourceVersion->version_no),
                'status'              => StandardVersion::STATUS_DRAFT,
            ]);

            // 2. نسخ سلم الدرجات (ScoreLevels) مع بناء خريطة للمعرفات القديمة والجديدة
            $scoreLevelMap = [];
            $oldScoreLevels = ScoreLevel::where('standard_version_id', $sourceVersion->version_id)
                ->orderBy('score_value')
                ->get();

            foreach ($oldScoreLevels as $oldLevel) {
                $newLevel = ScoreLevel::create([
                    'standard_version_id' => $newVersion->version_id,
                    'score_value'         => $oldLevel->score_value,
                    'label'               => $oldLevel->label,
                    'general_description' => $oldLevel->general_description,
                    'display_order'       => $oldLevel->display_order,
                ]);
                $scoreLevelMap[$oldLevel->score_level_id] = $newLevel->score_level_id;
            }

            // 3. نسخ المعايير الرئيسية والتفريعات التابعة
            $sourceStandards = Standard::where('version_id', $sourceVersion->version_id)
                ->with(['subStandards.indicators'])
                ->get();

            foreach ($sourceStandards as $std) {
                $newStd = Standard::create([
                    'version_id'  => $newVersion->version_id,
                    'code'        => $std->code,
                    'name'        => $std->name,
                    'description' => $std->description,
                    'weight'      => $std->weight,
                ]);

                foreach ($std->subStandards as $sub) {
                    $newSub = SubStandard::create([
                        'standard_id' => $newStd->standard_id,
                        'code'        => $sub->code,
                        'name'        => $sub->name,
                        'description' => $sub->description,
                        'weight'      => $sub->weight,
                    ]);

                    foreach ($sub->indicators as $ind) {
                        $newInd = Indicator::create([
                            'sub_standard_id' => $newSub->sub_standard_id,
                            'code'            => $ind->code,
                            'name'            => $ind->name,
                            'description'     => $ind->description,
                            'weight'          => $ind->weight,
                            'status'          => $ind->status,
                        ]);

                        // نسخ واصفات درجات المؤشر
                        $descriptors = IndicatorScoreDescriptor::where('indicator_id', $ind->indicator_id)
                            ->where('standard_version_id', $sourceVersion->version_id)
                            ->get();

                        foreach ($descriptors as $desc) {
                            IndicatorScoreDescriptor::create([
                                'indicator_id'        => $newInd->indicator_id,
                                'score_level_id'      => $scoreLevelMap[$desc->score_level_id] ?? $desc->score_level_id,
                                'standard_version_id' => $newVersion->version_id,
                                'label'               => $desc->label,
                                'description'         => $desc->description,
                                'display_order'       => $desc->display_order,
                                'is_active'           => $desc->is_active ?? true,
                            ]);
                        }

                        // نسخ متطلبات الشواهد للمؤشر
                        $requirements = IndicatorEvidenceRequirement::where('indicator_id', $ind->indicator_id)
                            ->where('standard_version_id', $sourceVersion->version_id)
                            ->get();

                        foreach ($requirements as $req) {
                            IndicatorEvidenceRequirement::create([
                                'indicator_id'        => $newInd->indicator_id,
                                'standard_version_id' => $newVersion->version_id,
                                'title'               => $req->title,
                                'description'         => $req->description,
                                'required'            => $req->required,
                                'display_order'       => $req->display_order,
                            ]);
                        }

                        // نسخ أساليب وأدوات التحقق المقررة للمؤشر (REV-T027 / U-28)
                        $verificationMethods = IndicatorVerificationMethod::where('indicator_id', $ind->indicator_id)->get();
                        foreach ($verificationMethods as $method) {
                            IndicatorVerificationMethod::create([
                                'indicator_id'   => $newInd->indicator_id,
                                'tool_id'        => $method->tool_id,
                                'required'       => $method->required,
                                'usage_guidance' => $method->usage_guidance,
                                'created_at'     => now(),
                            ]);
                        }
                    }
                }
            }

            return $newVersion->load('standards.subStandards.indicators');
        });
    }

    /**
     * تحديث البيانات الوصفية للمسودة.
     *
     * @param StandardVersion $version
     * @param array<string, mixed> $data
     * @return StandardVersion
     * @throws ValidationException
     */
    public function updateVersion(StandardVersion $version, array $data): StandardVersion
    {
        $this->ensureIsDraft($version);

        $version->update([
            'version_no'          => $data['version_no'] ?? $version->version_no,
            'issue_date'          => $data['issue_date'] ?? $version->issue_date,
            'source_organization' => $data['source_organization'] ?? $version->source_organization,
            'source_number'       => $data['source_number'] ?? $version->source_number,
            'source_description'  => $data['source_description'] ?? $version->source_description,
        ]);

        return $version;
    }

    /**
     * تحديث أوزان المعايير والمجالات والمؤشرات في المسودة مع التحقق الحتمي من التوازن الثلاثي (القرار 1).
     *
     * @param StandardVersion $version
     * @param array<int, array{standard_id: int, weight: float}> $standardsWeights
     * @param array<int, array{indicator_id: int, weight: float}>|null $indicatorsWeights
     * @param array<int, array{sub_standard_id: int, weight: float}>|null $subStandardsWeights
     * @return StandardVersion
     * @throws ValidationException
     */
    public function updateWeights(
        StandardVersion $version,
        array $standardsWeights,
        ?array $indicatorsWeights = null,
        ?array $subStandardsWeights = null
    ): StandardVersion {
        $this->ensureIsDraft($version);

        // 1. فحص المستوى 1: مجموع أوزان المعايير الرئيسية = 100.00%
        $currentStandards = $version->standards()->pluck('weight', 'standard_id')->all();

        foreach ($standardsWeights as $item) {
            $sid = (int) ($item['standard_id'] ?? $item['id']);
            if (array_key_exists($sid, $currentStandards)) {
                $currentStandards[$sid] = (float) $item['weight'];
            }
        }

        $totalSum = round(array_sum($currentStandards), 2);
        if (abs($totalSum - 100.00) > 0.01) {
            throw ValidationException::withMessages([
                'weights' => ["مجموع أوزان المعايير ({$totalSum}%) يجب أن يساوي 100.00% تمامًا لحفظ الأوزان."],
            ]);
        }

        // 2. فحص المستوى 2: إن تم تمرير أوزان المعايير الفرعية، يجب أن يتطابق مجموعها لكل معيار مع وزن المعيار الرئيسي الحاوي لها
        $subStandardsList = SubStandard::whereHas('standard', fn($q) => $q->where('version_id', $version->version_id))
            ->get()
            ->keyBy('sub_standard_id');

        $effectiveSubWeights = [];
        foreach ($subStandardsList as $subId => $subModel) {
            $effectiveSubWeights[$subId] = (float) $subModel->weight;
        }

        if (!empty($subStandardsWeights)) {
            $groupedSubWeights = [];
            foreach ($subStandardsWeights as $subItem) {
                $subId = (int) ($subItem['sub_standard_id'] ?? $subItem['id']);
                if (isset($subStandardsList[$subId])) {
                    $stdId = $subStandardsList[$subId]->standard_id;
                    $w = (float) $subItem['weight'];
                    $groupedSubWeights[$stdId][$subId] = $w;
                    $effectiveSubWeights[$subId] = $w;
                }
            }

            foreach ($groupedSubWeights as $stdId => $subsMap) {
                $expectedWeight = $currentStandards[$stdId] ?? 0.0;
                $actualSubSum = round(array_sum($subsMap), 2);
                if (abs($actualSubSum - $expectedWeight) > 0.01) {
                    $stdModel = Standard::find($stdId);
                    $stdName = $stdModel ? $stdModel->name : "المعيار رقم {$stdId}";
                    throw ValidationException::withMessages([
                        'sub_standards_weights' => ["مجموع أوزان المعايير الفرعية لـ ({$stdName}) هو ({$actualSubSum}%) ويجب أن يساوي تماماً وزن المعيار الرئيسي ({$expectedWeight}%)."],
                    ]);
                }
            }
        }

        // 3. فحص المستوى 3: إن تم تمرير أوزان المؤشرات، يجب أن يتطابق مجموع أوزان مؤشرات كل معيار فرعي مع وزن المعيار الفرعي الحاوي لها
        $indicatorsList = Indicator::whereHas('subStandard.standard', fn($q) => $q->where('version_id', $version->version_id))
            ->get();

        if (!empty($indicatorsWeights)) {
            $groupedIndWeights = [];
            foreach ($indicatorsList as $ind) {
                $groupedIndWeights[$ind->sub_standard_id][$ind->indicator_id] = (float) $ind->weight;
            }

            foreach ($indicatorsWeights as $indItem) {
                $iid = (int) ($indItem['indicator_id'] ?? $indItem['id']);
                $indModel = $indicatorsList->firstWhere('indicator_id', $iid);
                if ($indModel) {
                    $subId = $indModel->sub_standard_id;
                    $groupedIndWeights[$subId][$iid] = (float) $indItem['weight'];
                }
            }

            foreach ($groupedIndWeights as $subId => $indMap) {
                if (empty($indMap)) continue;
                $expectedSubWeight = $effectiveSubWeights[$subId] ?? 0.0;
                $actualIndSum = round(array_sum($indMap), 2);
                if (abs($actualIndSum - $expectedSubWeight) > 0.01) {
                    $subModel = $subStandardsList[$subId] ?? SubStandard::find($subId);
                    $subName = $subModel ? "{$subModel->name} ({$subModel->code})" : "المعيار الفرعي رقم {$subId}";
                    throw ValidationException::withMessages([
                        'indicators_weights' => ["مجموع أوزان المؤشرات للمعيار الفرعي ({$subName}) هو ({$actualIndSum}%) ويجب أن يساوي تماماً وزن المعيار الفرعي ({$expectedSubWeight}%)."],
                    ]);
                }
            }
        }

        DB::transaction(function () use ($version, $standardsWeights, $indicatorsWeights, $subStandardsWeights, $effectiveSubWeights) {
            // تحديث أوزان المعايير الرئيسية
            foreach ($standardsWeights as $item) {
                $sid = (int) ($item['standard_id'] ?? $item['id']);
                Standard::where('standard_id', $sid)
                    ->where('version_id', $version->version_id)
                    ->update(['weight' => $item['weight']]);
            }

            // تحديث أوزان المعايير الفرعية
            if (!empty($subStandardsWeights)) {
                foreach ($subStandardsWeights as $subItem) {
                    $subId = (int) ($subItem['sub_standard_id'] ?? $subItem['id']);
                    SubStandard::where('sub_standard_id', $subId)
                        ->whereHas('standard', fn($q) => $q->where('version_id', $version->version_id))
                        ->update(['weight' => $subItem['weight']]);
                }
            }

            // تحديث أوزان المؤشرات
            if (!empty($indicatorsWeights)) {
                foreach ($indicatorsWeights as $indItem) {
                    $iid = (int) ($indItem['indicator_id'] ?? $indItem['id']);
                    $indicator = Indicator::find($iid);
                    if ($indicator && $indicator->subStandard?->standard?->version_id === $version->version_id) {
                        $indicator->update(['weight' => $indItem['weight']]);
                    }
                }
            } elseif (!empty($subStandardsWeights)) {
                // التوزيع التلقائي الدقيق: إذا لم تُرسل أوزان مخصصة للمؤشرات، توزع أوزان المعيار الفرعي بالتساوي وبدقة على مؤشراته
                foreach ($subStandardsWeights as $subItem) {
                    $subId = (int) ($subItem['sub_standard_id'] ?? $subItem['id']);
                    $subWeight = (float) $subItem['weight'];
                    $indicators = Indicator::where('sub_standard_id', $subId)->orderBy('indicator_id', 'asc')->get();
                    $indCount = $indicators->count();
                    if ($indCount > 0) {
                        $baseWeight = floor(($subWeight / $indCount) * 100) / 100;
                        $remainder = round($subWeight - ($baseWeight * $indCount), 2);
                        foreach ($indicators as $idx => $ind) {
                            $assignedWeight = ($idx === $indCount - 1) ? round($baseWeight + $remainder, 2) : $baseWeight;
                            $ind->update(['weight' => $assignedWeight]);
                        }
                    }
                }
            }
        });

        return $version->fresh(['standards.subStandards.indicators']);
    }

    /**
     * إقرار مسودة الإصدار وتجميدها مع أرشفة الإصدار المُقرّ السابق تلقائيًا.
     *
     * @param StandardVersion $version
     * @return StandardVersion
     * @throws ValidationException
     */
    /**
     * إقرار مسودة الإصدار وتجميدها مع التحقق من مجموع الأوزان = 100%.
     * يحول المسودة إلى Approved فقط دون المساس بالإصدار النشط الحالي.
     *
     * @param StandardVersion $version
     * @return StandardVersion
     * @throws ValidationException
     */
    public function approveVersion(StandardVersion $version): StandardVersion
    {
        $this->ensureIsDraft($version);

        // التحقق النهائي من مجموع الأوزان = 100.00%
        $totalWeight = round((float) $version->standards()->sum('weight'), 2);
        if (abs($totalWeight - 100.00) > 0.01) {
            throw ValidationException::withMessages([
                'weights' => ["لا يمكن إقرار الإصدار: مجموع أوزان المعايير ({$totalWeight}%) يجب أن يساوي 100.00% تمامًا."],
            ]);
        }

        // إقرار الإصدار فقط دون التأثير على الإصدار النشط الحالي
        $version->status = StandardVersion::STATUS_APPROVED;
        $version->save();

        return $version;
    }

    /**
     * تنشيط إصدار معياري وأرشفة الإصدار النشط القديم تلقائيًا داخل معاملة ذرية (ضابط G-23).
     *
     * @param StandardVersion $version
     * @return StandardVersion
     */
    public function activateVersion(StandardVersion $version): StandardVersion
    {
        // فحص التوافق التشغيلي: التحقق من أن السلم التقديري مدعوم في بوابات الرصد والتقييم الحالية (سلم 0-3)
        $versionScoreLevels = ScoreLevel::where('standard_version_id', $version->version_id)->get();
        if ($versionScoreLevels->isNotEmpty()) {
            $levelValues = $versionScoreLevels->pluck('score_value')->sort()->values()->all();
            if ($levelValues !== [0, 1, 2, 3]) {
                throw ValidationException::withMessages([
                    'scale_compatibility' => ['مانع تفعيل تشغيلي: السلم التقديري المخصص لهذا الإصدار يتضمن مستويات غير مدعومة حالياً في استمارة رصد المقيم ومحرك احتساب الدرجات (المدعوم حالياً: سلم 0-3). يتطلب تحديث بوابات التقييم والرصد قبل إمكانية تفعيل هذا الإصدار.'],
                ]);
            }
        }

        return DB::transaction(function () use ($version) {
            $auditLogger = app(AuditLoggerService::class);

            // أرشفة أي إصدار نشط (Active) سابق تلقائيًا داخل المعاملة
            $activeVersions = StandardVersion::where('status', StandardVersion::STATUS_ACTIVE)
                ->where('version_id', '!=', $version->version_id)
                ->get();

            foreach ($activeVersions as $prev) {
                $oldStatus = $prev->status;
                $prev->status = StandardVersion::STATUS_ARCHIVED;
                $prev->saveQuietly();

                $auditLogger->log(
                    action: AuditLoggerService::ACTION_STANDARD_VERSION_AUTO_ARCHIVED,
                    targetType: 'StandardVersion',
                    targetId: $prev->version_id,
                    oldValues: ['status' => $oldStatus, 'version_no' => $prev->version_no],
                    newValues: ['status' => StandardVersion::STATUS_ARCHIVED, 'version_no' => $prev->version_no],
                );
            }

            // تنشيط الإصدار المطلوب
            $oldVersionStatus = $version->status;
            $version->status = StandardVersion::STATUS_ACTIVE;
            $version->saveQuietly();

            $auditLogger->log(
                action: AuditLoggerService::ACTION_STANDARD_VERSION_ACTIVATED,
                targetType: 'StandardVersion',
                targetId: $version->version_id,
                oldValues: ['status' => $oldVersionStatus, 'version_no' => $version->version_no],
                newValues: ['status' => StandardVersion::STATUS_ACTIVE, 'version_no' => $version->version_no],
            );

            return $version;
        });
    }

    /**
     * أرشفة إصدار معياري.
     *
     * @param StandardVersion $version
     * @return StandardVersion
     */
    public function archiveVersion(StandardVersion $version): StandardVersion
    {
        $version->status = StandardVersion::STATUS_ARCHIVED;
        $version->save();

        return $version;
    }

    /**
     * إنشاء معيار رئيسي جديد في مسودة الإصدار.
     *
     * @param StandardVersion $version
     * @param array<string, mixed> $data
     * @return Standard
     * @throws ValidationException
     */
    public function storeStandard(StandardVersion $version, array $data): Standard
    {
        $this->ensureIsDraft($version);

        return Standard::create([
            'version_id'  => $version->version_id,
            'code'        => $data['code'],
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'weight'      => $data['weight'] ?? 0.00,
        ]);
    }

    /**
     * تحديث معيار رئيسي.
     *
     * @param Standard $standard
     * @param array<string, mixed> $data
     * @return Standard
     * @throws ValidationException
     */
    public function updateStandard(Standard $standard, array $data): Standard
    {
        $this->ensureIsDraft($standard->version);

        $standard->update([
            'name'        => $data['name'] ?? $standard->name,
            'description' => array_key_exists('description', $data) ? $data['description'] : $standard->description,
            'code'        => $data['code'] ?? $standard->code,
        ]);

        return $standard;
    }

    /**
     * حذف معيار رئيسي من مسودة الإصدار وما يتبعه هرمياً.
     *
     * @param Standard $standard
     * @return bool
     * @throws ValidationException
     */
    public function deleteStandard(Standard $standard): bool
    {
        $this->ensureIsDraft($standard->version);

        return DB::transaction(function () use ($standard) {
            foreach ($standard->subStandards as $subStandard) {
                $this->deleteSubStandard($subStandard);
            }
            return (bool) $standard->delete();
        });
    }

    /**
     * إنشاء معيار فرعي / مجال جديد في مسودة الإصدار.
     *
     * @param Standard $standard
     * @param array<string, mixed> $data
     * @return SubStandard
     * @throws ValidationException
     */
    public function storeSubStandard(Standard $standard, array $data): SubStandard
    {
        $this->ensureIsDraft($standard->version);

        return SubStandard::create([
            'standard_id' => $standard->standard_id,
            'code'        => $data['code'],
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'weight'      => $data['weight'] ?? null,
        ]);
    }

    /**
     * تحديث معيار فرعي / مجال.
     *
     * @param SubStandard $subStandard
     * @param array<string, mixed> $data
     * @return SubStandard
     * @throws ValidationException
     */
    public function updateSubStandard(SubStandard $subStandard, array $data): SubStandard
    {
        $version = $subStandard->standard?->version;
        $this->ensureIsDraft($version);

        $subStandard->update([
            'name'        => $data['name'] ?? $subStandard->name,
            'description' => array_key_exists('description', $data) ? $data['description'] : $subStandard->description,
            'code'        => $data['code'] ?? $subStandard->code,
            'weight'      => array_key_exists('weight', $data) ? $data['weight'] : $subStandard->weight,
        ]);

        return $subStandard;
    }

    /**
     * حذف معيار فرعي وما يتبعه من مؤشرات في مسودة الإصدار.
     *
     * @param SubStandard $subStandard
     * @return bool
     * @throws ValidationException
     */
    public function deleteSubStandard(SubStandard $subStandard): bool
    {
        $version = $subStandard->standard?->version;
        $this->ensureIsDraft($version);

        return DB::transaction(function () use ($subStandard) {
            foreach ($subStandard->indicators as $indicator) {
                $this->deleteIndicator($indicator);
            }
            return (bool) $subStandard->delete();
        });
    }

    /**
     * إنشاء مؤشر جديد في مسودة الإصدار وتوليد واصفات درجاته الافتراضية.
     *
     * @param SubStandard $subStandard
     * @param array<string, mixed> $data
     * @return Indicator
     * @throws ValidationException
     */
    public function storeIndicator(SubStandard $subStandard, array $data): Indicator
    {
        $version = $subStandard->standard?->version;
        $this->ensureIsDraft($version);

        return DB::transaction(function () use ($subStandard, $version, $data) {
            $indicator = Indicator::create([
                'sub_standard_id' => $subStandard->sub_standard_id,
                'code'            => $data['code'],
                'name'            => $data['name'],
                'description'     => $data['description'] ?? null,
                'weight'          => $data['weight'] ?? 1.00,
                'status'          => $data['status'] ?? 'Active',
            ]);

            // استرجاع مستويات الدرجات (0-3) للإصدار أو الإصدار الافتراضي
            $scoreLevels = ScoreLevel::where('standard_version_id', $version->version_id)
                ->orderBy('display_order')
                ->get();

            if ($scoreLevels->isEmpty()) {
                $scoreLevels = ScoreLevel::where('standard_version_id', 1)
                    ->orderBy('display_order')
                    ->get();
            }

            foreach ($scoreLevels as $level) {
                IndicatorScoreDescriptor::create([
                    'indicator_id'        => $indicator->indicator_id,
                    'score_level_id'      => $level->score_level_id,
                    'standard_version_id' => $version->version_id,
                    'label'               => $level->label,
                    'description'         => 'وصف مستوى ' . $level->label . ' للمؤشر ' . $indicator->name,
                    'display_order'       => $level->display_order,
                    'is_active'           => true,
                ]);
            }

            return $indicator;
        });
    }

    /**
     * حذف مؤشر من مسودة الإصدار مع واصفاته ومتطلبات شواهده.
     *
     * @param Indicator $indicator
     * @return bool
     * @throws ValidationException
     */
    public function deleteIndicator(Indicator $indicator): bool
    {
        $version = $indicator->subStandard?->standard?->version;
        $this->ensureIsDraft($version);

        return DB::transaction(function () use ($indicator, $version) {
            IndicatorScoreDescriptor::where('indicator_id', $indicator->indicator_id)
                ->where('standard_version_id', $version->version_id)
                ->delete();

            IndicatorEvidenceRequirement::where('indicator_id', $indicator->indicator_id)
                ->where('standard_version_id', $version->version_id)
                ->delete();

            IndicatorVerificationMethod::where('indicator_id', $indicator->indicator_id)
                ->delete();

            return (bool) $indicator->delete();
        });
    }

    /**
     * تحديث مؤشر تفصيلي.
     *
     * @param Indicator $indicator
     * @param array<string, mixed> $data
     * @return Indicator
     * @throws ValidationException
     */
    public function updateIndicator(Indicator $indicator, array $data): Indicator
    {
        $version = $indicator->subStandard?->standard?->version;
        $this->ensureIsDraft($version);

        $desc = array_key_exists('description', $data)
            ? $data['description']
            : (array_key_exists('rubric_notes', $data) ? $data['rubric_notes'] : $indicator->description);

        $indicator->update([
            'name'        => $data['name'] ?? $indicator->name,
            'description' => $desc,
            'code'        => $data['code'] ?? $indicator->code,
            'status'      => $data['status'] ?? $indicator->status,
            'weight'      => array_key_exists('weight', $data) ? $data['weight'] : $indicator->weight,
        ]);

        // مزامنة أدوات ووسائل التحقق المعتمدة للمؤشر (مرونة 1-N أداة)
        if (array_key_exists('verification_tool_ids', $data) && is_array($data['verification_tool_ids']) && !empty($data['verification_tool_ids'])) {
            $toolIds = array_unique(array_filter(array_map('intval', $data['verification_tool_ids'])));
            DB::table('indicator_verification_methods')->where('indicator_id', $indicator->indicator_id)->delete();
            foreach ($toolIds as $toolId) {
                if ($toolId > 0) {
                    DB::table('indicator_verification_methods')->insert([
                        'indicator_id'   => $indicator->indicator_id,
                        'tool_id'        => $toolId,
                        'required'       => true,
                        'usage_guidance' => 'أداة تقييم معتمدة للتحقق من المؤشر',
                        'created_at'     => now(),
                    ]);
                }
            }
        } elseif (array_key_exists('verification_tools', $data) && is_array($data['verification_tools'])) {
            $toolNames = array_filter($data['verification_tools']);
            $resolvedIds = [];
            foreach ($toolNames as $rawName) {
                $cleanName = trim((string) $rawName);
                if (empty($cleanName)) continue;
                
                // البحث بالاسم الدقيق أولاً
                $tool = VerificationTool::where('name', $cleanName)->first();
                if (!$tool) {
                    // البحث بالاسم الجزئي
                    $tool = VerificationTool::where('name', 'LIKE', '%' . $cleanName . '%')
                        ->orWhereRaw('? LIKE CONCAT("%", name, "%")', [$cleanName])
                        ->first();
                }
                if (!$tool) {
                    // إنشاء الأداة المخصصة تلقائياً لضمان عدم ضياع التعديل نهائياً
                    $tool = VerificationTool::create([
                        'name'        => $cleanName,
                        'tool_type'   => 'مخصص',
                        'description' => 'أداة تحقق مخصصة للمؤشر',
                        'approved'    => true,
                    ]);
                }
                if ($tool) {
                    $resolvedIds[] = $tool->tool_id;
                }
            }

            $resolvedIds = array_unique($resolvedIds);
            DB::table('indicator_verification_methods')->where('indicator_id', $indicator->indicator_id)->delete();
            foreach ($resolvedIds as $toolId) {
                DB::table('indicator_verification_methods')->insert([
                    'indicator_id'   => $indicator->indicator_id,
                    'tool_id'        => $toolId,
                    'required'       => true,
                    'usage_guidance' => 'أداة تقييم معتمدة للتحقق من المؤشر',
                    'created_at'     => now(),
                ]);
            }
        }

        return $indicator->load('verificationTools');
    }

    /**
     * تحديث واصفات درجات المؤشر.
     *
     * @param Indicator $indicator
     * @param array<int, array{descriptor_id?: int, score_level_id?: int, score_value?: int, description: string, label?: string}> $descriptorsData
     * @return Collection
     * @throws ValidationException
     */
    public function updateIndicatorDescriptors(Indicator $indicator, array $descriptorsData): Collection
    {
        $version = $indicator->subStandard?->standard?->version;
        $this->ensureIsDraft($version);

        foreach ($descriptorsData as $descItem) {
            $query = IndicatorScoreDescriptor::where('indicator_id', $indicator->indicator_id)
                ->where('standard_version_id', $version->version_id);

            if (!empty($descItem['descriptor_id'])) {
                $query->where('descriptor_id', $descItem['descriptor_id']);
            } elseif (isset($descItem['score_level_id'])) {
                $query->where('score_level_id', $descItem['score_level_id']);
            }

            $desc = $query->first();
            if ($desc) {
                $desc->update([
                    'description' => $descItem['description'],
                    'label'       => $descItem['label'] ?? $desc->label,
                ]);
            }
        }

        return IndicatorScoreDescriptor::where('indicator_id', $indicator->indicator_id)
            ->where('standard_version_id', $version->version_id)
            ->orderBy('display_order')
            ->get();
    }

    /**
     * إضافة متطلب شاهد لمؤشر.
     *
     * @param Indicator $indicator
     * @param array<string, mixed> $data
     * @return IndicatorEvidenceRequirement
     * @throws ValidationException
     */
    public function storeRequirement(Indicator $indicator, array $data): IndicatorEvidenceRequirement
    {
        $version = $indicator->subStandard?->standard?->version;
        $this->ensureIsDraft($version);

        $maxOrder = IndicatorEvidenceRequirement::where('indicator_id', $indicator->indicator_id)
            ->where('standard_version_id', $version->version_id)
            ->max('display_order') ?? 0;

        return IndicatorEvidenceRequirement::create([
            'indicator_id'        => $indicator->indicator_id,
            'standard_version_id' => $version->version_id,
            'title'               => $data['title'],
            'description'         => $data['description'] ?? null,
            'required'            => (bool) ($data['required'] ?? true),
            'display_order'       => $data['display_order'] ?? ($maxOrder + 1),
        ]);
    }

    /**
     * تعديل متطلب شاهد لمؤشر.
     *
     * @param IndicatorEvidenceRequirement $requirement
     * @param array<string, mixed> $data
     * @return IndicatorEvidenceRequirement
     * @throws ValidationException
     */
    public function updateRequirement(IndicatorEvidenceRequirement $requirement, array $data): IndicatorEvidenceRequirement
    {
        $version = $requirement->standardVersion ?? $requirement->indicator?->subStandard?->standard?->version;
        $this->ensureIsDraft($version);

        $requirement->update([
            'title'         => $data['title'] ?? $requirement->title,
            'description'   => array_key_exists('description', $data) ? $data['description'] : $requirement->description,
            'required'      => array_key_exists('required', $data) ? (bool) $data['required'] : $requirement->required,
            'display_order' => $data['display_order'] ?? $requirement->display_order,
        ]);

        return $requirement;
    }

    /**
     * حذف متطلب شاهد لمؤشر.
     *
     * @param IndicatorEvidenceRequirement $requirement
     * @return bool
     * @throws ValidationException
     */
    public function deleteRequirement(IndicatorEvidenceRequirement $requirement): bool
    {
        $version = $requirement->standardVersion ?? $requirement->indicator?->subStandard?->standard?->version;
        $this->ensureIsDraft($version);

        return (bool) $requirement->delete();
    }

    /**
     * تحديث أو إعادة تهيئة مستويات سلم التقدير اللفظي للإصدار (مسودة فقط).
     *
     * @param StandardVersion $version
     * @param array<int, array{score_value: int, label: string, general_description?: string, display_order?: int}> $levels
     * @return Collection
     * @throws ValidationException
     */
    public function updateVersionScoreLevels(StandardVersion $version, array $levels): Collection
    {
        $this->ensureIsDraft($version);

        if (empty($levels) || count($levels) < 2) {
            throw ValidationException::withMessages([
                'levels' => ['يجب ألا يقل سلم التقدير عن مستويين على الأقل.'],
            ]);
        }

        return DB::transaction(function () use ($version, $levels) {
            ScoreLevel::where('standard_version_id', $version->version_id)->delete();

            $created = new Collection();
            $order = 1;
            foreach ($levels as $item) {
                $created->push(ScoreLevel::create([
                    'standard_version_id' => $version->version_id,
                    'score_value'         => (int) $item['score_value'],
                    'label'               => $item['label'],
                    'general_description' => $item['general_description'] ?? null,
                    'display_order'       => $item['display_order'] ?? $order++,
                ]));
            }

            // تحديث واصفات المؤشرات التابعة لهذا الإصدار لضمان وجود سجل لكل مستوى
            $indicators = Indicator::whereHas('subStandard.standard', function ($q) use ($version) {
                $q->where('version_id', $version->version_id);
            })->get();

            foreach ($indicators as $ind) {
                foreach ($created as $lvl) {
                    IndicatorScoreDescriptor::firstOrCreate([
                        'indicator_id'        => $ind->indicator_id,
                        'score_level_id'      => $lvl->score_level_id,
                        'standard_version_id' => $version->version_id,
                    ], [
                        'label'         => $lvl->label,
                        'description'   => 'واصف مستوى ' . $lvl->label . ' للمؤشر ' . $ind->name,
                        'display_order' => $lvl->display_order,
                        'is_active'     => true,
                    ]);
                }
            }

            return $created;
        });
    }

    /**
     * حذف مسودة إصدار معياري وكافة البيانات التابعة لها (Cascade).
     * مسموح فقط للإصدارات التي بحالة Draft وغير المرتبطة بدورات أو نتائج.
     *
     * @param StandardVersion $version
     * @return bool
     * @throws ValidationException
     */
    public function deleteVersion(StandardVersion $version): bool
    {
        if (!$version->isDraft()) {
            throw ValidationException::withMessages([
                'version' => ['لا يمكن حذف إصدار إلا إذا كان بحالة مسودة (Draft). الإصدارات المُقرّة أو النشطة محميّة نظامياً.'],
            ]);
        }

        $isLinked = DB::table('evaluation_cycles')->where('version_id', $version->version_id)->exists()
            || DB::table('evaluation_results')->where('standard_version_id', $version->version_id)->exists();

        if ($isLinked) {
            throw ValidationException::withMessages([
                'version' => ['لا يمكن حذف هذا الإصدار لارتباطه بدورات تقييم أو نتائج مسجلة في النظام.'],
            ]);
        }

        return DB::transaction(function () use ($version) {
            $standardIds = Standard::where('version_id', $version->version_id)->pluck('standard_id')->toArray();
            $subStandardIds = SubStandard::whereIn('standard_id', $standardIds)->pluck('sub_standard_id')->toArray();
            $indicatorIds = Indicator::whereIn('sub_standard_id', $subStandardIds)->pluck('indicator_id')->toArray();

            if (!empty($indicatorIds)) {
                DB::table('indicator_verification_methods')->whereIn('indicator_id', $indicatorIds)->delete();
                DB::table('indicator_evidence_requirements')->whereIn('indicator_id', $indicatorIds)->delete();
                DB::table('indicator_score_descriptors')->whereIn('indicator_id', $indicatorIds)->delete();
                DB::table('indicators')->whereIn('indicator_id', $indicatorIds)->delete();
            }

            DB::table('indicator_evidence_requirements')->where('standard_version_id', $version->version_id)->delete();
            DB::table('indicator_score_descriptors')->where('standard_version_id', $version->version_id)->delete();

            if (!empty($subStandardIds)) {
                DB::table('sub_standards')->whereIn('sub_standard_id', $subStandardIds)->delete();
            }

            if (!empty($standardIds)) {
                DB::table('standards')->whereIn('standard_id', $standardIds)->delete();
            }

            DB::table('score_levels')->where('standard_version_id', $version->version_id)->delete();

            return (bool) $version->delete();
        });
    }
}
