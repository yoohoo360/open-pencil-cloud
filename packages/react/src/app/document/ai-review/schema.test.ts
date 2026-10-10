import { describe, expect, test } from 'bun:test'

import { mergeAiFindings } from '#react/app/document/ai-review/merge'
import {
  countPayload,
  emptyAiReviewPayload,
  removeMarker
} from '#react/app/document/ai-review/markers'
import {
  extractJsonObject,
  parseAiReviewFindings,
  parseAiReviewPayload
} from '#react/app/document/ai-review/schema'

describe('AI review schema', () => {
  test('parses a full payload', () => {
    const payload = parseAiReviewPayload({
      version: 1,
      page_id: 'page1',
      markers: [
        {
          id: 'm1',
          node_id: 'n1',
          comments: [
            {
              id: 'c1',
              body: 'Missing empty state',
              severity: 'warning',
              source: 'ai',
              created_at: 1,
              status: 'open'
            }
          ]
        }
      ]
    })
    expect(payload?.markers).toHaveLength(1)
    expect(countPayload(payload!)).toEqual({ marker_count: 1, comment_count: 1 })
  })

  test('extracts JSON from fenced AI replies', () => {
    const raw = extractJsonObject('Here you go:\n```json\n{"summary":"ok","markers":[]}\n```')
    expect(parseAiReviewFindings(raw)).toEqual({ summary: 'ok', markers: [] })
  })

  test('merges AI findings onto existing markers', () => {
    const base = emptyAiReviewPayload('page1')
    base.markers = [{ id: 'm1', node_id: 'n1', comments: [] }]
    const merged = mergeAiFindings(
      base,
      {
        summary: 'Needs work',
        markers: [{ node_id: 'n1', comments: [{ body: 'Add loading state', severity: 'error' }] }]
      },
      { model: 'gpt-test' }
    )
    expect(merged.ai?.summary).toBe('Needs work')
    expect(merged.markers[0]?.comments).toHaveLength(1)
    expect(merged.markers[0]?.comments[0]?.source).toBe('ai')
    expect(removeMarker(merged, 'm1').markers).toHaveLength(0)
  })

  test('creates markers for page-scope findings', () => {
    const base = emptyAiReviewPayload('page1')
    const merged = mergeAiFindings(
      base,
      {
        summary: 'Page issues',
        markers: [
          {
            node_id: 'frame1',
            comments: [{ body: 'Missing empty state', severity: 'warning' }]
          }
        ]
      },
      {
        model: 'gpt-test',
        resolveMarker: (nodeId) => ({
          id: `m_${nodeId}`,
          node_id: nodeId,
          node_name: 'Frame',
          comments: []
        })
      }
    )
    expect(merged.markers).toHaveLength(1)
    expect(merged.markers[0]?.node_id).toBe('frame1')
    expect(merged.markers[0]?.comments).toHaveLength(1)
  })
})
