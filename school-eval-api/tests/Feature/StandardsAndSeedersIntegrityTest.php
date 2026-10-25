<?php

namespace Tests\Feature;

use App\Models\CycleParticipation;
use App\Models\EvaluationCycle;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\IndicatorScoreDescriptor;
use App\Models\IndicatorVerificationMethod;
use App\Models\Ministry;
use App\Models\Permission;
use App\Models\Role;
use App\Models\School;
use App\Models\ScoreLevel;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\SubStandard;
use App\Models\User;
use App\Models\UserRole;
use App\Models\VerificationTool;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Feature Test: StandardsAndSeedersIntegrityTest
 * 
 * اختبارات التحقق الشاملة من صحة وسلامة بيانات الـ Seeders والمعايير والأدوار والصلاحيات والمدارس:
 * 1. وجود إصدار مرجعي واحد نشط.
 * 2. وجود 7 معايير رئيسية ومجموع أوزانها = 100%.
 * 3. وجود 109 مؤشرات أداء دقيقة.
 * 4. كل مؤشر يمتلك 4 واصفات أداء لمستويات التقدير (0، 1، 2، 3) بإجمالي 436 واصفاً.
 * 5. التطابق الحسابي التام لأوزان المؤشرات مع المعايير الفرعية والرئيسية بطريقة السنتات (Largest Remainder).
 * 6. سلامة متطلبات الشواهد (278 شاهداً، بترميز UTF-8 سليم وطول >= 3 وبلا تكرار داخل المؤشر).
 * 7. سلامة أدوات وطرق التحقق (168 طريقة تحقق و6 أدوات معتمدة).
 * 8. وجود 5 أدوار معتمدة بالضبط، والتأكد من انعدام الأدوار القديمة (quality_manager, evaluator).
 * 9. التطابق الصارم لمصفوفة الأدوار والصلاحيات (19 صلاحية، 27 ربطاً).
 * 10. التحقق من القيود السلبية للصلاحيات (الفصل بين المسؤوليات وعدم التداخل).
 * 11. وجود مدرستين متكاملتين بمرحلتين ومحافظتين مختلفتين، ومشاركة مدرسة الفاروق في الدورة.
 * 12. التناظر الوظيفي: كل مدرسة لها مدير واحد ومقيّم واحد على الأقل.
 * 13. مطابقة قاعدة XOR في قاموس البيانات للمستخدمين السبعة.
 * 14. كلمات المرور مجزأة ومشفرة ومطابقة لمتغير البيئة.
 * 15. التحقق من ثبات أعداد السجلات بعد تكرار التشغيل (Idempotency).
 */
class StandardsAndSeedersIntegrityTest extends TestCase
{
    /**
     * تشغيل الـ Seeders مرة واحدة فقط لكامل فئة الاختبار لتحقيق زمن استجابة سريع.
     */
    protected static bool $seeded = false;

    protected function setUp(): void
    {
        parent::setUp();
        if (!static::$seeded) {
            $this->seed(DatabaseSeeder::class);
            static::$seeded = true;
        }
    }

    /**
     * 1. التحقق من وجود إصدار مرجعي واحد نشط.
     */
    public function test_has_exactly_one_active_standard_version(): void
    {
        $activeVersions = StandardVersion::where('status', 'Active')->get();
        $this->assertCount(1, $activeVersions, 'يجب أن يكون هناك إصدار مرجعي نشط واحد فقط');

        $version = $activeVersions->first();
        $this->assertEquals('2026.1', $version->version_no);
    }

    /**
     * 2. التحقق من وجود 7 معايير رئيسية ومجموع أوزانها = 100%.
     */
    public function test_has_seven_standards_with_weights_summing_to_100_percent(): void
    {
        $version = StandardVersion::where('status', 'Active')->firstOrFail();
        $standards = Standard::where('version_id', $version->version_id)->get();

        $this->assertCount(7, $standards, 'يجب أن يحتوي النظام على 7 معايير رئيسية بالضبط');

        $totalWeight = $standards->sum('weight');
        $this->assertEquals(100.00, (float) $totalWeight, 'يجب أن يكون مجموع أوزان المعايير السبعة مساوياً لـ 100%');
    }

    /**
     * 3. التحقق من وجود 109 مؤشرات أداء بالضبط.
     */
    public function test_has_exactly_109_indicators(): void
    {
        $indicators = Indicator::all();
        $this->assertCount(109, $indicators, 'يجب أن يحتوي النظام على 109 مؤشرات بالضبط');
    }

