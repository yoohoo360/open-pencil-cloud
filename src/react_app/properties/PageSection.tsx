import { ColorInput } from '@/react_app/pickers/ColorInput'
import { sectionWrapper } from '@/react_app/ui/section'
import { useEditor, useEditorSelector, useI18n } from '@open-pencil/react'

import type { Color } from '@open-pencil/core'
import type { Editor } from '@open-pencil/core/editor'

type AppEditor = Editor & {
  state: Editor['state'] & { pageColor: Color }
  setPageColor: (color: Color) => void
}

export function PageSection() {
  const editor = useEditor() as AppEditor
  const pageColor = useEditorSelector((e) => (e as AppEditor).state.pageColor)
  const { panels } = useI18n()

  return (
    <div data-test-id="page-section" className={sectionWrapper()}>
      <label className="mb-1.5 block text-[11px] text-muted">{panels.page ?? 'Page'}</label>
      <ColorInput color={pageColor} editable onUpdate={(c) => editor.setPageColor(c)} />
    </div>
  )
}
