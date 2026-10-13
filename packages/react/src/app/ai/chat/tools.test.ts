import { describe, expect, test } from 'bun:test'

import {
  STATIC_DESIGN_TOOL_NAMES,
  createDesignToolSession,
  visibleDesignToolNames
} from '#react/app/ai/chat/tools-catalog'

const SAMPLE_CATALOG = [
  'render',
  'describe',
  'batch_update',
  'eval',
  'diff_visual',
  'calc',
  'stock_photo'
] as const

describe('visibleDesignToolNames', () => {
  test('keeps only the static core set by default', () => {
    const names = visibleDesignToolNames(SAMPLE_CATALOG)
    expect(names).toEqual([
      'render',
      'describe',
      'batch_update',
      'eval',
      'calc',
      'stock_photo'
    ])
    for (const name of names) {
      expect(STATIC_DESIGN_TOOL_NAMES.has(name)).toBe(true)
    }
  })

  test('includes session-enabled deferred tools', () => {
    const session = createDesignToolSession()
    session.enabled.add('diff_visual')
    expect(visibleDesignToolNames(SAMPLE_CATALOG, session)).toContain('diff_visual')
    expect(visibleDesignToolNames(SAMPLE_CATALOG)).not.toContain('diff_visual')
  })
})
