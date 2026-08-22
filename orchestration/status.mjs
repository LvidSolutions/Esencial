import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const EXPECTED_STAGE_IDS = Array.from({ length: 23 }, (_, index) => `S${index}`);
const ACTIVE_OWNERSHIP_STATES = new Set(['READY', 'RUNNING', 'TESTING']);
const ACTIVE_WORK_STATES = new Set(['RUNNING', 'TESTING']);
const WORKER_LANES = new Set(['Worker A', 'Worker B', 'Worker C', 'Worker D']);
const MODEL_MATRIX = {
  S0: ['GPT-5.6 Sol', 'high'],
  S1: ['GPT-5.6 Terra', 'medium'],
  S2: ['GPT-5.6 Sol', 'high'],
  S3: ['GPT-5.6 Sol', 'high'],
  S4: ['GPT-5.6 Sol', 'high'],
  S5: ['GPT-5.6 Terra', 'high'],
  S6: ['GPT-5.6 Sol', 'xhigh'],
  S7: ['GPT-5.6 Sol', 'high'],
  S8: ['GPT-5.6 Sol', 'xhigh'],
  S9: ['GPT-5.6 Sol', 'high'],
  S10: ['GPT-5.6 Terra', 'high'],
  S11: ['GPT-5.6 Sol', 'high'],
  S12: ['GPT-5.6 Sol', 'xhigh'],
  S13: ['GPT-5.6 Sol', 'high'],
  S14: ['GPT-5.6 Sol', 'xhigh'],
  S15: ['GPT-5.6 Sol', 'high'],
  S16: ['GPT-5.6 Sol', 'xhigh'],
  S17: ['GPT-5.6 Sol', 'xhigh'],
  S18: ['GPT-5.6 Sol', 'xhigh'],
  S19: ['GPT-5.6 Sol', 'xhigh'],
  S20: ['GPT-5.6 Sol', 'high'],
  S21: ['GPT-5.6 Sol', 'high'],
  S22: ['GPT-5.6 Sol', 'xhigh'],
};

const DEPENDENCY_GUARDS = {
  S15: ['S14'],
  S16: ['S15'],
  S17: ['S16'],
  S18: ['S16'],
  S19: ['S11', 'S15', 'S16'],
  S20: ['S17', 'S18', 'S19'],
  S21: ['S20'],
  S22: ['S21'],
};

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function resolveLocalRef(schema, ref) {
  if (!ref.startsWith('#/')) throw new Error(`Unsupported schema reference: ${ref}`);
  return ref
    .slice(2)
    .split('/')
    .reduce((value, key) => value[key.replaceAll('~1', '/').replaceAll('~0', '~')], schema);
}

function matchesType(value, type) {
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  return typeof value === type;
}

