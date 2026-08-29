import type { Color } from '@open-pencil/scene-graph/primitives'

import { ColorRow } from '#react/components/properties/ColorRow'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useEditorStore } from '#react/app/editor/store'
import { useI18n } from '#react/i18n'

export function PageSection() {
  const editor = useEditorStore()
  const { panels } = useI18n()
  const pageColor = editor.state.pageColor

  function updatePageColor(color: Color) {
    editor.setPageColor(color)
  }

  return (
    <PanelSection label={panels.page}>
      <ColorRow
        color={pageColor}
        opacity={pageColor.a}
        label={panels.pageBackground}
        onColor={updatePageColor}
        onOpacity={(alpha) => updatePageColor({ ...pageColor, a: alpha })}
      />
    </PanelSection>
  )
}
