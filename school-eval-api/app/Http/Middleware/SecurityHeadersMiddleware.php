<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * وسيط ترويسات الأمان (Security Headers Middleware - الشريحة 11).
 *
 * يضيف ترويسات الحماية الأساسية لكافة استجابات الـ API مع الحفاظ على سلامة تنزيل ملفات PDF و Excel.
 * كما يفرض HSTS حصرياً في بيئة الإنتاج وعند الاتصال المشفر عبر HTTPS.
 */
class SecurityHeadersMiddleware
{
    /**
     * معالجة الطلب وإضافة ترويسات الأمان للاستجابة.
     *
     * @param Request $request
     * @param Closure(Request): Response $next
     * @return Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // الترويسات الأساسية الإلزامية لجميع الاستجابات
        $response->headers->set('X-Frame-Options', 'DENY', false);
        $response->headers->set('X-Content-Type-Options', 'nosniff', false);
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin', false);

        // HSTS فقط في بيئة الإنتاج وعند الاتصال المشفر عبر HTTPS
        $isProduction = app()->environment('production') || config('app.env') === 'production';
        if ($isProduction && ($request->isSecure() || $request->header('X-Forwarded-Proto') === 'https')) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
