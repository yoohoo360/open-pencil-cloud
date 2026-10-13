import { describe, expect, test } from 'bun:test'

import {
  designToolRunMode,
  planDesignToolWaves,
  runDesignToolWaves
} from '#react/app/ai/chat/tool-waves'

describe('designToolRunMode', () => {
  test('forces serial for reads and writes (CanvasKit is not reentrant)', () => {
    expect(designToolRunMode('describe')).toBe('serial')
    expect(designToolRunMode('get_node')).toBe('serial')
    expect(designToolRunMode('calc')).toBe('serial')
    expect(designToolRunMode('discover_tools')).toBe('serial')
    expect(designToolRunMode('render')).toBe('serial')
    expect(designToolRunMode('batch_update')).toBe('serial')
    expect(designToolRunMode('eval')).toBe('serial')
  })
})

describe('planDesignToolWaves', () => {
  test('puts each call in its own wave', () => {
    const waves = planDesignToolWaves([
      { name: 'describe' },
      { name: 'get_node' },
      { name: 'render' }
    ])
    expect(waves.map((wave) => wave.map((item) => item.name))).toEqual([
      ['describe'],
      ['get_node'],
      ['render']
    ])
  })
})

describe('runDesignToolWaves', () => {
  test('runs tools strictly in order without overlap', async () => {
    const log: string[] = []
    const waves = planDesignToolWaves([
      { name: 'describe', id: 'a' },
      { name: 'get_node', id: 'b' },
      { name: 'render', id: 'c' }
    ])

    await runDesignToolWaves(waves, async (item) => {
      log.push(`${item.id}-start`)
      await Promise.resolve()
      log.push(`${item.id}-end`)
    })

    expect(log).toEqual(['a-start', 'a-end', 'b-start', 'b-end', 'c-start', 'c-end'])
  })
})
