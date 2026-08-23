import {nextTrendPointIndex, splitConsecutivePoints, trendSummary} from './trendModel'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  assert(Object.is(actual, expected), `${message}: ${String(actual)} !== ${String(expected)}`)
}

const points = [
  {date: '2026-08-16', value: 2},
  {date: '2026-08-17', value: 4},
  {date: '2026-08-20', value: 1},
]
const segments = splitConsecutivePoints(points)
assertEqual(segments.length, 2, 'provider gaps split the visual line')
assertEqual(segments[0].length, 2, 'consecutive days stay connected')
assertEqual(segments[1][0].date, '2026-08-20', 'gap starts a new segment')

assertEqual(nextTrendPointIndex('ArrowRight', 0, 3), 1, 'right arrow advances')
assertEqual(nextTrendPointIndex('ArrowLeft', 0, 3), 0, 'left arrow stops at start')
assertEqual(nextTrendPointIndex('End', 0, 3), 2, 'End reaches last point')
assertEqual(nextTrendPointIndex('Home', 2, 3), 0, 'Home reaches first point')
assertEqual(nextTrendPointIndex('Enter', 1, 3), null, 'unrelated keys are preserved')

const summary = trendSummary(points)
assertEqual(summary?.low.date, '2026-08-20', 'summary keeps exact low date')
assertEqual(summary?.high.value, 4, 'summary keeps exact high value')

console.log('Analytics trend model checks passed: provider gaps, exact summaries and bounded roving keyboard focus.')
