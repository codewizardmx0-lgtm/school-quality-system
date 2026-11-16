<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== ALL USERS (raw) ===\n";
$users = DB::table('users')->get();
foreach ($users as $u) {
    $ua = (array)$u;
    $cols = array_keys($ua);
    if (!isset($listed)) { echo "Columns: " . implode(', ', $cols) . "\n"; $listed=true; }
    echo implode(' | ', array_map(fn($k,$v) => "$k=$v", $cols, $ua)) . "\n";
}

echo "\n=== ROLES (raw) ===\n";
$roles = DB::table('roles')->get();
foreach ($roles as $r) {
    $ra = (array)$r;
    $cols = array_keys($ra);
    if (!isset($listedr)) { echo "Columns: " . implode(', ', $cols) . "\n"; $listedr=true; }
    echo implode(' | ', array_map(fn($k,$v) => "$k=$v", $cols, $ra)) . "\n";
}

echo "\n=== USER_ROLES (raw) ===\n";
$ur = DB::table('user_roles')->get();
foreach ($ur as $r) {
    print_r((array)$r);
}

echo "\n=== PERMISSIONS (raw) ===\n";
$perms = DB::table('permissions')->get();
foreach ($perms as $p) {
    $pa = (array)$p;
    if (!isset($listedp)) { echo "Columns: " . implode(', ', array_keys($pa)) . "\n"; $listedp=true; }
    echo implode(' | ', array_map(fn($k,$v) => "$k=$v", array_keys($pa), $pa)) . "\n";
}
