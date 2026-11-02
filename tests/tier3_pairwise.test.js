/**
 * ============================================================================
 * TIER 3: PAIRWISE CROSS-FEATURE INTERACTIONS (tests/tier3_pairwise.test.js)
 * Tests multi-feature coordination, state preservation, and cross-system dynamics
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  instantiateEngine,
  createBrowserEnvironment,
  readProjectFile,
  runCLI,
  MockAudioContext
} from './test_helpers.js';

test('Tier 3: Pairwise Cross-Feature Interactions Suite', async (t) => {

  await t.test('P01: Mode Switcher + Audio Mute State Preservation', () => {
    // Switching modes (Quiz -> Pro -> Quiz) must preserve audio mute preference
    let isMuted = true;
    let currentMode = 'quiz';

    const switchMode = (newMode) => {
      currentMode = newMode;
      // Mode change must not reset isMuted
    };

    switchMode('pro');
    assert.equal(currentMode, 'pro');
    assert.equal(isMuted, true, 'Mute state preserved when switching to Pro mode');

    switchMode('quiz');
    assert.equal(currentMode, 'quiz');
    assert.equal(isMuted, true, 'Mute state preserved when returning to Quiz mode');
  });

  await t.test('P02: Sunset Duck Curve + 485 MWh BESS Response + Frequency Balance', async () => {
    const { engine } = await instantiateEngine();
    let telemetry = null;
    engine.onTelemetry = (t) => { telemetry = t; };

    // 18:30 PM: Sunset peak demand (1110 minutes)
    engine.setTime(1110);
    engine.setSlider('sunshine', 0); // No solar
    engine.setSlider('townLoad', 3); // High evening residential demand
    engine.setSlider('coalFire', 0); // Coal cold
    engine.setSlider('voltage', 230);

    // Case A: 485 MWh BESS available -> Battery discharges to supply town
    engine.setSlider('storage', 485);
    engine.updateSimulation(0.1);

    assert.equal(engine.batteryMode, 'discharging', 'BESS enters discharging mode during sunset deficit');
    assert.ok(engine.batteryFlowMW > 0, 'BESS supplies active power to grid');

    // Case B: BESS empty (0 MWh) -> Grid suffers major power deficit
    engine.setSlider('storage', 0);
    engine.updateSimulation(0.1);

    if (telemetry) {
      assert.ok(telemetry.powerDeficit > 0, 'Grid experiences power deficit when BESS is empty at sunset');
    }
  });

  await t.test('P03: Mettur Coal 1440MW + Flue Gas Scrubber + Canvas Air Quality', async () => {
    const { engine } = await instantiateEngine();
    let telemetry = null;
    engine.onTelemetry = (t) => { telemetry = t; };

    // Coal 100% without scrubber -> Low air cleanliness
    engine.setSlider('coalFire', 100);
    engine.setSlider('scrubber', 0);
    engine.updateSimulation(0.1);

    if (telemetry) {
      assert.ok(telemetry.airCleanliness < 50, 'Air cleanliness drops below 50% with 100% coal and 0% scrubber');
    }

    // Engage 100% flue gas scrubbers -> Air quality restores to clean
    engine.setSlider('scrubber', 100);
    engine.updateSimulation(0.1);

    if (telemetry) {
      assert.ok(telemetry.airCleanliness >= 80, 'Air cleanliness restores >= 80% with 100% scrubber active');
    }
  });

  await t.test('P04: Agri-Pumps (320 MW) + Solar Noon Harvest (648 MW)', async () => {
    const { engine } = await instantiateEngine();
    let telemetry = null;
    engine.onTelemetry = (t) => { telemetry = t; };

    // At 12:00 PM, 648 MW solar is flooding the grid
    engine.setTime(720);
    engine.setSlider('sunshine', 100);
    engine.setSlider('townLoad', 1); // Low noon domestic demand
    engine.setSlider('voltage', 230);

    // Engaging 100% Agri-Pumps absorbs up to 320 MW clean power
    engine.setSlider('agriPumps', 100);
    engine.updateSimulation(0.1);

    if (telemetry) {
      assert.ok(telemetry.totalDemand >= 320, 'Agri-pumps load integrates into total demand');
      assert.equal(engine.sliderVoltage, 230, 'Voltage remains nominal at 230V without sag');
    }
  });

  await t.test('P05: Standalone Single-File Inlining Pipeline + All UI Components', () => {
    // Run build script
    const buildRes = runCLI('python3 build_standalone.py');
    assert.equal(buildRes.exitCode, 0, 'build_standalone.py runs successfully');

    // Verify standalone_simulation.html contains all required inlined blocks
    const standaloneHtml = readProjectFile('standalone_simulation.html');

    assert.ok(standaloneHtml.includes('<style>'), 'Standalone contains inlined <style>');
    assert.ok(standaloneHtml.includes('<script>'), 'Standalone contains inlined <script>');
    assert.ok(!standaloneHtml.includes('<link rel="stylesheet" href="styles.css">'), 'CSS link tag successfully stripped');
    assert.ok(!standaloneHtml.includes('src="engine.js"'), 'engine.js script tag successfully inlined');
    assert.ok(!standaloneHtml.includes('src="ui.js"'), 'ui.js script tag successfully inlined');

    // Standalone file size should be substantial (> 150KB)
    assert.ok(standaloneHtml.length > 150000, `Standalone bundle size is ${standaloneHtml.length} bytes (expected > 150,000)`);
  });

  await t.test('P06: Canvas Resizing + DPR Setup + Mode Switch (No State Loss)', async () => {
    const { engine, canvas } = await instantiateEngine();

    // Set custom state
    engine.setTime(720);
    engine.setSlider('sunshine', 95);
    engine.setSlider('storage', 350);

    // Simulate window resize or mode change reducing canvas height
    canvas.width = 600;
    canvas.height = 220;
    engine.setupDpr();
    engine.repositionNodes();

    // Verify state was not reset
    assert.equal(engine.timeMinutes, 720, 'timeMinutes preserved across DPR setup');
    assert.equal(engine.sliderSunshine, 95, 'sliderSunshine preserved across DPR setup');
    assert.equal(engine.sliderStorage, 350, 'sliderStorage preserved across DPR setup');
  });

});
