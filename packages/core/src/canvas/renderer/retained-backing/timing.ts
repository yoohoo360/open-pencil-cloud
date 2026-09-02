export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function smoothAverage(previous: number, next: number, weight = 0.2): number {
  return previous * (1 - weight) + next * weight
}
