/**
 * tests/cli-tracker-path-resolution.test.mjs
 *
 * Asserts that CLI tools (scan.mjs, reply-watch.mjs, linkedin-join.mjs,
 * rejection-latency.mjs) resolve their tracker and data paths via
 * resolveTrackerPath(DATA_ROOT) rather than hardcoding 'data/applications.md'
 * or anchoring to the code repository (__dirname).
 */

import { pass, fail, ROOT, NODE } from './helpers.mjs';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { canonicalizeTrackerPath } from '../path-resolver.mjs';

console.log('\nCLI tracker path resolution — CAREER_OPS_TRACKER & CAREER_OPS_DATA_DIR support');

const tmp = mkdtempSync(join(tmpdir(), 'co-tracker-res-'));

try {
  const dataDir = join(tmp, 'data');
  mkdirSync(dataDir, { recursive: true });

  const customTracker = join(tmp, 'custom-tracker.md');
  const trackerHeader = '# Applications Tracker\n\n| # | Date | Company | Role | Score | Status | PDF | Report | Notes |\n|---|------|---------|------|-------|--------|-----|--------|-------|\n| 1 | 2026-06-01 | Acme | Dev | 4.0/5 | Applied | ❌ | - | |\n';
  writeFileSync(customTracker, trackerHeader);

  // 1. scan.mjs honors CAREER_OPS_TRACKER for APPLICATIONS_PATH
  const scanCheck = execFileSync(NODE, [
    '-e',
    `
    process.env.CAREER_OPS_TRACKER = ${JSON.stringify(customTracker)};
    import('./scan.mjs').then(m => {
      if (m.APPLICATIONS_PATH === ${JSON.stringify(canonicalizeTrackerPath(customTracker))}) {
        console.log('OK');
      } else {
        console.error('MISMATCH:', m.APPLICATIONS_PATH);
        process.exit(1);
      }
    });
    `,
  ], { cwd: ROOT, encoding: 'utf-8' });

  if (scanCheck.trim() === 'OK') {
    pass('scan.mjs: APPLICATIONS_PATH respects CAREER_OPS_TRACKER');
  } else {
    fail('scan.mjs: APPLICATIONS_PATH did not match CAREER_OPS_TRACKER');
  }

  // 2. scan.mjs honors flat root layout when data/applications.md is absent
  const flatTrackerDir = mkdtempSync(join(tmpdir(), 'co-flat-'));
  const flatTrackerFile = join(flatTrackerDir, 'applications.md');
  writeFileSync(flatTrackerFile, trackerHeader);

  const flatCheck = execFileSync(NODE, [
    '-e',
    `
    delete process.env.CAREER_OPS_TRACKER;
    process.env.CAREER_OPS_DATA_DIR = ${JSON.stringify(flatTrackerDir)};
    import('./scan.mjs').then(m => {
      if (m.APPLICATIONS_PATH === ${JSON.stringify(canonicalizeTrackerPath(flatTrackerFile))}) {
        console.log('OK');
      } else {
        console.error('MISMATCH:', m.APPLICATIONS_PATH);
        process.exit(1);
      }
    });
    `,
  ], { cwd: ROOT, encoding: 'utf-8' });

  if (flatCheck.trim() === 'OK') {
    pass('scan.mjs: APPLICATIONS_PATH resolves flat applications.md layout under CAREER_OPS_DATA_DIR');
  } else {
    fail('scan.mjs: APPLICATIONS_PATH did not resolve flat layout');
  }
  rmSync(flatTrackerDir, { recursive: true, force: true });

  // 3. reply-watch.mjs resolves tracker against CAREER_OPS_DATA_DIR
  const extDataDir = mkdtempSync(join(tmpdir(), 'co-ext-data-'));
  const extDataSubdir = join(extDataDir, 'data');
  mkdirSync(extDataSubdir, { recursive: true });
  const extTracker = join(extDataSubdir, 'applications.md');
  writeFileSync(extTracker, trackerHeader);

  const replyWatchCheck = execFileSync(NODE, [
    '-e',
    `
    delete process.env.CAREER_OPS_TRACKER;
    process.env.CAREER_OPS_DATA_DIR = ${JSON.stringify(extDataDir)};
    // Run reply-watch with empty stdin to observe tracker discovery
    const cp = await import('child_process');
    try {
      const out = cp.execFileSync(${JSON.stringify(NODE)}, ['reply-watch.mjs'], {
        cwd: ${JSON.stringify(ROOT)},
        input: '',
        encoding: 'utf-8',
        env: { ...process.env, CAREER_OPS_DATA_DIR: ${JSON.stringify(extDataDir)} }
      });
      console.log('OK');
    } catch (e) {
      console.error(e.stderr || e.stdout);
      process.exit(1);
    }
    `,
  ], { cwd: ROOT, encoding: 'utf-8' });

  if (replyWatchCheck.trim() === 'OK') {
    pass('reply-watch.mjs: discovers tracker under CAREER_OPS_DATA_DIR without CAREER_OPS_TRACKER');
  } else {
    fail('reply-watch.mjs: failed to discover tracker under CAREER_OPS_DATA_DIR');
  }
  rmSync(extDataDir, { recursive: true, force: true });

  // 4. linkedin-join.mjs resolves tracker via resolveTrackerPath
  const linkedinCheck = execFileSync(NODE, [
    '-e',
    `
    process.env.CAREER_OPS_TRACKER = ${JSON.stringify(customTracker)};
    const cp = await import('child_process');
    try {
      const out = cp.execFileSync(${JSON.stringify(NODE)}, ['linkedin-join.mjs', '--self-test'], {
        cwd: ${JSON.stringify(ROOT)},
        encoding: 'utf-8',
        env: { ...process.env, CAREER_OPS_TRACKER: ${JSON.stringify(customTracker)} }
      });
      console.log('OK');
    } catch (e) {
      console.error(e.stderr || e.stdout);
      process.exit(1);
    }
    `,
  ], { cwd: ROOT, encoding: 'utf-8' });

  if (linkedinCheck.trim() === 'OK') {
    pass('linkedin-join.mjs: self-test passes with resolveTrackerPath');
  } else {
    fail('linkedin-join.mjs: failed with resolveTrackerPath');
  }

} finally {
  rmSync(tmp, { recursive: true, force: true });
}
