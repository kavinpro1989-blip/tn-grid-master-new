/**
 * ============================================================================
 * TEST HELPERS & MOCK HARNESS (tests/test_helpers.js)
 * High-fidelity, deterministic browser mocks for opaque-box E2E testing
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * Reads a project file as UTF-8 string
 */
export function readProjectFile(relPath) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf-8');
}

/**
 * Checks if a project file exists
 */
export function fileExists(relPath) {
  return fs.existsSync(path.join(REPO_ROOT, relPath));
}

/**
 * High-fidelity Web Audio API Mock for procedural synthesizer verification
 */
export class MockAudioParam {
  constructor(defaultValue = 0) {
    this.value = defaultValue;
    this.events = [];
  }

  setValueAtTime(val, time) {
    this.value = val;
    this.events.push({ type: 'setValueAtTime', val, time });
    return this;
  }

  exponentialRampToValueAtTime(val, time) {
    this.value = val;
    this.events.push({ type: 'exponentialRampToValueAtTime', val, time });
    return this;
  }

  linearRampToValueAtTime(val, time) {
    this.value = val;
    this.events.push({ type: 'linearRampToValueAtTime', val, time });
    return this;
  }
}

export class MockAudioNode {
  constructor(context, type = 'generic') {
    this.context = context;
    this.type = type;
    this.connections = [];
  }

  connect(target) {
    this.connections.push(target);
    return target;
  }

  disconnect() {
    this.connections = [];
  }
}

export class MockOscillatorNode extends MockAudioNode {
  constructor(context) {
    super(context, 'oscillator');
    this.type = 'sine';
    this.frequency = new MockAudioParam(440);
    this.started = false;
    this.stopped = false;
    this.startTime = null;
    this.stopTime = null;
  }

  start(time = 0) {
    this.started = true;
    this.startTime = time;
    this.context.activeOscillators.push(this);
  }

  stop(time = 0) {
    this.stopped = true;
    this.stopTime = time;
  }
}

export class MockGainNode extends MockAudioNode {
  constructor(context) {
    super(context, 'gain');
    this.gain = new MockAudioParam(1.0);
  }
}

export class MockBiquadFilterNode extends MockAudioNode {
  constructor(context) {
    super(context, 'biquadFilter');
    this.type = 'lowpass';
    this.frequency = new MockAudioParam(1000);
    this.Q = new MockAudioParam(1);
  }
}

export class MockAudioContext {
  constructor() {
    this.state = 'suspended';
    this.currentTime = 0;
    this.destination = new MockAudioNode(this, 'destination');
    this.activeOscillators = [];
    this.createdNodes = [];
    this.resumeCallCount = 0;
  }

  async resume() {
    this.state = 'running';
    this.resumeCallCount++;
    return Promise.resolve();
  }

  createOscillator() {
    const node = new MockOscillatorNode(this);
    this.createdNodes.push(node);
    return node;
  }

  createGain() {
    const node = new MockGainNode(this);
    this.createdNodes.push(node);
    return node;
  }

