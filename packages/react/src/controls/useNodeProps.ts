import type { Effect, Fill, SceneNode, Stroke } from '@open-pencil/scene-graph'

import { useEditor } from '../context/editorContext'
import { useSceneComputed } from '../internal/useSceneComputed'

/** Sentinel value returned when a property differs across multiple selected nodes. */
export const MIXED = Symbol('mixed')

/** Property value that may either be concrete or mixed across the selection. */
export type MixedValue<T> = T | typeof MIXED

type ArrayItem = Fill | Stroke | Effect | Record<string, unknown>

/**
 * Returns shared property-panel helpers for the current selection.
 */
export function useNodeProps() {
  const store = useEditor()
  const node = useSceneComputed(() => {
    void store.state.sceneVersion
    return store.getSelectedNode() ?? null
  })
  const nodes = useSceneComputed(() => {
    void store.state.sceneVersion
    return store.getSelectedNodes()
  })
  const isMulti = nodes.length > 1
  const active = Boolean(node || isMulti)
  const activeNode = node ?? (nodes[0] as SceneNode | undefined) ?? null

  function merged<K extends keyof SceneNode>(key: K): MixedValue<SceneNode[K]> {
    const all = nodes
    if (all.length === 0) return MIXED
    const first = all[0][key]
    for (let i = 1; i < all.length; i++) {
      if (all[i][key] !== first) return MIXED
    }
    return first
  }

  function areArrayItemsEqual(a: ArrayItem, b: ArrayItem): boolean {
    if (a === b) return true
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length !== bKeys.length) return false
    for (const key of aKeys) {
      const aValue = a[key as keyof typeof a]
      const bValue = b[key as keyof typeof b]
      if (Array.isArray(aValue) && Array.isArray(bValue)) {
        if (aValue.length !== bValue.length) return false
        for (let i = 0; i < aValue.length; i++) {
          const left = aValue[i]
          const right = bValue[i]
          if (
            typeof left === 'object' &&
            left != null &&
            typeof right === 'object' &&
            right != null
          ) {
            if (!areArrayItemsEqual(left as ArrayItem, right as ArrayItem)) return false
          } else if (left !== right) {
            return false
          }
        }
        continue
      }
      if (
        typeof aValue === 'object' &&
        aValue != null &&
        typeof bValue === 'object' &&
        bValue != null
      ) {
        if (!areArrayItemsEqual(aValue as ArrayItem, bValue as ArrayItem)) return false
        continue
      }
      if (aValue !== bValue) return false
    }
    return true
  }

  function prop<K extends keyof SceneNode>(key: K): MixedValue<SceneNode[K]> {
    return merged(key)
  }

  function updateAllWithUndo(patch: Partial<SceneNode>, label: string) {
    for (const n of nodes) {
      store.updateNodeWithUndo(n.id, patch, label)
    }
  }

  function isArrayMixed(key: keyof SceneNode): boolean {
    const all = nodes
    if (all.length <= 1) return false
    const first = all[0][key]
    if (!Array.isArray(first)) return all.some((n) => n[key] !== first)
    for (let i = 1; i < all.length; i++) {
      const current = all[i][key]
      if (!Array.isArray(current) || current.length !== first.length) return true
      for (let j = 0; j < first.length; j++) {
        const left = first[j]
        const right = current[j]
        if (
          typeof left === 'object' &&
          left != null &&
          typeof right === 'object' &&
          right != null
        ) {
          if (!areArrayItemsEqual(left as ArrayItem, right as ArrayItem)) return true
        } else if (left !== right) {
          return true
        }
      }
    }
    return false
  }

  type ArrayPropKey = 'fills' | 'strokes' | 'effects'

  function targetNodes(): SceneNode[] {
    if (isMulti) return nodes
    return activeNode ? [activeNode] : []
  }

  function updateArrayItem(
    key: ArrayPropKey,
    index: number,
    patch: Record<string, unknown> | Fill | Stroke,
    label: string
  ) {
    for (const n of targetNodes()) {
      const arr = [...n[key]]
      arr[index] = { ...arr[index], ...patch } as (typeof arr)[number]
      store.updateNodeWithUndo(n.id, { [key]: arr } as Partial<SceneNode>, label)
    }
  }

  function removeArrayItem(key: ArrayPropKey, index: number, label: string) {
    for (const n of targetNodes()) {
      store.updateNodeWithUndo(
        n.id,
        { [key]: (n[key] as unknown[]).filter((_, i) => i !== index) } as Partial<SceneNode>,
        label
      )
    }
  }

  function toggleArrayVisibility(key: ArrayPropKey, index: number) {
    for (const n of targetNodes()) {
      const items = n[key] as Array<{ visible: boolean }>
      if (!items[index]) continue
      const arr = [...n[key]]
      arr[index] = { ...arr[index], visible: !items[index].visible }
      store.updateNodeWithUndo(
        n.id,
        { [key]: arr } as Partial<SceneNode>,
        `Toggle ${key} visibility`
      )
    }
  }

  const previousValues = new Map<string, Record<string, number | string>>()

  function storePreviousValues(key: string) {
    for (const n of store.getSelectedNodes()) {
      let rec = previousValues.get(n.id)
      if (!rec) {
        rec = {}
        previousValues.set(n.id, rec)
      }
      if (!(key in rec)) {
        rec[key] = n[key as keyof SceneNode] as number | string
      }
    }
  }

  function updateProp(key: string, value: number | string) {
    if (store.getSelectedNodes().length > 1) {
      storePreviousValues(key)
      for (const n of store.getSelectedNodes()) {
        store.updateNode(n.id, { [key]: value })
      }
    } else {
      const selected = store.getSelectedNode()
      if (selected) store.updateNode(selected.id, { [key]: value })
    }
  }

  function commitProp(key: string, _value: number | string, previous: number | string) {
    if (store.getSelectedNodes().length > 1) {
      for (const n of store.getSelectedNodes()) {
        const prev = previousValues.get(n.id)?.[key] ?? previous
        store.commitNodeUpdate(n.id, { [key]: prev } as Partial<SceneNode>, `Change ${key}`)
      }
      previousValues.clear()
    } else {
      const selected = store.getSelectedNode()
      if (selected) {
        store.commitNodeUpdate(
          selected.id,
          { [key]: previous } as Partial<SceneNode>,
          `Change ${key}`
        )
      }
    }
  }

  return {
    store,
    node,
    nodes,
    isMulti,
    active,
    activeNode,
    targetNodes,
    prop,
    merged,
    updateAllWithUndo,
    updateArrayItem,
    removeArrayItem,
    toggleArrayVisibility,
    isArrayMixed,
    updateProp,
    commitProp
  }
}