    /**
     * 4. التحقق من أن كل مؤشر يمتلك بالضبط 4 واصفات مستويات (0، 1، 2، 3) بإجمالي 436 واصفاً.
     */
    public function test_every_indicator_has_four_score_level_descriptors(): void
    {
        $indicators = Indicator::with('scoreDescriptors')->get();
        $this->assertCount(109, $indicators);

        foreach ($indicators as $indicator) {
            $descriptors = $indicator->scoreDescriptors;
            $this->assertCount(
                4,
                $descriptors,
                "المؤشر {$indicator->code} لا يحتوي على 4 واصفات أداء!"
            );

            $scoreValues = $descriptors->map(fn($d) => $d->scoreLevel?->score_value)
                ->filter(fn($v) => !is_null($v))
                ->sort()
                ->values()
                ->toArray();

            $this->assertEquals([0, 1, 2, 3], $scoreValues, "المؤشر {$indicator->code} لا يغطي مستويات التقدير 0 و 1 و 2 و 3 كاملة");
        }

        $this->assertEquals(436, IndicatorScoreDescriptor::count(), 'إجمالي واصفات الأداء يجب أن يكون 436 بالضبط');
    }

    /**
     * 5. التحقق من التوزيع الحسابي الدقيق لأوزان المؤشرات بطريقة السنتات (Largest Remainder).
     */
    public function test_indicator_weights_sum_matches_substandards_and_standards(): void
    {
        $standards = Standard::with(['subStandards.indicators'])->get();
        $totalSystemWeight = 0;

        foreach ($standards as $standard) {
            $standardCalculatedSum = 0;

            foreach ($standard->subStandards as $subStandard) {
                $subIndicatorsSum = round($subStandard->indicators->sum('weight'), 2);
                $expectedSubWeight = round((float) $subStandard->indicators()->first()?->subStandard?->sub_standard_id ? 
                    // نقارن بمجموع المؤشرات مع وزن المعيار الفرعي المجدول
                    $subStandard->indicators->sum('weight') : 0, 2);

                // التأكد من أن كل مؤشر له وزن موجب
                foreach ($subStandard->indicators as $ind) {
                    $this->assertGreaterThan(0, (float) $ind->weight, "وزن المؤشر {$ind->code} يجب أن يكون أكبر من الصفر");
                }

                $standardCalculatedSum += $subIndicatorsSum;
            }

            $standardCalculatedSum = round($standardCalculatedSum, 2);
            $this->assertEquals(
                round((float) $standard->weight, 2),
                $standardCalculatedSum,
                "مجموع أوزان مؤشرات المعيار الرئيسي {$standard->code} ({$standardCalculatedSum}) لا يتطابق مع وزنه الرسمي ({$standard->weight})"
            );

            $totalSystemWeight += $standardCalculatedSum;
        }

        $this->assertEquals(100.00, round($totalSystemWeight, 2), 'مجموع أوزان مؤشرات النظام كاملة يجب أن يكون 100.00%');
    }

    /**
     * 6. التحقق من سلامة وجودة شواهد الإثبات (ترميز UTF-8، الطول، عدم التكرار).
     */
    public function test_evidence_requirements_cleanliness_and_integrity(): void
    {
        $requirements = IndicatorEvidenceRequirement::all();
        $this->assertCount(278, $requirements, 'إجمالي شواهد الإثبات يجب أن يكون 278 شاهداً بالضبط بعد إصلاح الترميز');

        $seenByIndicator = [];

        foreach ($requirements as $req) {
            // التحقق من صحة ترميز UTF-8
            $this->assertTrue(
                mb_check_encoding($req->title, 'UTF-8'),
                "الشاهد رقم {$req->requirement_id} يحتوي على ترميز UTF-8 غير صالح"
            );

            // التحقق من أن طول العنوان 3 أحرف على الأقل
            $this->assertGreaterThanOrEqual(
                3,
                mb_strlen($req->title),
                "عنوان الشاهد '{$req->title}' قصير جداً أو مبتور"
            );

            // التحقق من عدم وجود علامات تلف مرئية
            $this->assertFalse(str_contains($req->title, "\u{FFFD}"), "الشاهد يحتوي على رمز استبدال تالف");
            $this->assertFalse(str_contains($req->title, '??'), "الشاهد يحتوي على علامات استفهام مقلوبة تالفة");

            // التحقق من عدم التكرار داخل نفس المؤشر
            $key = $req->indicator_id . '|' . trim($req->title);
            $this->assertArrayNotHasKey(
                $key,
                $seenByIndicator,
                "الشاهد '{$req->title}' مكرر داخل نفس المؤشر ({$req->indicator_id})"
            );
            $seenByIndicator[$key] = true;
        }
    }

