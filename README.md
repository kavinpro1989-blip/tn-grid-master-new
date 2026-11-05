# ⚡ TN Grid Master • தமிழ்நாடு மின் கட்டமைப்பு சிமுலேஷன்

> **Tamil Nadu Power Grid Digital Twin** — Solar vs Coal School Exhibition Edition  
> An interactive, cyber-physical, gamified simulation demonstrating the balance between **Daytime Clean Solar Energy** (Kamuthi Solar Park) and **Evening Coal Thermal Energy** (Mettur & North Chennai Thermal Stations) across Tamil Nadu's electrical grid.

---

## 🌐 Live Demonstrations & Quick Play

- 🚀 **Live Production Deployment**: [https://kavinpro1989-blip.github.io/tn-grid-master-new/](https://kavinpro1989-blip.github.io/tn-grid-master-new/)
- 📱 **Mobile Grid Hero Challenge**: [https://kavinpro1989-blip.github.io/tn-grid-master-new/?mode=quiz](https://kavinpro1989-blip.github.io/tn-grid-master-new/?mode=quiz)
- 💾 **100% Offline Standalone Bundle**: Open `standalone_simulation.html` directly in any web browser without needing servers, node modules, or an internet connection.

---

## 🎯 Key Highlights & Architecture

### 1. Cyber-Physical Digital Twin Engine (`engine.js`)
- **Physics-Accurate Telemetry**: Dynamically calculates Indian National Grid frequency ($50.00\text{ Hz}$ target lock), $230\text{V AC}$ distribution voltages, and line loading.
- **Joule Heating Line Losses**: Simulates $I^2R$ power dissipation over transmission cables with particle evaporation effects.
- **485 MWh Battery Energy Storage System (BESS)**: Sub-second ($20\text{ms}$) synthetic response rate to absorb peak solar generation and offset the sunset "duck curve".
- **Dynamic 60 FPS HTML5 Canvas**: Real-time rendering of catenary power lines, glowing electron flow, rotational wind turbines, chimney particulate plumes, and day/night illumination.

### 2. Zero-Asset Procedural Web Audio (`ui.js`)
- Synthetic audio engine using native browser Web Audio oscillators and envelopes.
- No external audio files required:
  - **Two-Tone Sine Chime**: High-efficiency solar packet flows.
  - **Low-Pass Sawtooth Tone**: Brownouts, frequency drop, and load shedding alerts.
  - **Triangle Wave Surge**: Battery rapid dispatch and high-voltage transmission.
  - **4-Note Brass Fanfare**: 30-second challenge victory and quiz completion.

### 3. Dual Experience Modes
- 🔬 **Pro Grid Sim Mode**: Full manual dispatcher authority with 8 master levers (Sunshine, BESS Storage, Coal Boilers, Electrostatic Scrubbers, Town Demand, Agricultural Irrigation Pumps, Substation Voltage Tap, and Grid Tie Diversion).
- 🎮 **Grid Hero Challenge (Mobile & In-Booth)**: 4 fast-paced dilemma rounds tailored for exhibition visitors on phones and tablets with dynamic scoring, rank certificates, and instant booth redemption.

---

## 👥 The Exhibition Team

- 💻 **Kavin** — *Software Architecture & Physical Twin Simulation*
- 🔌 **Faaris** — *Sensory Hardware Bench & Arduino Control*
- 🎙️ **Mithran** — *Story Anchor & Exhibition Presentation*

---

## 🚀 Running Locally

```bash
# Clone the repository
git clone https://github.com/kavinpro1989-blip/tn-grid-master-new.git
cd tn-grid-master-new

# Option A: Zero-install direct run
xdg-open standalone_simulation.html  # On Linux
# or open standalone_simulation.html in Chrome, Edge, or Safari

# Option B: Run via local web server
python3 -m http.server 8000
# Visit http://localhost:8000/ in your browser
```

---

## 🧪 Automated Testing & Verification

Comprehensive 5-tier test suite verifying all physics calculations, boundary conditions, audio synthesis, and adversarial inputs:

```bash
# Run full E2E test runner
node tests/runner.js

# Rebuild single-file standalone distribution
python3 build_standalone.py
```

---
*Created for Tamil Nadu School Science & Physics Exhibitions.*
