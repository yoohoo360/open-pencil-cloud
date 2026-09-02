import type {
  EditorPreparation,
  EditorPreparationFailure,
  EditorPreparationResult
} from '@/app/editor/preparation/types'

export interface EditorPreparationEvents {
  'preparation:started': (preparation: EditorPreparation) => void
  'preparation:updated': (preparation: EditorPreparation, previous: EditorPreparation) => void
  'preparation:finished': (result: EditorPreparationResult) => void
  'preparation:failed': (failure: EditorPreparationFailure) => void
}

export type EditorPreparationEventName = keyof EditorPreparationEvents

export interface EditorPreparationEventEmitter {
  emit<Event extends EditorPreparationEventName>(
    event: Event,
    ...args: Parameters<EditorPreparationEvents[Event]>
  ): void
  on<Event extends EditorPreparationEventName>(
    event: Event,
    handler: EditorPreparationEvents[Event]
  ): () => void
}

export function createEditorPreparationEvents(): EditorPreparationEventEmitter {
  const started = new Set<EditorPreparationEvents['preparation:started']>()
  const updated = new Set<EditorPreparationEvents['preparation:updated']>()
  const finished = new Set<EditorPreparationEvents['preparation:finished']>()
  const failed = new Set<EditorPreparationEvents['preparation:failed']>()

  return {
    emit(event, ...args) {
      switch (event) {
        case 'preparation:started':
          for (const listener of started) listener(args[0] as EditorPreparation)
          break
        case 'preparation:updated':
          for (const listener of updated) {
            listener(args[0] as EditorPreparation, args[1] as EditorPreparation)
          }
          break
        case 'preparation:finished':
          for (const listener of finished) listener(args[0] as EditorPreparationResult)
          break
        case 'preparation:failed':
          for (const listener of failed) listener(args[0] as EditorPreparationFailure)
      }
    },
    on(event, handler) {
      switch (event) {
        case 'preparation:started':
          started.add(handler as EditorPreparationEvents['preparation:started'])
          return () => started.delete(handler as EditorPreparationEvents['preparation:started'])
        case 'preparation:updated':
          updated.add(handler as EditorPreparationEvents['preparation:updated'])
          return () => updated.delete(handler as EditorPreparationEvents['preparation:updated'])
        case 'preparation:finished':
          finished.add(handler as EditorPreparationEvents['preparation:finished'])
          return () => finished.delete(handler as EditorPreparationEvents['preparation:finished'])
        case 'preparation:failed':
          failed.add(handler as EditorPreparationEvents['preparation:failed'])
          return () => failed.delete(handler as EditorPreparationEvents['preparation:failed'])
        default:
          return () => undefined
      }
    }
  }
}
