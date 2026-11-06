/**
 * mockAdminData.ts
 * Rich Arabic mock data for the System Administrator module
 * All dates stored as ISO 8601 UTC strings (§6)
 */

import type {
  User,
  School,
  Directorate,
  Role,
  AuditLogEntry,
  BlockedIp,
  BackupRecord,
  SystemSettings,
  ApiResponse,
} from '../types/admin.types';

// ─── Roles ────────────────────────────────────────────────────────────────────
export const MOCK_ROLES: Role[] = [
  { roleId: 1, roleName: 'مستخدم التقييم بالمدرسة', roleCode: 'S1', description: 'مسؤول إدخال بيانات التقييم الذاتي للمدرسة', userType: 'school' },
  { roleId: 2, roleName: 'مشرف وزاري معتمد', roleCode: 'B2', description: 'مشرف ميداني تابع للوزارة على مستوى المديرية', userType: 'ministry' },
  { roleId: 3, roleName: 'مسؤول إدارة المرجعية', roleCode: 'A3', description: 'مدير المعايير والمرجعية الوطنية للتقييم', userType: 'system' },
  { roleId: 4, roleName: 'مدير النظام المركزي', roleCode: 'SYS', description: 'صلاحيات حوكمة عليا وإدارة كاملة للمنصة', userType: 'system' },
];

// ─── Directorates ─────────────────────────────────────────────────────────────
export const MOCK_DIRECTORATES: Directorate[] = [
  { directorateId: 1, directorateName: 'مديرية التحرير', governorate: 'أمانة العاصمة', schoolCount: 8, isActive: true, createdAt: '2024-01-15T08:00:00Z' },
  { directorateId: 2, directorateName: 'مديرية الصافية', governorate: 'أمانة العاصمة', schoolCount: 7, isActive: true, createdAt: '2024-01-15T08:00:00Z' },
  { directorateId: 3, directorateName: 'مديرية الوحدة', governorate: 'أمانة العاصمة', schoolCount: 6, isActive: true, createdAt: '2024-01-15T08:00:00Z' },
  { directorateId: 4, directorateName: 'مديرية معين', governorate: 'أمانة العاصمة', schoolCount: 9, isActive: true, createdAt: '2024-01-15T08:00:00Z' },
  { directorateId: 5, directorateName: 'مديرية السبعين', governorate: 'أمانة العاصمة', schoolCount: 10, isActive: true, createdAt: '2024-01-15T08:00:00Z' },
  { directorateId: 6, directorateName: 'مديرية الثورة', governorate: 'أمانة العاصمة', schoolCount: 4, isActive: true, createdAt: '2024-01-15T08:00:00Z' },
  { directorateId: 7, directorateName: 'مديرية شعوب', governorate: 'أمانة العاصمة', schoolCount: 2, isActive: true, createdAt: '2024-01-15T08:00:00Z' },
  { directorateId: 8, directorateName: 'مديرية آزال', governorate: 'أمانة العاصمة', schoolCount: 2, isActive: true, createdAt: '2024-01-15T08:00:00Z' },
];