  createBiquadFilter() {
    const node = new MockBiquadFilterNode(this);
    this.createdNodes.push(node);
    return node;
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

/**
 * Mock HTML Canvas & 2D Context
 */
export class MockCanvas2DContext {
  constructor() {
    this.calls = [];
    this.fillTexts = [];
    this.shadowBlur = 0;
    this.shadowColor = '';
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
    this.globalAlpha = 1.0;
  }

  setTransform(a, b, c, d, e, f) {
    this.calls.push({ method: 'setTransform', args: [a, b, c, d, e, f] });
  }

  clearRect(x, y, w, h) {
    this.calls.push({ method: 'clearRect', args: [x, y, w, h] });
  }

  beginPath() {
    this.calls.push({ method: 'beginPath' });
  }

  arc(x, y, r, sa, ea) {
    this.calls.push({ method: 'arc', args: [x, y, r, sa, ea] });
  }

  rect(x, y, w, h) {
    this.calls.push({ method: 'rect', args: [x, y, w, h] });
  }

  fillRect(x, y, w, h) {
    this.calls.push({ method: 'fillRect', args: [x, y, w, h] });
  }

  strokeRect(x, y, w, h) {
    this.calls.push({ method: 'strokeRect', args: [x, y, w, h] });
  }

  fill() {
    this.calls.push({ method: 'fill', fillStyle: this.fillStyle });
  }

  stroke() {
    this.calls.push({ method: 'stroke', strokeStyle: this.strokeStyle });
  }

  fillText(text, x, y) {
    this.fillTexts.push({ text, x, y, fillStyle: this.fillStyle });
    this.calls.push({ method: 'fillText', args: [text, x, y] });
  }

  measureText(text) {
    return { width: text.length * 8 };
  }

  translate(x, y) {
    this.calls.push({ method: 'translate', args: [x, y] });
  }

  rotate(angle) {
    this.calls.push({ method: 'rotate', args: [angle] });
  }

  scale(sx, sy) {
    this.calls.push({ method: 'scale', args: [sx, sy] });
  }

  setLineDash(segments) {
    this.calls.push({ method: 'setLineDash', args: [segments] });
  }

  getLineDash() {
    return [];
  }

  clip() {
    this.calls.push({ method: 'clip' });
  }

  save() {
    this.calls.push({ method: 'save' });
  }

  restore() {
    this.calls.push({ method: 'restore' });
  }

  moveTo(x, y) {
    this.calls.push({ method: 'moveTo', args: [x, y] });
  }

  lineTo(x, y) {
    this.calls.push({ method: 'lineTo', args: [x, y] });
  }

  quadraticCurveTo(cx, cy, x, y) {
    this.calls.push({ method: 'quadraticCurveTo', args: [cx, cy, x, y] });
  }

  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
    this.calls.push({ method: 'bezierCurveTo', args: [c1x, c1y, c2x, c2y, x, y] });
  }

  closePath() {
    this.calls.push({ method: 'closePath' });
  }

  createLinearGradient() {
    return {
      addColorStop: () => {}
    };
  }

  createRadialGradient() {
    return {
      addColorStop: () => {}
    };
  }
}

export class MockCanvas {
  constructor(width = 1100, height = 480) {
    this.width = width;
    this.height = height;
    this.ctx = new MockCanvas2DContext();
  }

  getContext(type) {
    if (type === '2d') return this.ctx;
    return null;
  }

  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      right: this.width,
      bottom: this.height,
      width: this.width,
      height: this.height
    };
  }
}

/**
 * Lightweight DOM Element Mock
 */
export class MockDOMElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = '';
    this.classList = {
      _classes: new Set(),
      add: (...cls) => cls.forEach(c => this.classList._classes.add(c)),
      remove: (...cls) => cls.forEach(c => this.classList._classes.delete(c)),
      contains: (c) => this.classList._classes.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._classes.has(c)) {
            this.classList._classes.delete(c);
            return false;
          } else {
            this.classList._classes.add(c);
            return true;
          }
        } else if (force) {
          this.classList._classes.add(c);
          return true;
        } else {
          this.classList._classes.delete(c);
          return false;
        }
      }
    };
    this.style = {};
    this.textContent = '';
    this.innerHTML = '';
    this.value = '0';
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = [];
    this.parentElement = null;
  }

  setAttribute(k, v) {
    this.attributes.set(k, String(v));
  }

  getAttribute(k) {
    return this.attributes.get(k) || null;
  }

  removeAttribute(k) {
    this.attributes.delete(k);
  }

  addEventListener(event, fn) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(fn);
  }

  removeEventListener(event, fn) {
    if (!this.listeners.has(event)) return;
    const arr = this.listeners.get(event);
    const idx = arr.indexOf(fn);
    if (idx !== -1) arr.splice(idx, 1);
  }

  dispatchEvent(event) {
    const list = this.listeners.get(event.type) || [];
    for (const fn of list) {
      fn(event);
    }
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this });
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: 100,
      height: 48,
      right: 100,
      bottom: 48
    };
  }
}

