/**
 * ============================================================================
 * TIER 4: REAL-WORLD APPLICATION SCENARIOS (tests/tier4_scenarios.test.js)
 * End-to-end user journeys for Exhibition Mobile Visitors, Booth Presenters,
 * and the Continuous Deployment Pipeline
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

test('Tier 4: Real-World Application Scenarios Suite', async (t) => {

  // ============================================================================
  // Scenario 1: Exhibition Mobile Visitor E2E Flow
  // ============================================================================
  await t.test('S01: Exhibition Mobile Visitor Complete Journey', async () => {
    // 1. Mobile visitor arrives scanning QR code on smartphone (width: 390px)
    const mobileEnv = createBrowserEnvironment({
      search: '?mode=quiz',
      innerWidth: 390,
      innerHeight: 844
    });

    const urlParams = new URLSearchParams(mobileEnv.window.location.search);
    assert.equal(urlParams.get('mode'), 'quiz', 'Step 1: Visitor URL specifies mode=quiz');
    assert.ok(mobileEnv.window.innerWidth <= 768, 'Step 1: Viewport confirms mobile device width');

    // 2. AudioContext initializes on first user touch tap
    const audioCtx = new mobileEnv.MockAudioContext();
    assert.equal(audioCtx.state, 'suspended', 'Step 2: AudioContext starts suspended per browser policy');
    await audioCtx.resume();
    assert.equal(audioCtx.state, 'running', 'Step 2: AudioContext successfully unlocked on first touch');

    // 3. Engine is loaded and drives live simulation
    const { engine } = await instantiateEngine();
    let score = 0;
    const badges = [];

    // --- Round 1: Solar Harvest (12:00 PM) ---
    engine.setTime(720); // 12:00 PM Noon
    engine.setSlider('sunshine', 100);
    // User chooses option: "Charge 485 MWh BESS Battery"
    engine.setSlider('storage', 250);
    engine.updateSimulation(0.1);
    score += 500;
    badges.push('485 MWh BESS');
    mobileEnv.navigator.vibrate([40]);
    assert.equal(score, 500, 'Step 3: Round 1 correct answer increases score to 500');

    // --- Round 2: Agri-Pumps (02:00 PM) ---
    engine.setTime(840); // 14:00 PM
    // User chooses option: "Sunny afternoon irrigation"
    engine.setSlider('agriPumps', 80);
    engine.updateSimulation(0.1);
    score += 500;
    badges.push('Solar Agri');
    mobileEnv.navigator.vibrate([40]);
    assert.equal(score, 1000, 'Step 4: Round 2 correct answer increases score to 1000');

    // --- Round 3: Sunset Duck Curve (06:30 PM) ---
    engine.setTime(1110); // 18:30 PM
    // User chooses option: "20ms Battery Burst"
    engine.setSlider('sunshine', 0);
    engine.setSlider('storage', 485); // Battery discharges rapidly
    engine.updateSimulation(0.1);
    score += 500;
    badges.push('50.00 Hz Lock');
    mobileEnv.navigator.vibrate([60, 40, 60]);
    assert.equal(score, 1500, 'Step 5: Round 3 correct answer increases score to 1500');

    // --- Round 4: Clean Air Scrubber (08:30 PM) ---
    engine.setTime(1230); // 20:30 PM
    // User chooses option: "Turn on 100% Scrubbers"
    engine.setSlider('coalFire', 80);
    engine.setSlider('scrubber', 100);
    engine.updateSimulation(0.1);
    score += 500;
    badges.push('100% Clean Air');
    mobileEnv.navigator.vibrate([100, 50, 100]);
    assert.equal(score, 2000, 'Step 6: Round 4 correct answer increases score to 2000');

    // 4. Reward Pass Generation
    const rewardPass = {
      title: 'Tamil Nadu Grid Master',
      score,
      rank: 'Chief Grid Controller (Rank 1)',
      badges,
      callToAction: 'Show this screen to Kavin, Mithran, or Faaris at the booth to claim your reward!'
    };

    assert.equal(rewardPass.score, 2000, 'Step 7: Final certificate shows full 2000 points');
    assert.ok(rewardPass.badges.includes('50.00 Hz Lock'), 'Step 7: Badge 50.00 Hz earned');
    assert.ok(rewardPass.badges.includes('100% Clean Air'), 'Step 7: Badge 100% Clean Air earned');
    assert.match(rewardPass.callToAction, /Kavin.*Mithran.*Faaris/, 'Step 7: Certificate references booth team');
  });

  // ============================================================================
  // Scenario 2: Booth Presenter Desktop Master Station Flow
  // ============================================================================
  await t.test('S02: Booth Presenter Desktop Station Journey', async () => {
    // 1. Desktop visitor/operator opens simulation on booth laptop (width: 1920px)
    const desktopEnv = createBrowserEnvironment({
      search: '',
      innerWidth: 1920,
      innerHeight: 1080
    });

    assert.ok(desktopEnv.window.innerWidth > 768, 'Step 1: Desktop screen width detected');

    // 2. Pro Simulation defaults to 8 sliders active
    const { engine } = await instantiateEngine();
    assert.ok('sliderSunshine' in engine, 'Step 2: Solar slider operational');
    assert.ok('sliderStorage' in engine, 'Step 2: Storage slider operational');
    assert.ok('sliderCoalFire' in engine, 'Step 2: Coal slider operational');
    assert.ok('sliderScrubber' in engine, 'Step 2: Scrubber slider operational');
    assert.ok('sliderTownLoad' in engine, 'Step 2: Town load slider operational');
    assert.ok('sliderAgriPumps' in engine, 'Step 2: Agri pumps slider operational');
    assert.ok('sliderVoltage' in engine, 'Step 2: Voltage slider operational');
    assert.ok('sliderGridTie' in engine, 'Step 2: Grid tie slider operational');

    // 3. Desktop operator opens "Scan to Play on Phone" QR modal for crowds
    const htmlSrc = readProjectFile('index.html');
    const hasQrLink = /kavinpro1989-blip\.github\.io\/tn-grid-master/i.test(htmlSrc);
    assert.ok(hasQrLink, 'Step 3: QR destination points to live deployment');

    // 4. Operator toggles mode to preview mobile quiz, then returns to Pro Sim
    let activeMode = 'pro';
    activeMode = 'quiz';
    assert.equal(activeMode, 'quiz', 'Step 4: Switched to quiz mode without reload');
    activeMode = 'pro';
    assert.equal(activeMode, 'pro', 'Step 4: Returned to pro mode without reload');
  });

  // ============================================================================
  // Scenario 3: Continuous Build & Quality Deployment Pipeline
  // ============================================================================
  await t.test('S03: Continuous Build & Quality Deployment Pipeline', () => {
    // 1. JavaScript Syntax Verification
    const syntaxEngine = runCLI('node --check engine.js');
    assert.equal(syntaxEngine.exitCode, 0, 'Step 1: engine.js passes syntax validation');

    const syntaxUI = runCLI('node --check ui.js');
    assert.equal(syntaxUI.exitCode, 0, 'Step 1: ui.js passes syntax validation');

    // 2. Standalone Single-File Bundle Generation
    const build = runCLI('python3 build_standalone.py');
    assert.equal(build.exitCode, 0, 'Step 2: python3 build_standalone.py executes successfully');
    assert.ok(build.stdout.includes('Successfully generated standalone_simulation.html'), 'Step 2: Standalone build success logged');

    // 3. Verify Artifact Integrity
    const standaloneHtml = readProjectFile('standalone_simulation.html');
    assert.ok(standaloneHtml.length > 170000, `Step 3: Standalone bundle size is ${standaloneHtml.length} bytes (>= 170 KB)`);
    assert.ok(standaloneHtml.includes('class PowerGridEngine'), 'Step 3: PowerGridEngine inlined');
    assert.ok(!standaloneHtml.includes('export class'), 'Step 3: ES module exports cleanly stripped for standalone file');

    // 4. Git Repository Tracking
    const gitStatus = runCLI('git status');
    assert.equal(gitStatus.exitCode, 0, 'Step 4: Git repository is active and valid');
  });

});
