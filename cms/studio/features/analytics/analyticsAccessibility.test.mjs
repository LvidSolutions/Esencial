import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import process from 'node:process'
import {URL} from 'node:url'

const component = readFileSync(new URL('./AnalyticsTrend.tsx', import.meta.url), 'utf8')
const model = readFileSync(new URL('./trendModel.ts', import.meta.url), 'utf8')
const css = readFileSync(new URL('./analyticsFeature.css', import.meta.url), 'utf8')
const dashboard = readFileSync(new URL('./AnalyticsConsentFeature.tsx', import.meta.url), 'utf8')

assert.match(component, /tabIndex=\{index === activeIndex \? 0 : -1\}/, 'chart must use one roving tab stop')
assert.match(model, /ArrowRight/)
assert.match(model, /ArrowLeft/, 'chart must implement arrow-key navigation')
assert.match(component, /<table>/)
assert.match(component, /Visa exakta dagsvärden/, 'chart must include an exact table alternative')
assert.match(component, /samvariation över tid, inte att SEO har orsakat/, 'chart must state correlation rather than causation')
assert.match(css, /@media \(max-width: 40rem\)/, 'chart must have a small-screen layout')
assert.match(css, /overflow-x: auto/, 'exact-value table must remain reachable without clipping')
assert.match(dashboard, /Hur många gånger en Esencial-sida syntes i Googles sökresultat/, 'Google impressions need a plain-language explanation')
assert.match(dashboard, /Ett lägre tal är bättre/, 'average position needs a plain-language direction')
assert.match(dashboard, /setState\(\{status: 'loading'\}\)/, 'period changes must not retain stale figures')

process.stdout.write('Analytics accessibility checks passed: keyboard focus, exact table, plain Swedish, causation caveat, honest loading and responsive overflow.\n')
