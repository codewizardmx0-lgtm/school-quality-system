<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Target Score for Improvement Suggestions
    |--------------------------------------------------------------------------
    |
    | The default target score used to determine improvement suggestions.
    | Indicators scored below this target are flagged as improvement areas.
    |
    */
    'target_score' => (int) env('EVALUATION_TARGET_SCORE', 3),
];
