# TEST_INFRA.md — Comprehensive E2E Testing Infrastructure Specification

## 1. Overview & Test Architecture

This document defines the automated, opaque-box End-to-End (E2E) testing infrastructure for the **TN Grid Master** mobile-first "Grid Hero" challenge and physical fidelity overhaul.

The test infrastructure is designed according to the **Project Pattern Dual-Track Framework**, executing opaque-box validation against the full software distribution (`index.html`, `styles.css`, `engine.js`, `ui.js`, and `build_standalone.py`) without modifying production implementation code.

```
+-----------------------------------------------------------------------------------+
|                            Master Test Runner: tests/runner.js                    |
|                        (Feature Coverage, Timing & Exit Code)                     |
+-----------------------------------------------------------------------------------+
          |                           |                         |
          v                           v                         v
+--------------------+      +--------------------+    +--------------------+
| Tier 1: Features   |      | Tier 2: Boundaries |    | Tier 3: Pairwise   |
| (F1 - F35 checks)  |      | & Corner Cases     |    | Cross-Interactions |
+--------------------+      +--------------------+    +--------------------+
          |                           |
          v                           v
+--------------------+      +--------------------+
| Tier 4: Real-World |      | Tier 5: Adversarial|
| User Scenarios     |      | & Stress Hardening |
+--------------------+      +--------------------+
```

### Core Architecture Principles
1. **Opaque-Box Integrity**: Tests treat the web application as a complete system, observing DOM state mutations, CSS rule matching, Web Audio oscillator triggers, haptic invocations, mathematical telemetry calculations, and build bundle generation.
2. **Progressive Testability & Interface Contracts**: Each test validates against the interface contracts defined in `PROJECT.md` (§ Interface Contracts). During milestone execution, tests report precise pass/fail status per milestone, enabling implementers to verify their code iteratively.
3. **Deterministic & Self-Contained**: Tests run in Node.js 22 using native `node:test` and `node:assert/strict` with zero external npm dependencies. Mock harnesses provide deterministic browser primitives (`AudioContext`, `navigator.vibrate`, `Canvas2DContext`, `window.innerWidth`, `URLSearchParams`, `sessionStorage`).
4. **Zero-Flake Execution**: All simulations run synchronously or with controlled microtask steps; no arbitrary `setTimeout` delays or network-dependent calls exist.

---

## 2. Directory Layout & Test Suite Organization

All testing code is colocated within `/home/gg/KavinDarklite/School_Projects_Antigravity/tests/`:

```
/home/gg/KavinDarklite/School_Projects_Antigravity/
|-- tests/
|   |-- runner.js                  # Master test runner & feature coverage aggregator
|   |-- test_helpers.js            # Mock DOM, Web Audio, Canvas, Navigator, and VM harness
|   |-- tier1_features.test.js     # Tier 1: 35 Individual Feature Coverage tests (F1 - F35)
|   |-- tier2_boundaries.test.js   # Tier 2: Boundary, Clamp & Corner Case tests
|   |-- tier3_pairwise.test.js     # Tier 3: Pairwise Cross-Feature Interaction tests
|   |-- tier4_scenarios.test.js    # Tier 4: Real-World E2E Application User Journeys
|   |-- tier5_adversarial.test.js  # Tier 5: Adversarial, Fuzzing & Stress Hardening tests
|-- TEST_INFRA.md                  # Test suite architecture & methodology (this document)
|-- TEST_READY.md                  # Test readiness certification and run instructions
```

---

## 3. 4-Tier (+ Tier 5) Testing Methodology

The test suite employs a 5-tier methodology to ensure exhaustive verification:

