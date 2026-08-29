import { useState } from 'react'

import { useI18n } from '#react/i18n'
import { useEditorStore } from '#react/app/editor/store'

export function AppMenu() {
  const store = useEditorStore()
  const { dialogs } = useI18n()
  const [editing, setEditing] = useState(false)

  return (
    <div className="shrink-0 border-b border-border">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <img data-test-id="app-logo" src="/favicon-32.png" className="size-4" alt="OpenPencil" />
        {editing ? (
          <input
            data-test-id="app-document-name-input"
            className="min-w-0 flex-1 rounded border border-accent bg-input px-1 py-0.5 text-xs text-surface outline-none"
            defaultValue={store.state.documentName}
            autoFocus
            onBlur={(event) => {
              store.state.documentName = event.currentTarget.value.trim() || store.state.documentName
              store.notify()
              setEditing(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <span
            data-test-id="app-document-name"
            className="min-w-0 flex-1 cursor-default truncate rounded px-1 py-0.5 text-xs text-surface hover:bg-hover"
            onDoubleClick={() => setEditing(true)}
          >
            {store.state.documentName}
          </span>
        )}
        <span className="sr-only">{dialogs.close}</span>
      </div>
    </div>
  )
}
