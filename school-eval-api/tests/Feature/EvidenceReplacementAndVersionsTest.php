<?php

namespace Tests\Feature;

use App\Models\DocumentVersion;
use App\Models\Evaluation;
use App\Models\EvidenceLink;
use App\Models\Indicator;
use App\Models\SchoolDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * اختبارات ترقية استبدال الشاهد، وسجل الإصدارات، وتصفية المستودع، وحذف الملفات الفيزيائية
 */
class EvidenceReplacementAndVersionsTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * استبدال الشاهد بنسخة أحدث ينقل كافة روابط المؤشرات السابقة تلقائياً مع متطلباتها
     */
    public function test_replace_evidence_transfers_all_linked_indicators(): void
    {
        Storage::fake('local');

        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        $evaluation = Evaluation::where('school_id', $evaluator->school_id)->firstOrFail();

        // 1. إنشاء مستند ونسخة أولى
        $document = SchoolDocument::create([
            'school_id' => $evaluator->school_id,
            'title' => 'خطة التطوير الشاملة للاختبار',
            'document_type' => 'plan',
            'description' => 'وثيقة اختبار استبدال الشاهد',
            'created_by_user_id' => $evaluator->user_id,
        ]);

        $v1 = DocumentVersion::create([
            'school_id' => $evaluator->school_id,
            'school_document_id' => $document->id,
            'version_no' => 1,
            'is_current' => true,
            'storage_uri' => 'documents/' . $evaluator->school_id . '/test_v1.pdf',
            'file_name' => 'test_v1.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
            'notes' => 'الإصدار الأول',
        ]);
        Storage::disk('local')->put($v1->storage_uri, 'PDF V1 Content');

        // 2. ربط النسخة الأولى بمؤشرين مختلفين
        $indicators = Indicator::orderBy('indicator_id')->take(2)->get();
        $ind1 = $indicators[0];
        $ind2 = $indicators[1];

        $link1 = EvidenceLink::create([
            'school_id' => $evaluator->school_id,
            'evaluation_id' => $evaluation->evaluation_id,
            'indicator_id' => $ind1->indicator_id,
            'document_version_id' => $v1->id,
            'justification' => 'تبرير للمؤشر الأول',
            'covered_requirements' => [1, 2],
            'status' => 'completed',
        ]);

        $link2 = EvidenceLink::create([
            'school_id' => $evaluator->school_id,
            'evaluation_id' => $evaluation->evaluation_id,
            'indicator_id' => $ind2->indicator_id,
            'document_version_id' => $v1->id,
            'justification' => 'تبرير للمؤشر الثاني',
            'covered_requirements' => [3],
            'status' => 'completed',
        ]);

        // 3. استبدال المستند بنسخة ثانية أحدث
        $newFile = UploadedFile::fake()->create('test_v2.pdf', 2048, 'application/pdf');

        $response = $this->actingAs($evaluator, 'sanctum')
            ->postJson('/api/v1/evidences/upload', [
                'file' => $newFile,
                'documentId' => $document->id,
                'title' => 'خطة التطوير الشاملة المحدثة',
                'notes' => 'تحديث معتمد للنسخة الثانية',
            ]);

        $response->assertStatus(201);
        $data = $response->json('data');

        $this->assertEquals(2, $data['versionNumber']);
        $newVersionId = $data['versionId'];

        // التأكد من أن النسخة الأولى أصبحت غير حالية
        $v1->refresh();
        $this->assertFalse($v1->is_current);

        // التأكد من أن النسخة الثانية هي الحالية
        $v2 = DocumentVersion::findOrFail($newVersionId);
        $this->assertTrue($v2->is_current);

        // التأكد الحاسم: انتقال الرابطين (كافة المؤشرات) إلى النسخة الجديدة تلقائياً
        $link1->refresh();
        $link2->refresh();
        $this->assertEquals($newVersionId, $link1->document_version_id);
        $this->assertEquals($newVersionId, $link2->document_version_id);

        // التأكد من بقاء المتطلبات المغطاة والتبريرات سالمة
        $this->assertEquals([1, 2], $link1->covered_requirements);
        $this->assertEquals('تبرير للمؤشر الأول', $link1->justification);
        $this->assertEquals([3], $link2->covered_requirements);
        $this->assertEquals('تبرير للمؤشر الثاني', $link2->justification);

        // التأكد من أن استجابة الـ API تحتوي على مصفوفة المؤشرات المنقولة بالكامل
        $this->assertCount(2, $data['linkedIndicators']);
    }

    /**
     * مستودع الشواهد يعرض آخر نسخة فقط (is_current = true) ويستبعد النسخ القديمة
     */
    public function test_get_evidences_returns_only_current_versions(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        $document = SchoolDocument::create([
            'school_id' => $evaluator->school_id,
            'title' => 'وثيقة فحص تصفية المستودع',
            'document_type' => 'report',
            'created_by_user_id' => $evaluator->user_id,
        ]);

        // نسخة قديمة (غير حالية)
        DocumentVersion::create([
            'school_id' => $evaluator->school_id,
            'school_document_id' => $document->id,
            'version_no' => 1,
            'is_current' => false,
            'storage_uri' => 'documents/test_old.pdf',
            'file_name' => 'test_old.pdf',
            'file_size' => 1000,
            'mime_type' => 'application/pdf',
        ]);

        // نسخة حالية
        $current = DocumentVersion::create([
            'school_id' => $evaluator->school_id,
            'school_document_id' => $document->id,
            'version_no' => 2,
            'is_current' => true,
            'storage_uri' => 'documents/test_new.pdf',
            'file_name' => 'test_new.pdf',
            'file_size' => 2000,
            'mime_type' => 'application/pdf',
        ]);

        $response = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/evidences');

        $response->assertStatus(200);
        $evidences = collect($response->json('data.evidences'));

        // يجب أن يظهر الإصدار الحالي فقط، ولا يظهر الإصدار القديم
        $matching = $evidences->where('documentId', $document->id);
        $this->assertCount(1, $matching);
        $this->assertEquals(2, $matching->first()['versionNumber']);
        $this->assertEquals('test_new.pdf', $matching->first()['fileName']);
    }

    /**
     * حذف الملف الفيزيائي للإصدار القديم ينجح مع إبقاء السجل الأرشيفي
     */
    public function test_prune_version_physical_file_succeeds_for_old_version(): void
    {
        Storage::fake('local');

        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        $document = SchoolDocument::create([
            'school_id' => $evaluator->school_id,
            'title' => 'مستند تجربة شطب الملف الفيزيائي',
            'document_type' => 'record',
            'created_by_user_id' => $evaluator->user_id,
        ]);

        $path = 'documents/' . $evaluator->school_id . '/archived_sample.pdf';
        Storage::disk('local')->put($path, 'File payload to delete');
        $this->assertTrue(Storage::disk('local')->exists($path));

        $oldVersion = DocumentVersion::create([
            'school_id' => $evaluator->school_id,
            'school_document_id' => $document->id,
            'version_no' => 1,
            'is_current' => false,
            'storage_uri' => $path,
            'file_name' => 'archived_sample.pdf',
            'file_size' => 5000,
            'mime_type' => 'application/pdf',
            'notes' => 'نسخة مؤرشفة',
        ]);

        $response = $this->actingAs($evaluator, 'sanctum')
            ->deleteJson("/api/v1/evidences/versions/{$oldVersion->id}/file");

        $response->assertStatus(200);
        $this->assertTrue($response->json('data.isFilePruned'));

        // الملف الفيزيائي حُذف من التخزين
        $this->assertFalse(Storage::disk('local')->exists($path));

        // لكن سجل الإصدار باقٍ في قاعدة البيانات
        $oldVersion->refresh();
        $this->assertNotNull($oldVersion);
        $this->assertEquals(0, $oldVersion->file_size);
        $this->assertStringContainsString('تم شطب الملف الفيزيائي', $oldVersion->notes);
    }

    /**
     * رفض حذف الملف الفيزيائي للإصدار الحالي المعتمد للشاهد (حظر 422)
     */
    public function test_prune_version_physical_file_fails_for_current_version(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        $document = SchoolDocument::create([
            'school_id' => $evaluator->school_id,
            'title' => 'مستند تجربة حظر حذف النسخة الحالية',
            'document_type' => 'record',
            'created_by_user_id' => $evaluator->user_id,
        ]);

        $currentVersion = DocumentVersion::create([
            'school_id' => $evaluator->school_id,
            'school_document_id' => $document->id,
            'version_no' => 1,
            'is_current' => true,
            'storage_uri' => 'documents/current.pdf',
            'file_name' => 'current.pdf',
            'file_size' => 3000,
            'mime_type' => 'application/pdf',
        ]);

        $response = $this->actingAs($evaluator, 'sanctum')
            ->deleteJson("/api/v1/evidences/versions/{$currentVersion->id}/file");

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['version']);
    }

    /**
     * استرجاع السجل الأرشيفي الشامل لكافة الوثائق والنسخ التاريخية
     */
    public function test_get_versions_archive_returns_all_documents_with_versions(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        $response = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/evidences/versions-archive');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'archiveStats' => [
                    'totalDocuments',
                    'totalVersions',
                    'historicalVersionsCount',
                    'prunedVersionsCount',
                ],
                'documents' => [
                    '*' => [
                        'documentId',
                        'title',
                        'documentType',
                        'documentTypeArabic',
                        'totalVersionsCount',
                        'currentVersion',
                        'historicalVersions',
                    ]
                ]
            ]
        ]);
    }
}