### Tier 1: Feature Coverage (Single-Feature Correctness)
Tests each of the 35 features enumerated in `PROJECT.md § Feature Inventory` in isolation:
- **Mobile Routing (F1-F3)**: URL detection (`?mode=quiz`), viewport detection ($\le 768\text{px}$ or touch), non-reloading mode switcher, touch target heights ($\ge 48\text{px}$ buttons, $\ge 56\text{px}$ cards), and zero horizontal overflow.
- **Dilemma State Machine (F4-F8)**: 4 dilemma rounds (Solar Harvest, Agri-Pumps, Sunset Duck Curve, Scrubber) with punchy 1-sentence questions, emoji indicators, score calculations, and immediate option feedback.
- **Digital Reward Pass (F9)**: Generation of "Grid Master" pass displaying final score, rank, badges (50.00 Hz, 100% Clean Air), and booth team callout ("Show to Kavin, Mithran, or Faaris").
- **Physical Fidelity & Math (F10-F17)**: Kamuthi Solar (648 MW), Mettur Coal (1,440 MW), Kudankulam Nuclear (2,000 MW baseload), Muppandal Wind Corridor, 50.00 Hz frequency lock formula ($f = 50.00 + \Delta P \times 0.00045$), 230V AC regulation, Joule heating line loss ($I^2R$), and 485 MWh BESS (20ms response).
- **Canvas Visual Reactivity (F18-F22)**: Solar flood zenith, battery surge, turbine rotation RPM, house night illumination (`#facc15`), and chimney smoke clearing.
- **Procedural Web Audio & Haptics (F23-F29)**: Chime ($880 \to 1320\text{Hz}$), buzzer ($180 \to 140\text{Hz}$), power surge ($150 \to 600\text{Hz}$), victory fanfare ($C_5 \to E_5 \to G_5 \to C_6$), autoplay unlock, mute switch, and `navigator.vibrate` patterns.
- **Exhibition Bridge (F30)**: Desktop 1-click modal with inlined vector SVG QR code pointing to live quiz URL.
- **Build & Quality Pipeline (F31-F35)**: Full test harness, adversarial tests, `build_standalone.py` execution, `node --check` syntax verification, and Git repository tracking.

### Tier 2: Boundary & Corner Cases
Tests extreme inputs, numerical edge conditions, and missing browser capabilities:
- **Diurnal Time Limits**: 12:00 PM (720 min, solar zenith), 00:00 / 1440 min (midnight, solar zero), 06:00 (sunrise), 18:00 (sunset), negative minute wrapping.
- **Battery Storage Extremes**: Exactly 0 MWh (empty, unable to discharge), exactly 500 MWh (full, unable to charge further), charge/discharge current limits.
- **Voltage Extremes**: 0V (triggers auto-energization to 230V), 100V (total blackout), 205V (brownout threshold), 230V (nominal), 250V (maximum transformer ceiling).
- **Viewport Dimension Boundaries**: $768\text{px}$ (mobile threshold) vs $769\text{px}$ (desktop threshold), $375\text{px}$ (iPhone SE) and $414\text{px}$ (iPhone Plus) width constraints.
- **Query Parameter Variations**: Missing parameter, `?mode=quiz`, `?mode=pro`, malformed query string `?mode=unknown`, mixed casing.
- **Browser API Fallbacks**: Graceful no-op when `navigator.vibrate` is absent (iOS Safari), when `AudioContext` is suspended or fails autoplay, or when canvas 2D context fails.

### Tier 3: Pairwise Cross-Feature Interactions
Tests multi-feature coordination and state preservation:
- **Mode Switcher + Audio Mute + Dilemma Round**: Toggling between Quiz and Pro modes preserves mute state; selecting a dilemma option while muted triggers visual reactions and score updates without producing audio.
- **Sunset Duck Curve + 485 MWh BESS Discharge + 50.00 Hz Frequency Lock**: Transitioning from 12:00 PM to 18:30 PM with battery storage active triggers immediate 20ms BESS discharge, keeping grid frequency above 49.80 Hz and avoiding town blackout.
- **Mettur Coal 1440 MW + Scrubber 100% + Canvas Air Reactivity**: Operating coal thermal boilers at 100% with flue gas scrubbers engaged at 100% renders pure white steam puffs, maintains $\ge 80\%$ air quality, and clears black soot overlays.
- **Agri-Pumps + Solar Flood**: Activating 320 MW agricultural irrigation pumps during solar surplus absorbs excess generation, increasing system eco-score without causing line voltage sag.
- **Canvas DPR + Mode Switch**: Resizing canvas or toggling modes dynamically recalculates DPR and repositions node coordinates without resetting player score or active dilemma step.

### Tier 4: Real-World Application Scenarios
Simulates realistic end-to-end user journeys:
- **Scenario 1: Mobile Exhibition Visitor Journey**: Smartphone user scans QR code -> auto-launches "Grid Hero" challenge -> answers Rounds 1–4 -> receives audio/haptic/canvas feedback -> claims "Grid Master" digital certificate with badges and booth team callout ("Show to Kavin, Mithran, or Faaris").
- **Scenario 2: Booth Presenter Desktop Journey**: Desktop laptop opens simulation in Pro mode -> presenter opens 1-click QR code modal for visitors -> verifies vector SVG QR code -> closes modal -> adjusts 8 manual sliders -> switches to mobile challenge to demonstrate -> returns to Pro Sim with state preserved.
- **Scenario 3: Continuous Build & Quality Deployment Pipeline**: Executes `node --check engine.js` and `node --check ui.js` -> executes `python3 build_standalone.py` -> verifies standalone file size $\ge 170\text{ KB}$ with inlined `<style>` and `<script>` blocks -> verifies Git status and remote tracking.

