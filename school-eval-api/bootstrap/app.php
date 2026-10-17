<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'permission'      => \App\Http\Middleware\CheckPermission::class,
            'role'            => \App\Http\Middleware\CheckRole::class,
            'session.timeout' => \App\Http\Middleware\EnforceSessionTimeout::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // تخصيص استجابة 401 عند فشل مصادقة Sanctum أو الرمز المفقود
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return \App\Http\Responses\ApiResponse::unauthorized('يجب تسجيل الدخول للمتابعة.');
            }
        });

        // تخصيص استجابة 403 عند فشل التحقق من السياسة (Authorization)
        $exceptions->render(function (\Illuminate\Auth\Access\AuthorizationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return \App\Http\Responses\ApiResponse::forbidden('غير مصرح');
            }
        });

        // تخصيص استجابة 404
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return \App\Http\Responses\ApiResponse::notFound('العنصر المطلوب غير موجود.');
            }
        });
    })->create();
