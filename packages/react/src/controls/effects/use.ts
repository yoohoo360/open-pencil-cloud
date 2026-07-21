import { useRef } from 'react'

import {
  EFFECT_OPTIONS,
  createDefaultEffect,
  createEffectControlActions,
  createEffectEditActions,
  isShadow,
  type EffectEditSnapshot
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

  const expandedIndex = useRef<number | null>(null)
  const effectsBeforeScrub = useRef<EffectEditSnapshot | null>(null)
  const editActions = createEffectEditActions(editor, effectsBeforeScrub)
  const controlActions = createEffectControlActions(expandedIndex)

  return {
    expandedIndex,
    effectOptions: EFFECT_OPTIONS,
    createDefaultEffect,
    isShadow,
    ...editActions,
    ...controlActions
  }
}
