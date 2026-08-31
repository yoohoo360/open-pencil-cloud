import { ColorRow } from '#react/components/properties/ColorRow'
import { BoundColorRow } from '#react/components/properties/paint/BoundColorRow'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import {
  collectSelectionColors,
  replaceSelectionColor,
  selectionColorBindingTargets,
  shouldShowSelectionColors,
  type SelectionColorGroup
} from '#react/controls/selection-colors'
import { useEditor } from '#react/editor/context'
import { useSelectionState } from '#react/editor/selection-state/use'
import { useI18n } from '#react/i18n'
import { useSceneComputed } from '#react/internal/scene-computed/use'

import type { Color } from '@open-pencil/scene-graph/primitives'

function SelectionColorRow({
  group,
  label,
  onColor,
  onOpacity
}: {
  group: SelectionColorGroup
  label: string
  onColor: (color: Color) => void
  onOpacity: (opacity: number) => void
}) {
  const targets = selectionColorBindingTargets(group.occurrences)
  if (targets.length === 0) {
    return (
      <ColorRow
        color={group.color}
        opacity={group.opacity}
        label={label}
        onColor={onColor}
        onOpacity={onOpacity}
      />
    )
  }
  return (
    <BoundColorRow
      targets={targets}
      color={group.color}
      opacity={group.opacity}
      label={label}
      batchLabel="Change selection color"
      onColor={onColor}
      onOpacity={onOpacity}
    />
  )
}

export function SelectionColorsSection() {
  const editor = useEditor()
  const { hasSelection, selectedIds } = useSelectionState()
  const { panels } = useI18n()
  const groups = useSceneComputed(() =>
    collectSelectionColors(editor.graph, editor.state.selectedIds)
  )
  if (!hasSelection || !shouldShowSelectionColors(selectedIds, groups)) return null

  return (
    <PanelSection label={panels.selectionColors}>
      {groups.map((group) => (
        <div
          key={group.key}
          className="mb-1.5 last:mb-0"
          data-property="selection-color"
          data-color-key={group.key}
        >
          <SelectionColorRow
            group={group}
            label={panels.selectionColors}
            onColor={(color) =>
              replaceSelectionColor(editor, editor.state.selectedIds, group.key, { color })
            }
            onOpacity={(opacity) =>
              replaceSelectionColor(editor, editor.state.selectedIds, group.key, { opacity })
            }
          />
        </div>
      ))}
    </PanelSection>
  )
}