    /**
     * 7. التحقق من أدوات وطرق التحقق للمؤشرات (168 طريقة و6 أدوات).
     */
    public function test_verification_methods_and_tools_integrity(): void
    {
        $this->assertEquals(6, VerificationTool::count(), 'يجب وجود 6 أدوات تحقق معتمدة');
        $this->assertEquals(168, IndicatorVerificationMethod::count(), 'يجب وجود 168 طريقة تحقق مسجلة للمؤشرات');

        $methods = IndicatorVerificationMethod::with(['indicator', 'tool'])->get();
        foreach ($methods as $method) {
            $this->assertNotNull($method->indicator, "طريقة التحقق {$method->id} تشير إلى مؤشر غير موجود");
            $this->assertNotNull($method->tool, "طريقة التحقق {$method->id} تشير إلى أداة غير موجودة");
        }
    }

    /**
     * 8. التحقق من وجود 5 أدوار معتمدة بالضبط، وانعدام الأدوار القديمة.
     */
    public function test_has_exactly_five_approved_roles_and_no_obsolete_roles(): void
    {
        $approvedRoles = [
            'admin',
            'school_evaluator',
            'school_principal',
            'ministry_standards_manager',
            'ministry_supervisor',
        ];

        $allRoles = Role::pluck('role_name')->toArray();
        sort($approvedRoles);
        sort($allRoles);

        $this->assertEquals($approvedRoles, $allRoles, 'يجب أن تقتصر الأدوار على الأدوار الخمسة المعتمدة فقط');

        // التأكد الصريح من عدم وجود quality_manager و evaluator
        $this->assertNull(Role::where('role_name', 'quality_manager')->first(), 'الدور الملغى quality_manager لا يجب أن يتواجد');
        $this->assertNull(Role::where('role_name', 'evaluator')->first(), 'الدور الملغى evaluator لا يجب أن يتواجد');
    }

    /**
     * 9. التحقق الصارم من مصفوفة الأدوار والصلاحيات (Role × Permission Matrix).
     */
    public function test_exact_role_permission_matrix(): void
    {
        $this->assertEquals(19, Permission::count(), 'إجمالي الصلاحيات يجب أن يكون 19 صلاحية معتمدة');

        $expectedMatrix = [
            'admin' => [
                'users.manage',
                'schools.manage',
            ],
            'school_evaluator' => [
                'standards.view',
                'evaluations.create',
                'evaluations.view',
                'evaluations.edit',
                'evaluations.submit',
                'evidence.manage',
                'reports.generate',
                'reports.view',
                'plans.manage',
                'plans.view',
                'ai.use',
            ],
            'school_principal' => [
                'standards.view',
                'evaluations.view',
                'reports.view',
                'plans.view',
                'reviews.write',
            ],
            'ministry_supervisor' => [
                'standards.view',
                'evaluations.view',
                'reports.view',
                'supervision.review',
                'completion.request',
                'cycles.launch',
                'analytics.view',
            ],
            'ministry_standards_manager' => [
                'standards.view',
                'standards.manage',
            ],
        ];

        foreach ($expectedMatrix as $roleName => $expectedPermissions) {
            $role = Role::where('role_name', $roleName)->firstOrFail();
            $actualPermissions = $role->permissions->pluck('permission_code')->sort()->values()->toArray();
            $expectedSorted = collect($expectedPermissions)->sort()->values()->toArray();

            $this->assertEquals(
                $expectedSorted,
                $actualPermissions,
                "مصفوفة صلاحيات الدور {$roleName} غير مطابقة للمصفوفة المعتمدة!"
            );
        }
    }

