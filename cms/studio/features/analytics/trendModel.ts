const DAY_MS = 86_400_000

export type TrendPoint = {
  date: string
  value: number
}

function dayNumber(date: string) {
  return Date.parse(`${date}T00:00:00.000Z`) / DAY_MS
}

export function splitConsecutivePoints<T extends TrendPoint>(points: T[]) {
  const segments: T[][] = []
  for (const point of points) {
    const segment = segments.at(-1)
    const previous = segment?.at(-1)
    if (!segment || !previous || dayNumber(point.date) !== dayNumber(previous.date) + 1) {
      segments.push([point])
    } else {
      segment.push(point)
    }
  }
  return segments
}

export function nextTrendPointIndex(key: string, current: number, length: number) {
  if (length < 1) return null
  if (key === 'ArrowRight' || key === 'ArrowDown') return Math.min(current + 1, length - 1)
  if (key === 'ArrowLeft' || key === 'ArrowUp') return Math.max(current - 1, 0)
  if (key === 'Home') return 0
  if (key === 'End') return length - 1
  return null
}

export function trendSummary(points: TrendPoint[]) {
  if (points.length === 0) return null
  let low = points[0]
  let high = points[0]
  for (const point of points.slice(1)) {
    if (point.value < low.value) low = point
    if (point.value > high.value) high = point
  }
  return {first: points[0], last: points.at(-1)!, low, high}
}
