<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesEvaluatorContext;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\DocumentVersion;
use App\Models\EvidenceLink;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\SchoolDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * متحكم إدارة الشواهد والأدلة ونسخ الوثائق والروابط المتعددة في بوابة المقيّم.
 */
class EvaluatorEvidenceController extends Controller
{
    use ResolvesEvaluatorContext;

    /**
     * POST /api/v1/evidences/upload
     * Multipart file upload (versioned evidence)
     */
    public function uploadEvidence(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file'          => 'required|file|max:25600|mimes:pdf,png,jpg,jpeg,docx,xlsx',
            'title'         => 'nullable|string|max:255',
            'documentType'  => 'nullable|string|in:evidence,minutes,plan,record,report,board,image,other',
            'document_type' => 'nullable|string|in:evidence,minutes,plan,record,report,board,image,other',
            'description'   => 'nullable|string|max:2000',
            'justification' => 'nullable|string|max:1000',
            'indicatorId'   => 'nullable|integer',
            'actionId'      => 'nullable|integer',
            'notes'         => 'nullable|string',
            'documentId'    => 'nullable|integer',
        ], [
            'file.required' => 'الملف مطلوب.',
            'file.max'      => 'حجم الملف يتجاوز الحد الأقصى المسموح (25 ميجابايت).',
            'file.mimes'    => 'نوع الملف غير مسموح. الأنواع المسموحة: pdf, png, jpg, jpeg, docx, xlsx.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $user = $request->user();
        if ($user && !$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('ليس لديك صلاحية رفع أو تعديل الشواهد. هذه الصلاحية محصورة بمقيم المدرسة.');
        }

        $evaluation = $this->getActiveEvaluation($request);
        if (in_array($evaluation->status, ['Submitted', 'UnderReview', 'Completed'], true) || ($evaluation->cycle && $evaluation->cycle->status === 'Closed')) {
            return ApiResponse::error('لا يمكن رفع شواهد على ملف تقييم مقفل أو دورة مغلقة (للقراءة فقط).', 422);
        }
        $schoolId = $evaluation->school_id;
        $uploadedFile = $request->file('file');

        $originalName = $uploadedFile->getClientOriginalName();
        $mimeType = $uploadedFile->getClientMimeType();
        $fileSize = $uploadedFile->getSize();
        $storageName = Str::uuid()->toString() . '.' . $uploadedFile->getClientOriginalExtension();
        $storedPath = $uploadedFile->storeAs('evidences/' . $schoolId, $storageName, 'local');

        $docId = $request->input('documentId');
        if ($docId) {
            $document = SchoolDocument::where('school_id', $schoolId)->where('id', $docId)->first();
            if (!$document) {
                return ApiResponse::notFound('المستند المطلوب استبداله غير موجود.');
            }
            $updateData = [];
            if ($request->filled('title')) {
                $updateData['title'] = $request->input('title');
            }
            if ($request->filled('description')) {
                $updateData['description'] = $request->input('description');
            }
            if ($request->filled('documentType') || $request->filled('document_type')) {
                $updateData['document_type'] = $request->input('documentType') ?: $request->input('document_type');
            }
            if (!empty($updateData)) {
                $document->update($updateData);
            }
        } else {
            $title = $request->input('title') ?: pathinfo($originalName, PATHINFO_FILENAME);
            $documentType = $request->input('documentType') ?: $request->input('document_type', 'evidence');
            $description = $request->input('description');
            $document = SchoolDocument::create([
                'school_id'          => $schoolId,
                'title'              => $title,
                'document_type'      => $documentType,
                'description'        => $description,
                'created_by_user_id' => $user?->user_id ?? 1,
            ]);
        }

        $previousVersions = DocumentVersion::where('school_document_id', $document->id)->get();
        $latestVersion = $previousVersions->max('version_no') ?? 0;
        $newVersionNumber = $latestVersion + 1;

        DocumentVersion::where('school_document_id', $document->id)->update(['is_current' => false]);

        $versionNotes = $request->input('notes');
        if (empty($versionNotes) && $newVersionNumber > 1) {
            $versionNotes = "نسخة محدثة (الإصدار {$newVersionNumber})";
        }

        $docVersion = DocumentVersion::create([
            'school_id'          => $schoolId,
            'school_document_id' => $document->id,
            'version_no'         => $newVersionNumber,
            'is_current'         => true,
            'storage_uri'        => $storedPath,
            'file_name'          => $originalName,
            'mime_type'          => $mimeType,
            'file_size'          => $fileSize,
            'notes'              => $versionNotes,
        ]);

        $previousVersionIds = $previousVersions->pluck('id')->filter()->all();
        if (!empty($previousVersionIds)) {
            EvidenceLink::whereIn('document_version_id', $previousVersionIds)
                ->update(['document_version_id' => $docVersion->id]);
        }

        $linkId = null;
        $coveredReqs = null;
        if ($request->filled('coveredRequirements')) {
            $rawCovered = $request->input('coveredRequirements');
            if (is_string($rawCovered)) {
                $decoded = json_decode($rawCovered, true);
                $rawCovered = is_array($decoded) ? $decoded : [];
            }
            if (is_array($rawCovered)) {
                $coveredReqs = array_values(array_unique(array_map('intval', array_filter($rawCovered, fn ($v) => is_numeric($v)))));
            }
        }

        if ($request->filled('indicatorId')) {
            $indicatorId = (int) $request->input('indicatorId');
            $existingLink = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
                ->where('indicator_id', $indicatorId)
                ->where('document_version_id', $docVersion->id)
                ->first();

            if ($existingLink) {
                $linkUpdates = [];
                if ($coveredReqs !== null) {
                    $linkUpdates['covered_requirements'] = $coveredReqs;
                }
                if ($request->filled('justification')) {
                    $linkUpdates['justification'] = $request->input('justification');
                }
                if (!empty($linkUpdates)) {
                    $existingLink->update($linkUpdates);
                }
                $linkId = $existingLink->id;
            } else {
                $link = EvidenceLink::create([
                    'school_id'            => $schoolId,
                    'evaluation_id'        => $evaluation->evaluation_id,
                    'indicator_id'         => $indicatorId,
                    'document_version_id'  => $docVersion->id,
                    'action_id'            => $request->input('actionId'),
                    'justification'        => $request->input('justification') ?: $request->input('notes', ''),
                    'covered_requirements' => $coveredReqs ?? [],
                    'status'               => 'completed',
                ]);
                $linkId = $link->id;
            }
        }

        $allLinks = EvidenceLink::where('document_version_id', $docVersion->id)
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->with(['indicator.subStandard.standard'])
            ->get();

        $linkedIndicators = $allLinks->map(fn ($l) => [
            'linkId'              => (int) $l->id,
            'indicatorId'         => (int) $l->indicator_id,
            'indicatorCode'       => $l->indicator?->code ?? '',
            'indicatorTitle'      => $l->indicator?->name ?? '',
            'standardId'          => $l->indicator?->subStandard?->standard?->standard_id,
            'standardCode'        => $l->indicator?->subStandard?->standard?->code ?? '',
            'standardName'        => $l->indicator?->subStandard?->standard?->name ?? '',
            'justification'       => $l->justification ?? '',
            'coveredRequirements' => $l->covered_requirements ?? [],
        ])->values()->all();

        $firstLink = $allLinks->first();
        $isUnlinked = ($allLinks->isEmpty());

        return ApiResponse::created([
            'documentId'          => (int) $document->id,
            'versionId'           => (int) $docVersion->id,
            'linkId'              => $linkId ?? $firstLink?->id,
            'title'               => $document->title,
            'fileName'            => $originalName,
            'fileSize'            => $fileSize,
            'mimeType'            => $mimeType,
            'versionNumber'       => $newVersionNumber,
            'isUnlinked'          => $isUnlinked,
            'indicatorId'         => $firstLink?->indicator_id,
            'standardCode'        => $firstLink?->indicator?->subStandard?->standard?->code ?? 'UNLINKED',
            'standardName'        => $firstLink?->indicator?->subStandard?->standard?->name ?? 'مستودع المدرسة (غير مرتبط)',
            'indicatorCode'       => $firstLink?->indicator?->code ?? 'غير مرتبط',
            'indicatorTitle'      => $firstLink?->indicator?->name ?? 'غير مرتبط بأي مؤشر',
            'linkedIndicators'    => $linkedIndicators,
            'coveredRequirements' => $coveredReqs ?? $firstLink?->covered_requirements ?? [],
            'uploadedAt'          => $docVersion->created_at?->toIso8601String(),
        ], 'تم رفع المستند وتوثيقه كشاهد معياري بنجاح');
    }

