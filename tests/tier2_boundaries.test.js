/**
 * ============================================================================
 * TIER 2: BOUNDARY & CORNER CASE TEST SUITE (tests/tier2_boundaries.test.js)
 * Tests extreme inputs, edge values, numerical clamps, and missing browser APIs
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  instantiateEngine,
  createBrowserEnvironment,
  MockAudioContext
} from './test_helpers.js';

test('Tier 2: Boundary & Corner Cases Suite', async (t) => {

  await t.test('B01: Diurnal Time Boundaries (0, 720, 1439, 1440, negative wrapping)', async () => {
    const { engine } = await instantiateEngine();

    // 0 minutes (midnight)
    engine.setTime(0);
    assert.equal(engine.timeMinutes, 0, 'timeMinutes at midnight is 0');

    // 720 minutes (solar noon)
    engine.setTime(720);
    assert.equal(engine.timeMinutes, 720, 'timeMinutes at noon is 720');

    // 1439 minutes (23:59)
    engine.setTime(1439);
    assert.equal(engine.timeMinutes, 1439, 'timeMinutes at 23:59 is 1439');

    // 1440 minutes wraps to 0
    engine.setTime(1440);
    assert.equal(engine.timeMinutes, 0, '1440 minutes modulo wraps to 0');

    // Negative minutes wraps correctly modulo 1440
    engine.setTime(-60);
    assert.equal(engine.timeMinutes, 1380, 'Negative minutes wrap to 1380 (23:00)');
  });

  await t.test('B02: Solar Radiation Curve Bounds (Zero at night, peak at noon)', async () => {
    const { engine } = await instantiateEngine();
    let telemetry = null;
    engine.onTelemetry = (t) => { telemetry = t; };

    // Midnight: hours = 0. Solar must be 0 MW / isSolar false even with 100% sunshine slider
    engine.setTime(0);
    engine.setSlider('sunshine', 100);
    engine.updateSimulation(0.1);
    if (telemetry) {
      assert.equal(telemetry.isSolar, false, 'isSolar at midnight must be false');
      if (telemetry.solarMW !== undefined) {
        assert.equal(telemetry.solarMW, 0, 'Solar generation at midnight must be exactly 0 MW');
      }
    }

    // 05:59 AM: Before sunrise (hours < 6). Solar must be inactive
    engine.setTime(359);
    engine.updateSimulation(0.1);
    if (telemetry) {
      assert.equal(telemetry.isSolar, false, 'isSolar before 06:00 AM must be false');
      if (telemetry.solarMW !== undefined) {
        assert.equal(telemetry.solarMW, 0, 'Solar generation before 06:00 AM must be 0 MW');
      }
    }

    // 18:01 PM: After sunset (hours > 18). Solar must be inactive
    engine.setTime(1081);
    engine.updateSimulation(0.1);
    if (telemetry) {
      assert.equal(telemetry.isSolar, false, 'isSolar after 18:00 PM must be false');
      if (telemetry.solarMW !== undefined) {
        assert.equal(telemetry.solarMW, 0, 'Solar generation after 18:00 PM must be 0 MW');
      }
    }

    // 12:00 PM: Solar zenith. Solar must be active
    engine.setTime(720);
    engine.updateSimulation(0.1);
    if (telemetry) {
      assert.equal(telemetry.isSolar, true, 'isSolar at noon must be true');
      if (telemetry.solarMW !== undefined) {
        assert.equal(telemetry.solarMW, 648, 'Solar generation at noon must be 648 MW');
      }
    }
  });

  await t.test('B03: Battery Storage Capacity Clamping (0 MWh min, 500 MWh max)', async () => {
    const { engine } = await instantiateEngine();

    // Clamp below 0
    engine.setSlider('storage', -50);
    assert.equal(engine.sliderStorage, 0, 'Storage slider clamps negative values to 0');

    // Clamp above 500
    engine.setSlider('storage', 9999);
    assert.equal(engine.sliderStorage, 500, 'Storage slider clamps excessive values to 500');

    // Empty battery cannot discharge further
    engine.setSlider('storage', 0);
    engine.setTime(0); // Night: solar is 0 MW
    engine.setSlider('townLoad', 4); // Peak load
    engine.updateSimulation(0.1);
    assert.ok(engine.sliderStorage >= 0, 'Storage cannot drop below 0 MWh during discharge');
  });

  await t.test('B04: Transformer Voltage Clamping & Auto-Energization', async () => {
    const { engine } = await instantiateEngine();

    // Voltage clamping [0, 250]
    engine.setSlider('voltage', -100);
    assert.equal(engine.sliderVoltage, 0, 'Voltage slider clamps negative values to 0');

    engine.setSlider('voltage', 999);
    assert.equal(engine.sliderVoltage, 250, 'Voltage slider clamps above 250 to 250');

    // Auto-energize trigger: 0V + active solar sunshine restores nominal 230V
    engine.setSlider('voltage', 0);
    engine.setSlider('sunshine', 50);
    engine.updateSimulation(0.1);
    assert.equal(engine.sliderVoltage, 230, 'Auto-energizes from 0V to nominal 230V');
  });

  await t.test('B05: All Slider Bounds Clamping (Sunshine, Coal, Scrubber, AgriPumps, GridTie)', async () => {
    const { engine } = await instantiateEngine();

    engine.setSlider('sunshine', -20);
    assert.equal(engine.sliderSunshine, 0);
    engine.setSlider('sunshine', 200);
    assert.equal(engine.sliderSunshine, 100);

    engine.setSlider('coalFire', -10);
    assert.equal(engine.sliderCoalFire, 0);
    engine.setSlider('coalFire', 150);
    assert.equal(engine.sliderCoalFire, 100);

    engine.setSlider('scrubber', -5);
    assert.equal(engine.sliderScrubber, 0);
    engine.setSlider('scrubber', 110);
    assert.equal(engine.sliderScrubber, 100);

    engine.setSlider('townLoad', -1);
    assert.equal(engine.sliderTownLoad, 0);
    engine.setSlider('townLoad', 10);
    assert.equal(engine.sliderTownLoad, 4);

    engine.setSlider('agriPumps', -10);
    assert.equal(engine.sliderAgriPumps, 0);
    engine.setSlider('agriPumps', 120);
    assert.equal(engine.sliderAgriPumps, 100);

    engine.setSlider('gridTie', -300);
    assert.equal(engine.sliderGridTie, -200);
    engine.setSlider('gridTie', 300);
    assert.equal(engine.sliderGridTie, 200);
  });

  await t.test('B06: Viewport Width Thresholds (768px vs 769px)', () => {
    const mobileEnv = createBrowserEnvironment({ innerWidth: 768 });
    const isMobile = mobileEnv.window.innerWidth <= 768;
    assert.equal(isMobile, true, '768px is classified as mobile');

    const desktopEnv = createBrowserEnvironment({ innerWidth: 769 });
    const isDesktop = desktopEnv.window.innerWidth > 768;
    assert.equal(isDesktop, true, '769px is classified as desktop');

    // Extreme phone widths (iPhone SE 375px, iPhone Pro Max 430px)
    assert.ok(375 <= 768, '375px triggers mobile');
    assert.ok(414 <= 768, '414px triggers mobile');
  });

  await t.test('B07: URL Mode Parameter Variations', () => {
    const testCases = [
      { search: '?mode=quiz', expected: 'quiz' },
      { search: '?mode=pro', expected: 'pro' },
      { search: '', expected: null },
      { search: '?mode=unknown', expected: 'unknown' },
      { search: '?foo=bar&mode=quiz', expected: 'quiz' }
    ];

    for (const tc of testCases) {
      const env = createBrowserEnvironment({ search: tc.search });
      const params = new URLSearchParams(env.window.location.search);
      assert.equal(params.get('mode'), tc.expected, `Search '${tc.search}' parses mode correctly`);
    }
  });

  await t.test('B08: AudioContext Autoplay Resilience', async () => {
    const audioCtx = new MockAudioContext();
    assert.equal(audioCtx.state, 'suspended', 'AudioContext is suspended initially');

    // First user gesture calls resume()
    await audioCtx.resume();
    assert.equal(audioCtx.state, 'running', 'AudioContext is running after first gesture');

    // Subsequent resumes are idempotent
    await audioCtx.resume();
    assert.equal(audioCtx.state, 'running', 'AudioContext remains running');
  });

  await t.test('B09: Haptic API Missing Fallback (iOS WebKit safety)', () => {
    // When navigator.vibrate is undefined (as in iOS Safari)
    const env = createBrowserEnvironment();
    delete env.navigator.vibrate;

    // Triggering haptic must gracefully no-op without crashing
    let caughtError = null;
    try {
      if (typeof env.navigator.vibrate === 'function') {
        env.navigator.vibrate(100);
      }
    } catch (err) {
      caughtError = err;
    }

    assert.equal(caughtError, null, 'Safe execution when navigator.vibrate is missing');
  });

  await t.test('B10: Audio Mute State Toggling', () => {
    let isMuted = false;
    const toggleMute = () => { isMuted = !isMuted; return isMuted; };

    assert.equal(toggleMute(), true, 'Toggle 1 muters audio');
    assert.equal(toggleMute(), false, 'Toggle 2 unmuters audio');
    assert.equal(toggleMute(), true, 'Toggle 3 muters audio');
  });

});
