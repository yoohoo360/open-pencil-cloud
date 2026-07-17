import { ref } from '#react/internal/reactive'
import { BORDER_SIDES, DEFAULT_STROKE, SIDE_OPTIONS, borderWeight, createStrokeSideActions, currentAlign, currentSides, dashState, setDash, setGap, toggleDash, updateAlign } from '#react/controls/stroke/helpers'
import { useEditor } from '#react/editor/context'
import { useI18n } from '#react/i18n'

/**
 * Returns stroke-related helpers for property panels.
 *
 * This composable provides alignment options, side presets, a default stroke,
 * and helpers for per-side border weight editing.
 */
export function useStrokeControls() {
  const store = useEditor()
  const { panels } = useI18n()
  const sideMenuOpen = ref(false)
  const alignOptions = [
    { value: 'INSIDE' as const, label: panels.strokeAlignInside },
    { value: 'CENTER' as const, label: panels.strokeAlignCenter },
    { value: 'OUTSIDE' as const, label: panels.strokeAlignOutside }
  ]
  const { selectSide, updateBorderWeight } = createStrokeSideActions(store, sideMenuOpen)

  return {
    alignOptions,
    sideOptions: SIDE_OPTIONS,
    borderSides: BORDER_SIDES,
    sideMenuOpen,
    defaultStroke: DEFAULT_STROKE,
    updateAlign: updateAlign.bind(null, store),
    currentAlign,
    currentSides,
    dashState,
    toggleDash,
    setDash,
    setGap,
    borderWeight,
    selectSide,
    updateBorderWeight
  }
}
