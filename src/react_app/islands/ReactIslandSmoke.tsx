import { TEST_IDS, testIdProps, useEditor, useEditorVersion, useI18n } from '@open-pencil/react'

/**
 * Minimal React island used during the Vue→React migration to prove:
 * - Vite dual Vue+React host works
 * - EditorProvider / useEditor share the same editor instance as the Vue shell
 */
export function ReactIslandSmoke() {
  const editor = useEditor()
  const version = useEditorVersion()
  const { panels } = useI18n()

  return (
    <div
      {...testIdProps(TEST_IDS.reactIslandSmoke)}
      className="pointer-events-none absolute bottom-2 left-2 z-[100] rounded border border-border bg-panel px-2 py-1 text-[10px] text-muted opacity-70"
      aria-hidden
    >
      react · {panels.layers} · scene:{editor.state.sceneVersion} · v:{version}
    </div>
  )
}