    /**
     * GET /api/v1/evidences/documents/{documentId}/versions
     * استرجاع سجل الإصدارات التاريخية للمستند
     */
    public function getDocumentVersions(Request $request, int $documentId): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $schoolId = $evaluation->school_id;

        $document = SchoolDocument::where('school_id', $schoolId)->where('id', $documentId)->first();
        if (!$document) {
            return ApiResponse::notFound('المستند غير موجود.');
        }

        $versions = DocumentVersion::where('school_document_id', $document->id)
            ->orderBy('version_no', 'desc')
            ->get();

        $data = $versions->map(function (DocumentVersion $ver) use ($document) {
            return [
                'versionId'   => (int) $ver->id,
                'documentId'  => (int) $document->id,
                'versionNo'   => (int) $ver->version_no,
                'isCurrent'   => (bool) $ver->is_current,
                'fileName'    => $ver->file_name,
                'fileSize'    => (int) $ver->file_size,
                'mimeType'    => $ver->mime_type,
                'notes'       => $ver->notes ?: ($ver->is_current ? 'النسخة المعتمدة الحالية' : 'نسخة أرشيفية سابقة'),
                'createdAt'   => $ver->created_at?->toIso8601String(),
                'downloadUrl' => route('api.v1.document-versions.download', ['versionId' => $ver->id]),
            ];
        });