### Tier 5: Adversarial Hardening & Stress Testing
Verifies system resilience under malicious, rapid, or abnormal usage:
- **Rapid Mode Toggling**: Rapidly switches between Quiz and Pro modes 100 times in a tight loop to verify zero memory leaks or detached listeners.
- **Rapid Button Spamming**: Dispatches rapid concurrent taps on quiz option buttons to verify that score accumulation is strictly idempotent per round.
- **Defensive Input Sanitization**: Injects `NaN`, `Infinity`, negative numbers, and non-numeric strings into `setTime()` and `setSlider()` to confirm strict range clamping.
- **Offline Self-Containment**: Scans all HTML, CSS, and JS files for external HTTP/HTTPS resource links (excluding the destination link encoded in the QR code) to guarantee 100% offline functionality.

---

## 4. Complete Feature-to-Test Mapping Table

| # | Feature | Test Suite File | Test Function / Test Name | Expected Output Derivation Source |
|---|---------|-----------------|---------------------------|-----------------------------------|
| 1 | Device & URL Detection | `tier1_features.test.js` | `test_f01_device_and_url_detection` | `PROJECT.md § Interface Contracts`, `R1` |
| 2 | Dynamic Mode Switcher | `tier1_features.test.js` | `test_f02_dynamic_mode_switcher` | `PROJECT.md § Feature Inventory (2)`, `R1` |
| 3 | Mobile Touch Ergonomics | `tier1_features.test.js` | `test_f03_mobile_touch_ergonomics` | `PROJECT.md § Feature Inventory (3)`, `R1` |
| 4 | Dilemma Round 1: Solar Harvest | `tier1_features.test.js` | `test_f04_dilemma_round_1_solar_harvest` | `PROJECT.md § Feature Inventory (4)`, `R1` |
| 5 | Dilemma Round 2: Agri-Pumps | `tier1_features.test.js` | `test_f05_dilemma_round_2_agri_pumps` | `PROJECT.md § Feature Inventory (5)`, `R1` |
| 6 | Dilemma Round 3: Sunset Duck Curve | `tier1_features.test.js` | `test_f06_dilemma_round_3_duck_curve` | `PROJECT.md § Feature Inventory (6)`, `R1` |
| 7 | Dilemma Round 4: Clean Air Scrubber | `tier1_features.test.js` | `test_f07_dilemma_round_4_clean_air_scrubber` | `PROJECT.md § Feature Inventory (7)`, `R1` |
| 8 | Option Feedback & Scoring | `tier1_features.test.js` | `test_f08_option_feedback_and_scoring` | `PROJECT.md § Feature Inventory (8)`, `R1` |
| 9 | Grid Master Reward Pass | `tier1_features.test.js` | `test_f09_grid_master_reward_pass` | `PROJECT.md § Feature Inventory (9)`, `R5` |
| 10 | Kamuthi Solar Fidelity | `tier1_features.test.js` | `test_f10_kamuthi_solar_fidelity` | `PROJECT.md § Feature Inventory (10)`, `R4` |
| 11 | Mettur Coal Fidelity | `tier1_features.test.js` | `test_f11_mettur_coal_fidelity` | `PROJECT.md § Feature Inventory (11)`, `R4` |
| 12 | Kudankulam Nuclear Baseload | `tier1_features.test.js` | `test_f12_kudankulam_nuclear_baseload` | `PROJECT.md § Feature Inventory (12)`, `R4` |
| 13 | Muppandal Wind Corridor | `tier1_features.test.js` | `test_f13_muppandal_wind_corridor` | `PROJECT.md § Feature Inventory (13)`, `R4` |
| 14 | 50.00 Hz Frequency Lock | `tier1_features.test.js` | `test_f14_frequency_lock_formula` | `PROJECT.md § Feature Inventory (14)`, `R4` |
| 15 | 230V AC Voltage Regulation | `tier1_features.test.js` | `test_f15_voltage_regulation_230v` | `PROJECT.md § Feature Inventory (15)`, `R4` |
| 16 | Joule Heating Line Loss | `tier1_features.test.js` | `test_f16_joule_heating_line_loss` | `PROJECT.md § Feature Inventory (16)`, `R4` |
| 17 | 485 MWh BESS Fast Response | `tier1_features.test.js` | `test_f17_bess_485mwh_fast_response` | `PROJECT.md § Feature Inventory (17)`, `R4` |
| 18 | Canvas Reactivity: Solar Flood | `tier1_features.test.js` | `test_f18_canvas_reactivity_solar_flood` | `PROJECT.md § Feature Inventory (18)`, `R2` |
| 19 | Canvas Reactivity: Battery Surge | `tier1_features.test.js` | `test_f19_canvas_reactivity_battery_surge` | `PROJECT.md § Feature Inventory (19)`, `R2` |
| 20 | Canvas Reactivity: Wind Turbines | `tier1_features.test.js` | `test_f20_canvas_reactivity_wind_turbines` | `PROJECT.md § Feature Inventory (20)`, `R2` |
| 21 | Canvas Reactivity: House Night Lights | `tier1_features.test.js` | `test_f21_canvas_reactivity_house_lights` | `PROJECT.md § Feature Inventory (21)`, `R2` |
| 22 | Canvas Reactivity: Air Quality/Scrubber | `tier1_features.test.js` | `test_f22_canvas_reactivity_scrubber` | `PROJECT.md § Feature Inventory (22)`, `R2` |
| 23 | Procedural Audio: Correct Chime | `tier1_features.test.js` | `test_f23_audio_correct_chime` | `PROJECT.md § Feature Inventory (23)`, `R3` |
| 24 | Procedural Audio: Miss Buzzer | `tier1_features.test.js` | `test_f24_audio_miss_buzzer` | `PROJECT.md § Feature Inventory (24)`, `R3` |
| 25 | Procedural Audio: Power Surge | `tier1_features.test.js` | `test_f25_audio_power_surge` | `PROJECT.md § Feature Inventory (25)`, `R3` |
| 26 | Procedural Audio: Victory Fanfare | `tier1_features.test.js` | `test_f26_audio_victory_fanfare` | `PROJECT.md § Feature Inventory (26)`, `R3` |
| 27 | Procedural Audio: Autoplay Unlock | `tier1_features.test.js` | `test_f27_audio_autoplay_unlock` | `PROJECT.md § Feature Inventory (27)`, `R3` |
| 28 | Audio Mute Switch | `tier1_features.test.js` | `test_f28_audio_mute_switch` | `PROJECT.md § Feature Inventory (28)`, `R3` |
| 29 | Haptic Feedback API | `tier1_features.test.js` | `test_f29_haptic_feedback_api` | `PROJECT.md § Feature Inventory (29)`, `R3` |
| 30 | Desktop In-Booth QR Bridge Modal | `tier1_features.test.js` | `test_f30_desktop_qr_bridge_modal` | `PROJECT.md § Feature Inventory (30)`, `R3` |
| 31 | Full E2E Test Suite (Tiers 1-4) | `tier1_features.test.js` | `test_f31_full_e2e_suite_coverage` | `PROJECT.md § Milestones (E2E)` |
| 32 | Adversarial Hardening (Tier 5) | `tier1_features.test.js` | `test_f32_adversarial_hardening` | `PROJECT.md § Feature Inventory (32)` |
| 33 | Standalone Build Generation | `tier1_features.test.js` | `test_f33_standalone_build_generation` | `PROJECT.md § Feature Inventory (33)`, `R6` |
| 34 | JavaScript Syntax Verification | `tier1_features.test.js` | `test_f34_javascript_syntax_verification` | `PROJECT.md § Feature Inventory (34)`, `AC` |
| 35 | Git Version Control & Deployment | `tier1_features.test.js` | `test_f35_git_version_control_deployment` | `PROJECT.md § Feature Inventory (35)`, `R7` |