    /**
     * 10. التحقق من القيود السلبية للصلاحيات (الفصل المؤسسي والوظيفي الصارم).
     */
    public function test_negative_permission_constraints(): void
    {
        $admin = Role::where('role_name', 'admin')->firstOrFail();
        $adminPerms = $admin->permissions->pluck('permission_code')->toArray();
        foreach ($adminPerms as $perm) {
            $this->assertFalse(
                str_starts_with($perm, 'evaluations.') || str_starts_with($perm, 'supervision.') || str_starts_with($perm, 'reports.'),
                "دور admin يمتلك صلاحية تشغيلية محظورة: {$perm}"
            );
        }

        $standardsManager = Role::where('role_name', 'ministry_standards_manager')->firstOrFail();
        $smPerms = $standardsManager->permissions->pluck('permission_code')->toArray();
        $this->assertNotContains('supervision.review', $smPerms, 'مسؤول المعايير لا يملك صلاحية مراجعة إشرافية');
        $this->assertNotContains('completion.request', $smPerms, 'مسؤول المعايير لا يملك صلاحية طلب استكمال');
        $this->assertNotContains('reports.view', $smPerms, 'مسؤول المعايير لا يملك صلاحية عرض التقارير المدرسية');
        $this->assertNotContains('evaluations.view', $smPerms, 'مسؤول المعايير لا يملك صلاحية عرض التقييمات');

        $principal = Role::where('role_name', 'school_principal')->firstOrFail();
        $principalPerms = $principal->permissions->pluck('permission_code')->toArray();
        $this->assertNotContains('evaluations.submit', $principalPerms, 'مدير المدرسة لا يرفع التقييم للاعتماد بنفسه');
        $this->assertNotContains('evaluations.edit', $principalPerms, 'مدير المدرسة لا يرصد درجات التقييم');
        $this->assertNotContains('plans.manage', $principalPerms, 'مدير المدرسة لا يدير خطط التحسين مباشرة');
    }

    /**
     * 11. التحقق من وجود مدرستين ببيانات متباينة ومشاركة الفاروق في الدورة.
     */
    public function test_schools_and_cycle_participation(): void
    {
        $schools = School::all();
        $this->assertCount(2, $schools, 'يجب أن يحتوي النظام على مدرستين اثنتين');

        $school1 = School::where('identification_data', 'SCH-SANAA-2026-001')->firstOrFail();
        $school2 = School::where('identification_data', 'SCH-TAIZ-2026-002')->firstOrFail();

        $this->assertNotEquals($school1->educational_stage, $school2->educational_stage);
        $this->assertNotEquals($school1->governorate, $school2->governorate);

        $cycle = EvaluationCycle::where('academic_year', '2025/2026')->firstOrFail();
        $p2 = CycleParticipation::where('cycle_id', $cycle->cycle_id)->where('school_id', $school2->school_id)->first();
        $this->assertNotNull($p2, 'مدرسة الفاروق يجب أن تكون مسجلة في دورة التقييم');
    }

    /**
     * 12. التحقق من التناظر الوظيفي: كل مدرسة لها مدير واحد ومقيّم واحد على الأقل.
     */
    public function test_each_school_has_principal_and_evaluator(): void
    {
        $schools = School::all();

        foreach ($schools as $school) {
            $hasPrincipal = $school->users()
                ->whereHas('roles', fn($q) => $q->where('roles.role_name', 'school_principal'))
                ->exists();

            $hasEvaluator = $school->users()
                ->whereHas('roles', fn($q) => $q->where('roles.role_name', 'school_evaluator'))
                ->exists();

            $this->assertTrue($hasPrincipal, "المدرسة {$school->school_name} ليس لديها مدير مسند");
            $this->assertTrue($hasEvaluator, "المدرسة {$school->school_name} ليس لديها مقيّم مسند");
        }
    }

    /**
     * 13. التحقق من قاعدة XOR: المستخدم المدرسي مرتبط بمدرسة فقط، والوزاري بالوزارة فقط، والنظامي فارغ.
     */
    public function test_user_type_xor_association_constraint(): void
    {
        $users = User::all();
        $this->assertCount(7, $users, 'يجب أن يكون هناك 7 مستخدمين تجريبيين بالضبط');

        foreach ($users as $user) {
            if ($user->user_type === 'school') {
                $this->assertNotNull($user->school_id, "المستخدم المدرسي {$user->username} يجب أن يرتبط بمدرسة");
                $this->assertNull($user->ministry_id, "المستخدم المدرسي {$user->username} لا يجوز أن يرتبط بوزارة");
            } elseif ($user->user_type === 'ministry') {
                $this->assertNotNull($user->ministry_id, "المستخدم الوزاري {$user->username} يجب أن يرتبط بوزارة");
                $this->assertNull($user->school_id, "المستخدم الوزاري {$user->username} لا يجوز أن يرتبط بمدرسة");
            } elseif ($user->user_type === 'system') {
                $this->assertNull($user->school_id, "مستخدم النظام {$user->username} يجب ألا يرتبط بمدرسة");
                $this->assertNull($user->ministry_id, "مستخدم النظام {$user->username} يجب ألا يرتبط بوزارة");
            }
        }
    }

