<?php

namespace App\Services;

use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\IndicatorScoreDescriptor;
use App\Models\ScoreLevel;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\SubStandard;
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
        return StandardVersion::create([
            'version_no'          => $data['version_no'],
            'issue_date'          => $data['issue_date'] ?? now()->toDateString(),
            'source_organization' => $data['source_organization'] ?? 'وزارة التربية والتعليم والبحث العلمي',
            'source_number'       => $data['source_number'] ?? null,
            'source_description'  => $data['source_description'] ?? null,
            'status'              => StandardVersion::STATUS_DRAFT,
        ]);
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
     * تحديث أوزان المعايير في المسودة مع التحقق الحتمي من أن المجموع = 100.00%.
     *
     * @param StandardVersion $version
     * @param array<int, array{standard_id: int, weight: float}> $standardsWeights
     * @param array<int, array{indicator_id: int, weight: float}>|null $indicatorsWeights
     * @return StandardVersion
     * @throws ValidationException
     */
    public function updateWeights(StandardVersion $version, array $standardsWeights, ?array $indicatorsWeights = null): StandardVersion
    {
        $this->ensureIsDraft($version);

        // جلب المعايير الحالية للإصدار للتأكد من حساب المجموع بدقة
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

        DB::transaction(function () use ($version, $standardsWeights, $indicatorsWeights) {
            foreach ($standardsWeights as $item) {
                $sid = (int) ($item['standard_id'] ?? $item['id']);
                Standard::where('standard_id', $sid)
                    ->where('version_id', $version->version_id)
                    ->update(['weight' => $item['weight']]);
            }

            if (!empty($indicatorsWeights)) {
                foreach ($indicatorsWeights as $indItem) {
                    $iid = (int) ($indItem['indicator_id'] ?? $indItem['id']);
                    // التحقق من أن المؤشر يتبع هذا الإصدار
                    $indicator = Indicator::find($iid);
                    if ($indicator && $indicator->subStandard?->standard?->version_id === $version->version_id) {
                        $indicator->update(['weight' => $indItem['weight']]);
                    }
                }
            }
        });

        return $version->fresh('standards');
    }

    /**
     * إقرار مسودة الإصدار وتجميدها مع أرشفة الإصدار المُقرّ السابق تلقائيًا.
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

        return DB::transaction(function () use ($version) {
            // أرشفة أي إصدار مُقرّ أو نشط سابق تلقائيًا لضمان وجود إصدار مُقرّ نشط واحد فقط
            StandardVersion::whereIn('status', [StandardVersion::STATUS_APPROVED, StandardVersion::STATUS_ACTIVE])
                ->where('version_id', '!=', $version->version_id)
                ->update(['status' => StandardVersion::STATUS_ARCHIVED]);

            // إقرار الإصدار
            $version->status = StandardVersion::STATUS_APPROVED;
            $version->save();

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

        $indicator->update([
            'name'        => $data['name'] ?? $indicator->name,
            'description' => array_key_exists('description', $data) ? $data['description'] : $indicator->description,
            'code'        => $data['code'] ?? $indicator->code,
            'status'      => $data['status'] ?? $indicator->status,
            'weight'      => array_key_exists('weight', $data) ? $data['weight'] : $indicator->weight,
        ]);

        return $indicator;
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
}
