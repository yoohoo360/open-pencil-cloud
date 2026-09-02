import { describe, expect, test } from 'bun:test'

import { createEditorPreparationController } from '@/app/editor/preparation/controller'
import { createEditorPreparationEvents } from '@/app/editor/preparation/events'
import type { EditorPreparationResult } from '@/app/editor/preparation/types'
import { createInitialAppEditorState } from '@/app/editor/session/types'

describe('editor preparation controller', () => {
  test('keeps one reactive preparation snapshot until its owner finishes', () => {
    const state = createInitialAppEditorState('page')
    const controller = createEditorPreparationController(state)
    const load = controller.begin({ kind: 'document-open', subject: 'example.fig' })
    load.update({
      phase: 'resolving-fonts',
      detail: 'Geist Regular',
      completed: 2,
      total: 7,
      unit: 'fonts'
    })

    expect(state.preparation).toEqual({
      id: load.id,
      kind: 'document-open',
      phase: 'resolving-fonts',
      subject: 'example.fig',
      detail: 'Geist Regular',
      progress: { completed: 2, total: 7, unit: 'fonts' },
      startedAt: expect.any(Number)
    })

    load.complete()
    expect(state.preparation).toBeNull()
  })

  test('aborts and ignores an obsolete preparation handle', () => {
    const state = createInitialAppEditorState('page')
    const events = createEditorPreparationEvents()
    const results: EditorPreparationResult[] = []
    events.on('preparation:finished', (result) => results.push(result))
    const controller = createEditorPreparationController(state, events)
    const first = controller.begin({ kind: 'document-open' })
    const second = controller.begin({ kind: 'page-switch', phase: 'populating-page' })

    expect(first.signal.aborted).toBe(true)
    expect(results).toContainEqual({
      id: first.id,
      kind: 'document-open',
      status: 'cancelled',
      reason: 'superseded'
    })
    first.update({ phase: 'layout', detail: 'obsolete' })
    first.complete()
    expect(state.preparation?.id).toBe(second.id)
    second.complete()
    expect(state.preparation).toBeNull()
  })

  test('waits for the prepared scene to be presented before finishing', async () => {
    const state = createInitialAppEditorState('page')
    const controller = createEditorPreparationController(state)
    const handle = controller.begin({ kind: 'page-switch' })

    let presented = false
    const waiting = controller.waitForPresentation(handle.id, 7).then(() => {
      presented = true
      return presented
    })
    await Promise.resolve()
    expect(presented).toBe(false)

    controller.acknowledgePresentation(6)
    await Promise.resolve()
    expect(presented).toBe(false)

    controller.acknowledgePresentation(7)
    await waiting
    expect(presented).toBe(true)
    handle.complete()
  })
  test('times out when a committed scene is never presented', async () => {
    const state = createInitialAppEditorState('page')
    const controller = createEditorPreparationController(state, undefined, {
      presentationTimeoutMs: 1
    })
    const handle = controller.begin({ kind: 'page-switch' })

    await expect(controller.waitForPresentation(handle.id, 7)).rejects.toHaveProperty(
      'message',
      'The operation was timed out'
    )
    handle.fail({ code: 'render-failed', message: 'Timed out', retryable: true })
    expect(state.preparation).toBeNull()
  })
  test('emits exactly one terminal outcome', () => {
    const state = createInitialAppEditorState('page')
    const events = createEditorPreparationEvents()
    const outcomes: string[] = []
    events.on('preparation:finished', (result) => outcomes.push(result.status))
    events.on('preparation:failed', () => outcomes.push('failed'))
    const controller = createEditorPreparationController(state, events)

    const failed = controller.begin({ kind: 'document-open' })
    failed.fail({ code: 'decode-failed', message: 'Invalid', retryable: false })
    failed.complete()
    failed.cancel()

    expect(outcomes).toEqual(['failed'])
  })
  test('dispose aborts the active tab-local preparation', () => {
    const state = createInitialAppEditorState('page')
    const controller = createEditorPreparationController(state)
    const load = controller.begin({ kind: 'storage-open' })

    controller.dispose()

    expect(load.signal.aborted).toBe(true)
    expect(state.preparation).toBeNull()
  })
})