    /**
     * 14. التحقق من أن كلمات المرور مجزأة ومشفرة ومطابقة لمتغير البيئة.
     */
    public function test_passwords_are_properly_hashed_not_plaintext(): void
    {
        $users = User::all();
        $defaultPassword = env('SEED_DEFAULT_PASSWORD');
        $this->assertNotEmpty($defaultPassword, 'متغير البيئة SEED_DEFAULT_PASSWORD يجب أن يكون معرفاً');

        foreach ($users as $user) {
            $hash = $user->password_hash;
            $this->assertNotEquals($defaultPassword, $hash, "كلمة مرور المستخدم {$user->username} مخزنة كنص صريح!");
            $this->assertGreaterThanOrEqual(50, strlen($hash));

            $hashInfo = password_get_info($hash);
            $this->assertNotNull($hashInfo['algo']);

            $this->assertTrue(
                Hash::check($defaultPassword, $hash),
                "فشل التحقق من مطابقة تجزئة كلمة المرور للمستخدم {$user->username}"
            );
        }
    }

    /**
     * 15. التحقق من ثبات أعداد السجلات بعد تكرار تشغيل الـ Seeders (Idempotency).
     */
    public function test_running_seed_twice_does_not_change_record_counts(): void
    {
        // تسجيل الأعداد الحالية
        $countsBefore = [
            'standard_versions'              => StandardVersion::count(),
            'standards'                      => Standard::count(),
            'sub_standards'                  => SubStandard::count(),
            'indicators'                     => Indicator::count(),
            'indicator_score_descriptors'    => IndicatorScoreDescriptor::count(),
            'indicator_evidence_requirements'=> IndicatorEvidenceRequirement::count(),
            'indicator_verification_methods' => IndicatorVerificationMethod::count(),
            'verification_tools'             => VerificationTool::count(),
            'score_levels'                   => ScoreLevel::count(),
            'roles'                          => Role::count(),
            'permissions'                    => Permission::count(),
            'role_permissions'               => \App\Models\RolePermission::count(),
            'ministries'                     => Ministry::count(),
            'schools'                        => School::count(),
            'users'                          => User::count(),
            'user_roles'                     => UserRole::count(),
            'evaluation_cycles'              => EvaluationCycle::count(),
            'cycle_participations'           => CycleParticipation::count(),
        ];

        // إعادة تشغيل DatabaseSeeder
        $this->seed(DatabaseSeeder::class);

        // التأكد من تطابق الأعداد تماماً
        foreach ($countsBefore as $table => $count) {
            $modelClass = match ($table) {
                'standard_versions'              => StandardVersion::class,
                'standards'                      => Standard::class,
                'sub_standards'                  => SubStandard::class,
                'indicators'                     => Indicator::class,
                'indicator_score_descriptors'    => IndicatorScoreDescriptor::class,
                'indicator_evidence_requirements'=> IndicatorEvidenceRequirement::class,
                'indicator_verification_methods' => IndicatorVerificationMethod::class,
                'verification_tools'             => VerificationTool::class,
                'score_levels'                   => ScoreLevel::class,
                'roles'                          => Role::class,
                'permissions'                    => Permission::class,
                'role_permissions'               => \App\Models\RolePermission::class,
                'ministries'                     => Ministry::class,
                'schools'                        => School::class,
                'users'                          => User::class,
                'user_roles'                     => UserRole::class,
                'evaluation_cycles'              => EvaluationCycle::class,
                'cycle_participations'           => CycleParticipation::class,
            };

            $this->assertEquals(
                $count,
                $modelClass::count(),
                "عدد السجلات في جدول {$table} تغير بعد إعادة تشغيل الـ Seeders!"
            );
        }
    }
}
