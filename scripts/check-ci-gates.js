const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const WORKFLOW_DIR = path.join(ROOT, '.github', 'workflows')
const SHA_PIN = /^[a-z0-9_.-]+\/[a-z0-9_.-]+@[0-9a-f]{40}(?:\s+#\s+.+)?$/i

const SEO_GATE_STEPS = [
  ['Validate CI workflow contract', 'pnpm run check-ci-gates'],
  ['Validate CMS content', 'pnpm run check-content'],
  ['Build release candidate', 'pnpm run build'],
  ['Verify generated release is committed', 'git diff --exit-code'],
  ['Validate local HTTP SEO', 'pnpm run check-http-seo'],
  ['Audit project content', 'pnpm run audit:project-content'],
  ['Validate Studio safeguards', 'pnpm run check-studio-workspace'],
  ['Build Studio', 'npm --prefix cms/studio run build'],
  ['Install Playwright Chromium', 'pnpm exec playwright install --with-deps chromium'],
  ['Check functionality', 'pnpm run check-functionality'],
  ['Check performance', 'pnpm run check-performance'],
  ['Check accessibility', 'pnpm run check-accessibility'],
  ['Check reference parity', 'pnpm run check-reference-parity'],
]

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replace(/\r\n/g, '\n')
}

function lines(source) {
  return source.split('\n')
}

function section(source, heading, indent) {
  const sourceLines = lines(source)
  const start = sourceLines.findIndex((line) => line === `${' '.repeat(indent)}${heading}:`)
  if (start < 0) return ''
  let end = sourceLines.length
  for (let index = start + 1; index < sourceLines.length; index += 1) {
    const line = sourceLines[index]
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const leading = line.length - line.trimStart().length
    if (leading <= indent) {
      end = index
      break
    }
  }
  return sourceLines.slice(start, end).join('\n')
}

function stepBlocks(job) {
  const jobLines = lines(job)
  const starts = []
  for (let index = 0; index < jobLines.length; index += 1) {
    if (/^\s{6}- name:\s+\S/.test(jobLines[index])) starts.push(index)
  }
  return starts.map((start, index) => jobLines.slice(start, starts[index + 1] ?? jobLines.length).join('\n'))
}

function stepName(block) {
  return (block.match(/^\s{6}- name:\s+(.+)$/m) || [])[1] || ''
}

function errorIf(condition, errors, message) {
  if (condition) errors.push(message)
}

function commonWorkflowChecks(source, filename) {
  const errors = []
  const sourceLines = lines(source)
  errorIf(source.includes('\t'), errors, `${filename}: tabs are forbidden in YAML indentation`)
  errorIf(sourceLines.some((line) => /\s+$/.test(line)), errors, `${filename}: trailing whitespace is forbidden`)
  errorIf(!/^permissions:\n  contents: read$/m.test(source), errors, `${filename}: top-level permissions must be contents: read`)
  errorIf(!/^concurrency:\n  group: .+\n  cancel-in-progress: (?:true|false)$/m.test(source), errors, `${filename}: explicit concurrency is required`)
  errorIf(/pull_request_target:/.test(source), errors, `${filename}: pull_request_target is forbidden`)
  errorIf(/continue-on-error:\s*true/.test(source), errors, `${filename}: release gates may not continue on error`)
  errorIf(/\b(?:vercel\s+(?:deploy|promote)|sanity\s+deploy)\b/i.test(source), errors, `${filename}: deployment commands are forbidden in validation workflows`)
  for (const match of source.matchAll(/^\s*uses:\s*(.+)$/gm)) {
    errorIf(!SHA_PIN.test(match[1].trim()), errors, `${filename}: action is not pinned to an immutable 40-character SHA: ${match[1].trim()}`)
  }
  return errors
}

function validateNamedSteps(job, expected, filename) {
  const errors = []
  const blocks = stepBlocks(job)
  const names = blocks.map(stepName)
  let previous = -1
  for (const [name, command] of expected) {
    const index = names.indexOf(name)
    if (index < 0) {
      errors.push(`${filename}: required gate is missing: ${name}`)
      continue
    }
    if (index <= previous) errors.push(`${filename}: required gate is reordered: ${name}`)
    previous = Math.max(previous, index)
    const block = blocks[index]
    if (!block.includes(`run: ${command}`)) errors.push(`${filename}: ${name} must run exactly: ${command}`)
    if (/^\s{8}if:/m.test(block)) errors.push(`${filename}: required gate may not be conditional or skipped: ${name}`)
  }
  return errors
}

