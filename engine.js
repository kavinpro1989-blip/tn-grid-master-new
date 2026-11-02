/**
 * ============================================================================
 * TN GRID MASTER: SCHOOL EDITION - CANVAS GAME ENGINE (engine.js)
 * High-Fidelity Cyber-Physical Digital Twin of Tamil Nadu Electrical Grid
 * ============================================================================
 */

export class PowerGridEngine {
  constructor(canvas, onTelemetry) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D context unavailable');
    this.ctx = context;
    this.dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
    this.animFrameId = null;
    this.lastTime = 0;

    // Simulation Clock & Operational State
    this.timeMinutes = 720; // Default: 12:00 Noon (Kamuthi Peak Sun)
    this.isRunning = true;
    this.autoAdvanceTime = false; // Time locked unless explicitly toggled
    this.ecoScore = 0;
    this.fanRotation = 0;
    this.currentFanRpm = 0; // Rotational inertia easing state

    // ⚡ Tamil Nadu Grid Physical Parameters & Capacities
    this.nuclearCapacityMW = 2000; // Kudankulam Nuclear 2,000 MW baseload (KKNPP Units 1 & 2)
    this.nuclearBaseFactor = 1.0;  // 100% continuous baseload capacity factor
    this.windCapacityMW    = 1500; // Muppandal Wind Corridor 1,500 MW (Aralvaimozhi Gap)
    this.frequencyHz       = 50.00;// Indian National Grid 50.00 Hz frequency lock
    this.batteryMode       = 'idle'; // 'idle' | 'charging' | 'discharging' | 'full' | 'empty'
    this.batteryFlowMW     = 0;    // Active battery flow in MW (+ charge / - discharge)
    this.currentLineLossPct = 5;   // Joule heating line loss percentage
    this.batteryDepletedNotified = false;

    // 🎛️ 8 Master of Control Levers (Full Grid Authority)
    this.sliderSunshine   = 0;   // 0% (Kamuthi Solar PV harvest)
    this.sliderStorage    = 0;   // 0 MWh (485 MWh BESS battery buffer)
    this.sliderCoalFire   = 0;   // 0% (Mettur Thermal boiler burn rate)
    this.sliderScrubber   = 0;   // 0% (Electrostatic precipitator & FGD scrubber)
    this.sliderTownLoad   = 0;   // 0 (0% Off to 100% Peak town residential demand)
    this.sliderAgriPumps  = 0;   // 0% (Agricultural irrigation motors)
    this.sliderVoltage    = 230; // 230V Nominal Grid Voltage (Distribution transformer)
    this.sliderGridTie    = 0;   // 0 MW (Regional grid tie interchange)

    // Grid Topology Graph & Dynamic Particle Systems
    this.nodes = new Map();
    this.packets = [];
    this.smokePuffs = [];
    this.popTexts = [];
    this.ripples = [];
    this.photonSparkles = [];
    this.batterySurgeParticles = [];
    this.nextPacketId = 1;
    this.packetTimer = 0;
    this.lastTelemetryState = null;

    this.onTelemetry = onTelemetry;

    this.setupDpr();
    this.initTopology();

