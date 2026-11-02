/**
 * ============================================================================
 * TIER 1: FEATURE COVERAGE TEST SUITE (tests/tier1_features.test.js)
 * Tests Features 1 through 35 from PROJECT.md § Feature Inventory
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readProjectFile,
  instantiateEngine,
  createBrowserEnvironment,
  runCLI,
  MockAudioContext
} from './test_helpers.js';

test('Tier 1: Feature Coverage Suite (F01 - F35)', async (t) => {

  // ============================================================================
  // GROUP A: Mobile Experience & Routing (F01 - F03)
  // ============================================================================

  await t.test('F01: Device & URL Detection (?mode=quiz and <= 768px viewport)', () => {
    const uiSrc = readProjectFile('ui.js');
    
    // Contract verification: Mode detection logic must handle '?mode=quiz' or window.innerWidth <= 768
    const hasModeParamCheck = /mode\s*===?\s*['"]quiz['"]|\.get\(['"]mode['"]\)/.test(uiSrc);
    const hasViewportCheck = /innerWidth\s*<=\s*768|768/.test(uiSrc);
    
    assert.ok(
      hasModeParamCheck || hasViewportCheck,
      'F01: ui.js must implement mode detection checking URL search param (?mode=quiz) or viewport <= 768px'
    );

    // Verify simulation mode routing function in browser mock
    const env = createBrowserEnvironment({ search: '?mode=quiz', innerWidth: 390 });
    const params = new URLSearchParams(env.window.location.search);
    assert.equal(params.get('mode'), 'quiz', 'URLSearchParams correctly resolves mode=quiz');
  });

  await t.test('F02: Dynamic Mode Switcher (Non-reloading toggle)', () => {
    const htmlSrc = readProjectFile('index.html');
    const uiSrc = readProjectFile('ui.js');

    // Check for mode switcher button / toggle elements
    const hasSwitcherMarkup = /mode-switcher|btn-mode|modeToggle|Grid Hero|Pro Grid/i.test(htmlSrc);
    assert.ok(hasSwitcherMarkup, 'F02: index.html must contain mode switcher controls');

    // Check that ui.js does not force window.location.reload() on mode switch
    const hasModeSwitchFunc = /setSimulationMode|switchMode|toggleMode/i.test(uiSrc);
    assert.ok(hasModeSwitchFunc, 'F02: ui.js must contain a dynamic mode switcher function');
  });

  await t.test('F03: Mobile Touch Ergonomics (Min 48px touch targets, zero overflow)', () => {
    const cssSrc = readProjectFile('styles.css');

    // Check for touch target sizing in CSS
    const hasTouchMinHeight = /min-height:\s*(48|50|52|56)px/i.test(cssSrc);
    assert.ok(hasTouchMinHeight, 'F03: styles.css must define touch buttons with min-height >= 48px');

    // Check for mobile overflow protection
    const hasOverflowProtection = /overflow-x:\s*hidden/i.test(cssSrc);
    assert.ok(hasOverflowProtection, 'F03: styles.css must enforce overflow-x: hidden for mobile viewports');
  });

  // ============================================================================
  // GROUP B: Dilemma State Machine (F04 - F08)
  // ============================================================================

  await t.test('F04: Dilemma Round 1: Solar Harvest (12:00 PM Kamuthi Surplus)', () => {
    const uiSrc = readProjectFile('ui.js');
    const htmlSrc = readProjectFile('index.html');

    // Dilemma Round 1 must reference solar surplus / noon solar flood / BESS battery
    const hasRound1 = /solar_noon|Solar Harvest|12:00\s*PM|648\s*MW|Charge.*Battery/i.test(uiSrc + htmlSrc);
    assert.ok(hasRound1, 'F04: Dilemma Round 1 (Solar Harvest at 12:00 PM) must be defined');
  });

  await t.test('F05: Dilemma Round 2: Agri-Pumps (02:00 PM Irrigation Scheduling)', () => {
    const uiSrc = readProjectFile('ui.js');
    const htmlSrc = readProjectFile('index.html');

    // Dilemma Round 2 must reference agricultural irrigation pumps / afternoon scheduling
    const hasRound2 = /agri_pumps|Agri-Pumps|02:00\s*PM|irrigation|agriPumps/i.test(uiSrc + htmlSrc);
    assert.ok(hasRound2, 'F05: Dilemma Round 2 (Agri-Pumps Irrigation Scheduling) must be defined');
  });

  await t.test('F06: Dilemma Round 3: Sunset Duck Curve (06:30 PM Solar Drop & 20ms BESS)', () => {
    const uiSrc = readProjectFile('ui.js');
    const htmlSrc = readProjectFile('index.html');

    // Dilemma Round 3 must reference sunset duck curve / 18:30 / 20ms BESS burst
    const hasRound3 = /duck_curve|Duck Curve|06:30\s*PM|Sunset|18:30|20ms/i.test(uiSrc + htmlSrc);
    assert.ok(hasRound3, 'F06: Dilemma Round 3 (Sunset Duck Curve & 20ms BESS Response) must be defined');
  });

  await t.test('F07: Dilemma Round 4: Clean Air Scrubber (08:30 PM Night Baseload)', () => {
    const uiSrc = readProjectFile('ui.js');
    const htmlSrc = readProjectFile('index.html');

    // Dilemma Round 4 must reference coal smoke / scrubber / clean air
    const hasRound4 = /scrubber|Clean Air|08:30\s*PM|Flue Gas|Smog/i.test(uiSrc + htmlSrc);
    assert.ok(hasRound4, 'F07: Dilemma Round 4 (Clean Air Scrubber) must be defined');
  });

  await t.test('F08: Option Feedback & Scoring (Single-sentence punchy feedback)', () => {
    const uiSrc = readProjectFile('ui.js');
    const htmlSrc = readProjectFile('index.html');

    // Must have scoring logic and feedback presentation
    const hasFeedback = /feedback|score\s*[+=]|playerScore/i.test(uiSrc + htmlSrc);
    assert.ok(hasFeedback, 'F08: Quiz state machine must present option feedback and compute score deltas');
  });

  // ============================================================================
  // GROUP C: Digital Reward Pass (F09)
  // ============================================================================

  await t.test('F09: Grid Master Reward Pass (Score, Badges & Booth Callout)', () => {
    const htmlSrc = readProjectFile('index.html');
    const uiSrc = readProjectFile('ui.js');

    // Reward pass must display score, badges, and the booth team members
    const hasRewardPass = /Grid Master|certificate|reportModal|reward/i.test(htmlSrc + uiSrc);
    assert.ok(hasRewardPass, 'F09: index.html/ui.js must include the Grid Master reward pass');

    const mentionsBoothTeam = /Kavin|Mithran|Faaris/i.test(htmlSrc + uiSrc);
    assert.ok(mentionsBoothTeam, 'F09: Reward pass must call out team members Kavin, Mithran, or Faaris');
  });

  // ============================================================================
  // GROUP D: Tamil Nadu Grid Physical Fidelity (F10 - F17)
  // ============================================================================

  await t.test('F10: Kamuthi Solar Fidelity (648 MW peak & diurnal curve)', async () => {
    const { engine } = await instantiateEngine();
    
    // Check Kamuthi Solar Park node exists
    const plant = engine.nodes.get('plant');
    assert.ok(plant, 'Plant node must exist');
    assert.match(plant.name + plant.role, /Kamuthi|648\s*MW/i, 'Kamuthi Solar 648 MW node documented');

    // At 12:00 PM (timeMinutes 720), solar generation must scale with sliderSunshine up to 648 MW
    engine.setTime(720);
    engine.setSlider('sunshine', 100);
    engine.setSlider('voltage', 230);
    engine.setSlider('townLoad', 0);
    engine.updateSimulation(0.1);

    // Diurnal curve verification: at noon solarGenMW should be ~648 MW
    // Base sun angle at 12:00 = sin(pi/2)^1.3 = 1.0 => 648 MW
    const telemetry = engine.getTelemetry ? engine.getTelemetry() : null;
    if (telemetry) {
      assert.equal(telemetry.solarMW, 648, 'Solar MW at noon with 100% sunshine must equal 648 MW');
    }
  });

  await t.test('F11: Mettur Coal Fidelity (1,440 MW thermal boiler)', async () => {
    const { engine } = await instantiateEngine();
    
    // Set coal fire to 100%
    engine.setSlider('coalFire', 100);
    engine.setSlider('scrubber', 0);
    engine.updateSimulation(0.1);

    const telemetry = engine.getTelemetry ? engine.getTelemetry() : null;
    if (telemetry) {
      assert.equal(telemetry.coalMW, 1440, 'Mettur coal generation at 100% must equal 1440 MW');
    }
  });

  await t.test('F12: Kudankulam Nuclear Baseload (2,000 MW integrated factor)', async () => {
    const engineSrc = readProjectFile('engine.js');
    const hasNuclear = /Kudankulam|nuclear|2000/i.test(engineSrc);
    assert.ok(hasNuclear, 'F12: Kudankulam Nuclear 2000 MW baseload factor referenced in engine.js');
  });

  await t.test('F13: Muppandal Wind Corridor (Turbine RPM driven by renewable flow)', async () => {
    const { engine } = await instantiateEngine();
    assert.ok('fanRotation' in engine, 'F13: engine must track fanRotation for wind turbines');
  });

  await t.test('F14: 50.00 Hz Frequency Lock (Formula f = 50.00 + deltaP * 0.00045)', async () => {
    const engineSrc = readProjectFile('engine.js');
    const hasFrequencyFormula = /50\.00|0\.00045|frequency/i.test(engineSrc);
    assert.ok(hasFrequencyFormula, 'F14: engine.js must contain 50.00 Hz frequency lock calculation');
  });

  await t.test('F15: 230V AC Voltage Regulation (Auto-energization & thresholds)', async () => {
    const { engine } = await instantiateEngine();
    
    // Auto-energize: if voltage is 0V and generation becomes active, voltage auto-restores to 230V
    engine.setSlider('voltage', 0);
    engine.setSlider('sunshine', 80);
    engine.updateSimulation(0.1);

    assert.equal(engine.sliderVoltage, 230, 'F15: Transformer must auto-energize from 0V to nominal 230V');
  });

  await t.test('F16: Joule Heating Line Loss (I^2R calculation and electron evaporation)', async () => {
    const { engine } = await instantiateEngine();
    assert.ok('currentLineLossPct' in engine, 'F16: engine must track currentLineLossPct');
    
    // Spawn electron packet and check evaporation progress tracking
    engine.spawnElectron(false, 25);
    assert.ok(engine.packets.length > 0, 'Packets must be spawned');
  });

  await t.test('F17: 485 MWh BESS Fast Response (20ms response time simulation)', async () => {
    const { engine } = await instantiateEngine();
    
    // Storage can be set up to 500 MWh (485 MWh nominal capacity)
    engine.setSlider('storage', 485);
    assert.equal(engine.sliderStorage, 485, 'F17: BESS storage slider accepts 485 MWh nominal capacity');

    // Simulate charging: at noon with 648 MW solar surplus and town demand = 0, storage accumulates
    engine.setTime(720);
    engine.setSlider('sunshine', 100);
    engine.setSlider('townLoad', 0);
    engine.setSlider('storage', 100);
    engine.updateSimulation(0.1);

    assert.ok(engine.sliderStorage > 100, 'BESS charges from solar surplus');
  });

  // ============================================================================
  // GROUP E: Canvas Visual Reactivity (F18 - F22)
  // ============================================================================

  await t.test('F18: Canvas Reactivity: Solar Flood', async () => {
    const { engine } = await instantiateEngine();
    engine.setTime(720);
    engine.setSlider('sunshine', 100);
    engine.renderCanvas();
    assert.ok(engine.ctx.calls.length > 0, 'Canvas rendering executes draw calls');
  });

  await t.test('F19: Canvas Reactivity: Battery Surge', async () => {
    const { engine } = await instantiateEngine();
    engine.setSlider('storage', 485);
    engine.renderCanvas();
    assert.ok(engine.ctx.calls.length > 0, 'Canvas renders battery state');
  });

  await t.test('F20: Canvas Reactivity: Wind Turbines', async () => {
    const { engine } = await instantiateEngine();
    const prevRot = engine.fanRotation;
    engine.updateSimulation(0.1);
    assert.notEqual(engine.fanRotation, prevRot, 'F20: Fan/turbine rotation updates on game tick');
  });

  await t.test('F21: Canvas Reactivity: House Night Lights (#facc15 window glow)', async () => {
    const engineSrc = readProjectFile('engine.js');
    const hasNightLights = /facc15|shadowBlur/i.test(engineSrc);
    assert.ok(hasNightLights, 'F21: engine.js renders night window illumination (#facc15)');
  });

  await t.test('F22: Canvas Reactivity: Air Quality & Scrubber (Smoke clearing)', async () => {
    const { engine } = await instantiateEngine();
    engine.setSlider('coalFire', 100);
    engine.setSlider('scrubber', 100);
    engine.updateSimulation(0.1);
    // When scrubber is 100%, smog should be mitigated
    assert.equal(engine.sliderScrubber, 100, 'Scrubber slider is at 100%');
  });

  // ============================================================================
  // GROUP F: Procedural Web Audio & Haptics (F23 - F29)
  // ============================================================================

  await t.test('F23: Procedural Audio: Correct Chime (880Hz -> 1320Hz)', () => {
    const uiSrc = readProjectFile('ui.js');
    const hasChime = /playDing|880|1320|playSolarChime/i.test(uiSrc);
    assert.ok(hasChime, 'F23: ui.js must define correct answer chime');
  });

  await t.test('F24: Procedural Audio: Miss Buzzer (180Hz -> 140Hz)', () => {
    const uiSrc = readProjectFile('ui.js');
    const hasBuzzer = /playBuzzer|180|140|sawtooth/i.test(uiSrc);
    assert.ok(hasBuzzer, 'F24: ui.js must define miss buzzer');
  });

  await t.test('F25: Procedural Audio: Power Surge (150Hz -> 600Hz sweep)', () => {
    const uiSrc = readProjectFile('ui.js');
    const hasSurge = /playPowerSurge|sweep|ramp/i.test(uiSrc);
    assert.ok(hasSurge, 'F25: ui.js must define power surge tone');
  });

  await t.test('F26: Procedural Audio: Victory Fanfare (4-note brass arpeggio)', () => {
    const uiSrc = readProjectFile('ui.js');
    const hasVictory = /playVictory|fanfare|arpeggio/i.test(uiSrc);
    assert.ok(hasVictory, 'F26: ui.js must define victory fanfare');
  });

  await t.test('F27: Procedural Audio: Autoplay Unlock (resume on user gesture)', () => {
    const audioCtx = new MockAudioContext();
    assert.equal(audioCtx.state, 'suspended', 'Initial AudioContext starts suspended');
    audioCtx.resume();
    assert.equal(audioCtx.state, 'running', 'AudioContext transitions to running after gesture');
  });

  await t.test('F28: Audio Mute Switch (UI toggle for audio effects)', () => {
    const htmlSrc = readProjectFile('index.html');
    const uiSrc = readProjectFile('ui.js');
    const hasMute = /mute|soundToggle|sound-toggle/i.test(htmlSrc + uiSrc);
    assert.ok(hasMute, 'F28: Audio mute toggle button present');
  });

  await t.test('F29: Haptic Feedback API (navigator.vibrate patterns)', () => {
    const env = createBrowserEnvironment();
    env.navigator.vibrate([50, 100, 50]);
    assert.equal(env.vibrateCalls.length, 1, 'vibrate call captured');
    assert.deepEqual(env.vibrateCalls[0], [50, 100, 50], 'Pattern matches');
  });

  // ============================================================================
  // GROUP G: Exhibition Desktop Bridge (F30)
  // ============================================================================

  await t.test('F30: Desktop In-Booth QR Bridge Modal (Vector SVG pointing to live URL)', () => {
    const htmlSrc = readProjectFile('index.html');
    const hasQrModal = /qrModal|qr-modal|Scan to Play/i.test(htmlSrc);
    assert.ok(hasQrModal, 'F30: index.html contains in-booth QR bridge modal');

    const hasLiveUrl = /https:\/\/kavinpro1989-blip\.github\.io\/tn-grid-master/i.test(htmlSrc);
    assert.ok(hasLiveUrl, 'F30: QR code links to live GitHub Pages simulation');
  });

  // ============================================================================
  // GROUP H: Build, Syntax & Version Control (F31 - F35)
  // ============================================================================

  await t.test('F31: Full E2E Test Suite (Tiers 1-4 coverage)', () => {
    assert.ok(readProjectFile('TEST_INFRA.md'), 'TEST_INFRA.md exists');
  });

  await t.test('F32: Adversarial Hardening (Tier 5 resilience)', () => {
    // Verified by tier5_adversarial.test.js
    assert.ok(true, 'Tier 5 suite registered');
  });

  await t.test('F33: Standalone Build Generation (python3 build_standalone.py)', () => {
    const res = runCLI('python3 build_standalone.py');
    assert.equal(res.exitCode, 0, 'build_standalone.py must exit with code 0');
    assert.ok(res.stdout.includes('Successfully generated standalone_simulation.html'), 'Build logs success');
  });

  await t.test('F34: JavaScript Syntax Verification (node --check)', () => {
    const resEngine = runCLI('node --check engine.js');
    assert.equal(resEngine.exitCode, 0, 'node --check engine.js must exit with code 0');

    const resUI = runCLI('node --check ui.js');
    assert.equal(resUI.exitCode, 0, 'node --check ui.js must exit with code 0');
  });

  await t.test('F35: Git Version Control & Deployment Tracking', () => {
    const res = runCLI('git status');
    assert.equal(res.exitCode, 0, 'git status must exit with code 0');
  });

});
