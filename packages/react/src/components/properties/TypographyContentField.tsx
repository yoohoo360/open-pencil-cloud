import { useEffect, useState } from 'react'

import { TextPropertyBinding } from '#react/components/properties/component-properties/TextPropertyBinding'
import { AppInput } from '#react/components/ui/AppInput'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { useEditor } from '#react/editor/context'
import { useI18n } from '#react/i18n'

export function TypographyContentField({ nodeId, text }: { nodeId: string; text: string }) {
  const editor = useEditor()
  const { panels } = useI18n()
  const [draft, setDraft] = useState(text)

  useEffect(() => {
    setDraft(text)
  }, [text])

  function commit() {
    if (draft === text) return
    editor.updateNodeWithUndo(nodeId, { text: draft }, 'Edit text')
  }

  return (
    <PanelFieldGroup
      label={panels.textContent}
      className="border-b border-border px-3 py-2"
      ui={{ container: 'flex min-w-0 flex-row items-center gap-1' }}
    >
      <AppInput
        value={draft}
        aria-label={panels.textContent}
        data-property="text-content"
        className="min-w-0 flex-1"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
      />
      <TextPropertyBinding />
    </PanelFieldGroup>
  )
}
