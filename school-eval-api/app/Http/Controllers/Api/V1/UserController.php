<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\Ministry;
use App\Models\Role;
use App\Models\School;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * متحكم إدارة المستخدمين والحسابات (UserController).
 *
 * يوفر العمليات الإدارية لمسؤول النظام (UI-ADM-04 / UI-ADM-05):
 * - استعراض كافة الحسابات والتصفية بحسب النوع، المدرسة، الحالة، أو الدور.
 * - إضافة حساب جديد مع إسناد الدور المؤسسي (RBAC) والتكامل الحصري (XOR).
 * - تعديل بيانات الحساب.
 * - تفعيل وتعطيل الحسابات (سياسة «تعطيل لا حذف» BR-GEN-04).
 */
class UserController extends Controller
{
    /**
     * استعراض قائمة الحسابات للمستخدمين المصرح لهم (users.manage).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $query = User::with(['school', 'ministry', 'roles']);

        // فلترة بالنوع
        if ($request->has('userType')) {
            $query->where('user_type', $request->query('userType'));
        }

        // فلترة بالحالة
        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        // فلترة بالمدرسة
        if ($request->has('schoolId')) {
            $query->where('school_id', $request->query('schoolId'));
        }

        // بحث نصي
        if ($request->has('q')) {
            $term = $request->query('q');
            $query->where(function ($q) use ($term) {
                $q->where('username', 'like', "%{$term}%")
                  ->orWhere('full_name', 'like', "%{$term}%")
                  ->orWhere('email', 'like', "%{$term}%");
            });
        }

        $users = $query->orderBy('user_id')->get();

        return ApiResponse::success(
            data: UserResource::collection($users)->resolve($request),
            message: null
        );
    }

    /**
     * استعراض تفاصيل مستخدم محدد.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $targetUser = User::with(['school', 'ministry', 'roles'])->find($id);

        if (!$targetUser) {
            return ApiResponse::notFound('المستخدم المطلوب غير موجود.');
        }

        return ApiResponse::success(
            data: (new UserResource($targetUser))->resolve($request),
            message: null
        );
    }

    /**
     * إنشاء حساب مستخدم جديد مع إسناد الدور (UI-ADM-05).
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();

        $newUser = DB::transaction(function () use ($data) {
            $user = User::create([
                'username'      => $data['username'],
                'password_hash' => Hash::make($data['password']),
                'full_name'     => $data['fullName'],
                'email'         => $data['email'],
                'user_type'     => $data['userType'],
                'school_id'     => $data['userType'] === 'school' ? ($data['schoolId'] ?? null) : null,
                'ministry_id'   => $data['userType'] === 'ministry' ? ($data['ministryId'] ?? null) : null,
                'status'        => $data['status'],
            ]);

            // إسناد الدور الوظيفي
            if (!empty($data['roleId'])) {
                UserRole::create([
                    'user_id'     => $user->user_id,
                    'role_id'     => $data['roleId'],
                    'assigned_at' => now(),
                    'revoked_at'  => null,
                    'active'      => true,
                ]);
            }

            return $user;
        });

        $newUser->load(['school', 'ministry', 'roles']);

        return ApiResponse::created(
            data: (new UserResource($newUser))->resolve($request),
            message: 'تم إنشاء حساب المستخدم بنجاح.'
        );
    }

    /**
     * تعديل بيانات مستخدم موجود.
     */
    public function update(UpdateUserRequest $request, int $id): JsonResponse
    {
        $targetUser = User::find($id);

        if (!$targetUser) {
            return ApiResponse::notFound('المستخدم المطلوب غير موجود.');
        }

        $data = $request->validated();

        DB::transaction(function () use ($targetUser, $data) {
            $fields = [];

            if (isset($data['fullName'])) {
                $fields['full_name'] = $data['fullName'];
            }
            if (isset($data['email'])) {
                $fields['email'] = $data['email'];
            }
            if (!empty($data['password'])) {
                $fields['password_hash'] = Hash::make($data['password']);
            }
            if (isset($data['status'])) {
                $fields['status'] = $data['status'];
            }
            if (isset($data['userType'])) {
                $fields['user_type'] = $data['userType'];
                $fields['school_id'] = $data['userType'] === 'school' ? ($data['schoolId'] ?? null) : null;
                $fields['ministry_id'] = $data['userType'] === 'ministry' ? ($data['ministryId'] ?? null) : null;
            } elseif (array_key_exists('schoolId', $data) || array_key_exists('ministryId', $data)) {
                if (array_key_exists('schoolId', $data)) $fields['school_id'] = $data['schoolId'];
                if (array_key_exists('ministryId', $data)) $fields['ministry_id'] = $data['ministryId'];
            }

            $targetUser->update($fields);

            // تحديث الدور إن تم تمريره
            if (!empty($data['roleId'])) {
                // إلغاء الأدوار السابقة
                UserRole::where('user_id', $targetUser->user_id)
                    ->update(['active' => false, 'revoked_at' => now()]);

                // إسناد الدور الجديد
                UserRole::create([
                    'user_id'     => $targetUser->user_id,
                    'role_id'     => $data['roleId'],
                    'assigned_at' => now(),
                    'revoked_at'  => null,
                    'active'      => true,
                ]);
            }
        });

        $targetUser->load(['school', 'ministry', 'roles']);

        return ApiResponse::success(
            data: (new UserResource($targetUser->fresh()))->resolve($request),
            message: 'تم تحديث بيانات المستخدم بنجاح.'
        );
    }

    /**
     * تفعيل أو تعطيل الحساب (سياسة تعطيل لا حذف BR-GEN-04).
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $targetUser = User::find($id);
        if (!$targetUser) {
            return ApiResponse::notFound('المستخدم المطلوب غير موجود.');
        }

        // حظر تعطيل النفس لمسؤول النظام الحالي
        if ($targetUser->user_id === $user->user_id) {
            return ApiResponse::error(
                message: 'لا يمكن تعطيل حسابك الحالي المسجل به الدخول.',
                status: 400
            );
        }

        $newStatus = $targetUser->status === 'Active' ? 'Disabled' : 'Active';
        $targetUser->update(['status' => $newStatus]);

        $message = $newStatus === 'Active' 
            ? 'تم تفعيل حساب المستخدم بنجاح.' 
            : 'تم تعطيل حساب المستخدم بنجاح.';

        return ApiResponse::success(
            data: (new UserResource($targetUser->fresh()))->resolve($request),
            message: $message
        );
    }

    /**
     * استرجاع قائمة الأدوار والجهات المتاحة لتعبئة نماذج الإضافة والتعديل.
     */
    public function meta(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $roles = Role::orderBy('role_id')->get()->map(function ($r) {
            return [
                'roleId'      => $r->role_id,
                'roleName'    => $r->role_name,
                'description' => $r->description,
            ];
        });

        $schools = School::where('status', 'Active')->orderBy('school_name')->get()->map(function ($s) {
            return [
                'schoolId'   => $s->school_id,
                'schoolName' => $s->school_name,
            ];
        });

        $ministries = Ministry::orderBy('ministry_name')->get()->map(function ($m) {
            return [
                'ministryId'   => $m->ministry_id,
                'ministryName' => $m->ministry_name,
            ];
        });

        return ApiResponse::success(
            data: [
                'roles'      => $roles,
                'schools'    => $schools,
                'ministries' => $ministries,
            ],
            message: null
        );
    }
}
