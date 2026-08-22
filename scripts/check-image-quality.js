const {execFileSync} = require('child_process')
const fs = require('fs')
const path = require('path')
const {ROOT, PUBLIC_DIR, ensureDir} = require('./recovery-utils')

const MAX_PHOTO_SSIM_DISTORTION = 0.025

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function publicFile(source) {
  return path.join(PUBLIC_DIR, source.replace(/^\//, ''))
}

function imageInfo(file) {
  const output = execFileSync('magick', ['identify', '-format', '%w %h %Q', file], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
  const [width, height, quality] = output.split(/\s+/).map(Number)
  if (![width, height, quality].every(Number.isFinite)) throw new Error(`ImageMagick returned invalid metadata for ${file}.`)
  return {width, height, quality}
}

function ssimDistortion(source, variant, width) {
  const output = execFileSync(
    'magick',
    [source, '-resize', `${width}x>`, variant, '-metric', 'SSIM', '-compare', '-format', '%[distortion]', 'info:'],
    {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']},
  ).trim()
  const value = Number(output)
  if (!Number.isFinite(value)) throw new Error(`ImageMagick returned an invalid SSIM result for ${variant}.`)
  return value
}

function collectVariants() {
  const projectManifest = readJson(path.join(ROOT, 'content', 'image-variants.json'))
  const gridManifest = readJson(path.join(PUBLIC_DIR, 'assets', 'images', 'grid', 'manifest.json'))
  const rows = []
  for (const [source, entry] of Object.entries(projectManifest.entries || {})) {
    for (const variant of entry.variants || []) rows.push({collection: 'project', source, kind: entry.kind, ...variant})
  }
  for (const [source, entry] of Object.entries(gridManifest.entries || {})) {
    for (const variant of entry.variants || []) rows.push({collection: 'grid', source, kind: entry.kind, ...variant})
  }
  return rows.sort((left, right) => `${left.source}:${left.src}`.localeCompare(`${right.source}:${right.src}`))
}

function validate() {
  const errors = []
  const results = []
  for (const row of collectVariants()) {
    const sourceFile = publicFile(row.source)
    const variantFile = publicFile(row.src)
    if (!fs.existsSync(sourceFile) || !fs.existsSync(variantFile)) {
      errors.push(`${row.src}: source or derivative is missing.`)
      continue
    }
    const source = imageInfo(sourceFile)
    const variant = imageInfo(variantFile)
    const expectedWidth = Math.min(row.width, source.width)
    const expectedHeight = Math.round((source.height * expectedWidth) / source.width)
    if (variant.width !== expectedWidth || Math.abs(variant.height - expectedHeight) > 1) {
      errors.push(`${row.src}: ${variant.width}x${variant.height} changes the source framing; expected ${expectedWidth}x${expectedHeight}.`)
    }
    let distortion = null
    if (row.kind === 'photo') {
      distortion = ssimDistortion(sourceFile, variantFile, expectedWidth)
      if (distortion > MAX_PHOTO_SSIM_DISTORTION) {
        errors.push(`${row.src}: SSIM distortion ${distortion.toFixed(6)} exceeds ${MAX_PHOTO_SSIM_DISTORTION}.`)
      }
    } else if (row.kind === 'drawing-lossless' && variant.quality !== 100) {
      errors.push(`${row.src}: drawing derivative is not reported as lossless quality 100.`)
    }
    results.push({
      collection: row.collection,
      source: row.source,
      variant: row.src,
      kind: row.kind,
      width: variant.width,
      height: variant.height,
      ...(distortion === null ? {} : {ssimDistortion: distortion, ssimSimilarity: 1 - distortion}),
    })
  }
  const photos = results.filter((item) => item.kind === 'photo')
  const drawings = results.filter((item) => item.kind === 'drawing-lossless')
  const worstPhoto = [...photos].sort((left, right) => right.ssimDistortion - left.ssimDistortion)[0] || null
  return {
    errors,
    evidence: {
      methodology: {
        tool: 'ImageMagick SSIM against an identically resized original',
        maxPhotoSsimDistortion: MAX_PHOTO_SSIM_DISTORTION,
        framing: 'Derivative width and aspect ratio must match the uncropped original resize.',
        drawings: 'Grid drawing derivatives must report lossless WebP quality 100; project drawings retain originals.',
      },
      summary: {
        derivatives: results.length,
        photoDerivatives: photos.length,
        losslessDrawingDerivatives: drawings.length,
        worstPhoto: worstPhoto && {
          variant: worstPhoto.variant,
          ssimDistortion: worstPhoto.ssimDistortion,
          ssimSimilarity: worstPhoto.ssimSimilarity,
        },
      },
      results,
      errors,
    },
  }
}

function main() {
  const {errors, evidence} = validate()
  const evidenceFlag = process.argv.indexOf('--evidence')
  if (evidenceFlag >= 0) {
    const requested = process.argv[evidenceFlag + 1]
    if (!requested) throw new Error('--evidence requires a repository-relative output path.')
    const output = path.resolve(ROOT, requested)
    if (!output.startsWith(`${ROOT}${path.sep}`)) throw new Error('Evidence output must stay inside the repository.')
    ensureDir(path.dirname(output))
    fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
  }
  if (errors.length) {
    console.error(`Image quality validation failed (${errors.length} error(s)):\n- ${errors.join('\n- ')}`)
    process.exit(1)
  }
  const worst = evidence.summary.worstPhoto
  console.log(`Image quality validation passed: ${evidence.summary.derivatives} derivatives retain uncropped framing; ${evidence.summary.photoDerivatives} photos meet SSIM similarity >= ${(1 - MAX_PHOTO_SSIM_DISTORTION).toFixed(3)}${worst ? ` (worst ${worst.ssimSimilarity.toFixed(4)})` : ''}; ${evidence.summary.losslessDrawingDerivatives} drawing derivatives remain lossless.`)
}

if (require.main === module) main()

module.exports = {MAX_PHOTO_SSIM_DISTORTION, collectVariants, validate}
