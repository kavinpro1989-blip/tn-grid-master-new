# Project: TN Grid Master — Mobile "Grid Hero" Challenge & Physical Fidelity Overhaul

## Architecture
- **Engine Layer (`engine.js`)**: Encapsulates `PowerGridEngine` physics simulation, mathematical power flow, nodal voltages, 50.00 Hz frequency lock, 485 MWh BESS battery dynamics (20ms response), line loss ($I^2R$), and the 7-stage HTML5 Canvas town rendering pipeline. Exposes reactive hooks (`setTime`, `setSlider`, particle emitters, fan RPM, battery glow, house illumination, soot/steam opacity).
- **Audio & Haptic Synthesis Layer (`ui.js` - `ProceduralAudioEngine`)**: Zero-asset procedural Web Audio synthesizer using native oscillators and gain envelopes (`playDing`, `playBuzzer`, `playPowerSurge`, `playVictory`, `playPop`), browser autoplay unlock on first touch, mute state management, and fail-safe `navigator.vibrate` integration.
- **Mobile Controller & UI Presentation Layer (`ui.js`, `index.html`, `styles.css`)**:
  - Device and URL detection (`?mode=quiz`, viewport $\le 768\text{px}$, touch capability).
  - Frictionless non-reloading mode switcher (`[🎮 Grid Hero Challenge]` / `[🔬 Pro Grid Sim]`).
  - Mobile touch ergonomics: min 48px touch buttons, min 56px quiz option cards, zero horizontal overflow on 375px–414px viewports.
  - Dilemma state machine: 4 punchy 1-sentence rounds (Solar Harvest, Agri-Pumps, Sunset Duck Curve, Clean Air Scrubber) with instant visual canvas reactivity and feedback.
  - "Grid Master" digital reward pass / certificate modal with dynamic scoring, rank, badges (50.00 Hz, 100% Clean Air, 485 MWh BESS, 648 MW Solar), and booth call-to-action ("Show to Kavin, Mithran, or Faaris").
  - Desktop In-Booth QR Bridge: Inlined vector SVG modal pointing to `https://kavinpro1989-blip.github.io/tn-grid-master/?mode=quiz`.
