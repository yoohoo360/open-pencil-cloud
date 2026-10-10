import { describe, expect, test } from 'bun:test'

import { parseAiReviewStream } from '#react/app/document/ai-review/stream-parse'

describe('ai review stream parse', () => {
  test('reads closed tagged sections', () => {
    const parsed = parseAiReviewStream(
      '<thinking>t1</thinking><analysis>a1</analysis><findings>{"summary":"ok","markers":[]}</findings>'
    )
    expect(parsed.thinking).toBe('t1')
    expect(parsed.analysis).toBe('a1')
    expect(parsed.findingsText).toContain('"summary"')
  })

  test('reads unclosed streaming sections', () => {
    const parsed = parseAiReviewStream('<thinking>partial')
    expect(parsed.thinking).toBe('partial')
    expect(parsed.analysis).toBe('')
  })
})
