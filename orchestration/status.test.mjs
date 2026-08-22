import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createStatusOutput, deriveEffectiveStates, validateRegistry } from './status.mjs';

const orchestrationDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(orchestrationDir);
const statusPath = path.join(orchestrationDir, 'status.mjs');
const sourceRegistry = JSON.parse(readFileSync(path.join(orchestrationDir, 'stages.json'), 'utf8'));
const sourceSchema = JSON.parse(readFileSync(path.join(orchestrationDir, 'stages.schema.json'), 'utf8'));

function clone(value) {
  return structuredClone(value);
}

function validate(registry) {
  return validateRegistry(registry, sourceSchema, repoRoot);
}

test('the committed registry is valid', () => {
  const result = validate(sourceRegistry);
  assert.deepEqual(result.errors, []);
});

test('missing dependencies are rejected', () => {
  const registry = clone(sourceRegistry);
  registry.stages.find((stage) => stage.id === 'S8').dependencies.push('S99');
  assert.match(validate(registry).errors.join('\n'), /missing dependency S99/);
});

test('dependency cycles are rejected', () => {
  const registry = clone(sourceRegistry);
  registry.stages.find((stage) => stage.id === 'S0').dependencies = ['S8'];
  assert.match(validate(registry).errors.join('\n'), /Dependency cycle detected/);
});

test('READY is derived only when every dependency is DONE', () => {
  const registry = clone(sourceRegistry);
  registry.stages.find((stage) => stage.id === 'S13').state = 'PENDING';
  registry.stages.find((stage) => stage.id === 'S14').state = 'PENDING';
  registry.stages.find((stage) => stage.id === 'S15').state = 'PENDING';
  registry.stages.find((stage) => stage.id === 'S8').state = 'PENDING';
  const states = deriveEffectiveStates(registry);
  assert.equal(states.get('S8'), 'READY');
  assert.equal(states.get('S13'), 'PENDING');
  assert.equal(states.get('S14'), 'PENDING');
  assert.equal(states.get('S15'), 'PENDING');
  assert.equal(states.get('S16'), 'PENDING');
  assert.equal(states.get('S22'), 'PENDING');
});

test('the CMS extension cannot bypass final SEO validation or the access gate', () => {
  const registry = clone(sourceRegistry);
  registry.stages.find((stage) => stage.id === 'S15').dependencies = [];
  assert.match(validate(registry).errors.join('\n'), /S15 must depend on S14/);
});

test('CMS work unlocks only after S14 and verified Sanity access', () => {
  const registry = clone(sourceRegistry);
  registry.stages.find((stage) => stage.id === 'S14').state = 'DONE';
  registry.stages.find((stage) => stage.id === 'S15').state = 'PENDING';
  let states = deriveEffectiveStates(registry);
  assert.equal(states.get('S15'), 'READY');
  assert.equal(states.get('S16'), 'PENDING');

  registry.stages.find((stage) => stage.id === 'S15').state = 'DONE';
  states = deriveEffectiveStates(registry);
  assert.equal(states.get('S16'), 'READY');
});

test('DONE without evidence is rejected', () => {
  const registry = clone(sourceRegistry);
  const stage = registry.stages.find((candidate) => candidate.id === 'S8');
  stage.state = 'DONE';
  stage.evidence = [];
  assert.match(validate(registry).errors.join('\n'), /S8 is DONE without evidence/);
});

test('overlapping active ownership is rejected', () => {
  const registry = clone(sourceRegistry);
  registry.stages.find((stage) => stage.id === 'S8').state = 'RUNNING';
  registry.stages.find((stage) => stage.id === 'S9').state = 'RUNNING';
  registry.stages.find((stage) => stage.id === 'S8').ownedPaths = ['scripts/shared/**'];
  registry.stages.find((stage) => stage.id === 'S9').ownedPaths = ['scripts/shared/file.js'];
  assert.match(validate(registry).errors.join('\n'), /Ownership conflict: S8/);
});

test('four distinct worker lanes can run simultaneously', () => {
  const registry = clone(sourceRegistry);
  registry.stages.find((stage) => stage.id === 'S12').state = 'PENDING';
  registry.stages.find((stage) => stage.id === 'S13').state = 'PENDING';
  for (const id of ['S8', 'S9', 'S10', 'S11']) registry.stages.find((stage) => stage.id === id).state = 'RUNNING';
  const result = validate(registry);
  assert.equal(result.errors.some((error) => error.includes('active workers exceed')), false);
  assert.equal(result.errors.some((error) => error.includes('simultaneous active stages')), false);
});

test('machine-readable output is deterministic', () => {
  const validation = validate(sourceRegistry);
  const first = JSON.stringify(createStatusOutput(sourceRegistry, validation));
  const second = JSON.stringify(createStatusOutput(sourceRegistry, validate(sourceRegistry)));
  assert.equal(first, second);
});

test('the CLI is read-only', () => {
  const temporaryDir = mkdtempSync(path.join(os.tmpdir(), 'esencial-status-'));
  const registryPath = path.join(temporaryDir, 'stages.json');
  const schemaPath = path.join(temporaryDir, 'stages.schema.json');
  writeFileSync(registryPath, `${JSON.stringify(sourceRegistry, null, 2)}\n`);
  writeFileSync(schemaPath, `${JSON.stringify(sourceSchema, null, 2)}\n`);
  const before = [registryPath, schemaPath].map((filePath) => ({
    filePath,
    content: readFileSync(filePath, 'utf8'),
    size: statSync(filePath).size,
    mtimeMs: statSync(filePath).mtimeMs,
  }));
  const result = spawnSync(process.execPath, [statusPath, '--registry', registryPath, '--schema', schemaPath, '--root', repoRoot, '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  for (const snapshot of before) {
    assert.equal(readFileSync(snapshot.filePath, 'utf8'), snapshot.content);
    assert.equal(statSync(snapshot.filePath).size, snapshot.size);
    assert.equal(statSync(snapshot.filePath).mtimeMs, snapshot.mtimeMs);
  }
});