- **Standalone Build & Inlining Pipeline (`build_standalone.py`)**: Merges `index.html`, `styles.css`, `engine.js`, and `ui.js` into a 100% self-contained `standalone_simulation.html`.
- **Deployment Pipeline**: Git version control tracking `origin/main` deployed directly to GitHub Pages.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Device & URL Detection | Auto-detect mobile devices ($\le 768\text{px}$ or touch) or `?mode=quiz` URL param to launch quiz | M3 | R1, Survey |
| 2 | Dynamic Mode Switcher | Non-reloading mode toggle (`[🎮 Grid Hero Challenge]` / `[🔬 Pro Grid Sim]`) | M3 | R1, Survey |
| 3 | Mobile Touch Ergonomics | Min 48px button height, min 56px option cards, zero horizontal overflow on 375px-414px viewports | M3 | R1, Survey |
| 4 | Dilemma Round 1: Solar Harvest | 12:00 PM Kamuthi solar flood dilemma (charge 485 MWh BESS vs burn coal vs curtail) | M3 | R1, Survey |
| 5 | Dilemma Round 2: Agri-Pumps | 02:00 PM agricultural irrigation scheduling dilemma (solar afternoon vs evening peak vs shutoff) | M3 | R1, Survey |
| 6 | Dilemma Round 3: Sunset Duck Curve | 06:30 PM solar drop & evening peak dilemma (20ms BESS burst vs slow coal boiler vs blackout) | M3 | R1, Survey |
| 7 | Dilemma Round 4: Clean Air Scrubber | 08:30 PM night baseload dilemma (100% flue gas scrubbers vs masks vs blackout) | M3 | R1, Survey |
| 8 | Option Feedback & Scoring | Single-sentence punchy feedback with emoji indicators and score updates per choice | M3 | R1, Survey |
| 9 | Grid Master Reward Pass | Digital certificate displaying score, rank, badges, and booth claim text | M3 | R5, Survey |
| 10 | Kamuthi Solar Fidelity | 648 MW solar PV peak modeling and diurnal radiation curve | M1 | R4, Survey |
| 11 | Mettur Coal Fidelity | 1440 MW thermal boiler modeling with soot generation and flue gas scrubbing | M1 | R4, Survey |
| 12 | Kudankulam Nuclear Baseload | 2000 MW nuclear baseload factor integrated into grid power balance | M1 | R4, Survey |
| 13 | Muppandal Wind Corridor | Clean wind generation with rotating fan / turbine RPM driven by renewable flow | M1 | R4, Survey |
| 14 | 50.00 Hz Frequency Lock | Dynamic frequency telemetry formula $f = 50.00 + \Delta P \times 0.00045$ | M1 | R4, Survey |
| 15 | 230V AC Voltage Regulation | Transformer tap voltage, auto-energization, voltage sag and blackout thresholds | M1 | R4, Survey |
| 16 | Joule Heating Line Loss | Real-time $I^2R$ power loss calculation and visual electron evaporation | M1 | R4, Survey |
| 17 | 485 MWh BESS Fast Response | 485 MWh battery storage with 20ms sub-second response time simulation | M1 | R4, Survey |
| 18 | Canvas Reactivity: Solar Flood | Sun position, zenith rays, and solar panel excitation reacting to quiz selection | M1 | R2, Survey |
| 19 | Canvas Reactivity: Battery Surge | Battery fill meter, particle surge, and charge/discharge indicators reacting to quiz | M1 | R2, Survey |
| 20 | Canvas Reactivity: Wind Turbines | Turbine blade spinning speed reacting dynamically to grid state | M1 | R2, Survey |
| 21 | Canvas Reactivity: House Night Lights | Glowing windows (`#facc15`, `shadowBlur: 10`) reacting to evening demand | M1 | R2, Survey |
| 22 | Canvas Reactivity: Air Quality/Scrubber | Chimney soot particle clearing and transition from black soot to white steam | M1 | R2, Survey |
| 23 | Procedural Audio: Correct Chime | Two-tone sine wave chime ($880\text{Hz} \to 1320\text{Hz}$) with zero external audio assets | M2 | R3, Survey |
| 24 | Procedural Audio: Miss Buzzer | Filtered sawtooth buzzer ($180\text{Hz} \to 140\text{Hz}$) with zero external audio assets | M2 | R3, Survey |
| 25 | Procedural Audio: Power Surge | Ascending sweep ($150\text{Hz} \to 600\text{Hz}$) with zero external audio assets | M2 | R3, Survey |
| 26 | Procedural Audio: Victory Fanfare | 4-note brass arpeggio ($C_5 \to E_5 \to G_5 \to C_6$) with zero external audio assets | M2 | R3, Survey |
| 27 | Procedural Audio: Autoplay Unlock | Safe `AudioContext.resume()` execution on first user gesture | M2 | R3, Survey |
| 28 | Audio Mute Switch | Accessible UI toggle button to silence or enable procedural audio effects | M2 | R3, Survey |
| 29 | Haptic Feedback API | Safe `navigator.vibrate` calls with pattern mapping (correct, miss, surge, victory) | M2 | R3, Survey |
| 30 | Desktop In-Booth QR Bridge Modal | 1-click modal on desktop interface with inlined vector SVG QR code pointing to live quiz URL | M2 | R3, Survey |
| 31 | Full E2E Test Suite (Tiers 1-4) | Comprehensive opaque-box test runner covering all requirements | M4 | Dual Track |
| 32 | Adversarial Hardening (Tier 5) | White-box stress testing and boundary condition fuzzing | M4 | Dual Track |
| 33 | Standalone Build Generation | `python3 build_standalone.py` regenerating `standalone_simulation.html` | M5 | R6, Survey |
| 34 | JavaScript Syntax Verification | `node --check engine.js` and `node --check ui.js` clean exit code 0 | M5 | AC, Survey |
| 35 | Git Version Control & Deployment | Git commit and push to `origin/main` updating live GitHub Pages | M5 | R7, Survey |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Suite Track | Opaque-box test harness, test runner, Tiers 1-4 test cases, publish `TEST_READY.md` | none | DONE |
| M1 | Grid Physical Fidelity & Canvas Reactivity | Tamil Nadu grid parameters (Kamuthi, Mettur, Kudankulam, Muppandal, 50Hz, 230V, $I^2R$, 485 MWh BESS) and canvas visual reaction hooks in `engine.js` | none | DONE |
| M2 | Procedural Web Audio, Haptics & In-Booth QR Bridge | Procedural `SoundFX` class, autoplay unlock, mute toggle, haptic feedback, desktop vector SVG QR modal in `ui.js`, `index.html`, `styles.css` | none | DONE |
| M3 | Mobile "Grid Hero" Challenge Controller & Reward Pass | Device/URL detection, non-reloading mode switcher, 4 dilemma rounds, visual sync, "Grid Master" digital reward pass in `ui.js`, `index.html`, `styles.css` | M1, M2 | DONE |
| M4 | Final E2E Integration Pass & Coverage Hardening | Pass 100% of E2E test suite (Tiers 1-4) and adversarial stress hardening (Tier 5) | M3, E2E | DONE |
| M5 | Standalone Build Generation & GitHub Deployment | Execute `python3 build_standalone.py`, verify syntax (`node --check`), git stage, commit, and push to `main` branch | M4 | DONE |

