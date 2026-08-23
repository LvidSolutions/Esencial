import assert from 'node:assert/strict'
import test from 'node:test'
import analyticsHandler from '../../../../api/analytics.js'

const {searchDailySeries, vercelDailySeries} = analyticsHandler._internals
const range = {since: '2026-08-16', until: '2026-08-22'}

test('Vercel daily series is sorted, exact and never zero-filled', () => {
  const series = vercelDailySeries({
    version: 1,
    data: [
      {timestamp: '2026-08-22T00:00:00.000Z', visitors: 5, pageviews: 12},
      {timestamp: '2026-08-20T00:00:00.000Z', visitors: 10, pageviews: 20},
    ],
  }, range)

  assert.deepEqual(series, [
    {date: '2026-08-20', dailyVisitors: 10, pageviews: 20},
    {date: '2026-08-22', dailyVisitors: 5, pageviews: 12},
  ])
  assert.equal(series.length, 2, 'provider gaps must remain gaps rather than inferred zeroes')
})

test('Vercel daily series rejects duplicate, out-of-window and invalid points', () => {
  const valid = {timestamp: '2026-08-20T00:00:00.000Z', visitors: 1, pageviews: 2}
  assert.throws(() => vercelDailySeries({version: 1, data: [valid, {...valid}]}, range))
  assert.throws(() => vercelDailySeries({version: 1, data: [{...valid, timestamp: '2026-08-23T00:00:00.000Z'}]}, range))
  assert.throws(() => vercelDailySeries({version: 1, data: [{...valid, visitors: Number.NaN}]}, range))
  assert.throws(() => vercelDailySeries({version: 1, data: [{...valid, timestamp: 'not-a-date'}]}, range))
})

test('Search Console daily series is sorted and retains provider values', () => {
  const series = searchDailySeries({rows: [
    {keys: ['2026-08-22'], clicks: 3, impressions: 90},
    {keys: ['2026-08-18'], clicks: 2, impressions: 50},
  ]}, range)

  assert.deepEqual(series, [
    {date: '2026-08-18', clicks: 2, impressions: 50},
    {date: '2026-08-22', clicks: 3, impressions: 90},
  ])
})

test('Search Console daily series fails closed on malformed provider rows', () => {
  assert.throws(() => searchDailySeries({rows: [
    {keys: ['2026-08-22'], clicks: 1, impressions: 2},
    {keys: ['2026-08-22'], clicks: 3, impressions: 4},
  ]}, range))
  assert.throws(() => searchDailySeries({rows: [{keys: ['2026-08-15'], clicks: 1, impressions: 2}]}, range))
  assert.throws(() => searchDailySeries({rows: [{keys: ['22 August'], clicks: 1, impressions: 2}]}, range))
  assert.throws(() => searchDailySeries({rows: [{keys: ['2026-02-30'], clicks: 1, impressions: 2}]}, range))
  assert.throws(() => searchDailySeries({rows: [{keys: ['2026-08-22'], clicks: -1, impressions: 2}]}, range))
  assert.throws(() => searchDailySeries({rows: [{keys: [], clicks: 1, impressions: 2}]}, range))
})