function validateSeoWorkflow(source) {
  const filename = 'seo.yml'
  const errors = commonWorkflowChecks(source, filename)
  const job = section(source, 'validate', 2)
  errorIf(!job, errors, `${filename}: jobs.validate is required`)
  if (!job) return errors
  errorIf(!/^    timeout-minutes: 45$/m.test(job), errors, `${filename}: validate job must have a 45-minute timeout`)
  errorIf(!/persist-credentials:\s*false/.test(job), errors, `${filename}: validation checkout must not retain write credentials`)
  errorIf(!/node-version:\s*22\.19\.0/.test(job), errors, `${filename}: Node.js must be pinned to 22.19.0`)
  errorIf(!/version:\s*9\.15\.9/.test(job), errors, `${filename}: pnpm must be pinned to 9.15.9`)
  errorIf(!/cache:\s*pnpm/.test(job), errors, `${filename}: pnpm cache configuration is required`)
  errorIf(!/pnpm install --frozen-lockfile/.test(job), errors, `${filename}: frozen root install is required`)
  errorIf(!/npm ci --prefix cms\/studio --ignore-scripts/.test(job), errors, `${filename}: frozen Studio install is required`)
  errorIf(/secrets\./.test(job), errors, `${filename}: SEO validation must not receive repository secrets`)
  errors.push(...validateNamedSteps(job, SEO_GATE_STEPS, filename))
  errorIf(!/name: Write gate summary[\s\S]*?if: always\(\)/.test(job), errors, `${filename}: always-run actionable summary is required`)
  errorIf(!/name: Upload gate evidence[\s\S]*?if: always\(\)/.test(job), errors, `${filename}: always-run evidence upload is required`)
  return errors
}

function validateCmsWorkflow(source) {
  const filename = 'cms-build.yml'
  const errors = commonWorkflowChecks(source, filename)
  const validate = section(source, 'validate', 2)
  const publish = section(source, 'publish', 2)
  errorIf(!validate, errors, `${filename}: jobs.validate is required`)
  errorIf(!publish, errors, `${filename}: jobs.publish is required`)
  if (!validate || !publish) return errors
  errorIf(!/^    timeout-minutes: 30$/m.test(validate), errors, `${filename}: validate job must have a 30-minute timeout`)
  errorIf(!/^    if: github\.ref == 'refs\/heads\/main'$/m.test(validate), errors, `${filename}: CMS validation must fail closed outside main`)
  errorIf(!/^    outputs:\n      source_sha: \$\{\{ steps\.source_revision\.outputs\.sha \}\}$/m.test(validate), errors, `${filename}: validated source SHA must be handed to publish`)
  errorIf(/contents:\s*write/.test(validate), errors, `${filename}: secret-bearing validation job must not have write permission`)
  errorIf(!/persist-credentials:\s*false/.test(validate), errors, `${filename}: validation checkout must not retain write credentials`)
  errorIf((validate.match(/secrets\.SANITY_API_TOKEN/g) || []).length !== 1, errors, `${filename}: Sanity token must appear exactly once in validation`)
  errorIf(!/name: Build and validate published CMS content[\s\S]*?run: pnpm run build:cms[\s\S]*?SANITY_API_TOKEN: \$\{\{ secrets\.SANITY_API_TOKEN \}\}/.test(validate), errors, `${filename}: Sanity token must be scoped to the CMS build step`)
  errorIf(!/name: Verify CMS build scope[\s\S]*?git diff --exit-code/.test(validate), errors, `${filename}: CMS build scope check is required before publication`)
  errorIf(!/name: Upload validated website/.test(validate), errors, `${filename}: validated website artifact upload is required`)
  errorIf(!/^    needs: validate$/m.test(publish), errors, `${filename}: publish job must require completed validation`)
  errorIf(!/^    permissions:\n      contents: write$/m.test(publish), errors, `${filename}: write permission must be isolated to publish`)
  errorIf(/secrets\./.test(publish), errors, `${filename}: write-capable publish job must not receive repository secrets`)
  errorIf(!/name: Download validated website/.test(publish), errors, `${filename}: publish job must consume the validated artifact`)
  errorIf(!/ref: \$\{\{ needs\.validate\.outputs\.source_sha \}\}/.test(publish), errors, `${filename}: publish must check out the exact validated source SHA`)
  const replaceIndex = publish.indexOf('name: Replace website from validated artifact')
  const commitIndex = publish.indexOf('name: Commit validated website')
  errorIf(replaceIndex < 0 || commitIndex < 0 || replaceIndex >= commitIndex, errors, `${filename}: validated artifact must replace public before commit`)
  errorIf(!/git push origin HEAD:main/.test(publish), errors, `${filename}: publication push must target main explicitly`)
  return errors
}

