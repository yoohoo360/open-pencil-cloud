import { describe, expect, test } from 'bun:test'

import {
  estimatePageSwitchLoadingMs,
  PAGE_SWITCH_LOADING_MAX_MS,
  PAGE_SWITCH_LOADING_MIN_MS
} from '#react/app/document/page-loading/switch-duration'

describe('estimatePageSwitchLoadingMs', () => {
  test('clamps to 1s–8s across the node anchors', () => {
    expect(estimatePageSwitchLoadingMs(0)).toBe(PAGE_SWITCH_LOADING_MIN_MS)
    expect(estimatePageSwitchLoadingMs(1_000)).toBe(PAGE_SWITCH_LOADING_MIN_MS)
    expect(estimatePageSwitchLoadingMs(10_000)).toBe(2_500)
    expect(estimatePageSwitchLoadingMs(50_000)).toBe(5_500)
    expect(estimatePageSwitchLoadingMs(100_000)).toBe(PAGE_SWITCH_LOADING_MAX_MS)
    expect(estimatePageSwitchLoadingMs(500_000)).toBe(PAGE_SWITCH_LOADING_MAX_MS)
  })

  test('interpolates between anchors', () => {
    const mid = estimatePageSwitchLoadingMs(5_500)
    expect(mid).toBeGreaterThan(1_000)
    expect(mid).toBeLessThan(2_500)
  })
})
