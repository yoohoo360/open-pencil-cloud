import { enclosingHostedInstance } from '#react/hosted-components/match'
import { useEditor } from '#react/editor/context'
import { memo } from 'react'

/** Renders registered property-panel sections for the enclosing hosted instance. */
export const HostedComponentPanel = memo(function HostedComponentPanel() {
  const editor = useEditor()
  const selected = editor.getSelectedNode()
  if (!selected) return null
  const match = enclosingHostedInstance(editor.graph, selected.id)
  if (!match) return null
  return (
    <>
      {match.def.panel.sections.map((section) => {
        const Section = section.render
        return <Section key={`${match.def.id}:${section.id}`} />
      })}
    </>
  )
})