function validatePackage() {
  const errors = []
  const packageJson = JSON.parse(read('package.json'))
  errorIf(packageJson.packageManager !== 'pnpm@9.15.9', errors, 'package.json: packageManager must pin pnpm@9.15.9')
  errorIf(packageJson.engines?.node !== '22.x', errors, 'package.json: engines.node must pin the Node.js 22 runtime line')
  errorIf(packageJson.scripts?.['check-ci-gates'] !== 'node scripts/check-ci-gates.js', errors, 'package.json: check-ci-gates script is missing or changed')
  errorIf(!fs.existsSync(path.join(ROOT, 'pnpm-lock.yaml')), errors, 'pnpm-lock.yaml is required for frozen installs')
  errorIf(!fs.existsSync(path.join(ROOT, 'cms', 'studio', 'package-lock.json')), errors, 'cms/studio/package-lock.json is required for frozen Studio installs')
  return errors
}

function removeStep(source, name) {
  const sourceLines = lines(source)
  const start = sourceLines.findIndex((line) => line === `      - name: ${name}`)
  if (start < 0) throw new Error(`Fixture setup could not find ${name}`)
  let end = sourceLines.length
  for (let index = start + 1; index < sourceLines.length; index += 1) {
    if (/^      - name: /.test(sourceLines[index])) {
      end = index
      break
    }
  }
  sourceLines.splice(start, end - start)
  return sourceLines.join('\n')
}

function skipStep(source, name) {
  return source.replace(`      - name: ${name}\n`, `      - name: ${name}\n        if: \${{ false }}\n`)
}

function swapSteps(source, firstName, secondName) {
  const firstBlock = stepBlocks(section(source, 'validate', 2)).find((block) => stepName(block) === firstName)
  const secondBlock = stepBlocks(section(source, 'validate', 2)).find((block) => stepName(block) === secondName)
  if (!firstBlock || !secondBlock) throw new Error('Fixture setup could not find both steps to reorder')
  const marker = '      # S13_FIXTURE_SWAP_MARKER'
  return source.replace(firstBlock, marker).replace(secondBlock, firstBlock).replace(marker, secondBlock)
}

function runFixtures(seoSource) {
  const fixtures = [
    ['missing gate', removeStep(seoSource, 'Check accessibility'), 'required gate is missing'],
    ['skipped gate', skipStep(seoSource, 'Check performance'), 'may not be conditional or skipped'],
    ['reordered gate', swapSteps(seoSource, 'Validate CMS content', 'Build release candidate'), 'required gate is reordered'],
  ]
  for (const [label, source, expected] of fixtures) {
    const errors = validateSeoWorkflow(source)
    if (!errors.some((error) => error.includes(expected))) throw new Error(`Negative fixture ${label} did not fail closed with ${expected}`)
  }
  console.log(`CI gate negative fixtures passed (${fixtures.length} missing, skipped or reordered contracts rejected).`)
}

function main() {
  const workflowFiles = fs.readdirSync(WORKFLOW_DIR).filter((file) => /\.ya?ml$/i.test(file)).sort()
  const expectedFiles = ['cms-build.yml', 'seo.yml']
  const errors = []
  for (const filename of expectedFiles) if (!workflowFiles.includes(filename)) errors.push(`Required workflow is missing: ${filename}`)
  for (const filename of workflowFiles) errors.push(...commonWorkflowChecks(read(path.join('.github', 'workflows', filename)), filename))

  const seoSource = read(path.join('.github', 'workflows', 'seo.yml'))
  const cmsSource = read(path.join('.github', 'workflows', 'cms-build.yml'))
  errors.push(...validatePackage(), ...validateSeoWorkflow(seoSource), ...validateCmsWorkflow(cmsSource))
  const uniqueErrors = [...new Set(errors)]
  if (uniqueErrors.length) {
    console.error(`CI gate contract failed (${uniqueErrors.length} error(s)):\n- ${uniqueErrors.join('\n- ')}`)
    process.exit(1)
  }
  if (process.argv.includes('--fixtures')) runFixtures(seoSource)
  console.log(`CI gate contract passed (${workflowFiles.length} workflows; ${SEO_GATE_STEPS.length} ordered release gates; immutable actions, frozen installs, permissions, timeouts, concurrency, summaries, artifacts and secret isolation enforced).`)
}

if (require.main === module) main()

module.exports = {runFixtures, validateCmsWorkflow, validateSeoWorkflow}
