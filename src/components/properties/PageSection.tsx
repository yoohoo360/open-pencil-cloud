import { useI18n } from '@open-pencil/react'

import { ColorInput } from '@/components/ColorPicker/ColorInput'
import { PanelSection } from '@/components/ui/panel/PanelSection'
import { useEditorStore } from '@/app/editor/active-store'

export function PageSection() {
  const editor = useEditorStore()
  const { panels } = useI18n()

  return (
    <PanelSection label={panels.page ?? 'Page'} data-test-id="page-section">
      <ColorInput
        color={editor.state.pageColor}
        editable
        onUpdate={(color) => editor.setPageColor(color)}
      />
    </PanelSection>
  )
}