---

## 5. Execution Commands & Environment Prerequisites

### Prerequisites
- **Node.js**: $\ge \text{v18.0.0}$ (Installed: `v22.23.1`)
- **Python**: $\ge \text{3.10}$ (Installed: `3.10.12`)
- **Git**: Installed and connected to local repository

### Test Commands

```bash
# 1. Run the master test runner (executes all tiers with formatted report)
node tests/runner.js

# 2. Run test suites with native Node.js test runner
node --test tests/*.test.js

# 3. Run individual tier suites directly
node --test tests/tier1_features.test.js
node --test tests/tier2_boundaries.test.js
node --test tests/tier3_pairwise.test.js
node --test tests/tier4_scenarios.test.js
node --test tests/tier5_adversarial.test.js

# 4. Run build and syntax checks directly
node --check engine.js && node --check ui.js
python3 build_standalone.py
```

---

## 6. Authoritative Sources of Expected Outputs

Every test assertion is anchored in authoritative project specifications:
1. **Tamil Nadu Grid Physics**:
   - Kamuthi Solar: $648\text{ MW}$ maximum capacity (`PROJECT.md § R4`, `engine.js:83, 228`).
   - Mettur Coal: $1,440\text{ MW}$ maximum capacity (`PROJECT.md § R4`, `engine.js:229`).
   - Kudankulam Nuclear: $2,000\text{ MW}$ baseload factor (`PROJECT.md § R4, F12`).
   - Nominal Frequency: $50.00\text{ Hz}$ dynamic formula $f = 50.00 + \Delta P \times 0.00045$ (`PROJECT.md § F14`).
   - Nominal Voltage: $230\text{V AC}$ auto-energized (`PROJECT.md § F15`, `engine.js:223`).
   - Line Loss: $I^2R$ quadratic scaling with thermal electron evaporation (`PROJECT.md § F16`, `engine.js:329-339`).
   - BESS Battery: $485\text{ MWh}$ capacity with sub-20ms instant response (`PROJECT.md § F17`, `engine.js:237-297`).
