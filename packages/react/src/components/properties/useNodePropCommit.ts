import type { SceneNode } from '@open-pencil/scene-graph'

import { useEditor } from '#react/editor/context'

export function useNodePropCommit() {
  const editor = useEditor()

  function commit(key: keyof SceneNode, value: number, previous: number) {
    const nodes = editor.getSelectedNodes()
    if (nodes.length === 0) return
    for (const node of nodes) {
      editor.updateNode(node.id, { [key]: value })
    }
    for (const node of nodes) {
      editor.commitNodeUpdate(node.id, { [key]: previous } as Partial<SceneNode>, `Change ${key}`)
    }
    editor.requestRender()
  }

  return { editor, commit }
}