        return ApiResponse::success([
            'document' => [
                'id'            => (int) $document->id,
                'title'         => $document->title,
                'documentType'  => $document->document_type,
                'description'   => $document->description,
                'totalVersions' => $versions->count(),
            ],
            'versions' => $data,
        ], 'تم جلب سجل إصدارات المستند بنجاح');
    }

    /**
     * GET /api/v1/evidences/versions-archive
     * استرجاع السجل الأرشيفي الشامل لكافة الوثائق وإصداراتها التاريخية
     */
    public function getVersionsArchive(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $schoolId = $evaluation->school_id;

        $documents = SchoolDocument::where('school_id', $schoolId)
            ->with(['versions' => fn ($q) => $q->orderBy('version_no', 'desc'), 'creator'])
            ->orderBy('id', 'desc')
            ->get();

        $archive = $documents->map(function (SchoolDocument $doc) use ($evaluation) {
            $currentVer = $doc->versions->firstWhere('is_current', true);
            $historicalVers = $doc->versions->where('is_current', false)->values();

            $activeLinks = $currentVer
                ? EvidenceLink::where('document_version_id', $currentVer->id)
                    ->where('evaluation_id', $evaluation->evaluation_id)
                    ->with('indicator')
                    ->get()
                : collect();

            $docType = $doc->document_type ?? 'evidence';
            $docTypeArabic = match ($docType) {
                'minutes' => 'محضر اجتماع',
                'plan'    => 'خطة تشغيلية',
                'record'  => 'سجل توثيقي',
                'report'  => 'تقرير إنجاز',
                'board'   => 'لوحة حائطية/بيانية',
                'image'   => 'صورة ميدانية',
                default   => 'شاهد توثيقي',
            };

            return [
                'documentId'         => (int) $doc->id,
                'title'              => $doc->title,
                'documentType'       => $docType,
                'documentTypeArabic' => $docTypeArabic,
                'description'        => $doc->description ?? '',
                'totalVersionsCount' => $doc->versions->count(),
                'activeLinksCount'   => $activeLinks->count(),
                'linkedIndicators'   => $activeLinks->map(fn ($l) => [
                    'indicatorId'    => (int) $l->indicator_id,
                    'indicatorCode'  => $l->indicator?->code ?? '',
                    'indicatorTitle' => $l->indicator?->name ?? '',
                ])->values()->all(),
                'currentVersion' => $currentVer ? [
                    'versionId'     => (int) $currentVer->id,
                    'versionNo'     => (int) $currentVer->version_no,
                    'fileName'      => $currentVer->file_name,
                    'fileSize'      => (int) $currentVer->file_size,
                    'formattedSize' => round($currentVer->file_size / (1024 * 1024), 2) . ' MB',
                    'notes'         => $currentVer->notes ?: 'النسخة المعتمدة الحالية',
                    'createdAt'     => $currentVer->created_at?->toIso8601String(),
                    'downloadUrl'   => route('api.v1.document-versions.download', ['versionId' => $currentVer->id]),
                ] : null,
                'historicalVersions' => $historicalVers->map(function (DocumentVersion $ver) {
                    $isPruned = empty($ver->storage_uri) || (int) $ver->file_size === 0 || str_contains($ver->notes ?? '', 'تم شطب الملف الفيزيائي');
                    return [
                        'versionId'     => (int) $ver->id,
                        'versionNo'     => (int) $ver->version_no,
                        'fileName'      => $ver->file_name,
                        'fileSize'      => (int) $ver->file_size,
                        'formattedSize' => round($ver->file_size / (1024 * 1024), 2) . ' MB',
                        'notes'         => $ver->notes ?: 'نسخة أرشيفية سابقة',
                        'createdAt'     => $ver->created_at?->toIso8601String(),
                        'isFilePruned'  => $isPruned,
                        'downloadUrl'   => $isPruned ? null : route('api.v1.document-versions.download', ['versionId' => $ver->id]),
                    ];
                })->all(),
            ];
        });

        $totalVersions = DocumentVersion::where('school_id', $schoolId)->count();
        $prunedVersionsCount = DocumentVersion::where('school_id', $schoolId)
            ->where(function ($q) {
                $q->whereNull('storage_uri')
                  ->orWhere('storage_uri', '')
                  ->orWhere('file_size', 0)
                  ->orWhere('notes', 'like', '%تم شطب الملف الفيزيائي%');
            })->count();

        return ApiResponse::success([
            'archiveStats' => [
                'totalDocuments'          => $documents->count(),
                'totalVersions'           => $totalVersions,
                'historicalVersionsCount' => max(0, $totalVersions - $documents->count()),
                'prunedVersionsCount'     => $prunedVersionsCount,
            ],
            'documents' => $archive,
        ], 'تم جلب سجل أرشيف الإصدارات بنجاح');
    }

    /**
     * DELETE /api/v1/evidences/versions/{versionId}/file
     * حذف الملف الفيزيائي للإصدار القديم مع الحفاظ على سجل الأرشيف
     */
    public function pruneVersionPhysicalFile(Request $request, int $versionId): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $schoolId = $evaluation->school_id;

        $user = $request->user();
        if ($user && !$user->hasPermission('evidence.manage') && !$user->hasPermission('evaluations.edit')) {
            return ApiResponse::forbidden('غير مصرح لك بإدارة وحذف ملفات الشواهد.');
        }

        $version = DocumentVersion::where('id', $versionId)
            ->where('school_id', $schoolId)
            ->first();

        if (!$version) {
            return ApiResponse::notFound('إصدار الشاهد المطلوب غير موجود.');
        }

        if ($version->is_current) {
            return ApiResponse::validationError([
                'version' => ['لا يمكن حذف الملف الفيزيائي للإصدار المعتمد الحالي للشاهد. يُسمح فقط بتفريغ ملفات الإصدارات الأرشيفية السابقة.'],
            ], 'لا يمكن حذف الملف الفيزيائي للإصدار المعتمد الحالي.');
        }

        if ($version->storage_uri && Storage::disk('local')->exists($version->storage_uri)) {
            Storage::disk('local')->delete($version->storage_uri);
        }

        $noteNotice = '[تم شطب الملف الفيزيائي لتوفير المساحة - الأرشيف محفوظ]';
        $currentNotes = $version->notes ?: '';
        $updatedNotes = !str_contains($currentNotes, 'تم شطب الملف الفيزيائي')
            ? trim($currentNotes . ' ' . $noteNotice)
            : $currentNotes;

        $version->update([
            'storage_uri' => '',
            'file_size'   => 0,
            'notes'       => $updatedNotes,
        ]);

        return ApiResponse::success([
            'versionId'    => (int) $version->id,
            'versionNo'    => (int) $version->version_no,
            'notes'        => $version->notes,
            'fileSize'     => 0,
            'isFilePruned' => true,
        ], 'تم حذف الملف الفيزيائي للنسخة السابقة بنجاح مع الحفاظ على سجل الأرشيف.');
    }

    /**
     * PATCH /api/v1/evidence-links/{id}/covered-requirements
     * Update mandatory requirements covered by an existing evidence link
     */
    public function updateLinkCoveredRequirements(Request $request, int $linkId): JsonResponse
    {
        $user = $request->user();
        if ($user && !$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('ليس لديك صلاحية تعديل تغطية الشواهد.');
        }

        $evaluation = $this->getActiveEvaluation($request);
        if (in_array($evaluation->status, ['Submitted', 'UnderReview', 'Completed'], true)) {
            return ApiResponse::error('لا يمكن تعديل تغطية الشواهد لأن ملف التقييم مقفل أو مرفوع للمراجعة.', 422);
        }

        $link = EvidenceLink::where('id', $linkId)
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->where('school_id', $evaluation->school_id)
            ->first();

        if (!$link) {
            return ApiResponse::notFound('رابط الشاهد المطلوب غير موجود ضمن هذا التقييم.');
        }

        $validator = Validator::make($request->all(), [
            'coveredRequirements'   => 'required|array',
            'coveredRequirements.*' => 'integer',
        ], [
            'coveredRequirements.required' => 'يرجى تحديد المتطلبات المغطاة.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $mandatoryIds = IndicatorEvidenceRequirement::where('indicator_id', $link->indicator_id)
            ->where('required', true)
            ->pluck('requirement_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $requestedIds = array_map('intval', $request->input('coveredRequirements', []));
        $validCovered = array_values(array_unique(array_intersect($requestedIds, $mandatoryIds)));

        $link->covered_requirements = $validCovered;
        $link->save();

        return ApiResponse::success([
            'linkId'              => $link->id,
            'coveredRequirements' => $validCovered,
        ], 'تم تحديث تغطية متطلبات الشاهد بنجاح.');
    }

    /**
     * GET /api/v1/evidences
     * Filter repository evidences with metadata
     */
    public function getEvidences(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $schoolId = $evaluation->school_id;

        $standardFilter = $request->query('standardId');
        $formatFilter = $request->query('format');

        $query = DocumentVersion::with(['document.creator', 'evidenceLinks.indicator.subStandard.standard'])
            ->whereHas('document', function ($q) use ($schoolId) {
                $q->where('school_id', $schoolId);
            })
            ->where('is_current', true);

        if ($formatFilter) {
            $query->where('mime_type', 'like', '%' . $formatFilter . '%');
        }

        if ($standardFilter) {
            $query->whereHas('evidenceLinks.indicator.subStandard.standard', function ($q) use ($standardFilter) {
                if (is_numeric($standardFilter)) {
                    $q->where('standard_id', (int) $standardFilter);
                } else {
                    $q->where('code', $standardFilter)->orWhere('name', 'like', '%' . $standardFilter . '%');
                }
            });
        }

        $versions = $query->orderBy('id', 'desc')->get();

        $evidencesList = $versions->map(function ($ver) use ($evaluation) {
            $links = EvidenceLink::where('document_version_id', $ver->id)
                ->where('evaluation_id', $evaluation->evaluation_id)
                ->with('indicator.subStandard.standard')
                ->get();
            $link = $links->first();
            $isUnlinked = ($link === null);

            $linkedIndicators = $links->map(fn ($l) => [
                'linkId'              => $l->id,
                'indicatorId'         => $l->indicator_id,
                'indicatorCode'       => $l->indicator?->code ?? '',
                'indicatorTitle'      => $l->indicator?->name ?? '',
                'standardId'          => $l->indicator?->subStandard?->standard?->standard_id,
                'standardCode'        => $l->indicator?->subStandard?->standard?->code ?? '',
                'standardName'        => $l->indicator?->subStandard?->standard?->name ?? '',
                'justification'       => $l->justification ?? '',
                'coveredRequirements' => $l->covered_requirements ?? [],
            ])->values()->all();

            $docType = $ver->document?->document_type ?? 'evidence';
            $docTypeArabic = match ($docType) {
                'minutes' => 'محضر اجتماع',
                'plan'    => 'خطة تشغيلية',
                'record'  => 'سجل توثيقي',
                'report'  => 'تقرير إنجاز',
                'board'   => 'لوحة حائطية/بيانية',
                'image'   => 'صورة ميدانية',
                default   => 'شاهد توثيقي',
            };

            return [
                'id'                       => $ver->id,
                'linkId'                   => $link?->id,
                'isUnlinked'               => $isUnlinked,
                'documentId'               => $ver->school_document_id,
                'indicatorId'              => $link?->indicator_id,
                'title'                    => $ver->document?->title ?? $ver->file_name,
                'fileName'                 => $ver->file_name,
                'mimeType'                 => $ver->mime_type,
                'fileSize'                 => $ver->file_size,
                'formattedSize'            => round($ver->file_size / (1024 * 1024), 2) . ' MB',
                'versionNumber'            => $ver->version_no,
                'standardCode'             => $link?->indicator?->subStandard?->standard?->code ?? 'UNLINKED',
                'standardName'             => $link?->indicator?->subStandard?->standard?->name ?? 'مستودع المدرسة (غير مرتبط)',
                'indicatorCode'            => $link?->indicator?->code ?? 'غير مرتبط',
                'indicatorTitle'           => $link?->indicator?->name ?? 'غير مرتبط بأي مؤشر',
                'documentType'             => $docType,
                'documentTypeArabic'       => $docTypeArabic,
                'description'              => $ver->document?->description ?? '',
                'justification'            => $link?->justification ?? '',
                'linkedIndicators'         => $linkedIndicators,
                'uploadedAt'               => $ver->created_at?->toDateString() ?? $ver->document?->created_at?->toDateString(),
                'uploadedBy'               => $ver->document?->creator?->full_name ?? 'مسؤول الجودة',
                'verificationStatus'       => $ver->version_no > 2 ? 'NeedsReplacement' : 'Compliant',
                'verificationStatusArabic' => $ver->version_no > 2 ? 'يتطلب استبدال' : 'مطابق ومعتمد داخلياً',
            ];
        });

        $totalDocs = $versions->count();
        $compliantDocs = $versions->where('version_no', '<=', 2)->count();
        $needsReplacementDocs = $versions->where('version_no', '>', 2)->count();
        $storageUsedMb = round($versions->sum('file_size') / (1024 * 1024), 2);
        $storageLimitMb = 500.0;

        $coveredIndicatorsCount = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
            ->distinct('indicator_id')
            ->count('indicator_id');
        $version = $this->getEvaluationStandardVersion($evaluation);
        $totalIndicatorsCount = Indicator::whereHas('subStandard.standard', fn ($q) => $q->where('version_id', $version->version_id))->count() ?: 109;

        return ApiResponse::success([
            'vaultStats' => [
                'totalEvidences'         => $totalDocs,
                'compliantEvidences'     => $compliantDocs,
                'needsReplacement'       => $needsReplacementDocs,
                'storageUsedMb'          => $storageUsedMb,
                'storageLimitMb'         => $storageLimitMb,
                'storagePercentage'      => round(($storageUsedMb / $storageLimitMb) * 100, 1),
                'coveredIndicatorsCount' => $coveredIndicatorsCount,
                'totalIndicatorsCount'   => $totalIndicatorsCount,
            ],
            'evidences' => $evidencesList,
        ]);
    }

    /**
     * PATCH /api/v1/evidences/documents/{documentId}
     * Update school document title, type, description, and link justification
     */
    public function updateDocumentMetadata(Request $request, int $documentId): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $schoolId = $evaluation->school_id;

        $document = SchoolDocument::where('school_id', $schoolId)->where('id', $documentId)->first();
        if (!$document) {
            return ApiResponse::notFound('المستند غير موجود في ملف المدرسة.');
        }

        $validator = Validator::make($request->all(), [
            'title'         => 'nullable|string|max:255',
            'documentType'  => 'nullable|string|in:evidence,minutes,plan,record,report,board,image,other',
            'document_type' => 'nullable|string|in:evidence,minutes,plan,record,report,board,image,other',
            'description'   => 'nullable|string|max:2000',
            'justification' => 'nullable|string|max:1000',
            'linkId'        => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        if ($request->filled('title')) {
            $document->title = $request->input('title');
        }
        $docType = $request->input('documentType') ?: $request->input('document_type');
        if ($docType) {
            $document->document_type = $docType;
        }
        if ($request->has('description')) {
            $document->description = $request->input('description');
        }
        $document->save();

        if ($request->filled('justification')) {
            $justification = $request->input('justification');
            if ($request->filled('linkId')) {
                EvidenceLink::where('id', $request->input('linkId'))
                    ->where('school_id', $schoolId)
                    ->update(['justification' => $justification]);
            } else {
                $versionIds = DocumentVersion::where('school_document_id', $document->id)->pluck('id');
                EvidenceLink::whereIn('document_version_id', $versionIds)
                    ->where('evaluation_id', $evaluation->evaluation_id)
                    ->update(['justification' => $justification]);
            }
        }

        return ApiResponse::success([
            'documentId'   => $document->id,
            'title'        => $document->title,
            'documentType' => $document->document_type,
            'description'  => $document->description,
        ], 'تم تحديث بيانات الشاهد بنجاح.');
    }

    /**
     * DELETE /api/v1/evidences/documents/{documentId}
     * حذف الشاهد نهائياً إذا لم يكن مرتبطاً بأي مؤشر
     */
    public function deleteUnlinkedDocument(Request $request, int $documentId): JsonResponse
    {
        $user = $request->user();
        if ($user && !$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('ليس لديك صلاحية إدارة وحذف الشواهد.');
        }

        $evaluation = $this->getActiveEvaluation($request);
        $schoolId = $evaluation->school_id;

        $document = SchoolDocument::where('school_id', $schoolId)->where('id', $documentId)->first();
        if (!$document) {
            return ApiResponse::notFound('المستند غير موجود في ملف المدرسة.');
        }

        $versionIds = DocumentVersion::where('school_document_id', $document->id)->pluck('id');
        $linkedCount = EvidenceLink::whereIn('document_version_id', $versionIds)->count();
        if ($linkedCount > 0) {
            return ApiResponse::validationError([
                'documentId' => ["لا يمكن حذف هذا الشاهد لأنه مرتبط بـ {$linkedCount} مؤشر/مؤشرات. يرجى فك ارتباطه من كافة المؤشرات أولاً قبل الحذف."],
            ], 'لا يمكن حذف الشاهد المرتبط بمؤشرات.');
        }

        $versions = DocumentVersion::where('school_document_id', $document->id)->get();
        foreach ($versions as $v) {
            if ($v->file_path && Storage::disk('local')->exists($v->file_path)) {
                try {
                    Storage::disk('local')->delete($v->file_path);
                } catch (\Throwable) {
                }
            }
        }

        DocumentVersion::where('school_document_id', $document->id)->delete();
        $documentTitle = $document->title;
        $document->delete();

        return ApiResponse::success([
            'documentId' => $documentId,
        ], "تم حذف الشاهد غير المرتبط «{$documentTitle}» نهائياً من مستودع المدرسة.");
    }

    /**
     * GET /api/v1/evaluator/evidence-inventory
     * جرد وحصر الشواهد للمدرسة الحالية
     */
    public function getEvidenceInventory(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        return app(EvidenceController::class)->inventory($request, $evaluation->evaluation_id);
    }

    /**
     * POST /api/v1/evaluator/evidence-links/multi
     * ربط شاهد بعدة مؤشرات دفعة واحدة أو نقل شاهد
     */
    public function multiLinkEvidence(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'documentId'             => 'nullable|integer',
            'versionId'              => 'nullable|integer',
            'indicatorIds'           => 'nullable|array',
            'indicatorIds.*'         => 'integer',
            'targetIndicatorIds'     => 'nullable|array',
            'targetIndicatorIds.*'   => 'integer',
            'unlinkedIndicatorIds'   => 'nullable|array',
            'unlinkedIndicatorIds.*' => 'integer',
            'coveredRequirements'    => 'nullable|array',
            'coveredRequirements.*'  => 'integer',
            'justification'          => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $indicatorIds = $request->input('indicatorIds') ?? $request->input('targetIndicatorIds') ?? [];
        $unlinkedIds = $request->input('unlinkedIndicatorIds', []);
        if ((!is_array($indicatorIds) || count($indicatorIds) === 0) && (!is_array($unlinkedIds) || count($unlinkedIds) === 0)) {
            return ApiResponse::validationError([
                'indicatorIds' => ['يرجى اختيار مؤشر واحد على الأقل لربط الشاهد به أو فك ارتباطه.'],
            ]);
        }

        $user = $request->user();
        if ($user && !$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('ليس لديك صلاحية إدارة روابط الشواهد. هذه الصلاحية محصورة بمقيم المدرسة.');
        }

        $evaluation = $this->getActiveEvaluation($request);
        if (in_array($evaluation->status, ['Submitted', 'UnderReview', 'Completed'], true)) {
            return ApiResponse::error('لا يمكن تعديل روابط الشواهد لأن ملف التقييم مقفل أو مرفوع للمراجعة.', 422);
        }

        $documentId = $request->input('documentId');
        $versionId = $request->input('versionId');
        $justification = $request->input('justification');

        if ($versionId) {
            $versionExists = DocumentVersion::where('id', $versionId)
                ->whereHas('document', fn ($q) => $q->where('school_id', $evaluation->school_id))
                ->exists();
            if (!$versionExists) {
                $versionId = null;
            }
        }
        if (!$versionId && $documentId) {
            $versionId = DocumentVersion::where('school_document_id', $documentId)
                ->whereHas('document', fn ($q) => $q->where('school_id', $evaluation->school_id))
                ->orderByDesc('is_current')
                ->orderByDesc('id')
                ->value('id');
        }

        if (!$versionId) {
            return ApiResponse::validationError([
                'versionId' => ['تعذر تحديد نسخة المستند المطلوب ربطها.'],
            ]);
        }

        if (is_array($unlinkedIds) && count($unlinkedIds) > 0) {
            EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
                ->where('document_version_id', $versionId)
                ->whereIn('indicator_id', array_map('intval', $unlinkedIds))
                ->delete();
        }

        $coveredReqs = null;
        if ($request->filled('coveredRequirements')) {
            $rawCovered = $request->input('coveredRequirements');
            if (is_string($rawCovered)) {
                $decoded = json_decode($rawCovered, true);
                $rawCovered = is_array($decoded) ? $decoded : [];
            }
            if (is_array($rawCovered)) {
                $coveredReqs = array_values(array_unique(array_map('intval', array_filter($rawCovered, fn ($v) => is_numeric($v)))));
            }
        }

        $targetIndIds = array_unique(array_map('intval', $indicatorIds));

        foreach ($targetIndIds as $tIndId) {
            $mandatoryReqIds = IndicatorEvidenceRequirement::where('indicator_id', $tIndId)
                ->where('required', true)
                ->pluck('requirement_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            if (!empty($mandatoryReqIds)) {
                $matching = array_intersect($coveredReqs ?? [], $mandatoryReqIds);
                if (empty($matching)) {
                    $indObj = Indicator::find($tIndId);
                    $code = $indObj?->code ?? (string) $tIndId;
                    return ApiResponse::error("لا بد أن تحدد متطلباً إلزامياً واحداً على الأقل للمؤشر ({$code}).", 422);
                }
            }
        }

        $createdLinks = [];
        foreach ($targetIndIds as $indId) {
            $mandatoryReqIds = IndicatorEvidenceRequirement::where('indicator_id', $indId)
                ->where('required', true)
                ->pluck('requirement_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $linkReqs = !empty($mandatoryReqIds)
                ? array_values(array_intersect($coveredReqs ?? [], $mandatoryReqIds))
                : ($coveredReqs ?? []);

            $link = EvidenceLink::firstOrCreate([
                'evaluation_id'       => $evaluation->evaluation_id,
                'indicator_id'        => $indId,
                'document_version_id' => $versionId,
            ], [
                'school_id'            => $evaluation->school_id,
                'justification'        => $justification,
                'covered_requirements' => $linkReqs,
                'status'               => 'completed',
            ]);

            $link->covered_requirements = $linkReqs;
            if ($justification) {
                $link->justification = $justification;
            }
            $link->status = 'completed';
            $link->save();

            $createdLinks[] = $link->id;
        }

        return ApiResponse::success([
            'linkedCount'   => count($createdLinks),
            'unlinkedCount' => is_array($unlinkedIds) ? count($unlinkedIds) : 0,
            'linkIds'       => $createdLinks,
        ], count($createdLinks) > 0 ? 'تم ربط الشاهد بالمؤشرات المحددة بنجاح' : 'تم تحديث روابط الشاهد بنجاح');
    }
}