    if (typeof window !== 'undefined') {
      const resizeHandler = () => {
        this.setupDpr();
        this.repositionNodes();
      };
      window.addEventListener('resize', resizeHandler);
      window.addEventListener('DOMContentLoaded', resizeHandler);
      window.addEventListener('load', resizeHandler);
    }
  }

  setupDpr() {
    this.dpr = Math.max(1, (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1);

    let w = 0;
    let h = 0;

    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width > 0) w = rect.width;
      if (rect.height > 0) h = rect.height;

      // Fallback to parent container clientWidth during layout transitions
      if (w <= 0 && this.canvas.parentElement) {
        w = this.canvas.parentElement.clientWidth;
      }
    }

    if (w <= 0) {
      w = typeof window !== 'undefined' ? window.innerWidth : 1100;
    }
    if (h <= 0) {
      const isMobileQuiz = typeof document !== 'undefined' && document.body && document.body.classList.contains('mode-quiz');
      h = isMobileQuiz ? 220 : (typeof window !== 'undefined' ? Math.max(280, window.innerHeight - 260) : 480);
    }

    const targetPixelW = Math.round(w * this.dpr);
    const targetPixelH = Math.round(h * this.dpr);

    // Only resize canvas pixel buffer if dimensions actually changed to avoid flicker
    if (this.canvas.width !== targetPixelW || this.canvas.height !== targetPixelH) {
      this.canvas.width = targetPixelW;
      this.canvas.height = targetPixelH;
    }

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  initTopology() {
    this.nodes.clear();

    // 1. Generation Complex (Left) - Kamuthi Solar Park (648 MW) / Mettur Thermal (1440 MW)
    this.nodes.set('plant', {
      id: 'plant',
      name: 'Kamuthi Solar Park',
      role: '648 MW • 100% Clean',
      icon: '☀️',
      xNorm: 0.12,
      yNorm: 0.64,
      x: 0,
      y: 0,
      isLit: true,
      brownoutLevel: 0,
      flickerPhase: 0
    });

    // 2. High-Voltage Transmission Pylon 1 (400 kV Grid Backbone)
    this.nodes.set('pylon1', {
      id: 'pylon1',
      name: 'HV Pylon #1',
      role: '400 kV Transmission',
      icon: '🗼',
      xNorm: 0.28,
      yNorm: 0.48,
      x: 0,
      y: 0,
      isLit: true,
      brownoutLevel: 0,
      flickerPhase: 0
    });

    // 3. Muppandal Wind Corridor (1,500 MW Clean Wind Hub)
    this.nodes.set('fanStation', {
      id: 'fanStation',
      name: 'Muppandal Wind Corridor',
      role: '1,500 MW Clean Wind Hub',
      icon: '🌀',
      xNorm: 0.45,
      yNorm: 0.48,
      x: 0,
      y: 0,
      isLit: true,
      brownoutLevel: 0,
      flickerPhase: 0
    });

    // 4. TANTRANSCO Main Grid Substation & 485 MWh BESS Battery
    this.nodes.set('substation', {
      id: 'substation',
      name: 'TANTRANSCO Substation',
      role: '485 MWh BESS & 230V Bus',
      icon: '🏢',
      xNorm: 0.62,
      yNorm: 0.60,
      x: 0,
      y: 0,
      isLit: true,
      brownoutLevel: 0,
      flickerPhase: 0
    });

    // 5. Six Friendly Town Buildings (Bilingual Tamil & English)
    const houseList = [
      { id: 'house_1', name: 'School (பள்ளி)', role: 'Classrooms & Labs', icon: '🏫', x: 0.77, y: 0.44 },
      { id: 'house_2', name: 'Clinic (மருத்துவமனை)', role: 'Medical Care', icon: '🏥', x: 0.86, y: 0.42 },
      { id: 'house_3', name: 'Farm Pump (விவசாயம்)', role: 'Pumps & Motors', icon: '🏡', x: 0.95, y: 0.40 },
      { id: 'house_4', name: 'Villa (குடியிருப்பு)', role: 'AC & Fans', icon: '🏠', x: 0.77, y: 0.76 },
      { id: 'house_5', name: 'Cottage (இல்லம்)', role: 'Lights & TV', icon: '🏘️', x: 0.86, y: 0.78 },
      { id: 'house_6', name: 'Library (நூலகம்)', role: 'Terminal Node', icon: '📚', x: 0.95, y: 0.80 }
    ];

    houseList.forEach((h) => {
      this.nodes.set(h.id, {
        id: h.id,
        name: h.name,
        role: h.role,
        icon: h.icon,
        xNorm: h.x,
        yNorm: h.y,
        x: 0,
        y: 0,
        isLit: true,
        brownoutLevel: 0,
        flickerPhase: Math.random() * Math.PI
      });
    });

    this.repositionNodes();
  }

  repositionNodes() {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    this.nodes.forEach((n) => {
      n.x = n.xNorm * w;
      n.y = n.yNorm * h;
    });
  }

  start() {
    if (!this.animFrameId) {
      this.lastTime = performance.now();
      this.animFrameId = requestAnimationFrame(this.gameTick.bind(this));
    }
  }

  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  setTime(minutes) {
    const parsed = Number(minutes);
    if (!Number.isFinite(parsed)) return this.timeMinutes;

    // Circular modulo math without resetting user state
    this.timeMinutes = ((Math.round(parsed) % 1440) + 1440) % 1440;

    if (!this.isRunning && this.onTelemetry) {
      this.updateSimulation(0);
    }
    return this.timeMinutes;
  }

  setSlider(key, value) {
    const num = Number(value);
    if (isNaN(num)) return 0;

    const k = String(key).toLowerCase().trim();
    let applied = num;

    if (k === 'sunshine' || k === 'solar' || k === 'sun' || k === 'solarpv') {
      applied = Math.max(0, Math.min(100, num));
      this.sliderSunshine = applied;
    } else if (k === 'storage' || k === 'battery' || k === 'bess' || k === 'bessstorage') {
      applied = Math.max(0, Math.min(500, num));
      this.sliderStorage = applied;
    } else if (k === 'coalfire' || k === 'coal' || k === 'thermal' || k === 'boiler') {
      applied = Math.max(0, Math.min(100, num));
      this.sliderCoalFire = applied;
    } else if (k === 'scrubber' || k === 'filter' || k === 'flue' || k === 'precipitator') {
      applied = Math.max(0, Math.min(100, num));
      this.sliderScrubber = applied;
    } else if (k === 'townload' || k === 'load' || k === 'demand' || k === 'houses') {
      applied = Math.max(0, Math.min(4, Math.round(num)));
      this.sliderTownLoad = applied;
    } else if (k === 'agripumps' || k === 'pumps' || k === 'agri' || k === 'irrigation') {
      applied = Math.max(0, Math.min(100, num));
      this.sliderAgriPumps = applied;
    } else if (k === 'voltage' || k === 'volt' || k === 'transformer' || k === 'tap') {
      applied = Math.max(0, Math.min(250, num));
      this.sliderVoltage = applied;
    } else if (k === 'gridtie' || k === 'tie' || k === 'gridexchange' || k === 'interchange') {
      applied = Math.max(-200, Math.min(200, num));
      this.sliderGridTie = applied;
    }

    return applied;
  }

  triggerVisualReaction(type, payload) {
    const p = (payload && typeof payload === 'object') ? payload : {};
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const centerX = w * 0.5;
    const centerY = h * 0.5;
    const plant = this.nodes.get('plant');
    const sub = this.nodes.get('substation');

    const t = String(type).toLowerCase().replace(/[-_ \t]/g, '');

    switch (t) {
      case 'solarflood':
      case 'solarsurge':
      case 'solarharvest':
      case 'solar': {
        this.setTime(720); // 12:00 PM Peak Zenith
        this.setSlider('sunshine', 100);
        this.setSlider('coalFire', 0);
        const px = plant ? plant.x : w * 0.15;
        const py = plant ? plant.y : h * 0.65;

        this.ripples.push({
          x: px, y: py, radius: 12, maxRadius: 110, speed: 140,
          color: '#facc15', alpha: 1.0
        });

        this.spawnPopup(px, py - 48, p.text || '☀️ 648 MW KAMUTHI SOLAR HARVEST', '#facc15', { maxLife: 2.5 });

        for (let i = 0; i < 8; i++) {
          this.spawnElectron(true, 5);
        }
        break;
      }

      case 'batterysurge':
      case 'batteryburst':
      case 'batterydischarge':
      case 'battery': {
        const mode = p.mode || 'discharge';
        const mw = p.mw || 250;
        const sx = sub ? sub.x : w * 0.62;
        const sy = sub ? sub.y : h * 0.60;

        this.ripples.push({
          x: sx, y: sy, radius: 10, maxRadius: 100, speed: 130,
          color: mode === 'charge' ? '#4ade80' : '#38bdf8', alpha: 1.0
        });

        const badgeText = p.text || (mode === 'charge' 
          ? `🔋 BESS CHARGING (+${mw} MW)` 
          : `⚡ 20ms BESS INJECTION (-${mw} MW) • 50.00 Hz LOCKED`);
        this.spawnPopup(sx, sy - 46, badgeText, mode === 'charge' ? '#4ade80' : '#38bdf8', { maxLife: 2.5 });

        // High-speed radial discharge sparks
        for (let i = 0; i < 12; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 40 + Math.random() * 80;
          this.batterySurgeParticles.push({
            x: sx - 63,
            y: sy + 2,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: mode === 'charge' ? '#4ade80' : '#38bdf8',
            radius: 2.5 + Math.random() * 2,
            alpha: 1.0,
            life: 0,
            maxLife: 0.9
          });
        }
        break;
      }

      case 'agripumps':
      case 'agriirrigation':
      case 'irrigation': {
        this.setTime(840); // 02:00 PM
        this.setSlider('agriPumps', 95);
        const farm = this.nodes.get('house_3');
        const fx = farm ? farm.x : w * 0.95;
        const fy = farm ? farm.y : h * 0.40;

        this.ripples.push({
          x: fx, y: fy, radius: 10, maxRadius: 85, speed: 125,
          color: '#4ade80', alpha: 1.0
        });

        this.spawnPopup(fx - 20, fy - 40, p.text || '💧 AGRI PUMPS ACTIVE (320 MW) • SOLAR POWERED', '#4ade80', { maxLife: 2.5 });
        break;
      }

      case 'duckcurvesunset':
      case 'duckcurve':
      case 'sunset': {
        this.setTime(1110); // 06:30 PM Sunset
        this.setSlider('sunshine', 0);
        this.spawnPopup(centerX, 80, p.text || '🌆 SUNSET DUCK CURVE: SOLAR COLLAPSES TO 0 MW', '#f97316', { maxLife: 2.6 });
        break;
      }

      case 'scrubberclearing':
      case 'scrubberactive':
      case 'cleanair':
      case 'scrubber': {
        this.setSlider('scrubber', 100);
        this.clearChimneySoot();
        break;
      }

      case 'blackout':
      case 'blackoutfailure':
      case 'gridcollapse': {
        this.setSlider('voltage', 0);
        this.ripples.push({
          x: centerX, y: centerY, radius: 20, maxRadius: 180, speed: 160,
          color: '#ef4444', alpha: 1.0
        });

        this.spawnPopup(centerX, centerY - 50, p.text || '🚨 TOTAL BLACKOUT: GRID COLLAPSED', '#ef4444', { maxLife: 3.0 });
        break;
      }

      case 'ripple': {
        this.ripples.push({
          x: p.x !== undefined ? p.x : centerX,
          y: p.y !== undefined ? p.y : centerY,
          radius: p.radius || 8,
          maxRadius: p.maxRadius || 80,
          speed: p.speed || 120,
          color: p.color || '#38bdf8',
          alpha: p.alpha !== undefined ? p.alpha : 1.0
        });
        break;
      }

      case 'poptext':
      case 'popup': {
        this.spawnPopup(
          p.x !== undefined ? p.x : centerX,
          p.y !== undefined ? p.y : centerY,
          p.text || '⚡ GRID UPDATE',
          p.color || '#38bdf8',
          p
        );
        break;
      }

      default:
        if (p.text) {
          this.spawnPopup(
            p.x !== undefined ? p.x : centerX,
            p.y !== undefined ? p.y : centerY,
            p.text,
            p.color || '#38bdf8',
            p
          );
        }
        break;
    }
  }

  getTelemetry() {
    if (!this.lastTelemetryState) {
      this.updateSimulation(0);
    }
    return { ...this.lastTelemetryState };
  }

  spawnPopup(x, y, text, color = '#38bdf8', options = {}) {
    const maxLife = options.maxLife || 2.0;
    this.popTexts.push({
      x,
      y,
      text,
      color,
      textColor: options.textColor || '#ffffff',
      badgeBg: options.badgeBg || 'rgba(10, 15, 26, 0.90)',
      alpha: 1.0,
      life: 0,
      maxLife,
      scale: 0.6,
      vy: options.vy || 28
    });
  }

  clearChimneySoot() {
    const plant = this.nodes.get('plant');
    for (let i = 0; i < this.smokePuffs.length; i++) {
      const s = this.smokePuffs[i];
      if (s.isSoot) {
        s.alpha *= 0.5;
        s.life += 1.8;
      }
    }
    const px = plant ? plant.x : 100;
    const py = plant ? plant.y - 75 : 200;
    this.spawnPopup(px, py - 40, '🌿 100% SCRUBBERS ENGAGED • PURE STEAM!', '#34d399', { maxLife: 2.5 });
  }

  gameTick(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (this.autoAdvanceTime) {
      this.timeMinutes = (this.timeMinutes + dt * 2.2) % 1440;
    }

    this.updateSimulation(dt);
    this.renderCanvas();

    this.animFrameId = requestAnimationFrame(this.gameTick.bind(this));
  }

  updateSimulation(dt) {
    const hours = this.timeMinutes / 60;
    const isSolarTime = hours >= 6 && hours <= 18;

    // 1. Kamuthi Solar Diurnal Elevation Geometry (648 MW Peak PV)
    let baseSun = 0;
    if (isSolarTime) {
      const angle = ((hours - 6) / 12) * Math.PI;
      baseSun = Math.pow(Math.sin(angle), 1.3);
    }

    // 2. Transformer Auto-Energization Safeguard to Nominal 230V AC
    if (this.sliderVoltage === 0 && (this.sliderSunshine > 0 || this.sliderCoalFire > 0 || this.sliderStorage > 0)) {
      this.sliderVoltage = 230;
    }

    const effectiveSolar = baseSun * (this.sliderSunshine / 100);
    const solarGenMW = Math.round(effectiveSolar * 648);
    const coalGenMW  = Math.round((this.sliderCoalFire / 100) * 1440);
    const netGridTie = this.sliderGridTie;

    // 3. Kudankulam Nuclear 2,000 MW Baseload Factor Integration
    const nuclearMW = Math.round(this.nuclearCapacityMW * this.nuclearBaseFactor);

    // 4. Muppandal Wind Corridor Generation (1,500 MW Capacity, Aralvaimozhi Gap)
    const windDiurnalFactor = 0.45 + 0.35 * Math.sin(((hours - 10) / 24) * Math.PI * 2);
    const windGenMW = Math.round(windDiurnalFactor * this.windCapacityMW);

    // Total Demand: Town Residential Load + Agri Irrigation Motors - Grid Tie
    const homesDemand = (this.sliderTownLoad / 4.0) * 1100; // 0 to 1100 MW
    const agriDemand  = (this.sliderAgriPumps / 100) * 320; // 0 to 320 MW
    const totalDemand = Math.max(0, homesDemand + agriDemand - netGridTie);

    // 5. 485 MWh BESS Fast Inverter Response Dynamics (Sub-second / 20ms Frame Execution)
    let batteryDischargeMW = 0;
    let batteryChargeMW = 0;
    let batteryMode = 'idle';
    let batteryFlowMW = 0;

    if (this.sliderSunshine > 0 && solarGenMW > totalDemand) {
      // Surplus Solar: 485 MWh BESS charges rapidly (+250 MW max inverter intake)
      const surplusSolarMW = solarGenMW - totalDemand;
      batteryChargeMW = Math.min(250, surplusSolarMW);
      if (this.sliderStorage < 500) {
        const chargeDelta = (batteryChargeMW / 8.5) * dt;
        this.sliderStorage = Math.min(500, this.sliderStorage + chargeDelta);
        batteryMode = 'charging';
        batteryFlowMW = batteryChargeMW;
      } else {
        batteryMode = 'full';
        batteryFlowMW = 0;
      }
    } else if (solarGenMW < totalDemand && this.sliderStorage > 0.5) {
      // Deficit / Sunset Duck Curve: BESS fires 20ms sub-second injection (-360 MW max burst)
      const solarDeficitMW = totalDemand - solarGenMW;
      const maxDeliverableMW = Math.min(360, this.sliderStorage * 2.8);
      batteryDischargeMW = (this.sliderVoltage >= 100) ? Math.min(maxDeliverableMW, solarDeficitMW) : 0;

      const drainDelta = Math.max(3.5 * dt, (batteryDischargeMW / 11.0) * dt);
      this.sliderStorage = Math.max(0, this.sliderStorage - drainDelta);
      batteryMode = 'discharging';
      batteryFlowMW = batteryDischargeMW;

      if (this.sliderStorage <= 0.5) {
        this.sliderStorage = 0;
        batteryDischargeMW = 0;
        batteryMode = 'empty';
        batteryFlowMW = 0;

        if (!this.batteryDepletedNotified) {
          this.batteryDepletedNotified = true;
          this.spawnPopup(this.canvas.width / (2 * this.dpr), 140, '🪫 BATTERY DEPLETED (0 MWh)! (பேட்டரி காலியானது)', '#ef4444', { maxLife: 2.5 });
        }
      } else {
        this.batteryDepletedNotified = false;
      }
    } else if (this.sliderStorage <= 0.5) {
      this.sliderStorage = 0;
      batteryMode = 'empty';
      batteryFlowMW = 0;
    }

    this.batteryMode = batteryMode;
    this.batteryFlowMW = batteryFlowMW;

    // Merit Order Dispatch Assessment
    const cleanPotentialMW = solarGenMW + batteryDischargeMW;
    const isSolar = (cleanPotentialMW >= 180 && this.sliderCoalFire < 50) || 
                    (solarGenMW > coalGenMW && solarGenMW > 120);

    const plant = this.nodes.get('plant');
    if (plant) {
      if (isSolar) {
        plant.name = 'Kamuthi Solar Park';
        plant.role = `${solarGenMW} MW • 100% Clean Solar`;
        plant.icon = '☀️';
      } else {
        plant.name = 'Mettur Thermal Station';
        plant.role = `${coalGenMW} MW • Coal Boiler`;
        plant.icon = '🏭';
      }
    }

    // Active Supply vs Demand
    const activeSupplyMW = isSolar 
      ? (cleanPotentialMW + Math.max(0, netGridTie)) 
      : (coalGenMW + Math.max(0, netGridTie));

    const powerDeficit = Math.max(0, totalDemand - activeSupplyMW);
    const deficitRatio = totalDemand > 0 ? Math.min(1.0, powerDeficit / totalDemand) : 0;
    const isTotalBlackout = (this.sliderVoltage < 100) || (totalDemand > 0 && (activeSupplyMW < 50 || deficitRatio > 0.82));

    // 6. 50.00 Hz Dynamic Frequency Lock (Dynamic Swing Formula)
    // Formula: f = 50.00 + ((Supply - Demand) / 1000) * 0.45
    let rawFreq = 50.00;
    if (isTotalBlackout) {
      rawFreq = 0.00;
    } else {
      const deltaP = activeSupplyMW - totalDemand;
      rawFreq = 50.00 + (deltaP / 1000.0) * 0.45;
      rawFreq = Math.max(47.50, Math.min(52.50, rawFreq));
    }
    this.frequencyHz = +rawFreq.toFixed(2);

    // 7. Joule Heating Line Loss (I^2 * R = P^2 * R / V^2)
    const voltageSagPenalty = Math.max(0, (230 - this.sliderVoltage) / 20.0);
    const voltageOverload   = Math.max(0, (this.sliderVoltage - 238) / 12.0);
    const coalStress = (this.sliderCoalFire / 100) * (totalDemand / 650.0);
    const voltFactor = Math.pow(230.0 / Math.max(100, this.sliderVoltage), 2);

    const baseLossPct = isSolar 
      ? (5 + (1.0 - effectiveSolar) * 5 + voltageOverload * 14) 
      : (20 + coalStress * 24 + voltageOverload * 18);
    const lineLossPct = Math.min(65, Math.round(baseLossPct * voltFactor));
    this.currentLineLossPct = lineLossPct;
    const lineLossMW = Math.round(activeSupplyMW * (lineLossPct / 100.0));
    const efficiencyPct = Math.max(20, 100 - lineLossPct);

    // 8. Muppandal Wind Corridor Blade RPM Dynamics (Rotational Inertia Easing)
    let targetRpm = 0;
    const voltageRatio = Math.max(0.2, this.sliderVoltage / 230.0);
    if (this.sliderVoltage < 100) {
      targetRpm = 0;
    } else {
      const windFlowRatio = windGenMW / this.windCapacityMW;
      const cleanDemandFactor = Math.max(0.4, 1.0 - deficitRatio);
      targetRpm = Math.round((1400 + windFlowRatio * 2000) * cleanDemandFactor * voltageRatio);
    }
    this.currentFanRpm = this.currentFanRpm || 0;
    this.currentFanRpm += (targetRpm - this.currentFanRpm) * Math.min(1.0, Math.max(0.2, dt * 2.8));
    this.fanRotation += (Math.max(100, this.currentFanRpm) / 60) * 2 * Math.PI * dt;

    // Load Shedding, Brownout & House Illumination Logic
    let brownoutCount = 0;
    let litCount = 0;

    for (let i = 1; i <= 6; i++) {
      const house = this.nodes.get(`house_${i}`);
      if (house) {
        house.flickerPhase += dt * (7 + i * 2);

        const isFarm = (house.id === 'house_3');
        const farmOverload = isFarm && (this.sliderAgriPumps > 75) && !isSolar;

        if (isTotalBlackout || farmOverload) {
          house.isLit = false;
          house.brownoutLevel = 1.0;
          brownoutCount++;
        } else if (deficitRatio > 0.15) {
          const shedThreshold = (7 - i) / 6.0;
          if (deficitRatio >= shedThreshold * 0.75 || this.sliderVoltage < 205) {
            house.isLit = false;
            house.brownoutLevel = 1.0;
            brownoutCount++;
          } else {
            house.isLit = true;
            house.brownoutLevel = 0.5;
            brownoutCount++;
            litCount++;
          }
        } else if (isSolar && (effectiveSolar >= 0.25 || this.sliderStorage > 40) && this.sliderVoltage >= 205) {
          house.isLit = true;
          house.brownoutLevel = 0.0;
          litCount++;
        } else {
          const dropRatio = (i / 6.0) * (0.38 + coalStress * 0.60 + voltageSagPenalty * 0.55);
          if (dropRatio > 0.35 || this.sliderVoltage < 205) {
            house.brownoutLevel = Math.min(1.0, (dropRatio - 0.30) * 2.6);
            brownoutCount++;
            if (house.brownoutLevel < 0.70) litCount++;
          } else {
            house.brownoutLevel = 0.0;
            litCount++;
          }
        }
      }
    }

    // 9. Soot Generation & Continuous Scrubber Dynamics
    const rawSmog = isSolar ? 0 : (this.sliderCoalFire / 100) * 100;
    const filterReduction = (this.sliderScrubber / 100) * 0.95; // 95% efficiency when 100% engaged
    const finalSmog = isSolar ? 0 : Math.round(rawSmog * (1.0 - filterReduction));
    const airCleanliness = Math.max(5, 100 - finalSmog);

    // Town Satisfaction & Happiness Rating
    const smogPenalty = (finalSmog / 100) * 65;
    const blackoutPenalty = isTotalBlackout ? 92 : (brownoutCount * 14 + deficitRatio * 35);
    const voltagePenalty = (this.sliderVoltage < 205) ? (205 - this.sliderVoltage) * 1.5 : (this.sliderVoltage > 242 ? (this.sliderVoltage - 242) * 1.5 : 0);
    const townHappiness = Math.max(5, Math.min(100, Math.round(100 - blackoutPenalty - smogPenalty - voltagePenalty)));

    // Cumulative Eco-Score Dynamics
    if (isTotalBlackout) {
      this.ecoScore = Math.max(0, this.ecoScore - dt * 70);
    } else if (finalSmog > 50) {
      this.ecoScore = Math.max(0, this.ecoScore - dt * 45);
    } else if (brownoutCount > 1 || this.sliderVoltage < 205) {
      this.ecoScore = Math.max(0, this.ecoScore - dt * 25);
    } else if (isSolar && townHappiness >= 85 && airCleanliness >= 80) {
      this.ecoScore = Math.min(3000, this.ecoScore + dt * 25);
    } else if (!isSolar && coalGenMW > 0) {
      this.ecoScore = Math.max(0, this.ecoScore - dt * 10);
    }

    // Live Grid Performance Rating
    let liveGrade = 'A';
    let gradeTitle = 'CLEAN ENERGY CHAMPION';
    let gradeTamil = 'தூய ஆற்றல் சாம்பியன்';
    let gradeColor = '#4ade80';

    if (isTotalBlackout || (brownoutCount >= 5 && totalDemand > 0) || this.sliderVoltage < 100) {
      liveGrade = 'F';
      gradeTitle = 'TOTAL BLACKOUT';
      gradeTamil = 'முழு மின்தடை';
      gradeColor = '#ef4444';
    } else if (finalSmog >= 60 || airCleanliness <= 30) {
      liveGrade = 'D';
      gradeTitle = 'TOXIC SMOG';
      gradeTamil = 'நச்சுப் புகை';
      gradeColor = '#f97316';
    } else if (brownoutCount >= 2 || townHappiness < 60 || this.sliderVoltage < 205 || this.sliderVoltage > 244) {
      liveGrade = 'C';
      gradeTitle = 'UNSTABLE GRID';
      gradeTamil = 'மின் தட்டுப்பாடு';
      gradeColor = '#eab308';
    } else if (!isSolar || this.sliderCoalFire > 35) {
      liveGrade = 'B';
      gradeTitle = 'COAL-DEPENDENT';
      gradeTamil = 'நிலக்கரி சார்பு';
      gradeColor = '#38bdf8';
    } else if (townHappiness >= 80 && airCleanliness >= 80 && isSolar && this.sliderVoltage >= 215 && this.sliderVoltage <= 245) {
      liveGrade = 'A+';
      gradeTitle = 'ELITE MASTER';
      gradeTamil = 'தலைசிறந்தது';
      gradeColor = '#22c55e';
    }

    // Electron packet emission
    this.packetTimer += dt;
    const interval = isSolar ? 0.08 : 0.20;
    if (!isTotalBlackout && activeSupplyMW > 40 && this.packetTimer >= interval) {
      this.packetTimer = 0;
      this.spawnElectron(isSolar, lineLossPct);
    }

    this.updatePackets(dt);
    this.updateSmoke(dt, isSolar, finalSmog);
    this.updateBatterySurgeParticles(dt);
    this.updatePhotonSparkles(dt);

    // Update floating pop text badges
    for (let i = this.popTexts.length - 1; i >= 0; i--) {
      const pt = this.popTexts[i];
      pt.life += dt;
      pt.y -= dt * (pt.vy || 26);
      if (pt.scale !== undefined && pt.scale < 1.0) {
        pt.scale = Math.min(1.0, pt.scale + dt * 4.5);
      }
      pt.alpha = Math.max(0, 1.0 - (pt.life / pt.maxLife));
      if (pt.life >= pt.maxLife) {
        this.popTexts.splice(i, 1);
      }
    }

    // Unified Telemetry Snapshot with Dual-Key Standard Contracts
    const telemetry = {
      // ⚡ Physical Grid Parameters
      frequencyHz: this.frequencyHz,             // 50.00 Hz Indian Grid frequency lock
      voltageAC: this.sliderVoltage,             // 230V AC Single-Phase
      voltage: this.sliderVoltage,               // Backward-compatible alias
      solarMW: solarGenMW,                       // Kamuthi Solar 648 MW output
      coalMW: coalGenMW,                         // Mettur Coal 1440 MW output
      nuclearMW: nuclearMW,                      // Kudankulam Nuclear 2000 MW baseload
      windMW: windGenMW,                         // Muppandal Wind 1500 MW corridor
      bessMWh: Math.round(this.sliderStorage),   // 485 MWh BESS battery state of charge
      storageMwh: Math.round(this.sliderStorage),// Backward-compatible alias
      batteryMode: this.batteryMode,
      batteryFlowMW: Math.round(this.batteryFlowMW),
      townDemandMW: Math.round(totalDemand),     // Total town demand in MW
      totalDemand: Math.round(totalDemand),      // Backward-compatible alias
      activeSupplyMW,
      powerDeficit,
      lineLossPct,
      lineLossMW,
      efficiencyPct,

      // 🌿 Environmental & Quality Metrics
      airCleanliness,
      finalSmog,
      airQualityGrade: liveGrade,
      townHappiness,
      housesLitCount: litCount,
      brownoutCount,
      isTotalBlackout,
      isSolar,

      // 🎛️ Control Levers & Runtime State
      timeMinutes: this.timeMinutes,
      sunshinePct: this.sliderSunshine,
      coalFirePct: this.sliderCoalFire,
      scrubberPct: this.sliderScrubber,
      townLoad: this.sliderTownLoad,
      agriPumps: this.sliderAgriPumps,
      gridTie: this.sliderGridTie,
      fanRpm: Math.round(this.currentFanRpm),
      ecoScore: Math.round(this.ecoScore),

      // 🏆 Ratings
      grade: liveGrade,
      gradeTitle,
      gradeTamil,
      gradeColor
    };

    this.lastTelemetryState = telemetry;

    if (this.onTelemetry) {
      this.onTelemetry(telemetry);
    }
  }

  spawnElectron(isSolar, lineLossPct = 5) {
    const plant = this.nodes.get('plant');
    const pylon1 = this.nodes.get('pylon1');
    if (!plant || !pylon1) return;

    const targetHouse = Math.floor(Math.random() * 6) + 1;
    const willEvaporate = !isSolar && Math.random() < (lineLossPct / 100);

    this.packets.push({
      id: this.nextPacketId++,
      fromNode: plant,
      toNode: pylon1,
      progress: 0,
      speed: isSolar ? 1.5 : 0.85,
      isSolar,
      isEvaporating: willEvaporate,
      evaporationProgress: 0,
      targetHouseIndex: targetHouse
    });
  }

  updatePackets(dt) {
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i];

      if (p.isEvaporating && p.progress > 0.4) {
        p.evaporationProgress += dt * 3.0;
        if (p.evaporationProgress >= 1.0) {
          this.packets.splice(i, 1);
          continue;
        }
      }

      p.progress += p.speed * dt;
      if (p.progress >= 1.0) {
        const next = this.getNextNode(p.toNode.id, p.targetHouseIndex);
        if (next) {
          p.fromNode = p.toNode;
          p.toNode = next;
          p.progress = 0;
        } else {
          this.packets.splice(i, 1);
        }
      }
    }
  }

  getNextNode(currentId, targetHouse) {
    if (currentId === 'pylon1') return this.nodes.get('fanStation') || null;
    if (currentId === 'fanStation') return this.nodes.get('substation') || null;
    if (currentId === 'substation') return this.nodes.get(`house_${targetHouse}`) || null;
    return null;
  }

  updateSmoke(dt, isSolar, finalSmog = 0) {
    if (!isSolar && this.sliderCoalFire > 5) {
      const plant = this.nodes.get('plant');
      const spawnRate = (this.sliderCoalFire / 100) * 0.9;
      if (plant && Math.random() < spawnRate) {
        const scrubberFrac = Math.max(0, Math.min(1, (this.sliderScrubber / 100.0) * 0.95));
        const r = Math.round(15 + 225 * scrubberFrac);
        const g = Math.round(23 + 222 * scrubberFrac);
        const b = Math.round(42 + 213 * scrubberFrac);
        const isSoot = (scrubberFrac < 0.4);

        this.smokePuffs.push({
          x: plant.x + (Math.random() - 0.5) * 35,
          y: plant.y - 75,
          vx: Math.random() * (isSoot ? 34 : 20) + 10,
          vy: isSoot ? (-Math.random() * 35 - 20) : (-Math.random() * 55 - 40),
          radius: Math.random() * (isSoot ? 16 : 8) + 10,
          colorRGB: `${r}, ${g}, ${b}`,
          alpha: isSoot ? 0.85 : 0.35,
          life: 0,
          maxLife: isSoot ? 3.6 : 1.6,
          isSoot
        });
      }
    }

    for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
      const s = this.smokePuffs[i];
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.radius += dt * (s.isSoot ? 16 : 9);
      s.currentAlpha = Math.max(0, s.alpha * (1.0 - s.life / s.maxLife));
      if (s.life >= s.maxLife) {
        this.smokePuffs.splice(i, 1);
      }
    }

    // Update animated touch/event ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += r.speed * dt;
      r.alpha = Math.max(0, 1.0 - (r.radius / r.maxRadius));
      if (r.radius >= r.maxRadius || r.alpha <= 0) {
        this.ripples.splice(i, 1);
      }
    }
  }

  updateBatterySurgeParticles(dt) {
    const sub = this.nodes.get('substation');
    if (!sub) return;

    const bessX = sub.x - 63;
    const bessY = sub.y + 2;

    // Ambient charge/discharge particle spawning
    if (this.batteryMode === 'charging' && this.batteryFlowMW > 10 && Math.random() < 0.22) {
      this.batterySurgeParticles.push({
        x: sub.x + (Math.random() - 0.5) * 16,
        y: sub.y + (Math.random() - 0.5) * 10,
        vx: (bessX - sub.x) * 1.8 + (Math.random() - 0.5) * 15,
        vy: (bessY - sub.y) * 1.8 + (Math.random() - 0.5) * 15,
        color: '#4ade80',
        radius: 3,
        alpha: 1.0,
        life: 0,
        maxLife: 0.6
      });
    } else if (this.batteryMode === 'discharging' && this.batteryFlowMW > 10 && Math.random() < 0.25) {
      this.batterySurgeParticles.push({
        x: bessX + (Math.random() - 0.5) * 12,
        y: bessY + (Math.random() - 0.5) * 12,
        vx: (sub.x - bessX) * 1.6 + (Math.random() - 0.5) * 20,
        vy: (sub.y - bessY) * 1.6 + (Math.random() - 0.5) * 20,
        color: '#38bdf8',
        radius: 3.5,
        alpha: 1.0,
        life: 0,
        maxLife: 0.7
      });
    }

    for (let i = this.batterySurgeParticles.length - 1; i >= 0; i--) {
      const bp = this.batterySurgeParticles[i];
      bp.life += dt;
      bp.x += bp.vx * dt;
      bp.y += bp.vy * dt;
      bp.alpha = Math.max(0, 1.0 - bp.life / bp.maxLife);
      if (bp.life >= bp.maxLife) {
        this.batterySurgeParticles.splice(i, 1);
      }
    }
  }

  updatePhotonSparkles(dt) {
    const plant = this.nodes.get('plant');
    if (plant && this.sliderSunshine > 40 && Math.random() < 0.16) {
      this.photonSparkles.push({
        x: plant.x + (Math.random() - 0.5) * 64,
        y: plant.y - 12 - Math.random() * 22,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 20 - 10,
        alpha: 1.0,
        life: 0,
        maxLife: 0.8,
        char: Math.random() > 0.5 ? '✨' : '⚡'
      });
    }

    for (let i = this.photonSparkles.length - 1; i >= 0; i--) {
      const sp = this.photonSparkles[i];
      sp.life += dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.alpha = Math.max(0, 1.0 - sp.life / sp.maxLife);
      if (sp.life >= sp.maxLife) {
        this.photonSparkles.splice(i, 1);
      }
    }
  }

  drawSafeRoundRect(ctx, x, y, w, h, r = 4) {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  renderCanvas() {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    this.ctx.clearRect(0, 0, w, h);

    const hours = this.timeMinutes / 60;
    const isSolarTime = hours >= 6 && hours <= 18;

    // 1. Atmosphere, Landscape & Sun Zenith Rays
    this.drawLandscape(w, h, isSolarTime);
    if (isSolarTime && this.sliderSunshine > 10) {
      this.drawZenithRays(w, h, isSolarTime);
    }

    // 2. Power Lines & Interactive Ripples
    this.drawPowerLines();
    this.drawRipples();

    // 3. Infrastructure Nodes & Town Buildings
    this.drawInfrastructure(isSolarTime);

    // 4. In-Flight Energy Particles & Battery Surge
    this.drawElectrons();
    this.drawBatterySurgeParticles();

    // 5. Environmental Emissions, Popups & Photon Sparkles
    this.drawPuffsAndPopups();
    this.drawPhotonSparkles();
  }

  drawZenithRays(w, h, isSolarTime) {
    const ctx = this.ctx;
    const plant = this.nodes.get('plant');
    const dayProgress = Math.max(0, Math.min(1, (this.timeMinutes - 360) / 720));

    // Calculate celestial sun position
    const sunX = w * (0.10 + dayProgress * 0.75);
    const sunY = h * (0.42 - Math.sin(dayProgress * Math.PI) * 0.32);

    const groundY = h * 0.76;
    const clarity = 1.0 - (this.lastTelemetryState ? (this.lastTelemetryState.finalSmog / 100.0) * 0.75 : 0);
    const rayIntensity = (this.sliderSunshine / 100.0) * Math.pow(Math.sin(dayProgress * Math.PI), 1.2) * clarity;

    if (rayIntensity <= 0.04) return;

    ctx.save();

    // Soft celestial sun disc
    ctx.beginPath();
    ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(254, 240, 138, ${Math.min(0.8, rayIntensity * 0.9)})`;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Direct targeted solar ray beamed down onto Kamuthi Solar Park
    if (plant) {
      const gradTarget = ctx.createLinearGradient(sunX, sunY, plant.x, plant.y);
      gradTarget.addColorStop(0, `rgba(254, 240, 138, ${0.30 * rayIntensity})`);
      gradTarget.addColorStop(0.5, `rgba(250, 204, 21, ${0.14 * rayIntensity})`);
      gradTarget.addColorStop(1, 'rgba(16, 185, 129, 0)');

      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(plant.x - 48, plant.y);
      ctx.lineTo(plant.x + 48, plant.y);
      ctx.closePath();
      ctx.fillStyle = gradTarget;
      ctx.fill();
    }

    // Ambient fan light cones radiating downward across terrain
    const angles = [-0.55, -0.32, -0.12, 0.12, 0.32, 0.55];
    angles.forEach((ang, idx) => {
      const shimmer = Math.sin(performance.now() * 0.0018 + idx) * 0.03;
      const targetX = sunX + Math.tan(ang) * (groundY - sunY);
      const halfW = 28 + Math.abs(ang) * 18;

      const grad = ctx.createLinearGradient(sunX, sunY, targetX, groundY);
      grad.addColorStop(0, `rgba(254, 240, 138, ${(0.18 + shimmer) * rayIntensity})`);
      grad.addColorStop(0.6, `rgba(250, 204, 21, ${0.07 * rayIntensity})`);
      grad.addColorStop(1, 'rgba(30, 41, 59, 0)');

      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(targetX - halfW, groundY);
      ctx.lineTo(targetX + halfW, groundY);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    });

    ctx.restore();
  }

  drawRipples() {
    const ctx = this.ctx;
    ctx.save();
    this.ripples.forEach((r) => {
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = r.alpha;
      ctx.stroke();
    });
    ctx.restore();
  }

  drawLandscape(w, h, isSolar) {
    const ctx = this.ctx;
    const groundY = h * 0.76;

    ctx.save();
    // Distant background mountain ridge (Western Ghats backdrop)
    ctx.beginPath();
    ctx.moveTo(0, groundY - 30);
    ctx.bezierCurveTo(w * 0.25, groundY - 75, w * 0.5, groundY - 35, w * 0.75, groundY - 65);
    ctx.bezierCurveTo(w * 0.9, groundY - 80, w * 0.98, groundY - 40, w, groundY - 50);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = isSolar ? 'rgba(16, 185, 129, 0.16)' : 'rgba(30, 41, 59, 0.4)';
    ctx.fill();

    // Foreground rolling terrain
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.bezierCurveTo(w * 0.2, groundY - 35, w * 0.45, groundY - 10, w * 0.7, groundY - 30);
    ctx.bezierCurveTo(w * 0.85, groundY - 45, w * 0.95, groundY - 15, w, groundY - 25);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = isSolar ? '#0a2318' : '#0a0e1a';
    ctx.fill();

    // Base ground solid bedrock
    ctx.beginPath();
    ctx.rect(0, groundY + 10, w, h - groundY);
    ctx.fillStyle = isSolar ? '#061710' : '#060810';
    ctx.fill();

    // Terrain contour accent line
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.bezierCurveTo(w * 0.2, groundY - 35, w * 0.45, groundY - 10, w * 0.7, groundY - 30);
    ctx.bezierCurveTo(w * 0.85, groundY - 45, w * 0.95, groundY - 15, w, groundY - 25);
    ctx.strokeStyle = isSolar ? 'rgba(52, 211, 153, 0.35)' : 'rgba(148, 163, 184, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  drawPowerLines() {
    const ctx = this.ctx;
    ctx.save();

    const mainLegs = [
      ['plant', 'pylon1'],
      ['pylon1', 'fanStation'],
      ['fanStation', 'substation']
    ];

    mainLegs.forEach(([idA, idB]) => {
      const a = this.nodes.get(idA);
      const b = this.nodes.get(idB);
      if (!a || !b) return;

      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2 + 22;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(midX, midY, b.x, b.y);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(midX, midY, b.x, b.y);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    });

    const sub = this.nodes.get('substation');
    if (sub) {
      for (let i = 1; i <= 6; i++) {
        const house = this.nodes.get(`house_${i}`);
        if (!house) continue;

        ctx.beginPath();
        ctx.moveTo(sub.x, sub.y);
        ctx.lineTo(house.x, house.y);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.32)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawInfrastructure(isSolar) {
    const ctx = this.ctx;

    this.nodes.forEach((n) => {
      ctx.save();
      ctx.translate(n.x, n.y);

      if (n.id === 'plant') {
        if (isSolar) {
          this.drawKamuthiSolarPark();
        } else {
          this.drawMetturCoalPlant();
        }
      } else if (n.id === 'pylon1') {
        this.drawPylon(n.name);
      } else if (n.id === 'fanStation') {
        this.drawMuppandalWindTurbines();
      } else if (n.id === 'substation') {
        this.drawSubstation();
      } else if (n.id.startsWith('house_')) {
        this.drawHouse(n);
      }

      ctx.restore();
    });
  }

  drawKamuthiSolarPark() {
    const ctx = this.ctx;
    const effectiveSolar = (this.lastTelemetryState ? this.lastTelemetryState.solarMW : 0) / 648.0;
    const isExcited = (effectiveSolar > 0.15);

    // Mounting rack frame
    ctx.fillStyle = '#475569';
    ctx.fillRect(-52, 18, 104, 6);
    ctx.fillRect(-26, 0, 8, 18);
    ctx.fillRect(18, 0, 8, 18);

    const offsets = [-34, 0, 34];
    offsets.forEach((px) => {
      ctx.save();
      ctx.translate(px, -4);
      ctx.rotate(-0.16);

      // Multi-pass excitation radiance glow on solar PV modules
      if (isExcited) {
        ctx.shadowColor = effectiveSolar > 0.75 ? '#fde047' : '#38bdf8';
        ctx.shadowBlur = Math.round(6 + 14 * effectiveSolar);
      }

      const grad = ctx.createLinearGradient(-16, -12, 16, 12);
      if (isExcited) {
        grad.addColorStop(0, '#0284c7');
        grad.addColorStop(1, '#38bdf8');
      } else {
        grad.addColorStop(0, '#0369a1');
        grad.addColorStop(1, '#075985');
      }

      ctx.fillStyle = grad;
      ctx.strokeStyle = isExcited ? '#7dd3fc' : '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      this.drawSafeRoundRect(ctx, -16, -12, 32, 24, 4);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Silicon cell busbars
      ctx.strokeStyle = isExcited ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-16, 0); ctx.lineTo(16, 0);
      ctx.moveTo(0, -12); ctx.lineTo(0, 12);
      ctx.moveTo(-11, -8); ctx.lineTo(11, 8);
      ctx.stroke();
      ctx.restore();
    });

    ctx.font = '16px Fredoka, sans-serif';
    ctx.fillText(isExcited ? '✨' : '☀️', 38, -25);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 11px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Kamuthi Solar (648 MW)', 0, 38);
  }

  drawMetturCoalPlant() {
    const ctx = this.ctx;

    // Main boiler house
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-36, -16, 72, 36);

    // Twin thermal smokestacks (Stage I & II)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-22, -76, 13, 60);
    ctx.fillRect(9, -76, 13, 60);

    // Red & white aviation warning stripes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-22, -61, 13, 10);
    ctx.fillRect(9, -61, 13, 10);

    // Furnace glow windows
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-16, 4, 11, 10);
    ctx.fillRect(6, 4, 11, 10);

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 11px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Mettur Coal (1,440 MW)', 0, 38);
  }

  drawPylon(name) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-18, 40);
    ctx.lineTo(-5, -40);
    ctx.lineTo(5, -40);
    ctx.lineTo(18, 40);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-30, -20);
    ctx.lineTo(30, -20);
    ctx.moveTo(-35, -35);
    ctx.lineTo(35, -35);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(-30, -16, 3, 0, Math.PI * 2);
    ctx.arc(30, -16, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 0, 52);
  }

  drawMuppandalWindTurbines() {
    const ctx = this.ctx;
    const isSpinning = this.currentFanRpm > 100;

    // Atmospheric breeze streamlines through mountain pass
    if (isSpinning) {
      ctx.save();
      const streamTime = performance.now() * 0.002;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        const lineY = -35 + i * 14;
        const lineX = ((streamTime * 60 + i * 35) % 90) - 45;
        ctx.beginPath();
        ctx.moveTo(lineX - 18, lineY);
        ctx.lineTo(lineX + 18, lineY);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Tapered monopole wind turbine tower
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, 34);
    ctx.lineTo(-2, -22);
    ctx.lineTo(2, -22);
    ctx.lineTo(4, 34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Streamlined nacelle pod at tower top
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    this.drawSafeRoundRect(ctx, -12, -26, 24, 9, 3);
    ctx.fill();
    ctx.stroke();

    // Rotor Hub & 3 Aerodynamic Blades
    ctx.save();
    ctx.translate(0, -22);
    ctx.rotate(this.fanRotation);

    // 3 Aerofoil Blades (120 deg symmetry)
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * 2 * Math.PI) / 3);

      const bladeGrad = ctx.createLinearGradient(0, 0, 0, -32);
      bladeGrad.addColorStop(0, '#e2e8f0');
      bladeGrad.addColorStop(1, '#38bdf8');

      ctx.fillStyle = bladeGrad;
      ctx.beginPath();
      ctx.moveTo(-2.5, 0);
      ctx.lineTo(-1, -32);
      ctx.lineTo(1, -32);
      ctx.lineTo(2.5, 0);
      ctx.closePath();
      ctx.fill();

      // Aviation red safety tip
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-1.2, -32, 2.4, 6);

      ctx.restore();
    }

    // Nose cone hub spinner
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bilingual label
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Muppandal Wind (1,500 MW)', 0, 48);
  }

  // Alias for backward compatibility with existing tests/inspectors
  drawFanStation() {
    this.drawMuppandalWindTurbines();
  }

  drawSubstation() {
    const ctx = this.ctx;

    // Substation Transformer Enclosure
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.drawSafeRoundRect(ctx, -26, -16, 52, 36, 6);
    ctx.fill();
    ctx.stroke();

    // Transformer cooling fins
    ctx.fillStyle = '#0f172a';
    for (let x = -19; x <= 19; x += 9) {
      ctx.fillRect(x, -11, 4, 26);
    }

    // High-voltage insulators
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-11, -27, 6, 11);
    ctx.fillRect(5, -27, 6, 11);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TANTRANSCO Substation', 0, 34);

    // ========================================================================
    // Dedicated On-Canvas 485 MWh BESS Battery Storage Enclosure
    // ========================================================================
    const bessX = -64;
    const bessY = 2;

    ctx.save();
    ctx.translate(bessX, bessY);

    // Container Enclosure Body
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = this.batteryMode === 'discharging' ? '#f87171' : (this.batteryMode === 'charging' ? '#4ade80' : '#0284c7');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    this.drawSafeRoundRect(ctx, -24, -15, 48, 30, 4);
    ctx.fill();
    ctx.stroke();

    // Inverter status LED beacon
    ctx.beginPath();
    ctx.arc(-18, -9, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = this.batteryMode === 'charging' ? '#22c55e' : (this.batteryMode === 'discharging' ? '#38bdf8' : (this.sliderStorage <= 0.5 ? '#ef4444' : '#64748b'));
    ctx.fill();

    // 5-Segment State-of-Charge (SOC) Meter
    const socRatio = Math.max(0, Math.min(1.0, this.sliderStorage / 500.0));
    const activeBars = Math.ceil(socRatio * 5);

    for (let b = 1; b <= 5; b++) {
      const bx = -14 + (b - 1) * 6.5;
      const by = -4;
      const bw = 4.5;
      const bh = 14;

      if (b <= activeBars) {
        let barColor = '#22c55e';
        if (b <= 2) barColor = '#ef4444';
        else if (b <= 4) barColor = '#eab308';

        ctx.fillStyle = barColor;
        ctx.fillRect(bx, by, bw, bh);

        // Discharging glow
        if (this.batteryMode === 'discharging') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(bx, by, bw, bh);
        }
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(bx, by, bw, bh);
      }
    }

    // Battery label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('485 MWh BESS', 0, 22);

    // Live Flow Badge Pill above container
    let pillText = `${Math.round(this.sliderStorage)} MWh`;
    let pillBorder = '#64748b';
    let pillBg = 'rgba(15, 23, 42, 0.90)';

    if (this.batteryMode === 'charging') {
      pillText = `▲ +${Math.round(this.batteryFlowMW)} MW`;
      pillBorder = '#4ade80';
    } else if (this.batteryMode === 'discharging') {
      pillText = `▼ -${Math.round(this.batteryFlowMW)} MW`;
      pillBorder = '#f87171';
    } else if (this.sliderStorage <= 0.5) {
      pillText = `0 MWh EMPTY`;
      pillBorder = '#ef4444';
    }

    ctx.font = 'bold 8px Fredoka, sans-serif';
    const pw = ctx.measureText(pillText).width + 8;
    ctx.fillStyle = pillBg;
    ctx.strokeStyle = pillBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    this.drawSafeRoundRect(ctx, -pw / 2, -26, pw, 10, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = pillBorder;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pillText, 0, -21);

    ctx.restore();
  }

  drawHouse(n) {
    const ctx = this.ctx;
    const hours = this.timeMinutes / 60;
    const isNightTime = hours >= 18.0 || hours <= 6.5;
    const isTwilight = hours > 16.8 && hours < 18.0;

    const isLit = n.isLit && n.brownoutLevel < 0.8;
    const isBrownout = n.brownoutLevel > 0.2;

    // Building exterior walls
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = isBrownout ? '#ef4444' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    this.drawSafeRoundRect(ctx, -20, -8, 40, 26, 4);
    ctx.fill();
    ctx.stroke();

    // Sloped roof
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(-24, -8);
    ctx.lineTo(0, -26);
    ctx.lineTo(24, -8);
    ctx.closePath();
    ctx.fill();

    // Window illumination logic
    let windowColor = '#0f172a';
    let glowIntensity = 0;

    if (n.brownoutLevel >= 0.8 || !isLit) {
      windowColor = '#0f172a';
      glowIntensity = 0;
    } else if (isBrownout) {
      const flicker = Math.sin(n.flickerPhase * 2.5) > 0;
      windowColor = flicker ? '#f97316' : '#451a03';
      glowIntensity = flicker ? 4 : 0;
    } else if (isNightTime || isTwilight) {
      // 🌙 Evening & Night Peak: Radiant golden incandescent windows
      windowColor = '#facc15';
      glowIntensity = isNightTime ? 12 : 6;
    } else {
      // ☀️ Daytime: Soft cyan glass reflection
      windowColor = '#67e8f9';
      glowIntensity = 2;
    }

    ctx.fillStyle = windowColor;
    if (glowIntensity > 0) {
      ctx.shadowColor = (windowColor === '#f97316') ? '#f97316' : '#facc15';
      ctx.shadowBlur = glowIntensity;
    }
    ctx.fillRect(-14, -2, 9, 9);
    ctx.fillRect(5, -2, 9, 9);
    ctx.shadowBlur = 0;

    // Ground porch light projection cone during evening/night illumination
    if ((isNightTime || isTwilight) && isLit && !isBrownout) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-14, 18);
      ctx.lineTo(-24, 34);
      ctx.lineTo(24, 34);
      ctx.lineTo(14, 18);
      ctx.closePath();
      ctx.fillStyle = 'rgba(250, 204, 21, 0.12)';
      ctx.fill();
      ctx.restore();
    }

    ctx.font = '12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    const moodEmoji = isBrownout ? '😰' : '😃';
    ctx.fillText(`${n.icon} ${moodEmoji}`, 0, -32);

    ctx.fillStyle = isBrownout ? '#f87171' : '#cbd5e1';
    ctx.font = '10px Fredoka, sans-serif';
    ctx.fillText(n.name, 0, 28);
  }

  drawElectrons() {
    const ctx = this.ctx;
    ctx.save();

    this.packets.forEach((p) => {
      const x = p.fromNode.x + p.progress * (p.toNode.x - p.fromNode.x);
      const y = p.fromNode.y + p.progress * (p.toNode.y - p.fromNode.y);

      if (p.isEvaporating && p.evaporationProgress > 0) {
        ctx.fillStyle = `rgba(249, 115, 22, ${Math.max(0, 1 - p.evaporationProgress)})`;
        ctx.beginPath();
        ctx.arc(x, y - p.evaporationProgress * 15, 6 + p.evaporationProgress * 10, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      ctx.fillStyle = p.isSolar ? '#22c55e' : '#ef4444';
      ctx.shadowColor = p.isSolar ? '#4ade80' : '#f87171';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(x, y, p.isSolar ? 6 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    ctx.restore();
  }

  drawBatterySurgeParticles() {
    const ctx = this.ctx;
    ctx.save();

    this.batterySurgeParticles.forEach((bp) => {
      ctx.fillStyle = bp.color;
      ctx.shadowColor = bp.color;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = bp.alpha;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, bp.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  drawPhotonSparkles() {
    const ctx = this.ctx;
    ctx.save();

    this.photonSparkles.forEach((sp) => {
      ctx.globalAlpha = sp.alpha;
      ctx.font = '14px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sp.char, sp.x, sp.y);
    });

    ctx.restore();
  }

  drawPuffsAndPopups() {
    const ctx = this.ctx;
    ctx.save();

    this.smokePuffs.forEach((s) => {
      const rgb = s.colorRGB || '30, 41, 59';
      const a = s.currentAlpha !== undefined ? s.currentAlpha : s.alpha;
      ctx.fillStyle = `rgba(${rgb}, ${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    this.popTexts.forEach((pt) => {
      this.drawPopBadge(pt);
    });

    ctx.restore();
  }

  drawPopBadge(pt) {
    const ctx = this.ctx;
    ctx.save();

    ctx.font = 'bold 12px Fredoka, sans-serif';
    const textWidth = ctx.measureText(pt.text).width;
    const badgeW = Math.max(textWidth + 24, 60);
    const badgeH = 26;
    const radius = 6;

    ctx.globalAlpha = Math.max(0, Math.min(1, pt.alpha));
    ctx.translate(pt.x, pt.y);

    if (pt.scale && pt.scale < 1.0) {
      ctx.scale(pt.scale, pt.scale);
    }

    // High-contrast rounded badge background
    ctx.fillStyle = pt.badgeBg || 'rgba(10, 15, 26, 0.90)';
    ctx.strokeStyle = pt.color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;

    ctx.beginPath();
    this.drawSafeRoundRect(ctx, -badgeW / 2, -badgeH / 2, badgeW, badgeH, radius);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Badge text label
    ctx.fillStyle = pt.textColor || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pt.text, 0, 0);

    ctx.restore();
  }

  handleCanvasClick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    let clickedNode = null;
    for (const node of this.nodes.values()) {
      const dx = mouseX - node.x;
      const dy = mouseY - node.y;
      if (Math.sqrt(dx * dx + dy * dy) < 38) {
        clickedNode = node;
        break;
      }
    }

    if (clickedNode) {
      if (clickedNode.id.startsWith('house_')) {
        const isPowered = clickedNode.isLit && clickedNode.brownoutLevel < 0.5;
        this.ripples.push({
          x: clickedNode.x,
          y: clickedNode.y,
          radius: 8,
          maxRadius: 70,
          speed: 120,
          color: isPowered ? '#4ade80' : '#ef4444',
          alpha: 1.0
        });
        this.spawnPopup(
          clickedNode.x,
          clickedNode.y - 42,
          isPowered ? `⚡ ${clickedNode.name}: 230V Active` : `⚠️ ${clickedNode.name}: Low Power`,
          isPowered ? '#4ade80' : '#ef4444',
          { maxLife: 1.6 }
        );
      } else if (clickedNode.id === 'fanStation') {
        this.ripples.push({
          x: clickedNode.x,
          y: clickedNode.y,
          radius: 10,
          maxRadius: 75,
          speed: 130,
          color: '#38bdf8',
          alpha: 1.0
        });
        this.spawnPopup(
          clickedNode.x,
          clickedNode.y - 42,
          `🌀 Muppandal Wind Corridor (1,500 MW)`,
          '#38bdf8',
          { maxLife: 1.6 }
        );
      } else if (clickedNode.id === 'plant') {
        const isSolar = clickedNode.name.includes('Solar');
        if (isSolar) {
          this.ecoScore += 100;
          this.ripples.push({
            x: clickedNode.x,
            y: clickedNode.y,
            radius: 12,
            maxRadius: 90,
            speed: 130,
            color: '#facc15',
            alpha: 1.0
          });
          this.spawnPopup(
            clickedNode.x,
            clickedNode.y - 42,
            '⭐ KAMUTHI SOLAR BOOST +100! (சூரிய ஆற்றல்)',
            '#facc15',
            { maxLife: 1.8 }
          );
        } else {
          this.ecoScore = Math.max(0, this.ecoScore - 20);
          this.ripples.push({
            x: clickedNode.x,
            y: clickedNode.y,
            radius: 12,
            maxRadius: 80,
            speed: 100,
            color: '#ef4444',
            alpha: 1.0
          });
          this.spawnPopup(
            clickedNode.x,
            clickedNode.y - 42,
            '💨 COUGH! -20 SMOG PENALTY (புகை மாசு)',
            '#ef4444',
            { maxLife: 1.8 }
          );
        }
      } else if (clickedNode.id === 'substation') {
        this.ripples.push({
          x: clickedNode.x,
          y: clickedNode.y,
          radius: 10,
          maxRadius: 80,
          speed: 120,
          color: '#eab308',
          alpha: 1.0
        });
        this.spawnPopup(
          clickedNode.x,
          clickedNode.y - 42,
          '⚡ SUBSTATION & 485 MWh BESS (230V AC)',
          '#eab308',
          { maxLife: 1.6 }
        );
      }
      return clickedNode;
    } else {
      // Gentle ripple feedback on clicking open terrain
      this.ripples.push({
        x: mouseX,
        y: mouseY,
        radius: 6,
        maxRadius: 45,
        speed: 90,
        color: 'rgba(56, 189, 248, 0.5)',
        alpha: 0.7
      });
      return null;
    }
  }
}