export function validateAgainstSchema(value, rule, schema, location = '$') {
  const errors = [];
  if (rule.$ref) return validateAgainstSchema(value, resolveLocalRef(schema, rule.$ref), schema, location);
  if (rule.type && !matchesType(value, rule.type)) {
    return [`${location} must be ${rule.type}.`];
  }
  if (Object.hasOwn(rule, 'const') && value !== rule.const) errors.push(`${location} must equal ${JSON.stringify(rule.const)}.`);
  if (rule.enum && !rule.enum.includes(value)) errors.push(`${location} must be one of ${rule.enum.join(', ')}.`);
  if (typeof value === 'string') {
    if (rule.minLength && value.length < rule.minLength) errors.push(`${location} is shorter than ${rule.minLength}.`);
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) errors.push(`${location} does not match ${rule.pattern}.`);
  }
  if (Array.isArray(value)) {
    if (rule.minItems !== undefined && value.length < rule.minItems) errors.push(`${location} has fewer than ${rule.minItems} items.`);
    if (rule.maxItems !== undefined && value.length > rule.maxItems) errors.push(`${location} has more than ${rule.maxItems} items.`);
    if (rule.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${location} contains duplicate items.`);
    if (rule.items) value.forEach((item, index) => errors.push(...validateAgainstSchema(item, rule.items, schema, `${location}[${index}]`)));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of rule.required ?? []) {
      if (!Object.hasOwn(value, key)) errors.push(`${location}.${key} is required.`);
    }
    if (rule.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(rule.properties ?? {}, key)) errors.push(`${location}.${key} is not allowed.`);
      }
    }
    for (const [key, childRule] of Object.entries(rule.properties ?? {})) {
      if (Object.hasOwn(value, key)) errors.push(...validateAgainstSchema(value[key], childRule, schema, `${location}.${key}`));
    }
  }
  return errors;
}

function stageNumber(id) {
  return Number(id.slice(1));
}

function normalizedPattern(pattern) {
  return pattern.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/\*\*.*$/, '').replace(/\*.*$/, '').replace(/\/$/, '');
}

function patternsOverlap(left, right) {
  const a = normalizedPattern(left);
  const b = normalizedPattern(right);
  if (!a || !b) return true;
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function findCycles(stagesById) {
  const cycles = [];
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  function visit(id) {
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      cycles.push([...stack.slice(start), id].join(' -> '));
      return;
    }
    if (visited.has(id) || !stagesById.has(id)) return;
    visiting.add(id);
    stack.push(id);
    for (const dependency of stagesById.get(id).dependencies) visit(dependency);
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of stagesById.keys()) visit(id);
  return [...new Set(cycles)];
}

export function deriveEffectiveStates(registry) {
  const rawStates = new Map(registry.stages.map((stage) => [stage.id, stage.state]));
  const effective = new Map();
  for (const stage of [...registry.stages].sort((a, b) => stageNumber(a.id) - stageNumber(b.id))) {
    let state = stage.state;
    if (['PENDING', 'READY', 'RETRY'].includes(state)) {
      const dependenciesDone = stage.dependencies.every((dependency) => rawStates.get(dependency) === 'DONE');
      state = dependenciesDone ? 'READY' : 'PENDING';
    }
    effective.set(stage.id, state);
  }
  return effective;
}

export function validateRegistry(registry, schema, rootDir) {
  const errors = validateAgainstSchema(registry, schema, schema);
  const warnings = [];
  const stages = Array.isArray(registry.stages) ? registry.stages : [];
  const stagesById = new Map();
  for (const stage of stages) {
    if (stagesById.has(stage.id)) errors.push(`Duplicate stage ID: ${stage.id}.`);
    stagesById.set(stage.id, stage);
  }
  for (const id of stagesById.keys()) {
    if (!EXPECTED_STAGE_IDS.includes(id)) errors.push(`Unknown stage ID: ${id}.`);
  }
  for (const id of EXPECTED_STAGE_IDS) {
    if (!stagesById.has(id)) errors.push(`Missing expected stage ID: ${id}.`);
  }
  for (const stage of stages) {
    for (const dependency of stage.dependencies ?? []) {
      if (!stagesById.has(dependency)) errors.push(`${stage.id} references missing dependency ${dependency}.`);
      if (dependency === stage.id) errors.push(`${stage.id} cannot depend on itself.`);
    }
    const expected = MODEL_MATRIX[stage.id];
    if (expected && (stage.model !== expected[0] || stage.effort !== expected[1])) {
      errors.push(`${stage.id} requires ${expected[0]} / ${expected[1]}, found ${stage.model} / ${stage.effort}.`);
    }
    if (stage.state === 'DONE') {
      if (!(stage.evidence?.length > 0)) errors.push(`${stage.id} is DONE without evidence.`);
      if (!(stage.reportPaths?.length > 0)) errors.push(`${stage.id} is DONE without a report.`);
      for (const relativePath of [...(stage.reportPaths ?? []), ...(stage.evidence ?? [])]) {
        if (path.isAbsolute(relativePath)) {
          errors.push(`${stage.id} references absolute evidence path ${relativePath}.`);
          continue;
        }
        try {
          readFileSync(path.resolve(rootDir, relativePath));
        } catch {
          errors.push(`${stage.id} references missing evidence/report path ${relativePath}.`);
        }
      }
      for (const dependency of stage.dependencies ?? []) {
        if (stagesById.get(dependency)?.state !== 'DONE') errors.push(`${stage.id} is DONE while dependency ${dependency} is not DONE.`);
      }
    }
  }
  for (const [stageId, requiredDependencies] of Object.entries(DEPENDENCY_GUARDS)) {
    const stage = stagesById.get(stageId);
    if (!stage) continue;
    for (const dependency of requiredDependencies) {
      if (!stage.dependencies.includes(dependency)) errors.push(`${stageId} must depend on ${dependency}.`);
    }
  }
  for (const cycle of findCycles(stagesById)) errors.push(`Dependency cycle detected: ${cycle}.`);

  const effectiveStates = deriveEffectiveStates(registry);
  for (const stage of stages) {
    if (stage.state === 'READY' && effectiveStates.get(stage.id) !== 'READY') errors.push(`${stage.id} is marked READY with unfinished dependencies.`);
  }

  const ownershipStages = stages.filter((stage) => ACTIVE_OWNERSHIP_STATES.has(effectiveStates.get(stage.id)));
  for (let leftIndex = 0; leftIndex < ownershipStages.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ownershipStages.length; rightIndex += 1) {
      const left = ownershipStages[leftIndex];
      const right = ownershipStages[rightIndex];
      for (const leftPath of left.ownedPaths) {
        for (const rightPath of right.ownedPaths) {
          if (patternsOverlap(leftPath, rightPath)) errors.push(`Ownership conflict: ${left.id} (${leftPath}) overlaps ${right.id} (${rightPath}).`);
        }
      }
    }
  }

  const activeWorkerStages = stages.filter((stage) => WORKER_LANES.has(stage.ownerLane) && ACTIVE_WORK_STATES.has(effectiveStates.get(stage.id)));
  if (activeWorkerStages.length > registry.maxWorkers) errors.push(`${activeWorkerStages.length} active workers exceed maxWorkers=${registry.maxWorkers}.`);
  const laneCounts = new Map();
  for (const stage of activeWorkerStages) laneCounts.set(stage.ownerLane, (laneCounts.get(stage.ownerLane) ?? 0) + 1);
  for (const [lane, count] of laneCounts) {
    if (count > 1) errors.push(`${lane} has ${count} simultaneous active stages.`);
  }
  if (registry.totalContexts !== registry.maxWorkers + 1) errors.push('totalContexts must equal maxWorkers + one coordinator.');

  const readyByLane = new Map();
  for (const stage of stages.filter((candidate) => effectiveStates.get(candidate.id) === 'READY' && WORKER_LANES.has(candidate.ownerLane))) {
    if (readyByLane.has(stage.ownerLane)) warnings.push(`${stage.ownerLane} has multiple READY stages (${readyByLane.get(stage.ownerLane)}, ${stage.id}); launch only one.`);
    else readyByLane.set(stage.ownerLane, stage.id);
  }
  return { errors: [...new Set(errors)].sort(), warnings: [...new Set(warnings)].sort(), effectiveStates };
}

export function createStatusOutput(registry, validation) {
  const stages = [...registry.stages]
    .sort((a, b) => stageNumber(a.id) - stageNumber(b.id))
    .map((stage) => ({
      id: stage.id,
      title: stage.title,
      ownerLane: stage.ownerLane,
      configuredState: stage.state,
      effectiveState: validation.effectiveStates.get(stage.id),
      model: stage.model,
      effort: stage.effort,
      dependencies: stage.dependencies,
      stateReason: stage.stateReason,
    }));
  const stateCounts = {};
  for (const stage of stages) stateCounts[stage.effectiveState] = (stateCounts[stage.effectiveState] ?? 0) + 1;
  return {
    valid: validation.errors.length === 0,
    schemaVersion: registry.schemaVersion,
    project: registry.project,
    baselineSha: registry.baselineSha,
    integrationRef: registry.integrationRef,
    totalContexts: registry.totalContexts,
    maxWorkers: registry.maxWorkers,
    stateCounts,
    readyStages: stages.filter((stage) => stage.effectiveState === 'READY').map((stage) => stage.id),
    errors: validation.errors,
    warnings: validation.warnings,
    stages,
  };
}

function parseArguments(argv) {
  const options = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') options.json = true;
    else if (['--registry', '--schema', '--root'].includes(argument)) options[argument.slice(2)] = argv[++index];
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

export function runStatus(options = {}) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const registryPath = path.resolve(options.registry ?? path.join(scriptDir, 'stages.json'));
  const schemaPath = path.resolve(options.schema ?? path.join(scriptDir, 'stages.schema.json'));
  const rootDir = path.resolve(options.root ?? path.dirname(scriptDir));
  const registry = readJson(registryPath);
  const schema = readJson(schemaPath);
  const validation = validateRegistry(registry, schema, rootDir);
  return createStatusOutput(registry, validation);
}

function humanOutput(output) {
  const lines = [
    `Esencial orchestration: ${output.valid ? 'VALID' : 'INVALID'}`,
    `Baseline: ${output.baselineSha} (${output.integrationRef})`,
    `Contexts: ${output.totalContexts} total / ${output.maxWorkers} workers`,
    '',
    'Stage  Effective  Lane         Model / effort',
  ];
  for (const stage of output.stages) lines.push(`${stage.id.padEnd(6)} ${stage.effectiveState.padEnd(10)} ${stage.ownerLane.padEnd(12)} ${stage.model} / ${stage.effort}`);
  lines.push('', `READY: ${output.readyStages.join(', ') || 'none'}`);
  if (output.warnings.length) lines.push('', 'Warnings:', ...output.warnings.map((warning) => `- ${warning}`));
  if (output.errors.length) lines.push('', 'Errors:', ...output.errors.map((error) => `- ${error}`));
  return lines.join('\n');
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const output = runStatus(options);
    process.stdout.write(options.json ? `${JSON.stringify(output, null, 2)}\n` : `${humanOutput(output)}\n`);
    if (!output.valid) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
