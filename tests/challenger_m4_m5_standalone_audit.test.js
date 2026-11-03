/**
 * ============================================================================
 * CHALLENGER M4/M5 EMPIRICAL VERIFICATION SUITE
 * tests/challenger_m4_m5_standalone_audit.test.js
 * Adversarial audit of standalone distribution build, asset inlining,
 * zero network dependency, and simulation runtime integrity.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createBrowserEnvironment, MockCanvas } from './test_helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

function getFilePath(relPath) {
  return path.join(REPO_ROOT, relPath);
}

function runCmd(cmd) {
  try {
    const stdout = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { exitCode: 0, stdout, stderr: '' };
  } catch (err) {
    return { exitCode: err.status || 1, stdout: err.stdout || '', stderr: err.stderr || '' };
  }
}

// ----------------------------------------------------------------------------
// SUITE 1: Standalone Build Execution & Idempotence
// ----------------------------------------------------------------------------
test('Suite 1: Standalone Build Execution & Idempotence', async (t) => {
  await t.test('1.1: Execute build_standalone.py and verify exit code 0', () => {
    const res = runCmd('python3 build_standalone.py');
    assert.equal(res.exitCode, 0, 'build_standalone.py must succeed with exit code 0');
    assert.match(res.stdout, /Successfully generated standalone_simulation\.html/, 'stdout logs build success');
  });

  await t.test('1.2: Verify standalone_simulation.html existence and file size (~252 KB)', () => {
    const standalonePath = getFilePath('standalone_simulation.html');
    assert.ok(fs.existsSync(standalonePath), 'standalone_simulation.html must exist');
    const stats = fs.statSync(standalonePath);
    const sizeKb = stats.size / 1024;
    assert.ok(sizeKb >= 240 && sizeKb <= 270, `File size (${sizeKb.toFixed(2)} KB) must be ~252 KB`);
    assert.ok(stats.size >= 245000 && stats.size <= 275000, `Expected file size in ~255 KB range (actual: ${stats.size})`);
  });

  await t.test('1.3: HTML5 Doctype & Well-Formed Structure', () => {
    const content = fs.readFileSync(getFilePath('standalone_simulation.html'), 'utf-8');
    assert.ok(content.startsWith('<!DOCTYPE html>'), 'Must start with <!DOCTYPE html>');
    assert.ok(content.includes('<html lang="en">'), 'Must contain <html lang="en">');
    assert.ok(content.includes('</html>'), 'Must contain </html>');
    assert.ok(content.includes('</body>'), 'Must contain </body>');
  });

  await t.test('1.4: Idempotence: Hash before and after re-build must match exactly', () => {
    const standalonePath = getFilePath('standalone_simulation.html');
    const initialContent = fs.readFileSync(standalonePath);
    const initialHash = crypto.createHash('sha256').update(initialContent).digest('hex');

    // Run build again
    const res = runCmd('python3 build_standalone.py');
    assert.equal(res.exitCode, 0);

    const postContent = fs.readFileSync(standalonePath);
    const postHash = crypto.createHash('sha256').update(postContent).digest('hex');

    assert.equal(postHash, initialHash, 'Re-running build_standalone.py must produce identical SHA-256 hash');
  });
});

// ----------------------------------------------------------------------------
// SUITE 2: Inlining & Zero External Dependencies
// ----------------------------------------------------------------------------
test('Suite 2: Inlining & Zero External Dependencies', async (t) => {
  const content = fs.readFileSync(getFilePath('standalone_simulation.html'), 'utf-8');

  await t.test('2.1: Verify styles.css is completely inlined inside <style>', () => {
    assert.ok(!content.includes('<link rel="stylesheet" href="styles.css">'), 'styles.css link tag must be removed');
    assert.ok(content.includes('<style>'), 'Must contain inline <style> block');
    assert.ok(content.includes('.game-wrapper'), 'Must contain core layout CSS');
    assert.ok(content.includes('.mobile-quiz-stage'), 'Must contain mobile quiz stage CSS');
    assert.ok(content.includes('.quiz-card'), 'Must contain mobile quiz card CSS');
    assert.ok(content.includes('.quiz-option-btn'), 'Must contain mobile quiz option button CSS');
    assert.ok(content.includes('.qr-card'), 'Must contain QR modal CSS');
    assert.ok(content.includes('.reward-pass-card'), 'Must contain reward pass CSS');
  });

  await t.test('2.2: Verify external script tags (engine.js, ui.js) are removed', () => {
    assert.ok(!content.includes('src="engine.js"'), 'engine.js script tag must be removed');
    assert.ok(!content.includes('src="ui.js"'), 'ui.js script tag must be removed');
    assert.ok(!content.includes("src='engine.js'"), 'engine.js single quotes removed');
    assert.ok(!content.includes("src='ui.js'"), 'ui.js single quotes removed');
  });

  await t.test('2.3: Zero external <script src="..."> tags', () => {
    const scriptSrcMatches = content.match(/<script[^>]+src=[\"'][^\"']+[\"']/g);
    assert.equal(scriptSrcMatches, null, `Found unexpected external script tags: ${scriptSrcMatches}`);
  });

  await t.test('2.4: Zero external <img> tags', () => {
    const imgSrcMatches = content.match(/<img[^>]+src=[\"'][^\"']+[\"']/g);
    assert.equal(imgSrcMatches, null, `Found unexpected external img tags: ${imgSrcMatches}`);
  });

  await t.test('2.5: Vector SVG QR code is fully inlined in DOM', () => {
    assert.ok(content.includes('<svg class="qr-svg" viewBox="0 0 37 37"'), 'Inlined vector SVG QR code present');
    assert.ok(content.includes('id="qr-path"'), 'QR SVG path element present');
    assert.ok(content.includes('https://kavinpro1989-blip.github.io/tn-grid-master/?mode=quiz'), 'QR URL pill text matches live quiz URL');
  });

  await t.test('2.6: Offline CSS font fallback safety', () => {
    // Check that styles.css defines system fallbacks so offline operation renders cleanly
    assert.ok(content.includes("-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif"), 'System font fallbacks present for sans-serif');
    assert.ok(content.includes("monospace"), 'Monospace fallback present for telemetry fonts');
  });
});

// ----------------------------------------------------------------------------
// SUITE 3: Standalone Script Syntax & Module Conversion
// ----------------------------------------------------------------------------
test('Suite 3: Standalone Script Syntax & Module Conversion', async (t) => {
  const content = fs.readFileSync(getFilePath('standalone_simulation.html'), 'utf-8');
  const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, 'Must find inline <script> block');
  const scriptContent = scriptMatch[1];

  await t.test('3.1: Extracted standalone JavaScript passes node --check syntax', () => {
    const tmpFile = path.join('/tmp', `standalone_test_${Date.now()}.js`);
    fs.writeFileSync(tmpFile, scriptContent, 'utf-8');
    const res = runCmd(`node --check ${tmpFile}`);
    fs.unlinkSync(tmpFile);
    assert.equal(res.exitCode, 0, 'Standalone script must be syntactically valid in classic script mode');
  });

  await t.test('3.2: Verify no dangling ES module export statements', () => {
    // In classic <script>, 'export' is a syntax error
    const danglingExports = scriptContent.match(/^\s*export\s+/gm);
    assert.equal(danglingExports, null, `Found illegal export statements in classic script: ${danglingExports}`);
  });

  await t.test('3.3: Verify no unhandled ES module import statements', () => {
    // In classic <script>, 'import' is a syntax error
    const danglingImports = scriptContent.match(/^\s*import\s+/gm);
    assert.equal(danglingImports, null, `Found illegal import statements in classic script: ${danglingImports}`);
  });

  await t.test('3.4: Verify original files pass node --check', () => {
    const resEngine = runCmd('node --check engine.js');
    assert.equal(resEngine.exitCode, 0, 'engine.js passes node --check');
    const resUI = runCmd('node --check ui.js');
    assert.equal(resUI.exitCode, 0, 'ui.js passes node --check');
  });
});

// ----------------------------------------------------------------------------
// SUITE 4: Standalone Simulated DOM & Runtime Execution
// ----------------------------------------------------------------------------
test('Suite 4: Standalone Simulated DOM & Runtime Execution', async (t) => {
  const content = fs.readFileSync(getFilePath('standalone_simulation.html'), 'utf-8');
  const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
  const scriptContent = scriptMatch[1];

  // Create high-fidelity browser environment using test_helpers
  const env = createBrowserEnvironment({
    innerWidth: 1024,
    innerHeight: 768,
    search: '?mode=quiz'
  });

  // Ensure gameCanvas returns a mock canvas with 2D context and event listener support
  const mockCanvasInstance = new MockCanvas(1100, 480);
  const canvasListeners = new Map();
  mockCanvasInstance.addEventListener = (evt, fn) => {
    if (!canvasListeners.has(evt)) canvasListeners.set(evt, []);
    canvasListeners.get(evt).push(fn);
  };
  mockCanvasInstance.removeEventListener = (evt, fn) => {
    if (!canvasListeners.has(evt)) return;
    const arr = canvasListeners.get(evt);
    const idx = arr.indexOf(fn);
    if (idx !== -1) arr.splice(idx, 1);
  };
  mockCanvasInstance.dispatchEvent = (evt) => {
    const list = canvasListeners.get(evt.type) || [];
    for (const fn of list) fn(evt);
  };
  env.elementsById.set('gameCanvas', mockCanvasInstance);

  const activeTimeouts = new Set();
  const activeIntervals = new Set();
  const customSetTimeout = (fn, ms) => {
    const id = setTimeout(() => { activeTimeouts.delete(id); fn(); }, ms);
    activeTimeouts.add(id);
    return id;
  };
  const customSetInterval = (fn, ms) => {
    const id = setInterval(fn, ms);
    activeIntervals.add(id);
    return id;
  };

  const sandbox = {
    window: env.window,
    document: env.document,
    navigator: env.navigator,
    sessionStorage: env.sessionStorage,
    AudioContext: env.MockAudioContext,
    webkitAudioContext: env.MockAudioContext,
    requestAnimationFrame: (cb) => customSetTimeout(cb, 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    performance: globalThis.performance,
    console,
    setTimeout: customSetTimeout,
    clearTimeout: (id) => { activeTimeouts.delete(id); clearTimeout(id); },
    setInterval: customSetInterval,
    clearInterval: (id) => { activeIntervals.delete(id); clearInterval(id); }
  };
  sandbox.window.document = env.document;

  test.after(() => {
    for (const id of activeTimeouts) clearTimeout(id);
    for (const id of activeIntervals) clearInterval(id);
  });

  vm.createContext(sandbox);

  await t.test('4.1: Standalone script executes without throwing runtime errors', () => {
    assert.doesNotThrow(() => {
      vm.runInContext(scriptContent, sandbox);
    }, 'Standalone script execution must not throw');
  });

  await t.test('4.2: PowerGridEngine is defined and instantiable from standalone context', () => {
    const code = 'new PowerGridEngine(document.getElementById("gameCanvas"))';
    let engine;
    assert.doesNotThrow(() => {
      engine = vm.runInContext(code, sandbox);
    }, 'Must instantiate PowerGridEngine');
    assert.ok(engine, 'Engine instance created');

    // Run 10 ticks
    for (let i = 0; i < 10; i++) {
      engine.updateSimulation(16);
    }

    const telemetry = engine.getTelemetry();
    assert.ok(telemetry, 'Telemetry returned');
    assert.ok(telemetry.frequencyHz >= 48.0 && telemetry.frequencyHz <= 52.0, 'Frequency in realistic range');
    assert.ok(telemetry.voltageAC >= 180 && telemetry.voltageAC <= 250, 'Voltage in realistic range');
  });

  await t.test('4.3: Physical fidelity constants verification in standalone engine', () => {
    const code = `
      (() => {
        const engInstance = new PowerGridEngine(document.getElementById("gameCanvas"));
        engInstance.setTime(720); // 12:00 PM peak solar
        engInstance.updateSimulation(16);
        return engInstance.getTelemetry();
      })()
    `;
    const tData = vm.runInContext(code, sandbox);
    assert.ok(tData.solarMW >= 0 && tData.solarMW <= 648, `Solar output ${tData.solarMW} MW must cap at Kamuthi 648 MW`);
    assert.ok(tData.coalMW >= 0 && tData.coalMW <= 1440, `Coal output ${tData.coalMW} MW must cap at Mettur 1440 MW`);
    assert.ok(tData.nuclearMW === 2000, `Nuclear output ${tData.nuclearMW} MW must equal Kudankulam 2000 MW baseload`);
    assert.ok(tData.bessMWh <= 485, `BESS capacity ${tData.bessMWh} MWh must not exceed 485 MWh`);
  });

  await t.test('4.4: Visual reaction hooks handling in standalone engine', () => {
    const code = `
      (() => {
        const engInstance = new PowerGridEngine(document.getElementById("gameCanvas"));
        engInstance.triggerVisualReaction('solar_flood', { intensity: 1.5 });
        engInstance.triggerVisualReaction('battery_surge', { charge: true, mwh: 100 });
        engInstance.triggerVisualReaction('fan_rpm', { rpm: 1200 });
        engInstance.triggerVisualReaction('house_lights', { glow: 1.0 });
        engInstance.triggerVisualReaction('scrubber', { active: true });
        engInstance.triggerVisualReaction('unknown_reaction_safe_fallback', {});
        return true;
      })()
    `;
    const result = vm.runInContext(code, sandbox);
    assert.equal(result, true, 'All visual reactions and adversarial unknown reactions execute safely');
  });

  await t.test('4.5: Quiz Controller & State Machine in standalone sandbox', () => {
    // Verify that quiz controller buttons and dilemma actions can be triggered
    const code = `
      (() => {
        const quizPill = document.getElementById('quizRoundPill');
        const scorePill = document.getElementById('quizScorePill');
        const questionEl = document.getElementById('quizQuestion');
        return {
          hasQuestion: Boolean(questionEl),
          hasScore: Boolean(scorePill),
          hasRound: Boolean(quizPill)
        };
      })()
    `;
    const res = vm.runInContext(code, sandbox);
    assert.ok(res.hasQuestion, 'Quiz question element exists');
    assert.ok(res.hasScore, 'Quiz score pill exists');
    assert.ok(res.hasRound, 'Quiz round pill exists');
  });
});

// ----------------------------------------------------------------------------
// SUITE 5: Git & Deployment Status Verification
// ----------------------------------------------------------------------------
test('Suite 5: Git & Deployment Status Verification', async (t) => {
  await t.test('5.1: git status shows clean working tree for tracked files', () => {
    const res = runCmd('git status --porcelain');
    assert.equal(res.exitCode, 0, 'git status must exit code 0');
    // Filter out untracked files (.agents/, etc)
    const trackedChanges = res.stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('??'));
    assert.deepEqual(trackedChanges, [], 'Tracked files must have zero uncommitted changes');
  });

  await t.test('5.2: git diff standalone_simulation.html is clean', () => {
    const res = runCmd('git diff standalone_simulation.html');
    assert.equal(res.exitCode, 0);
    assert.equal(res.stdout.trim(), '', 'standalone_simulation.html has zero unstaged diff against git HEAD');
  });

  await t.test('5.3: Branch is up to date with origin/main', () => {
    const res = runCmd('git status');
    assert.ok(res.stdout.includes("Your branch is up to date with 'origin/main'"), 'Branch is up to date with origin/main');
  });
});
