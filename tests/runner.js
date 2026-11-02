#!/usr/bin/env node
/**
 * ============================================================================
 * TN GRID MASTER — MASTER E2E TEST RUNNER (tests/runner.js)
 * Executes all 5 test tiers, maps to Features 1..35, and outputs status report
 * ============================================================================
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const SUITES = [
  { name: 'Tier 1: Feature Coverage (F01 - F35)', file: 'tests/tier1_features.test.js' },
  { name: 'Tier 2: Boundary & Corner Cases',      file: 'tests/tier2_boundaries.test.js' },
  { name: 'Tier 3: Pairwise Cross-Interactions',   file: 'tests/tier3_pairwise.test.js' },
  { name: 'Tier 4: Real-World Scenarios',         file: 'tests/tier4_scenarios.test.js' },
  { name: 'Tier 5: Adversarial Hardening',        file: 'tests/tier5_adversarial.test.js' }
];

console.log('='.repeat(80));
console.log('⚡ TN GRID MASTER — COMPREHENSIVE E2E TEST RUNNER ⚡');
console.log('='.repeat(80));
console.log(`Working Directory: ${REPO_ROOT}`);
console.log(`Node Version:      ${process.version}`);
console.log(`Timestamp:         ${new Date().toISOString()}`);
console.log('='.repeat(80));
console.log('');

let totalPassed = 0;
let totalFailed = 0;
const suiteResults = [];

for (const suite of SUITES) {
  process.stdout.write(`▶ Running ${suite.name}... `);
  const startTime = Date.now();
  
  const res = spawnSync(process.execPath, ['--test', suite.file], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const durationMs = Date.now() - startTime;
  const output = (res.stdout || '') + (res.stderr || '');
  
  // Parse pass/fail counts from node:test output (supports both TTY spec and piped TAP format)
  const passMatch = output.match(/(?:ℹ|#)\s+pass\s+(\d+)/i);
  const failMatch = output.match(/(?:ℹ|#)\s+fail\s+(\d+)/i);
  
  const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failed = failMatch ? parseInt(failMatch[1], 10) : (res.status === 0 ? 0 : 1);

  totalPassed += passed;
  totalFailed += failed;

  suiteResults.push({
    name: suite.name,
    file: suite.file,
    passed,
    failed,
    durationMs,
    exitCode: res.status,
    output
  });

  if (res.status === 0 && failed === 0) {
    console.log(`\x1b[32m✔ PASS\x1b[0m (${passed} passed, ${durationMs}ms)`);
  } else {
    console.log(`\x1b[31m✖ FAIL\x1b[0m (${passed} passed, ${failed} failed, ${durationMs}ms)`);
  }
}

console.log('');
console.log('='.repeat(80));
console.log('📊 TEST EXECUTION SUMMARY BY TIER');
console.log('='.repeat(80));

for (const res of suiteResults) {
  const statusBadge = res.failed === 0 ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${statusBadge} ${res.name.padEnd(46)} ${String(res.passed).padStart(3)} passed | ${String(res.failed).padStart(2)} failed | ${res.durationMs}ms`);
}

console.log('-'.repeat(80));
console.log(`TOTALS: ${totalPassed} passed, ${totalFailed} failed across ${SUITES.length} test suites.`);
console.log('='.repeat(80));

// Milestone Breakdown Matrix
console.log('\n📌 FEATURE MILESTONE PROGRESSION STATUS:');
console.log('  Milestone M1 (Physics & Canvas Reactivity): In Progress');
console.log('  Milestone M2 (Audio, Haptics & QR Modal):   Planned');
console.log('  Milestone M3 (Mobile Challenge & Pass):     Planned');
console.log('  Milestone M4 (Final Integration Pass):      Planned');
console.log('  Milestone M5 (Standalone Build & Git):      Planned (Build script verified)');
console.log('='.repeat(80));

// If running in strict CI mode and failures exist, exit with code 1
// If running with --report flag, exit 0 so audit logs can be collected
if (process.argv.includes('--report')) {
  process.exit(0);
} else {
  process.exit(totalFailed === 0 ? 0 : 1);
}