/**
 * Creates a complete virtual DOM and Browser Environment
 */
export function createBrowserEnvironment(options = {}) {
  const {
    innerWidth = 1024,
    innerHeight = 768,
    devicePixelRatio = 1,
    search = ''
  } = options;

  const elementsById = new Map();
  const eventListeners = new Map();
  const vibrateCalls = [];

  const mockNavigator = {
    vibrate: (pattern) => {
      vibrateCalls.push(pattern);
      return true;
    },
    userAgent: innerWidth <= 768 ? 'Mobile Safari / Android' : 'Desktop Chrome'
  };

  const mockSessionStorage = {
    _data: new Map(),
    getItem: (k) => mockSessionStorage._data.get(k) || null,
    setItem: (k, v) => mockSessionStorage._data.set(k, String(v)),
    removeItem: (k) => mockSessionStorage._data.delete(k),
    clear: () => mockSessionStorage._data.clear()
  };

  const mockLocation = {
    search,
    href: `http://localhost/${search}`,
    pathname: '/'
  };

  const mockDocument = {
    getElementById: (id) => {
      if (!elementsById.has(id)) {
        elementsById.set(id, new MockDOMElement('div', id));
      }
      return elementsById.get(id);
    },
    querySelector: (sel) => {
      if (sel.startsWith('#')) {
        return mockDocument.getElementById(sel.slice(1));
      }
      return new MockDOMElement('div', '');
    },
    querySelectorAll: (sel) => {
      return [new MockDOMElement('div', '')];
    },
    addEventListener: (ev, fn) => {
      if (!eventListeners.has(ev)) eventListeners.set(ev, []);
      eventListeners.get(ev).push(fn);
    },
    body: new MockDOMElement('body', 'body')
  };

  const mockWindow = {
    innerWidth,
    innerHeight,
    devicePixelRatio,
    location: mockLocation,
    sessionStorage: mockSessionStorage,
    document: mockDocument,
    navigator: mockNavigator,
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    addEventListener: (ev, fn) => {
      if (!eventListeners.has(ev)) eventListeners.set(ev, []);
      eventListeners.get(ev).push(fn);
    },
    removeEventListener: () => {},
    dispatchEvent: (event) => {
      const list = eventListeners.get(event.type) || [];
      for (const fn of list) fn(event);
    },
    requestAnimationFrame: (cb) => setTimeout(cb, 16),
    cancelAnimationFrame: (id) => clearTimeout(id)
  };

  return {
    window: mockWindow,
    document: mockDocument,
    navigator: mockNavigator,
    sessionStorage: mockSessionStorage,
    elementsById,
    vibrateCalls,
    MockAudioContext
  };
}

/**
 * Instantiates the actual PowerGridEngine from engine.js in the mock harness
 */
export async function instantiateEngine(mockCanvas = null, onTelemetry = () => {}) {
  const canvas = mockCanvas || new MockCanvas(1100, 480);
  
  // Set up globals
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = {
      devicePixelRatio: 1,
      innerWidth: 1024,
      innerHeight: 768,
      addEventListener: () => {}
    };
  }
  if (typeof globalThis.requestAnimationFrame === 'undefined') {
    globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  }

  const { PowerGridEngine } = await import('../engine.js');
  const engine = new PowerGridEngine(canvas, onTelemetry);
  return { engine, canvas };
}

/**
 * Execute CLI commands safely and return { stdout, stderr, exitCode }
 */
export function runCLI(cmd) {
  try {
    const stdout = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (err) {
    return {
      stdout: err.stdout ? err.stdout.toString() : '',
      stderr: err.stderr ? err.stderr.toString() : (err.message || ''),
      exitCode: err.status || 1
    };
  }
}