// ─── Schools ──────────────────────────────────────────────────────────────────
export const MOCK_SCHOOLS: School[] = [
  { schoolId: 1, schoolCode: 'SCH-101', schoolName: 'مدرسة الأمل الثانوية', schoolType: 'government', educationalStage: 'ثانوي (10-12)', directorateId: 1, directorate: 'مديرية التحرير', governorate: 'أمانة العاصمة', status: 'Active', evaluatorUserId: 5, evaluatorName: 'أحمد محمد الحربي', evaluatorEmail: 'ahmed.harbi@arteqa.edu.ye', isLinked: true, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { schoolId: 2, schoolCode: 'SCH-102', schoolName: 'مدرسة النور الأساسية', schoolType: 'government', educationalStage: 'أساسي (1-9)', directorateId: 1, directorate: 'مديرية التحرير', governorate: 'أمانة العاصمة', status: 'Active', evaluatorUserId: 6, evaluatorName: 'فاطمة علي الزبيدي', evaluatorEmail: 'fatima.zubaidi@arteqa.edu.ye', isLinked: true, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { schoolId: 3, schoolCode: 'SCH-103', schoolName: 'مدرسة الاتحاد المختلطة', schoolType: 'government', educationalStage: 'أساسي وثانوي', directorateId: 1, directorate: 'مديرية التحرير', governorate: 'أمانة العاصمة', status: 'Active', evaluatorUserId: null, evaluatorName: null, evaluatorEmail: null, isLinked: false, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { schoolId: 4, schoolCode: 'SCH-104', schoolName: 'مدرسة البشير الأهلية', schoolType: 'private', educationalStage: 'أساسي وثانوي', directorateId: 1, directorate: 'مديرية التحرير', governorate: 'أمانة العاصمة', status: 'Active', evaluatorUserId: 7, evaluatorName: 'محمد سالم القحطاني', evaluatorEmail: 'm.qhtani@arteqa.edu.ye', isLinked: true, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { schoolId: 5, schoolCode: 'SCH-105', schoolName: 'مدرسة الشهيد الجمهوري', schoolType: 'government', educationalStage: 'ثانوي (10-12)', directorateId: 1, directorate: 'مديرية التحرير', governorate: 'أمانة العاصمة', status: 'Active', evaluatorUserId: 8, evaluatorName: 'نور هاشم الأنسي', evaluatorEmail: 'nour.ansi@arteqa.edu.ye', isLinked: true, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { schoolId: 6, schoolCode: 'SCH-106', schoolName: 'مدرسة الفتح الحديثة', schoolType: 'private', educationalStage: 'أساسي (1-9)', directorateId: 1, directorate: 'مديرية التحرير', governorate: 'أمانة العاصمة', status: 'Inactive', evaluatorUserId: null, evaluatorName: null, evaluatorEmail: null, isLinked: false, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { schoolId: 7, schoolCode: 'SCH-107', schoolName: 'مدرسة الوطن الثانوية', schoolType: 'government', educationalStage: 'ثانوي (10-12)', directorateId: 1, directorate: 'مديرية التحرير', governorate: 'أمانة العاصمة', status: 'Active', evaluatorUserId: 9, evaluatorName: 'كريم عمر باحارثة', evaluatorEmail: 'k.baharitha@arteqa.edu.ye', isLinked: true, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { schoolId: 8, schoolCode: 'SCH-108', schoolName: 'مدرسة العلم والتقنية', schoolType: 'private', educationalStage: 'أساسي (1-9)', directorateId: 1, directorate: 'مديرية التحرير', governorate: 'أمانة العاصمة', status: 'Active', evaluatorUserId: 10, evaluatorName: 'سارة يحيى المقطري', evaluatorEmail: 's.maqtari@arteqa.edu.ye', isLinked: true, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { schoolId: 9, schoolCode: 'SCH-201', schoolName: 'مدرسة الصافية الأساسية', schoolType: 'government', educationalStage: 'أساسي (1-9)', directorateId: 2, directorate: 'مديرية الصافية', governorate: 'أمانة العاصمة', status: 'Active', evaluatorUserId: 11, evaluatorName: 'عمر خالد السنيدار', evaluatorEmail: 'o.sunaidar@arteqa.edu.ye', isLinked: true, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { schoolId: 10, schoolCode: 'SCH-202', schoolName: 'مدرسة الإشراق الثانوية', schoolType: 'government', educationalStage: 'ثانوي (10-12)', directorateId: 2, directorate: 'مديرية الصافية', governorate: 'أمانة العاصمة', status: 'Active', evaluatorUserId: null, evaluatorName: null, evaluatorEmail: null, isLinked: false, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { schoolId: 11, schoolCode: 'SCH-203', schoolName: 'مدرسة النجاح الأهلية', schoolType: 'private', educationalStage: 'أساسي وثانوي', directorateId: 2, directorate: 'مديرية الصافية', governorate: 'أمانة العاصمة', status: 'Active', evaluatorUserId: 12, evaluatorName: 'هبة عبدالله الشامي', evaluatorEmail: 'h.shami@arteqa.edu.ye', isLinked: true, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { schoolId: 12, schoolCode: 'SCH-401', schoolName: 'مدرسة النهضة الثانوية', schoolType: 'government', educationalStage: 'ثانوي (10-12)', directorateId: 4, directorate: 'مديرية معين', governorate: 'أمانة العاصمة', status: 'Active', evaluatorUserId: 13, evaluatorName: 'طارق محمد البكري', evaluatorEmail: 't.bakri@arteqa.edu.ye', isLinked: true, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { schoolId: 13, schoolCode: 'SCH-402', schoolName: 'مدرسة المعلا الأساسية', schoolType: 'government', educationalStage: 'أساسي (1-9)', directorateId: 4, directorate: 'مديرية معين', governorate: 'أمانة العاصمة', status: 'Active', evaluatorUserId: 14, evaluatorName: 'ليلى حمود الرميثي', evaluatorEmail: 'l.rumaythi@arteqa.edu.ye', isLinked: true, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { schoolId: 14, schoolCode: 'SCH-501', schoolName: 'مدرسة السبعين الأساسية', schoolType: 'government', educationalStage: 'أساسي (1-9)', directorateId: 5, directorate: 'مديرية السبعين', governorate: 'أمانة العاصمة', status: 'Active', evaluatorUserId: 15, evaluatorName: 'علي حسن الحداد', evaluatorEmail: 'a.haddad@arteqa.edu.ye', isLinked: true, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { schoolId: 15, schoolCode: 'SCH-301', schoolName: 'مدرسة الوحدة الثانوية', schoolType: 'government', educationalStage: 'ثانوي (10-12)', directorateId: 3, directorate: 'مديرية الوحدة', governorate: 'أمانة العاصمة', status: 'Active', evaluatorUserId: null, evaluatorName: null, evaluatorEmail: null, isLinked: false, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
];

// ─── Users ────────────────────────────────────────────────────────────────────
export const MOCK_USERS: User[] = [
  { userId: 1, username: 'admin.system', fullName: 'المهندس عادل ناصر', email: 'a.naser@arteqa.edu.ye', userType: 'system', status: 'Active', roleId: 4, roleName: 'مدير النظام المركزي', roleCode: 'SYS', schoolId: null, schoolName: null, schoolCode: null, directorateId: null, directorate: null, lastActivity: '2026-11-02T00:30:00Z', isOnline: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2026-11-02T00:30:00Z' },
  { userId: 2, username: 'ref.admin1', fullName: 'د. خالد الرازحي', email: 'k.razhi@arteqa.edu.ye', userType: 'system', status: 'Active', roleId: 3, roleName: 'مسؤول إدارة المرجعية', roleCode: 'A3', schoolId: null, schoolName: null, schoolCode: null, directorateId: null, directorate: null, lastActivity: '2026-11-01T11:42:00Z', isOnline: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2026-11-01T11:42:00Z' },
  { userId: 3, username: 'ref.admin2', fullName: 'أ. عبدالرحمن الشامي', email: 'a.shami@arteqa.edu.ye', userType: 'system', status: 'Active', roleId: 3, roleName: 'مسؤول إدارة المرجعية', roleCode: 'A3', schoolId: null, schoolName: null, schoolCode: null, directorateId: null, directorate: null, lastActivity: '2026-11-01T09:15:00Z', isOnline: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2026-11-01T09:15:00Z' },
  { userId: 4, username: 'sys.backup', fullName: 'عمار عمر عبدالله', email: 'ammar.omar@arteqa.edu.ye', userType: 'system', status: 'Active', roleId: 4, roleName: 'مدير النظام المركزي', roleCode: 'SYS', schoolId: null, schoolName: null, schoolCode: null, directorateId: null, directorate: null, lastActivity: '2026-11-01T02:00:00Z', isOnline: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2026-11-01T02:00:00Z' },
  { userId: 40, username: 'sys.monitor', fullName: 'ياسر فاروق الجلال', email: 'y.jalal@arteqa.edu.ye', userType: 'system', status: 'Disabled', roleId: 3, roleName: 'مسؤول إدارة المرجعية', roleCode: 'A3', schoolId: null, schoolName: null, schoolCode: null, directorateId: null, directorate: null, lastActivity: '2026-10-20T14:00:00Z', isOnline: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2026-10-20T14:00:00Z' },
  { userId: 41, username: 'sys.sec', fullName: 'منى أحمد الشوكاني', email: 'm.shawkani@arteqa.edu.ye', userType: 'system', status: 'Active', roleId: 4, roleName: 'مدير النظام المركزي', roleCode: 'SYS', schoolId: null, schoolName: null, schoolCode: null, directorateId: null, directorate: null, lastActivity: '2026-11-01T20:00:00Z', isOnline: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2026-11-01T20:00:00Z' },
  { userId: 20, username: 'sup.tahreer', fullName: 'أ. وليد الحسني', email: 'w.husni@arteqa.edu.ye', userType: 'ministry', status: 'Active', roleId: 2, roleName: 'مشرف وزاري معتمد', roleCode: 'B2', schoolId: null, schoolName: null, schoolCode: null, directorateId: 1, directorate: 'مديرية التحرير', lastActivity: '2026-11-01T16:20:00Z', isOnline: false, createdAt: '2024-03-01T00:00:00Z', updatedAt: '2026-11-01T16:20:00Z' },
  { userId: 21, username: 'sup.safia', fullName: 'د. نادية علي محمد', email: 'n.ali@arteqa.edu.ye', userType: 'ministry', status: 'Active', roleId: 2, roleName: 'مشرف وزاري معتمد', roleCode: 'B2', schoolId: null, schoolName: null, schoolCode: null, directorateId: 2, directorate: 'مديرية الصافية', lastActivity: '2026-11-01T14:45:00Z', isOnline: false, createdAt: '2024-03-01T00:00:00Z', updatedAt: '2026-11-01T14:45:00Z' },
  { userId: 22, username: 'sup.wahda', fullName: 'م. حسام سعيد الدبعي', email: 'h.dabai@arteqa.edu.ye', userType: 'ministry', status: 'Active', roleId: 2, roleName: 'مشرف وزاري معتمد', roleCode: 'B2', schoolId: null, schoolName: null, schoolCode: null, directorateId: 3, directorate: 'مديرية الوحدة', lastActivity: '2026-10-31T11:00:00Z', isOnline: false, createdAt: '2024-03-01T00:00:00Z', updatedAt: '2026-10-31T11:00:00Z' },
  { userId: 23, username: 'sup.maeen', fullName: 'أ. ريم صالح الزيدي', email: 'r.zaidi@arteqa.edu.ye', userType: 'ministry', status: 'Active', roleId: 2, roleName: 'مشرف وزاري معتمد', roleCode: 'B2', schoolId: null, schoolName: null, schoolCode: null, directorateId: 4, directorate: 'مديرية معين', lastActivity: '2026-11-01T10:30:00Z', isOnline: false, createdAt: '2024-03-01T00:00:00Z', updatedAt: '2026-11-01T10:30:00Z' },
  { userId: 24, username: 'sup.sab70', fullName: 'د. عصام فيصل المطري', email: 'e.mutari@arteqa.edu.ye', userType: 'ministry', status: 'Active', roleId: 2, roleName: 'مشرف وزاري معتمد', roleCode: 'B2', schoolId: null, schoolName: null, schoolCode: null, directorateId: 5, directorate: 'مديرية السبعين', lastActivity: '2026-11-01T09:00:00Z', isOnline: false, createdAt: '2024-03-01T00:00:00Z', updatedAt: '2026-11-01T09:00:00Z' },
  { userId: 25, username: 'sup.thawra', fullName: 'أ. بسمة محمد الجرادي', email: 'b.jaradi@arteqa.edu.ye', userType: 'ministry', status: 'Active', roleId: 2, roleName: 'مشرف وزاري معتمد', roleCode: 'B2', schoolId: null, schoolName: null, schoolCode: null, directorateId: 6, directorate: 'مديرية الثورة', lastActivity: '2026-10-30T13:00:00Z', isOnline: false, createdAt: '2024-03-01T00:00:00Z', updatedAt: '2026-10-30T13:00:00Z' },
  { userId: 26, username: 'sup.shoub', fullName: 'م. ثائر أحمد الحكيمي', email: 't.hakimi@arteqa.edu.ye', userType: 'ministry', status: 'Disabled', roleId: 2, roleName: 'مشرف وزاري معتمد', roleCode: 'B2', schoolId: null, schoolName: null, schoolCode: null, directorateId: 7, directorate: 'مديرية شعوب', lastActivity: '2026-10-15T08:00:00Z', isOnline: false, createdAt: '2024-03-01T00:00:00Z', updatedAt: '2026-10-15T08:00:00Z' },
  { userId: 27, username: 'sup.azal', fullName: 'د. شروق خالد الحريري', email: 's.hariri@arteqa.edu.ye', userType: 'ministry', status: 'Active', roleId: 2, roleName: 'مشرف وزاري معتمد', roleCode: 'B2', schoolId: null, schoolName: null, schoolCode: null, directorateId: 8, directorate: 'مديرية آزال', lastActivity: '2026-10-29T15:00:00Z', isOnline: false, createdAt: '2024-03-01T00:00:00Z', updatedAt: '2026-10-29T15:00:00Z' },
  { userId: 5, username: 'eval.sch101', fullName: 'أحمد محمد الحربي', email: 'ahmed.harbi@arteqa.edu.ye', userType: 'school', status: 'Active', roleId: 1, roleName: 'مستخدم التقييم بالمدرسة', roleCode: 'S1', schoolId: 1, schoolName: 'مدرسة الأمل الثانوية', schoolCode: 'SCH-101', directorateId: 1, directorate: 'مديرية التحرير', lastActivity: '2026-11-01T16:30:00Z', isOnline: false, createdAt: '2024-04-01T00:00:00Z', updatedAt: '2026-11-01T16:30:00Z' },
  { userId: 6, username: 'eval.sch102', fullName: 'فاطمة علي الزبيدي', email: 'fatima.zubaidi@arteqa.edu.ye', userType: 'school', status: 'Active', roleId: 1, roleName: 'مستخدم التقييم بالمدرسة', roleCode: 'S1', schoolId: 2, schoolName: 'مدرسة النور الأساسية', schoolCode: 'SCH-102', directorateId: 1, directorate: 'مديرية التحرير', lastActivity: '2026-11-01T14:00:00Z', isOnline: false, createdAt: '2024-04-01T00:00:00Z', updatedAt: '2026-11-01T14:00:00Z' },
  { userId: 7, username: 'eval.sch104', fullName: 'محمد سالم القحطاني', email: 'm.qhtani@arteqa.edu.ye', userType: 'school', status: 'Active', roleId: 1, roleName: 'مستخدم التقييم بالمدرسة', roleCode: 'S1', schoolId: 4, schoolName: 'مدرسة البشير الأهلية', schoolCode: 'SCH-104', directorateId: 1, directorate: 'مديرية التحرير', lastActivity: '2026-11-01T13:00:00Z', isOnline: false, createdAt: '2024-04-01T00:00:00Z', updatedAt: '2026-11-01T13:00:00Z' },
  { userId: 8, username: 'eval.sch105', fullName: 'نور هاشم الأنسي', email: 'nour.ansi@arteqa.edu.ye', userType: 'school', status: 'Active', roleId: 1, roleName: 'مستخدم التقييم بالمدرسة', roleCode: 'S1', schoolId: 5, schoolName: 'مدرسة الشهيد الجمهوري', schoolCode: 'SCH-105', directorateId: 1, directorate: 'مديرية التحرير', lastActivity: '2026-10-31T17:00:00Z', isOnline: false, createdAt: '2024-04-01T00:00:00Z', updatedAt: '2026-10-31T17:00:00Z' },
  { userId: 9, username: 'eval.sch107', fullName: 'كريم عمر باحارثة', email: 'k.baharitha@arteqa.edu.ye', userType: 'school', status: 'Active', roleId: 1, roleName: 'مستخدم التقييم بالمدرسة', roleCode: 'S1', schoolId: 7, schoolName: 'مدرسة الوطن الثانوية', schoolCode: 'SCH-107', directorateId: 1, directorate: 'مديرية التحرير', lastActivity: '2026-10-30T15:00:00Z', isOnline: false, createdAt: '2024-04-01T00:00:00Z', updatedAt: '2026-10-30T15:00:00Z' },
  { userId: 10, username: 'eval.sch108', fullName: 'سارة يحيى المقطري', email: 's.maqtari@arteqa.edu.ye', userType: 'school', status: 'Active', roleId: 1, roleName: 'مستخدم التقييم بالمدرسة', roleCode: 'S1', schoolId: 8, schoolName: 'مدرسة العلم والتقنية', schoolCode: 'SCH-108', directorateId: 1, directorate: 'مديرية التحرير', lastActivity: '2026-11-01T11:00:00Z', isOnline: false, createdAt: '2024-04-01T00:00:00Z', updatedAt: '2026-11-01T11:00:00Z' },
  { userId: 11, username: 'eval.sch201', fullName: 'عمر خالد السنيدار', email: 'o.sunaidar@arteqa.edu.ye', userType: 'school', status: 'Active', roleId: 1, roleName: 'مستخدم التقييم بالمدرسة', roleCode: 'S1', schoolId: 9, schoolName: 'مدرسة الصافية الأساسية', schoolCode: 'SCH-201', directorateId: 2, directorate: 'مديرية الصافية', lastActivity: '2026-11-01T15:30:00Z', isOnline: false, createdAt: '2024-04-01T00:00:00Z', updatedAt: '2026-11-01T15:30:00Z' },
  { userId: 12, username: 'eval.sch203', fullName: 'هبة عبدالله الشامي', email: 'h.shami@arteqa.edu.ye', userType: 'school', status: 'Active', roleId: 1, roleName: 'مستخدم التقييم بالمدرسة', roleCode: 'S1', schoolId: 11, schoolName: 'مدرسة النجاح الأهلية', schoolCode: 'SCH-203', directorateId: 2, directorate: 'مديرية الصافية', lastActivity: '2026-11-01T12:00:00Z', isOnline: false, createdAt: '2024-04-01T00:00:00Z', updatedAt: '2026-11-01T12:00:00Z' },
  { userId: 13, username: 'eval.sch401', fullName: 'طارق محمد البكري', email: 't.bakri@arteqa.edu.ye', userType: 'school', status: 'Active', roleId: 1, roleName: 'مستخدم التقييم بالمدرسة', roleCode: 'S1', schoolId: 12, schoolName: 'مدرسة النهضة الثانوية', schoolCode: 'SCH-401', directorateId: 4, directorate: 'مديرية معين', lastActivity: '2026-11-01T10:00:00Z', isOnline: false, createdAt: '2024-04-01T00:00:00Z', updatedAt: '2026-11-01T10:00:00Z' },
  { userId: 14, username: 'eval.sch402', fullName: 'ليلى حمود الرميثي', email: 'l.rumaythi@arteqa.edu.ye', userType: 'school', status: 'Active', roleId: 1, roleName: 'مستخدم التقييم بالمدرسة', roleCode: 'S1', schoolId: 13, schoolName: 'مدرسة المعلا الأساسية', schoolCode: 'SCH-402', directorateId: 4, directorate: 'مديرية معين', lastActivity: '2026-10-31T09:00:00Z', isOnline: false, createdAt: '2024-04-01T00:00:00Z', updatedAt: '2026-10-31T09:00:00Z' },
  { userId: 15, username: 'eval.sch501', fullName: 'علي حسن الحداد', email: 'a.haddad@arteqa.edu.ye', userType: 'school', status: 'Disabled', roleId: 1, roleName: 'مستخدم التقييم بالمدرسة', roleCode: 'S1', schoolId: 14, schoolName: 'مدرسة السبعين الأساسية', schoolCode: 'SCH-501', directorateId: 5, directorate: 'مديرية السبعين', lastActivity: '2026-10-25T08:00:00Z', isOnline: false, createdAt: '2024-04-01T00:00:00Z', updatedAt: '2026-10-25T08:00:00Z' },
];

// ─── Audit Log ────────────────────────────────────────────────────────────────
export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  { logId: 1, timestamp: '2026-11-02T08:42:00Z', actorUserId: 2, actorName: 'د. خالد الرازحي', actorRole: 'مسؤول إدارة المرجعية', actorRoleCode: 'A3', eventType: 'قفل وثيقة معايير', eventCategory: 'sensitive', description: 'قفل وثيقة المعايير الوطنية للمرحلة الثانوية - الإصدار 3.2 • توليد البصمة الرقمية: SHA-8f9c2e1b', digitalHash: 'SHA-8f9c2e1b', ipAddress: '192.168.10.45', location: 'صنعاء، اليمن', deviceInfo: 'Chrome OS • متصفح Chrome 118', securityStatus: 'verified' },
  { logId: 2, timestamp: '2026-11-02T08:15:00Z', actorUserId: 3, actorName: 'أ. عبدالرحمن الشامي', actorRole: 'مسؤول إدارة المرجعية', actorRoleCode: 'A3', eventType: 'إصدار طلب استكمال', eventCategory: 'normal', description: 'إرسال طلب استكمال بيانات التقييم الذاتي لمدرسة الأمل الثانوية (SCH-101)', digitalHash: 'SHA-3a2b1c9d', ipAddress: '192.168.10.31', location: 'صنعاء، اليمن', deviceInfo: 'Windows 11 • متصفح Edge 118', securityStatus: 'verified' },
  { logId: 3, timestamp: '2026-11-02T07:58:00Z', actorUserId: 5, actorName: 'أحمد محمد الحربي', actorRole: 'مستخدم التقييم بالمدرسة', actorRoleCode: 'S1', eventType: 'رفع مخرج نهائي', eventCategory: 'normal', description: 'رفع مخرج التقييم النهائي لمدرسة الأمل الثانوية - الدورة الثالثة 2026 • حجم الملف: 4.2 MB', digitalHash: 'SHA-f1e2d3c4', ipAddress: '197.32.45.12', location: 'صنعاء، اليمن', deviceInfo: 'macOS 14 • Safari 17', securityStatus: 'verified' },
  { logId: 4, timestamp: '2026-11-02T06:33:00Z', actorUserId: 0, actorName: 'حساب مجهول', actorRole: 'غير معروف', actorRoleCode: '---', eventType: 'فشل تسجيل دخول', eventCategory: 'breach', description: 'محاولة دخول غير مصرح بها (3 محاولات متكررة) • تم حظر عنوان IP تلقائياً بواسطة منظومة الحماية', digitalHash: 'SHA-0a0b0c0d', ipAddress: '45.139.210.88', location: 'موسكو، روسيا', deviceInfo: 'Linux • Python Requests 2.31', securityStatus: 'blocked' },
  { logId: 5, timestamp: '2026-11-02T05:10:00Z', actorUserId: 1, actorName: 'المهندس عادل ناصر', actorRole: 'مدير النظام المركزي', actorRoleCode: 'SYS', eventType: 'تعديل صلاحية حساب', eventCategory: 'sensitive', description: 'تعديل صلاحيات حساب المستخدم (ID:26) - تعليق مؤقت للحساب • السبب: انتهاء صلاحية التفويض الوزاري', digitalHash: 'SHA-9e8d7c6b', ipAddress: '192.168.1.1', location: 'صنعاء، اليمن', deviceInfo: 'Windows Server 2022 • Chrome 118', securityStatus: 'verified' },
  { logId: 6, timestamp: '2026-11-02T04:55:00Z', actorUserId: 4, actorName: 'عمار عمر عبدالله', actorRole: 'مدير النظام المركزي', actorRoleCode: 'SYS', eventType: 'إنشاء نسخة احتياطية', eventCategory: 'normal', description: 'تنفيذ النسخة الاحتياطية الليلية التلقائية الكاملة • الحجم: 3.85 GB • الحالة: مكتملة بنجاح', digitalHash: 'SHA-a1b2c3d4', ipAddress: '127.0.0.1', location: 'صنعاء، اليمن', deviceInfo: 'مهمة مجدولة (Cron Job)', securityStatus: 'verified' },
  { logId: 7, timestamp: '2026-11-01T22:10:00Z', actorUserId: 1, actorName: 'المهندس عادل ناصر', actorRole: 'مدير النظام المركزي', actorRoleCode: 'SYS', eventType: 'تسجيل مدرسة جديدة', eventCategory: 'normal', description: 'تسجيل مدرسة جديدة: مدرسة العلم والتقنية (SCH-108) تحت مديرية التحرير', digitalHash: 'SHA-b5c6d7e8', ipAddress: '192.168.1.1', location: 'صنعاء، اليمن', deviceInfo: 'Windows 11 • Chrome 118', securityStatus: 'verified' },
  { logId: 8, timestamp: '2026-11-01T18:30:00Z', actorUserId: 0, actorName: 'حساب مجهول', actorRole: 'غير معروف', actorRoleCode: '---', eventType: 'فشل تسجيل دخول', eventCategory: 'breach', description: 'محاولة اختراق بهجوم القوة الغاشمة (Brute Force) - 15 محاولة فاشلة • تم الحظر التلقائي الفوري', digitalHash: 'SHA-0000ffff', ipAddress: '103.45.88.211', location: 'بكين، الصين', deviceInfo: 'Linux • Automated Scanner', securityStatus: 'blocked' },
  { logId: 9, timestamp: '2026-11-01T15:40:00Z', actorUserId: 20, actorName: 'أ. وليد الحسني', actorRole: 'مشرف وزاري معتمد', actorRoleCode: 'B2', eventType: 'مراجعة تقرير مدرسة', eventCategory: 'normal', description: 'مراجعة وإقرار تقرير التقييم الذاتي لمدرسة النور الأساسية (SCH-102) - الدورة الثالثة', digitalHash: 'SHA-c9d8e7f6', ipAddress: '192.168.15.20', location: 'صنعاء، اليمن', deviceInfo: 'iPad OS 17 • Safari 17', securityStatus: 'verified' },
  { logId: 10, timestamp: '2026-11-01T11:00:00Z', actorUserId: 2, actorName: 'د. خالد الرازحي', actorRole: 'مسؤول إدارة المرجعية', actorRoleCode: 'A3', eventType: 'إنشاء مستخدم جديد', eventCategory: 'sensitive', description: 'إنشاء حساب مستخدم جديد: سارة يحيى المقطري (eval.sch108) • الدور: مستخدم التقييم بالمدرسة', digitalHash: 'SHA-1a2b3c4d', ipAddress: '192.168.10.45', location: 'صنعاء، اليمن', deviceInfo: 'Chrome OS • Chrome 118', securityStatus: 'verified' },
];

// ─── Blocked IPs ──────────────────────────────────────────────────────────────
export const MOCK_BLOCKED_IPS: BlockedIp[] = [
  { ipId: 1, ipAddress: '45.139.210.88', reason: 'محاولات دخول غير مصرح بها متكررة (3 محاولات)', blockedAt: '2026-11-02T06:33:00Z', attemptCount: 3, location: 'موسكو، روسيا' },
  { ipId: 2, ipAddress: '103.45.88.211', reason: 'هجوم قوة غاشمة (Brute Force) - 15 محاولة فاشلة', blockedAt: '2026-11-01T18:30:00Z', attemptCount: 15, location: 'بكين، الصين' },
  { ipId: 3, ipAddress: '185.220.101.42', reason: 'نشاط مشبوه - مسح منافذ الشبكة', blockedAt: '2026-10-30T03:15:00Z', attemptCount: 7, location: 'فرانكفورت، ألمانيا' },
];

// ─── Backup Records ───────────────────────────────────────────────────────────
export const MOCK_BACKUPS: BackupRecord[] = [
  { backupId: 1, fileName: 'backup_full_2026-11-02_0200.enc', backupType: 'full', sizeBytes: 4133949440, status: 'completed', sha256Hash: 'a1b2c3d4e5f6789012345678901234567890abcd', createdAt: '2026-11-02T02:00:00Z', completedAt: '2026-11-02T02:18:30Z' },
  { backupId: 2, fileName: 'backup_db_2026-11-01_0200.enc', backupType: 'db_only', sizeBytes: 4134768640, status: 'completed', sha256Hash: 'b2c3d4e5f6789012345678901234567890abcde1', createdAt: '2026-11-01T02:00:00Z', completedAt: '2026-11-01T02:07:45Z' },
  { backupId: 3, fileName: 'backup_full_2026-10-31_0200.enc', backupType: 'full', sizeBytes: 4127195136, status: 'completed', sha256Hash: 'c3d4e5f6789012345678901234567890abcde1f2', createdAt: '2026-10-31T02:00:00Z', completedAt: '2026-10-31T02:19:10Z' },
  { backupId: 4, fileName: 'backup_incr_2026-10-30_1400.enc', backupType: 'incremental', sizeBytes: 524288000, status: 'completed', sha256Hash: 'd4e5f6789012345678901234567890abcde1f2g3', createdAt: '2026-10-30T14:00:00Z', completedAt: '2026-10-30T14:02:30Z' },
  { backupId: 5, fileName: 'backup_full_2026-10-30_0200.enc', backupType: 'full', sizeBytes: 4118806528, status: 'completed', sha256Hash: 'e5f6789012345678901234567890abcde1f2g3h4', createdAt: '2026-10-30T02:00:00Z', completedAt: '2026-10-30T02:18:00Z' },
  { backupId: 6, fileName: 'backup_full_2026-10-29_0200.enc', backupType: 'full', sizeBytes: 4111417344, status: 'failed', sha256Hash: 'f67890-FAILED', createdAt: '2026-10-29T02:00:00Z', completedAt: null },
];

// ─── System Settings ──────────────────────────────────────────────────────────
export const MOCK_SYSTEM_SETTINGS: SystemSettings = {
  aiEngine: { isEnabled: true, model: 'Artaqa-Assist v2.4', responseMs: 320, status: 'connected' },
  cloudStorage: { isEnabled: true, endpoint: 's3.arteqa-storage.ye', maxFileSizeMb: 25, encryptionAlgorithm: 'AES-256' },
  smtp: { isEnabled: true, senderEmail: 'noreply@arteqa.edu.ye', smtpHost: 'mail.arteqa.edu.ye', smtpPort: 587, status: 'running' },
  maintenanceMode: { isEnabled: false, scheduledAt: null, reason: '' },
};

// ─── Mock API Service ─────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

function success<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
  return { data, message: null, errors: null, meta: meta || null };
}

export const mockAdminService = {
  // Users
  getUsers: async (): Promise<ApiResponse<User[]>> => {
    await delay(300);
    return success([...MOCK_USERS]);
  },

  createUser: async (dto: Partial<User>): Promise<ApiResponse<User>> => {
    await delay(500);
    const newUser: User = {
      userId: Date.now(),
      username: dto.username || '',
      fullName: dto.fullName || '',
      email: dto.email || '',
      userType: dto.userType || 'school',
      status: 'Active',
      roleId: dto.roleId || 1,
      roleName: dto.roleName || '',
      roleCode: dto.roleCode || 'S1',
      schoolId: dto.schoolId || null,
      schoolName: dto.schoolName || null,
      schoolCode: dto.schoolCode || null,
      directorateId: dto.directorateId || null,
      directorate: dto.directorate || null,
      lastActivity: new Date().toISOString(),
      isOnline: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    MOCK_USERS.push(newUser);
    return success(newUser);
  },

  updateUser: async (userId: number, dto: Partial<User>): Promise<ApiResponse<User>> => {
    await delay(400);
    const idx = MOCK_USERS.findIndex((u) => u.userId === userId);
    if (idx === -1) return { data: null, message: 'المستخدم غير موجود', errors: null, meta: null };
    MOCK_USERS[idx] = { ...MOCK_USERS[idx], ...dto, updatedAt: new Date().toISOString() };
    return success(MOCK_USERS[idx]);
  },

  toggleUserStatus: async (userId: number): Promise<ApiResponse<User>> => {
    await delay(300);
    const idx = MOCK_USERS.findIndex((u) => u.userId === userId);
    if (idx === -1) return { data: null, message: 'المستخدم غير موجود', errors: null, meta: null };
    MOCK_USERS[idx].status = MOCK_USERS[idx].status === 'Active' ? 'Disabled' : 'Active';
    return success(MOCK_USERS[idx]);
  },

  resetPassword: async (userId?: number): Promise<ApiResponse<{ tempPassword: string }>> => {
    void userId;
    await delay(600);
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const pwd = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return success({ tempPassword: `Arteqa@${pwd}` });
  },

  // Schools
  getSchools: async (): Promise<ApiResponse<School[]>> => {
    await delay(300);
    return success([...MOCK_SCHOOLS]);
  },

  createSchool: async (dto: Partial<School>): Promise<ApiResponse<School>> => {
    await delay(500);
    const dir = MOCK_DIRECTORATES.find((d) => d.directorateId === dto.directorateId);
    const newSchool: School = {
      schoolId: Date.now(),
      schoolCode: dto.schoolCode || `SCH-${Date.now()}`,
      schoolName: dto.schoolName || '',
      schoolType: dto.schoolType || 'government',
      educationalStage: dto.educationalStage || '',
      directorateId: dto.directorateId || 1,
      directorate: dir?.directorateName || '',
      governorate: dir?.governorate || 'أمانة العاصمة',
      status: 'Active',
      evaluatorUserId: null,
      evaluatorName: null,
      evaluatorEmail: null,
      isLinked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    MOCK_SCHOOLS.push(newSchool);
    if (dir) dir.schoolCount += 1;
    return success(newSchool);
  },

  linkEvaluator: async (schoolId: number, userId: number): Promise<ApiResponse<School>> => {
    await delay(400);
    const schoolIdx = MOCK_SCHOOLS.findIndex((s) => s.schoolId === schoolId);
    const user = MOCK_USERS.find((u) => u.userId === userId);
    if (schoolIdx === -1 || !user) return { data: null, message: 'بيانات غير صحيحة', errors: null, meta: null };
    MOCK_SCHOOLS[schoolIdx] = {
      ...MOCK_SCHOOLS[schoolIdx],
      evaluatorUserId: user.userId,
      evaluatorName: user.fullName,
      evaluatorEmail: user.email,
      isLinked: true,
      updatedAt: new Date().toISOString(),
    };
    return success(MOCK_SCHOOLS[schoolIdx]);
  },

  // Directorates
  getDirectorates: async (): Promise<ApiResponse<Directorate[]>> => {
    await delay(200);
    return success([...MOCK_DIRECTORATES]);
  },

  createDirectorate: async (dto: Partial<Directorate>): Promise<ApiResponse<Directorate>> => {
    await delay(400);
    const newDir: Directorate = {
      directorateId: Date.now(),
      directorateName: dto.directorateName || '',
      governorate: dto.governorate || 'أمانة العاصمة',
      schoolCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    MOCK_DIRECTORATES.push(newDir);
    return success(newDir);
  },

  // Audit
  getAuditLogs: async (): Promise<ApiResponse<AuditLogEntry[]>> => {
    await delay(300);
    return success([...MOCK_AUDIT_LOGS]);
  },

  getBlockedIps: async (): Promise<ApiResponse<BlockedIp[]>> => {
    await delay(200);
    return success([...MOCK_BLOCKED_IPS]);
  },

  unblockIp: async (ipId: number): Promise<ApiResponse<boolean>> => {
    await delay(400);
    const idx = MOCK_BLOCKED_IPS.findIndex((ip) => ip.ipId === ipId);
    if (idx !== -1) MOCK_BLOCKED_IPS.splice(idx, 1);
    return success(true);
  },

  // Backups
  getBackups: async (): Promise<ApiResponse<BackupRecord[]>> => {
    await delay(300);
    return success([...MOCK_BACKUPS]);
  },

  triggerBackup: async (backupType: string): Promise<ApiResponse<BackupRecord>> => {
    await delay(2000);
    const types: Record<string, string> = { full: 'backup_full', db_only: 'backup_db', incremental: 'backup_incr' };
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const newBackup: BackupRecord = {
      backupId: Date.now(),
      fileName: `${types[backupType] || 'backup_full'}_${dateStr}_${timeStr}.enc`,
      backupType: backupType as BackupRecord['backupType'],
      sizeBytes: Math.floor(Math.random() * 500000000) + 3800000000,
      status: 'completed',
      sha256Hash: Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
      createdAt: now.toISOString(),
      completedAt: new Date(now.getTime() + 1200000).toISOString(),
    };
    MOCK_BACKUPS.unshift(newBackup);
    return success(newBackup);
  },

  getSystemSettings: async (): Promise<ApiResponse<SystemSettings>> => {
    await delay(200);
    return success({ ...MOCK_SYSTEM_SETTINGS });
  },

  saveSystemSettings: async (settings: SystemSettings): Promise<ApiResponse<SystemSettings>> => {
    await delay(600);
    Object.assign(MOCK_SYSTEM_SETTINGS, settings);
    return success({ ...MOCK_SYSTEM_SETTINGS });
  },

  sendTestEmail: async (): Promise<ApiResponse<boolean>> => {
    await delay(1500);
    return success(true);
  },

  getRoles: async (): Promise<ApiResponse<Role[]>> => {
    await delay(100);
    return success([...MOCK_ROLES]);
  },
};
