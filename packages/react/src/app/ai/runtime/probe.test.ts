import { describe, expect, test } from 'bun:test'

import { DEFAULT_AGENT_SERVER_URL, probeAgentServer } from '#react/app/ai/runtime/probe'

describe('probeAgentServer', () => {
  test('returns false for empty url', async () => {
    expect(await probeAgentServer('')).toBe(false)
  })

  test('returns false when server is unreachable', async () => {
    expect(
      await probeAgentServer('http://127.0.0.1:9', { timeoutMs: 200 })
    ).toBe(false)
  })

  test('default url is local agent server', () => {
    expect(DEFAULT_AGENT_SERVER_URL).toContain('2024')
  })
})
