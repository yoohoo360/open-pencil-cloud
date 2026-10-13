import { describe, expect, test } from 'bun:test'

import {
  clearChatMemory,
  finalizeStoppedMessages,
  loadChatMemory,
  pullUserMessageForEdit,
  saveChatMemory
} from '#react/app/ai/chat/memory'
import type { ChatMessage } from '#react/app/ai/chat/types'

function user(id: string, text: string): ChatMessage {
  return { id, role: 'user', parts: [{ type: 'text', text }] }
}

function assistant(id: string, text = '', phase: ChatMessage['phase'] = 'execute'): ChatMessage {
  return {
    id,
    role: 'assistant',
    parts: text ? [{ type: 'text', text }] : [],
    planArtifacts: { thinking: '', plan: '', steps: '' },
    phase
  }
}

describe('chat memory', () => {
  test('stores and restores per tab', () => {
    clearChatMemory('tab-a')
    clearChatMemory('tab-b')
    saveChatMemory('tab-a', [user('u1', 'hello')])
    saveChatMemory('tab-b', [user('u2', 'other')])
    expect(loadChatMemory('tab-a')[0]?.parts[0]).toEqual({ type: 'text', text: 'hello' })
    expect(loadChatMemory('tab-b')[0]?.parts[0]).toEqual({ type: 'text', text: 'other' })
    clearChatMemory('tab-a')
    expect(loadChatMemory('tab-a')).toEqual([])
  })
})

describe('finalizeStoppedMessages', () => {
  test('drops empty trailing assistant', () => {
    expect(finalizeStoppedMessages([user('u1', 'hi'), assistant('a1')])).toEqual([user('u1', 'hi')])
  })

  test('keeps partial assistant as done', () => {
    const next = finalizeStoppedMessages([user('u1', 'hi'), assistant('a1', 'partial', 'route')])
    expect(next).toHaveLength(2)
    expect(next[1]?.phase).toBe('done')
    expect(next[1]?.parts[0]).toEqual({ type: 'text', text: 'partial' })
  })
})

describe('pullUserMessageForEdit', () => {
  test('pulls last user turn and prior context remains', () => {
    const { messages, draft } = pullUserMessageForEdit([
      user('u1', 'first'),
      assistant('a1', 'ok', 'done'),
      user('u2', 'second'),
      assistant('a2')
    ])
    expect(draft).toBe('second')
    expect(messages.map((message) => message.id)).toEqual(['u1', 'a1'])
  })

  test('pulls a specific user message and truncates after it', () => {
    const { messages, draft } = pullUserMessageForEdit(
      [user('u1', 'first'), assistant('a1', 'ok', 'done'), user('u2', 'second')],
      'u1'
    )
    expect(draft).toBe('first')
    expect(messages).toEqual([])
  })
})
