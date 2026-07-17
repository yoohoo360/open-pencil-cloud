import { ref } from '#react/internal/reactive'
import { OKHCL_FIELD_OPTIONS, createOkHCLActions, createOkHCLFieldFormats, createOkHCLPreviewHelpers, getFillOkHCLColor, getStrokeOkHCLColor } from '#react/controls/okhcl/helpers'
import { useEditor } from '#react/editor/context'
import type { ColorFieldFormat } from '#react/primitives/ColorPicker/types'

export function useOkHCL() {
  const editor = useEditor()
  const fieldFormats = ref(new Map<string, ColorFieldFormat>())

  const { ensureFillOkHCL, ensureStrokeOkHCL, updateFillOkHCL, updateStrokeOkHCL } =
    createOkHCLActions(editor)
  const { getFillPreviewInfo, getStrokePreviewInfo } = createOkHCLPreviewHelpers(editor)
  const { getFieldFormat, setFillFieldFormat, setStrokeFieldFormat } = createOkHCLFieldFormats(
    fieldFormats,
    ensureFillOkHCL,
    ensureStrokeOkHCL
  )

  return {
    getFillOkHCLColor,
    getStrokeOkHCLColor,
    getFillPreviewInfo,
    getStrokePreviewInfo,
    getFieldFormat,
    setFillFieldFormat,
    setStrokeFieldFormat,
    updateFillOkHCL,
    updateStrokeOkHCL,
    fieldOptions: OKHCL_FIELD_OPTIONS
  }
}
