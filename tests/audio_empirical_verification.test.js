/**
 * ============================================================================
 * EMPIRICAL AUDIO & HAPTICS CHALLENGER SUITE
 * tests/audio_empirical_verification.test.js
 * Deep empirical verification of Web Audio acoustic waveform parameters,
 * AudioContext lifecycle state transitions, haptic fallbacks, and stress limits.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBrowserEnvironment,
  MockCanvas,
  MockAudioContext,
  MockOscillatorNode,
  MockGainNode,
  MockBiquadFilterNode,
  MockAudioParam
} from './test_helpers.js';

// Setup full browser mock before importing ui.js
const env = createBrowserEnvironment();
const canvas = new MockCanvas(1100, 480);
canvas.addEventListener = () => {};
env.elementsById.set('gameCanvas', canvas);
globalThis.window = env.window;
globalThis.document = env.document;
Object.defineProperty(globalThis, 'navigator', { value: env.navigator, configurable: true, writable: true });
globalThis.sessionStorage = env.sessionStorage;
globalThis.AudioContext = env.MockAudioContext;
globalThis.webkitAudioContext = env.MockAudioContext;
globalThis.requestAnimationFrame = () => {};

// Dynamically import ui.js to get live classes and instances
await import('../ui.js');

const ProceduralAudioEngine = globalThis.window.ProceduralAudioEngine;
const SoundFX = globalThis.window.SoundFX;
const sfx = globalThis.window.sfx;
const triggerHaptic = globalThis.window.triggerHaptic;

test('EMPIRICAL VERIFICATION: Web Audio & Haptics Challenger Suite', async (t) => {

  // --------------------------------------------------------------------------
  // SECTION 1: Class and Instance Integrity
  // --------------------------------------------------------------------------
  await t.test('1.1 Class and Instance Exposure', () => {
    assert.equal(typeof ProceduralAudioEngine, 'function', 'ProceduralAudioEngine class is exported to window');
    assert.equal(typeof SoundFX, 'function', 'SoundFX class is exported to window');
    assert.ok(SoundFX.prototype instanceof ProceduralAudioEngine, 'SoundFX inherits from ProceduralAudioEngine');
    assert.ok(sfx instanceof ProceduralAudioEngine, 'sfx is an instance of ProceduralAudioEngine');
    assert.equal(typeof triggerHaptic, 'function', 'triggerHaptic is exported to window');
  });

  // --------------------------------------------------------------------------
  // SECTION 2: AudioContext Lifecycle & Autoplay Policy
  // --------------------------------------------------------------------------
  await t.test('2.1 AudioContext Lazy Initialization', () => {
    const engine = new ProceduralAudioEngine();
    assert.equal(engine.ctx, null, 'AudioContext starts null to satisfy autoplay restrictions before user gesture');
    assert.equal(engine.masterGain, null, 'Master gain node starts null before initialization');
    assert.equal(engine.muted, false, 'Default muted state is false');
  });

  await t.test('2.2 AudioContext State Transition: Suspended to Running on init()', async () => {
    const engine = new ProceduralAudioEngine();
    assert.equal(engine.ctx, null);

    engine.init();
    assert.ok(engine.ctx instanceof MockAudioContext, 'engine.ctx initialized');
    assert.equal(engine.ctx.state, 'running', 'AudioContext transitions to running after init()');
    assert.equal(engine.ctx.resumeCallCount, 1, 'AudioContext.resume() was invoked');
    assert.ok(engine.masterGain, 'Master gain node created');
    assert.equal(engine.masterGain.gain.value, 0.3, 'Initial master gain is 0.3 (unmuted)');
  });

  await t.test('2.3 Autoplay Unlock Event Wiring', () => {
    assert.ok(typeof sfx.init === 'function', 'sfx.init is callable');
  });

  // --------------------------------------------------------------------------
  // SECTION 3: Master Gain & Mute State Control
  // --------------------------------------------------------------------------
  await t.test('3.1 Mute State Toggle and Gain Transitions (0.3 vs 0)', () => {
    const engine = new ProceduralAudioEngine();
    engine.init();

    assert.equal(engine.muted, false, 'Starts unmuted');
    assert.equal(engine.masterGain.gain.value, 0.3, 'Unmuted gain is 0.3');

    // Toggle to MUTE
    const res1 = engine.toggleMute();
    assert.equal(res1, true, 'toggleMute returns true when muted');
    assert.equal(engine.muted, true, 'engine.muted is true');
    assert.equal(engine.masterGain.gain.value, 0, 'Master gain ramped to 0 on mute');

    // Toggle to UNMUTE
    const res2 = engine.toggleMute();
    assert.equal(res2, false, 'toggleMute returns false when unmuted');
    assert.equal(engine.muted, false, 'engine.muted is false');
    assert.equal(engine.masterGain.gain.value, 0.3, 'Master gain restored to 0.3 on unmute');

    // Toggle alias
    const res3 = engine.toggle();
    assert.equal(res3, true, 'toggle() aliases toggleMute()');
    assert.equal(engine.muted, true);
    assert.equal(engine.masterGain.gain.value, 0);

    engine.toggle(); // restore unmuted
  });

  await t.test('3.2 UI Synchronization on Mute Toggle', () => {
    const iconEl = env.document.getElementById('audioIcon');
    const labelEl = env.document.getElementById('audioLabel');

    const engine = new ProceduralAudioEngine();
    engine.init();

    engine.muted = false;
    engine.updateUI();
    assert.equal(iconEl.textContent, '🔊', 'Icon shows sound on when unmuted');
    assert.equal(labelEl.textContent, 'Sound ON', 'Label shows Sound ON when unmuted');

    engine.toggleMute();
    assert.equal(iconEl.textContent, '🔇', 'Icon shows muted when muted');
    assert.equal(labelEl.textContent, 'Muted', 'Label shows Muted when muted');

    engine.toggleMute(); // reset
  });

  // --------------------------------------------------------------------------
  // SECTION 4: Acoustic Waveform Parameters — playDing (Correct Chime)
  // --------------------------------------------------------------------------
  await t.test('4.1 playDing Waveform Parameters (880Hz -> 1320Hz Double Sine)', () => {
    const engine = new ProceduralAudioEngine();
    engine.init();
    engine.ctx.createdNodes = [];
    engine.ctx.activeOscillators = [];

    engine.playDing();

    const oscNodes = engine.ctx.createdNodes.filter(n => n instanceof MockOscillatorNode);
    const gainNodes = engine.ctx.createdNodes.filter(n => n instanceof MockGainNode);

    assert.equal(oscNodes.length, 2, 'playDing must create exactly 2 oscillator nodes');
    assert.equal(gainNodes.length, 2, 'playDing must create exactly 2 gain envelope nodes');

    // Osc 1: 880 Hz sine chime
    const osc1 = oscNodes[0];
    assert.equal(osc1.type, 'sine', 'Osc 1 waveform is sine');
    const osc1FreqEvents = osc1.frequency.events;
    assert.ok(osc1FreqEvents.some(e => e.val === 880), 'Osc 1 frequency set to 880Hz');
    assert.equal(osc1.started, true, 'Osc 1 was started');
    assert.equal(osc1.stopped, true, 'Osc 1 was stopped');
    assert.equal(osc1.stopTime, 0.35, 'Osc 1 stop time is now + 0.35s');

    // Gain 1: 0.25 decaying exponentially to 0.001
    const gain1 = gainNodes[0];
    const gain1Events = gain1.gain.events;
    assert.ok(gain1Events.some(e => e.type === 'setValueAtTime' && e.val === 0.25), 'Gain 1 initial value 0.25');
    assert.ok(gain1Events.some(e => e.type === 'exponentialRampToValueAtTime' && e.val === 0.001 && e.time === 0.35), 'Gain 1 decays to 0.001 at 0.35s');

    // Osc 2: 1320 Hz sine chime offset by 0.08s
    const osc2 = oscNodes[1];
    assert.equal(osc2.type, 'sine', 'Osc 2 waveform is sine');
    const osc2FreqEvents = osc2.frequency.events;
    assert.ok(osc2FreqEvents.some(e => e.val === 1320 && Math.abs(e.time - 0.08) < 1e-4), 'Osc 2 frequency set to 1320Hz at now + 0.08s');
    assert.equal(osc2.started, true, 'Osc 2 was started');
    assert.equal(osc2.stopped, true, 'Osc 2 was stopped');
    assert.equal(osc2.stopTime, 0.5, 'Osc 2 stop time is now + 0.5s');

    // Gain 2: starts 0, triggers 0.28 at 0.08s, decays to 0.001 at 0.5s
    const gain2 = gainNodes[1];
    const gain2Events = gain2.gain.events;
    assert.ok(gain2Events.some(e => e.val === 0.28 && Math.abs(e.time - 0.08) < 1e-4), 'Gain 2 jumps to 0.28 at 0.08s');
    assert.ok(gain2Events.some(e => e.type === 'exponentialRampToValueAtTime' && e.val === 0.001 && e.time === 0.5), 'Gain 2 decays to 0.001 at 0.5s');

    // Routing
    assert.ok(gain1.connections.includes(engine.masterGain), 'Gain 1 connects to masterGain');
    assert.ok(gain2.connections.includes(engine.masterGain), 'Gain 2 connects to masterGain');
  });

  // --------------------------------------------------------------------------
  // SECTION 5: Acoustic Waveform Parameters — playBuzzer (Miss Buzzer)
  // --------------------------------------------------------------------------
  await t.test('5.1 playBuzzer Waveform Parameters (180Hz -> 140Hz Low-pass Sawtooth)', () => {
    const engine = new ProceduralAudioEngine();
    engine.init();
    engine.ctx.createdNodes = [];
    engine.ctx.activeOscillators = [];

    engine.playBuzzer();

    const oscNodes = engine.ctx.createdNodes.filter(n => n instanceof MockOscillatorNode);
    const filterNodes = engine.ctx.createdNodes.filter(n => n instanceof MockBiquadFilterNode);
    const gainNodes = engine.ctx.createdNodes.filter(n => n instanceof MockGainNode);

    assert.equal(oscNodes.length, 1, 'playBuzzer creates 1 oscillator');
    assert.equal(filterNodes.length, 1, 'playBuzzer creates 1 biquad filter');
    assert.equal(gainNodes.length, 1, 'playBuzzer creates 1 gain envelope');

    const osc = oscNodes[0];
    assert.equal(osc.type, 'sawtooth', 'Oscillator waveform is sawtooth');
    const freqEvents = osc.frequency.events;
    assert.ok(freqEvents.some(e => e.type === 'setValueAtTime' && e.val === 180), 'Initial frequency is 180Hz');
    assert.ok(freqEvents.some(e => e.type === 'linearRampToValueAtTime' && e.val === 140 && e.time === 0.25), 'Linear ramp down to 140Hz at 0.25s');
    assert.equal(osc.started, true);
    assert.equal(osc.stopped, true);
    assert.equal(osc.stopTime, 0.28);

    const filter = filterNodes[0];
    assert.equal(filter.type, 'lowpass', 'Filter type is lowpass');
    assert.ok(filter.frequency.events.some(e => e.val === 450), 'Filter cutoff frequency is 450Hz');

    const gain = gainNodes[0];
    assert.ok(gain.gain.events.some(e => e.val === 0.2), 'Initial gain 0.2');
    assert.ok(gain.gain.events.some(e => e.type === 'exponentialRampToValueAtTime' && e.val === 0.001 && e.time === 0.28), 'Gain decays to 0.001 at 0.28s');

    // Routing chain: osc -> filter -> gain -> masterGain
    assert.ok(osc.connections.includes(filter), 'Oscillator connects to BiquadFilter');
    assert.ok(filter.connections.includes(gain), 'Filter connects to Gain');
    assert.ok(gain.connections.includes(engine.masterGain), 'Gain connects to masterGain');
  });

  // --------------------------------------------------------------------------
  // SECTION 6: Acoustic Waveform Parameters — playPowerSurge (Frequency Sweep)
  // --------------------------------------------------------------------------
  await t.test('6.1 playPowerSurge Waveform Parameters (150Hz -> 600Hz Triangle Sweep)', () => {
    const engine = new ProceduralAudioEngine();
    engine.init();
    engine.ctx.createdNodes = [];
    engine.ctx.activeOscillators = [];

    engine.playPowerSurge();

    const oscNodes = engine.ctx.createdNodes.filter(n => n instanceof MockOscillatorNode);
    const gainNodes = engine.ctx.createdNodes.filter(n => n instanceof MockGainNode);

    assert.equal(oscNodes.length, 1, 'playPowerSurge creates 1 oscillator');
    assert.equal(gainNodes.length, 1, 'playPowerSurge creates 1 gain node');

    const osc = oscNodes[0];
    assert.equal(osc.type, 'triangle', 'Oscillator waveform is triangle');
    const freqEvents = osc.frequency.events;
    assert.ok(freqEvents.some(e => e.type === 'setValueAtTime' && e.val === 150), 'Initial frequency is 150Hz');
    assert.ok(freqEvents.some(e => e.type === 'exponentialRampToValueAtTime' && e.val === 600 && e.time === 0.45), 'Exponential ramp up to 600Hz at 0.45s');
    assert.equal(osc.started, true);
    assert.equal(osc.stopped, true);
    assert.equal(osc.stopTime, 0.5);

    const gain = gainNodes[0];
    const gainEvents = gain.gain.events;
    assert.ok(gainEvents.some(e => e.type === 'setValueAtTime' && e.val === 0.05), 'Starts at 0.05 gain');
    assert.ok(gainEvents.some(e => e.type === 'linearRampToValueAtTime' && e.val === 0.22 && e.time === 0.2), 'Linear ramp to 0.22 at 0.2s');
    assert.ok(gainEvents.some(e => e.type === 'exponentialRampToValueAtTime' && e.val === 0.001 && e.time === 0.5), 'Decays to 0.001 at 0.5s');

    assert.ok(osc.connections.includes(gain), 'Oscillator connects to Gain');
    assert.ok(gain.connections.includes(engine.masterGain), 'Gain connects to masterGain');
  });

  // --------------------------------------------------------------------------
  // SECTION 7: Acoustic Waveform Parameters — playVictory (4-Note Brass Arpeggio)
  // --------------------------------------------------------------------------
  await t.test('7.1 playVictory Waveform Parameters (C5 -> E5 -> G5 -> C6 Brass Arpeggio)', () => {
    const engine = new ProceduralAudioEngine();
    engine.init();
    engine.ctx.createdNodes = [];
    engine.ctx.activeOscillators = [];

    engine.playVictory();

    const oscNodes = engine.ctx.createdNodes.filter(n => n instanceof MockOscillatorNode);
    const gainNodes = engine.ctx.createdNodes.filter(n => n instanceof MockGainNode);

    assert.equal(oscNodes.length, 4, 'playVictory creates exactly 4 oscillators for 4 notes');
    assert.equal(gainNodes.length, 4, 'playVictory creates exactly 4 gain envelopes');

    const expectedNotes = [
      { freq: 523.25, time: 0.00, dur: 0.15 }, // C5
      { freq: 659.25, time: 0.14, dur: 0.15 }, // E5
      { freq: 783.99, time: 0.28, dur: 0.18 }, // G5
      { freq: 1046.5, time: 0.45, dur: 0.80 }  // C6
    ];

    for (let i = 0; i < 4; i++) {
      const osc = oscNodes[i];
      const gain = gainNodes[i];
      const note = expectedNotes[i];

      assert.equal(osc.type, 'triangle', `Note ${i+1} waveform is triangle (brass emulation)`);
      const freqEv = osc.frequency.events.find(e => Math.abs(e.val - note.freq) < 0.1);
      assert.ok(freqEv, `Note ${i+1} frequency set to ${note.freq}Hz`);
      assert.ok(Math.abs(freqEv.time - note.time) < 1e-4, `Note ${i+1} scheduled at time offset ${note.time}s`);

      assert.equal(osc.started, true, `Note ${i+1} started`);
      assert.equal(osc.stopped, true, `Note ${i+1} stopped`);
      assert.ok(Math.abs(osc.stopTime - (note.time + note.dur)) < 1e-4, `Note ${i+1} stop time is ${note.time + note.dur}s`);

      const gainEvents = gain.gain.events;
      assert.ok(gainEvents.some(e => e.val === 0.25 && Math.abs(e.time - note.time) < 1e-4), `Note ${i+1} gain jumps to 0.25 at note time`);
      assert.ok(gainEvents.some(e => e.type === 'exponentialRampToValueAtTime' && e.val === 0.001 && Math.abs(e.time - (note.time + note.dur)) < 1e-4), `Note ${i+1} decays to 0.001`);
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 8: Acoustic Waveform Parameters — playPop (UI Tap Click)
  // --------------------------------------------------------------------------
  await t.test('8.1 playPop Waveform Parameters (400Hz -> 100Hz Fast Decay)', () => {
    const engine = new ProceduralAudioEngine();
    engine.init();
    engine.ctx.createdNodes = [];
    engine.ctx.activeOscillators = [];

    engine.playPop();

    const oscNodes = engine.ctx.createdNodes.filter(n => n instanceof MockOscillatorNode);
    const gainNodes = engine.ctx.createdNodes.filter(n => n instanceof MockGainNode);

    assert.equal(oscNodes.length, 1, 'playPop creates 1 oscillator');
    assert.equal(gainNodes.length, 1, 'playPop creates 1 gain node');

    const osc = oscNodes[0];
    assert.equal(osc.type, 'sine', 'playPop uses sine wave');
    const freqEvents = osc.frequency.events;
    assert.ok(freqEvents.some(e => e.val === 400), 'Initial frequency 400Hz');
    assert.ok(freqEvents.some(e => e.type === 'exponentialRampToValueAtTime' && e.val === 100 && e.time === 0.04), 'Ramps down to 100Hz at 0.04s');
    assert.equal(osc.stopTime, 0.04);
  });

  // --------------------------------------------------------------------------
  // SECTION 9: Mute Gate Verification (Zero Audio Node Leaks When Muted)
  // --------------------------------------------------------------------------
  await t.test('9.1 Mute Gate Strictly Inhibits Node Creation and Audio Scheduling', () => {
    const engine = new ProceduralAudioEngine();
    engine.init();
    engine.muted = true; // MUTE

    engine.ctx.createdNodes = [];
    engine.ctx.activeOscillators = [];

    engine.playDing();
    engine.playBuzzer();
    engine.playPowerSurge();
    engine.playVictory();
    engine.playPop();

    assert.equal(engine.ctx.createdNodes.length, 0, 'Zero nodes created when muted is true');
    assert.equal(engine.ctx.activeOscillators.length, 0, 'Zero oscillators activated when muted is true');
  });

  // --------------------------------------------------------------------------
  // SECTION 10: Haptic Feedback API & Fallback Resilience
  // --------------------------------------------------------------------------
  await t.test('10.1 Standard Haptic Vibration Calls', () => {
    env.vibrateCalls.length = 0;

    triggerHaptic([40, 60, 60]);
    assert.equal(env.vibrateCalls.length, 1);
    assert.deepEqual(env.vibrateCalls[0], [40, 60, 60], 'Chime vibration pattern recorded');

    triggerHaptic([180]);
    assert.equal(env.vibrateCalls.length, 2);
    assert.deepEqual(env.vibrateCalls[1], [180], 'Buzzer vibration pattern recorded');

    triggerHaptic([60, 40, 60, 40, 120, 80, 200]);
    assert.equal(env.vibrateCalls.length, 3);
    assert.deepEqual(env.vibrateCalls[2], [60, 40, 60, 40, 120, 80, 200], 'Victory vibration pattern recorded');

    triggerHaptic();
    assert.equal(env.vibrateCalls.length, 4);
    assert.equal(env.vibrateCalls[3], 40, 'Default vibration is 40ms');
  });

  await t.test('10.2 Haptic Fallback: Missing navigator.vibrate Does Not Throw', () => {
    const origNav = globalThis.navigator;
    try {
      Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true });
      assert.doesNotThrow(() => {
        triggerHaptic(50);
        triggerHaptic([50, 100, 50]);
      }, 'Missing navigator.vibrate must not throw');
    } finally {
      Object.defineProperty(globalThis, 'navigator', { value: origNav, configurable: true, writable: true });
    }
  });

  await t.test('10.3 Haptic Fallback: navigator.vibrate Exception Trapping', () => {
    const origNav = globalThis.navigator;
    try {
      const throwingNav = {
        vibrate: () => {
          throw new Error('DOMException: NotAllowedError - user gesture required');
        }
      };
      Object.defineProperty(globalThis, 'navigator', { value: throwingNav, configurable: true, writable: true });

      assert.doesNotThrow(() => {
        triggerHaptic(100);
        triggerHaptic([40, 60, 60]);
      }, 'Throwing navigator.vibrate must be caught silently without crashing application');
    } finally {
      Object.defineProperty(globalThis, 'navigator', { value: origNav, configurable: true, writable: true });
    }
  });

  await t.test('10.4 Haptic Adversarial Input Fuzzing', () => {
    assert.doesNotThrow(() => {
      triggerHaptic(null);
      triggerHaptic(undefined);
      triggerHaptic(-50);
      triggerHaptic(0);
      triggerHaptic(NaN);
      triggerHaptic('invalid_string');
      triggerHaptic({});
      triggerHaptic(new Array(1000).fill(10));
    }, 'Adversarial inputs to triggerHaptic must never crash');
  });

  // --------------------------------------------------------------------------
  // SECTION 11: Stress Limits & High-Concurrency Burst Testing
  // --------------------------------------------------------------------------
  await t.test('11.1 Rapid Burst Sound Triggering (1,000 iterations)', () => {
    const engine = new ProceduralAudioEngine();
    engine.init();

    const startMs = Date.now();

    for (let i = 0; i < 250; i++) {
      engine.playDing();
      engine.playBuzzer();
      engine.playPowerSurge();
      engine.playVictory();
    }

    const elapsedMs = Date.now() - startMs;
    // 250 * (2 + 1 + 1 + 4) = 2000 oscillators
    const oscCount = engine.ctx.createdNodes.filter(n => n instanceof MockOscillatorNode).length;
    assert.equal(oscCount, 2000, 'Created exactly 2000 oscillators for 1000 sound triggers');
    assert.ok(elapsedMs < 1000, `Stress burst completed rapidly in ${elapsedMs}ms (< 1000ms)`);
  });

  await t.test('11.2 Rapid Mute Toggling Stress (1,000 toggles)', () => {
    const engine = new ProceduralAudioEngine();
    engine.init();

    for (let i = 0; i < 1000; i++) {
      engine.toggleMute();
    }

    assert.equal(engine.muted, false, 'Ends in correct toggle parity');
    assert.equal(engine.masterGain.gain.value, 0.3, 'Master gain restored to 0.3');
  });

  await t.test('11.3 LocalStorage Exception Handling', () => {
    const origStorage = globalThis.localStorage;
    try {
      globalThis.localStorage = {
        getItem: () => { throw new Error('SecurityError: The operation is insecure.'); },
        setItem: () => { throw new Error('SecurityError: The operation is insecure.'); }
      };

      assert.doesNotThrow(() => {
        const eng = new ProceduralAudioEngine();
        eng.init();
        eng.toggleMute();
      }, 'ProceduralAudioEngine must survive localStorage SecurityError');
    } finally {
      if (origStorage) globalThis.localStorage = origStorage;
      else delete globalThis.localStorage;
    }
  });

});
