import { describe, expect, test } from 'bun:test'

import { groupAssistantParts } from '#react/components/chat/tool-call-group'
import type { ChatMessagePart } from '#react/app/ai/chat/types'

describe('groupAssistantParts', () => {
  test('batches consecutive tools and keeps text between runs', () => {
    const parts: ChatMessagePart[] = [
      {
        type: 'tool',
        toolCallId: '1',
        toolName: 'get_selection',
        state: 'output-available'
      },
      {
        type: 'tool',
        toolCallId: '2',
        toolName: 'find_nodes',
        state: 'output-available'
      },
      { type: 'text', text: 'next' },
      {
        type: 'tool',
        toolCallId: '3',
        toolName: 'describe',
        state: 'output-available'
      }
    ]
    const groups = groupAssistantParts(parts)
    expect(groups).toHaveLength(3)
    expect(groups[0]?.kind).toBe('tools')
    if (groups[0]?.kind === 'tools') {
      expect(groups[0].tools.map((tool) => tool.toolName)).toEqual([
        'get_selection',
        'find_nodes'
      ])
    }
    expect(groups[1]).toEqual({ kind: 'text', text: 'next', key: 'text-0' })
    expect(groups[2]?.kind).toBe('tools')
  })
})
