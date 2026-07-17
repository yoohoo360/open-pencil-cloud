import { ref } from '#react/internal/reactive'
import type { Effect } from '@open-pencil/scene-graph'

import {
  getEffectOptions,
  createDefaultEffect,
  createEffectControlActions,
  createEffectEditActions,
  isShadow
} from '#react/controls/effects/helpers'
import { useEditor } from '#react/editor/context'

/**
 * Returns effect-editing helpers for property panels.
 *
 * This composable manages default effect creation, expanded-row state,
 * scrub-preview behavior, and effect type/color updates.
 */
export function useEffectsControls() {
  const editor = useEditor()

  const expandedIndex = ref<number | null>(null)
  const effectsBeforeScrub = ref<Effect[] | null>(null)
  const editActions = createEffectEditActions(editor, effectsBeforeScrub)
  const controlActions = createEffectControlActions(expandedIndex)

  return {
    expandedIndex,
    effectOptions: getEffectOptions(),
    createDefaultEffect,
    isShadow,
    ...editActions,
    ...controlActions
  }
}
