import { describe, expect, test } from 'bun:test'

import { AGENT_SERVER_ENSURE_PATH } from '#react/app/ai/runtime/ensure-agent-server'

describe('ensureDevAgentServer', () => {
  test('expose the rspack ensure path', () => {
    expect(AGENT_SERVER_ENSURE_PATH).toBe('/__openpencil-agent-server/ensure')
  })
})
