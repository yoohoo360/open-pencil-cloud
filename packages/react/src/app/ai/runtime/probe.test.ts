import { describe, expect, test } from 'bun:test'

import {
  DEFAULT_AGENT_SERVER_PORT,
  DEFAULT_AGENT_SERVER_URL,
  probeAgentServer
} from '#react/app/ai/runtime/probe'

describe('probeAgentServer', () => {
  test('returns false for empty url', async () => {
    expect(await probeAgentServer('')).toBe(false)
  })

  test('returns false when server is unreachable', async () => {
    expect(await probeAgentServer('http://127.0.0.1:9', { timeoutMs: 200 })).toBe(false)
  })

  test('default url is the MCP companion port', () => {
    expect(DEFAULT_AGENT_SERVER_PORT).toBe(7600)
    expect(DEFAULT_AGENT_SERVER_URL).toBe('http://127.0.0.1:7600')
  })

  test('skips mixed-content fetch on https pages for local urls', async () => {
    const previous = globalThis.window
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { protocol: 'https:' } }
    })
    try {
      expect(await probeAgentServer('http://127.0.0.1:7600', { timeoutMs: 200 })).toBe(false)
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: previous
      })
    }
  })
})
