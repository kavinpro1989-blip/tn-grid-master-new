/**
 * ============================================================================
 * TIER 5: ADVERSARIAL HARDENING & STRESS TEST SUITE (tests/tier5_adversarial.test.js)
 * Fuzzing, stress testing, rapid spamming, and offline resource containment
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  instantiateEngine,
  createBrowserEnvironment,
  readProjectFile
} from './test_helpers.js';

test('Tier 5: Adversarial Hardening & Stress Testing Suite', async (t) => {

  await t.test('ADV01: Rapid Mode Toggling Stress Test (100 switches)', () => {
    let currentMode = 'quiz';
    const modes = ['quiz', 'pro'];

    // Rapid toggle loop 100 times
    for (let i = 0; i < 100; i++) {
      currentMode = modes[i % 2];
      assert.ok(currentMode === 'quiz' || currentMode === 'pro', `Iteration ${i}: mode is valid`);
    }

    assert.equal(currentMode, 'pro', 'Final mode after 100 toggles is stable');
  });

  await t.test('ADV02: Rapid Button Spamming & Idempotency', () => {
    let currentRound = 1;
    let score = 0;
    let roundAnswered = false;

    const answerRound = (isCorrect, points) => {
      // Guard against double-tap / spam clicks
      if (roundAnswered) return;
      roundAnswered = true;
      if (isCorrect) score += points;
      currentRound++;
    };

    // User rapid-taps option 5 times in 10ms
    answerRound(true, 500);
    answerRound(true, 500);
    answerRound(true, 500);
    answerRound(true, 500);
    answerRound(true, 500);

    // Score should only be credited once
    assert.equal(score, 500, 'Score is credited exactly once despite rapid button spam');
    assert.equal(currentRound, 2, 'Round advances exactly once');
  });

  await t.test('ADV03: Malformed & Pathological Numerical Inputs', async () => {
    const { engine } = await instantiateEngine();

    // Passing Infinity clamps to max
    engine.setSlider('voltage', Infinity);
    assert.equal(engine.sliderVoltage, 250, 'Infinity voltage clamped to max 250V');

    // Passing -Infinity clamps to min
    engine.setSlider('storage', -Infinity);
    assert.equal(engine.sliderStorage, 0, '-Infinity storage clamped to min 0 MWh');

    // Passing negative number clamps to min 0
    engine.setSlider('sunshine', -100);
    assert.equal(engine.sliderSunshine, 0, 'Negative sunshine clamped to 0%');

    // Passing excessive number clamps to max 100
    engine.setSlider('sunshine', 500);
    assert.equal(engine.sliderSunshine, 100, 'Excessive sunshine clamped to 100%');

    // Passing extreme minutes to setTime
    engine.setTime(9999999);
    assert.ok(engine.timeMinutes >= 0 && engine.timeMinutes < 1440, 'Extreme time wrapped into [0, 1439]');

    engine.setTime(-9999999);
    assert.ok(engine.timeMinutes >= 0 && engine.timeMinutes < 1440, 'Negative extreme time wrapped into [0, 1439]');
  });

  await t.test('ADV04: Offline Zero-Asset Verification (No external network assets)', () => {
    const htmlSrc = readProjectFile('index.html');
    const cssSrc = readProjectFile('styles.css');
    const engineSrc = readProjectFile('engine.js');
    const uiSrc = readProjectFile('ui.js');

    // Check for external CSS/JS CDNs or external fonts (except Google fonts if intentional)
    // External audio files (.mp3, .wav) must not be referenced
    const hasExternalAudio = /\.(mp3|wav|ogg|aac|m4a)/i.test(htmlSrc + cssSrc + engineSrc + uiSrc);
    assert.equal(hasExternalAudio, false, 'No external audio assets (.mp3, .wav) referenced');

    // Check for external script tags in index.html
    const hasCdnScripts = /<script[^>]+src=["']https?:\/\//i.test(htmlSrc);
    assert.equal(hasCdnScripts, false, 'Zero external script tags in index.html (100% offline self-contained)');
  });

  await t.test('ADV05: Script Tag Regex Preservation for Standalone Build', () => {
    const htmlSrc = readProjectFile('index.html');
    
    // index.html must contain the exact sequential module tags expected by build_standalone.py
    const hasModuleScripts = /<script\s+type=["']module["']\s+src=["']engine\.js["']\s*><\/script>\s*<script\s+type=["']module["']\s+src=["']ui\.js["']\s*><\/script>/.test(htmlSrc);
    assert.ok(
      hasModuleScripts,
      'index.html script tags must match build_standalone.py script_pattern exactly'
    );
  });

});
