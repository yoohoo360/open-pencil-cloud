import type { MaskType } from '@open-pencil/scene-graph'

import { useEditor } from '#react/editor/context'
import { useSelectionState } from '#react/editor/selection-state/use'

export function useMask() {
  const editor = useEditor()
  const { selectedNode } = useSelectionState()
  const active = selectedNode?.isMask === true
  const maskType = selectedNode?.maskType ?? 'ALPHA'

  function setMaskType(value: MaskType) {
    if (!selectedNode?.isMask || selectedNode.maskType === value) return
    editor.updateNodeWithUndo(selectedNode.id, { maskType: value }, 'Change mask type')
  }

  return { active, maskType, setMaskType }
}