---

## Interface Contracts

### `engine.js` ↔ `ui.js`
- `engine.setTime(minutes: number): void` — Set simulation clock time (e.g., 720 = 12:00 PM, 1110 = 18:30 PM).
- `engine.setSlider(key: string, value: number): void` — Programmatically update simulation controls (`'sunshine'`, `'storage'`, `'coalFire'`, `'agriPumps'`, `'scrubber'`, `'voltage'`, `'townLoad'`).
- `engine.triggerVisualReaction(type: string, payload?: object): void` — Exposes visual reaction hooks for solar flood, battery surge, fan RPM, house night illumination, and chimney soot clearing.
- `engine.getTelemetry(): object` — Returns current state: `{ frequencyHz, voltageAC, solarMW, coalMW, nuclearMW, windMW, bessMWh, townDemandMW, lineLossMW, airQualityGrade }`.
- `engine.setupDpr(): void` & `engine.repositionNodes(): void` — Recalculates canvas dimensions and node coordinates on mode transitions without state loss.

### `ui.js` ↔ Audio & Haptics
- `sfx.init(): void` — Resumes suspended `AudioContext` on first user interaction.
- `sfx.toggleMute(): boolean` — Toggles mute state and returns current muted boolean.
- `sfx.playDing(): void` — Plays 880Hz -> 1320Hz double sine chime.
- `sfx.playBuzzer(): void` — Plays 180Hz -> 140Hz low-pass filtered sawtooth error tone.
- `sfx.playPowerSurge(): void` — Plays 150Hz -> 600Hz triangle wave power surge.
- `sfx.playVictory(): void` — Plays 4-note brass fanfare ($C_5 \to E_5 \to G_5 \to C_6$).
- `sfx.playPop(): void` — Plays UI tap click tone.
- `triggerHaptic(pattern: number | number[]): void` — Safely triggers `navigator.vibrate` with graceful exception trapping.

### `ui.js` ↔ Mode Routing
- `detectInitialMode(): 'quiz' | 'pro'` — Resolves URL query params (`?mode=quiz`), session preference, or viewport / touch capability.
- `setSimulationMode(mode: 'quiz' | 'pro', persist?: boolean): void` — Applies CSS classes, adjusts layout, and resizes canvas without reloading the page.

---

## Code Layout
- Exclusive Write Ownership:
  - Milestone M1: `/home/gg/KavinDarklite/School_Projects_Antigravity/engine.js`
  - Milestone M2: `/home/gg/KavinDarklite/School_Projects_Antigravity/ui.js` (Audio/Haptics/QR sections), `/home/gg/KavinDarklite/School_Projects_Antigravity/index.html` (QR modal markup), `/home/gg/KavinDarklite/School_Projects_Antigravity/styles.css` (QR modal styling)
  - Milestone M3: `/home/gg/KavinDarklite/School_Projects_Antigravity/ui.js` (Quiz controller, mode switcher), `/home/gg/KavinDarklite/School_Projects_Antigravity/index.html` (Quiz cards, certificate markup), `/home/gg/KavinDarklite/School_Projects_Antigravity/styles.css` (Quiz styling, responsive touch layouts)
  - Milestone E2E: `/home/gg/KavinDarklite/School_Projects_Antigravity/tests/` (Test runner, test cases, test infrastructure)
  - Milestone M5: `/home/gg/KavinDarklite/School_Projects_Antigravity/build_standalone.py`, `/home/gg/KavinDarklite/School_Projects_Antigravity/standalone_simulation.html`