2. **Procedural Audio Frequencies**:
   - Correct Chime: Two-tone sine wave $880\text{ Hz} \to 1320\text{ Hz}$ (`PROJECT.md § F23`, plan line 69).
   - Miss Buzzer: Low-pass filtered sawtooth $180\text{ Hz} \to 140\text{ Hz}$ (`PROJECT.md § F24`, plan line 70).
   - Power Surge: Exponential sweep $150\text{ Hz} \to 600\text{ Hz}$ (`PROJECT.md § F25`, plan line 71).
   - Victory Fanfare: 4-note brass arpeggio $C_5 (523.25\text{ Hz}) \to E_5 (659.25\text{ Hz}) \to G_5 (783.99\text{ Hz}) \to C_6 (1046.50\text{ Hz})$ (`PROJECT.md § F26`, plan line 72).
3. **Mobile & Dilemma Specifications**:
   - Dilemma sequence: 4 rounds chronologically ordered (12:00 PM, 02:00 PM, 06:30 PM, 08:30 PM) (`PROJECT.md § F4-F7`).
   - Reward Certificate: Displaying score, rank, badges, and the explicit team members "Kavin, Mithran, or Faaris" (`PROJECT.md § F9`, `Final_Exhibition_Workflow.md`).
   - QR Code Destination: `https://kavinpro1989-blip.github.io/tn-grid-master/?mode=quiz` (`PROJECT.md § F30`).

---

## 7. Test Isolation & Determinism Guarantees

- **No Shared Mutable State**: Each test instantiates fresh engine and DOM mock fixtures via `createTestHarness()`.
- **Clock & Animation Isolation**: `requestAnimationFrame` and timers are mocked synchronously; ticks are advanced explicitly by passing deterministic delta-times (`dt = 0.1s`).
- **Filesystem Cleanliness**: Tests read production files (`index.html`, `styles.css`, `engine.js`, `ui.js`) read-only; standalone build generation is validated in-place or via isolated verification checks.
- **Progressive Testability**: When running during Milestone 1, features assigned to M2/M3 are tested against contract signatures, allowing clear distinction between unimplemented features and regressions.

---

## 8. Defect Escalation & Reporting Protocol

When a test failure occurs:
1. **Differentiate Test Defect vs Implementation Defect**:
   - If the test expectation contradicts `PROJECT.md` or `ORIGINAL_REQUEST.md`, correct the test.
   - If the production code contradicts `PROJECT.md` or fails an interface contract, escalate immediately to the responsible milestone sub-orchestrator.
2. **Escalation Information Required**:
   - Exact test name and feature ID (`F01`–`F35`).
   - Expected behavior per `PROJECT.md` specification.
   - Observed behavior / error stack trace.
   - Affected milestone (`M1`, `M2`, `M3`, `M4`, or `M5`).
