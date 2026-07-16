import type { ReactNode } from 'react'

import { useEditor } from '../context/editorContext'
import { useNodeProps } from '../controls/useNodeProps'
import { useSceneComputed } from '../internal/useSceneComputed'
import { PropertyListProvider } from './context'

import type { Fill, Stroke, Effect, SceneNode } from '@open-pencil/core'

type ArrayPropKey = 'fills' | 'strokes' | 'effects'
type ArrayItemType = Fill | Stroke | Effect

export interface PropertyListRootSlotProps {
  items: ArrayItemType[]
  isMixed: boolean
  isMulti: boolean
  activeNode: SceneNode | null
  add: (defaults: ArrayItemType) => void
  remove: (index: number) => void
  update: (index: number, item: ArrayItemType) => void
  patch: (index: number, changes: Record<string, unknown>) => void
  toggleVisibility: (index: number) => void
}

export interface PropertyListRootProps {
  propKey: ArrayPropKey
  label?: string
  onAdd?: (item: ArrayItemType) => void
  onRemove?: (index: number) => void
  onUpdate?: (index: number, item: ArrayItemType) => void
  onPatch?: (index: number, changes: Record<string, unknown>) => void
  onToggleVisibility?: (index: number) => void
  children?: ReactNode | ((state: PropertyListRootSlotProps) => ReactNode)
}

export function PropertyListRoot({
  propKey,
  onAdd,
  onRemove,
  onUpdate,
  onPatch,
  onToggleVisibility,
  children
}: PropertyListRootProps) {
  const editor = useEditor()
  const { isArrayMixed } = useNodeProps()

  const selectedNodes = useSceneComputed(() => {
    void editor.state.sceneVersion
    return editor.getSelectedNodes()
  })
  const activeNode = useSceneComputed<SceneNode | null>(() => {
    void editor.state.sceneVersion
    return editor.getSelectedNode() ?? selectedNodes[0] ?? null
  })
  const isMulti = selectedNodes.length > 1
  const active = selectedNodes.length > 0
  const isMixed = isArrayMixed(propKey)

  const items = useSceneComputed(() => {
    void editor.state.sceneVersion
    if (isMixed) return [] as ArrayItemType[]
    return (activeNode?.[propKey] ?? []) as ArrayItemType[]
  })

  function targetNodes(): SceneNode[] {
    if (isMulti) return selectedNodes
    return activeNode ? [activeNode] : []
  }

  function add(defaults: ArrayItemType) {
    onAdd?.(defaults)
    for (const n of targetNodes()) {
      const arr = isMulti ? [defaults] : [...n[propKey], defaults]
      editor.updateNodeWithUndo(
        n.id,
        { [propKey]: arr } as Partial<SceneNode>,
        isMulti ? `Set ${propKey}` : `Add ${propKey}`
      )
    }
  }

  function remove(index: number) {
    onRemove?.(index)
    for (const n of targetNodes()) {
      editor.updateNodeWithUndo(
        n.id,
        {
          [propKey]: (n[propKey] as ArrayItemType[]).filter((_, i) => i !== index)
        } as Partial<SceneNode>,
        `Remove ${propKey}`
      )
    }
  }

  function update(index: number, item: ArrayItemType) {
    onUpdate?.(index, item)
    for (const n of targetNodes()) {
      const arr = [...n[propKey]] as ArrayItemType[]
      arr[index] = item
      editor.updateNodeWithUndo(n.id, { [propKey]: arr } as Partial<SceneNode>, `Change ${propKey}`)
    }
  }

  function patch(index: number, changes: Record<string, unknown>) {
    onPatch?.(index, changes)
    for (const n of targetNodes()) {
      const arr = [...n[propKey]] as ArrayItemType[]
      arr[index] = { ...arr[index], ...changes } as ArrayItemType
      editor.updateNodeWithUndo(n.id, { [propKey]: arr } as Partial<SceneNode>, `Change ${propKey}`)
    }
  }

  function toggleVisibility(index: number) {
    onToggleVisibility?.(index)
    const nodes = targetNodes()
    if (nodes.length === 0) return
    if (nodes.length > 1) {
      editor.undo.beginBatch(`Toggle ${propKey} visibility`)
    }
    for (const n of nodes) {
      const liveNode = editor.getNode(n.id)
      if (!liveNode) continue
      const arr = liveNode[propKey] as Array<{ visible: boolean }>
      if (!arr[index]) continue
      const newArr = [...liveNode[propKey]] as Array<{ visible: boolean }>
      newArr[index] = { ...newArr[index], visible: !arr[index].visible }
      editor.updateNodeWithUndo(
        n.id,
        { [propKey]: newArr } as Partial<SceneNode>,
        `Toggle ${propKey} visibility`
      )
    }
    if (nodes.length > 1) {
      editor.undo.commitBatch()
    }
  }

  if (!active) return null

  const slot: PropertyListRootSlotProps = {
    items,
    isMixed,
    isMulti,
    activeNode,
    add,
    remove,
    update,
    patch,
    toggleVisibility
  }

  const content = typeof children === 'function' ? children(slot) : children

  return (
    <PropertyListProvider
      value={{
        editor,
        propKey,
        items,
        isMixed,
        activeNode,
        isMulti,
        add,
        remove,
        update,
        patch,
        toggleVisibility
      }}
    >
      {content}
    </PropertyListProvider>
  )
}
