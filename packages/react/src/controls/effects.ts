import { useRef, useState } from 'react'

import type { Editor } from '@open-pencil/core/editor'
import type { Effect, SceneNode } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

import { useEditor } from '#react/editor/context'
import { useI18n } from '#react/i18n'

type EffectType = Effect['type']

export function isShadow(type: string) {
  return type === 'DROP_SHADOW' || type === 'INNER_SHADOW'
}

export function createDefaultEffect(): Effect {
  return {
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    offset: { x: 0, y: 4 },
    radius: 4,
    spread: 0,
    visible: true
  }
}

export interface EffectEditSnapshot {
  effects: Effect[]
  effectStyleId: string | null
}

export function useEffectsControls() {
  const editor = useEditor()
  const { panels } = useI18n()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const effectsBeforeScrub = useRef<EffectEditSnapshot | null>(null)

  const effectOptions = [
    { value: 'DROP_SHADOW' as const, label: panels.dropShadow },
    { value: 'INNER_SHADOW' as const, label: panels.innerShadow },
    { value: 'LAYER_BLUR' as const, label: panels.layerBlur },
    { value: 'BACKGROUND_BLUR' as const, label: panels.backgroundBlur },
    { value: 'FOREGROUND_BLUR' as const, label: panels.foregroundBlur }
  ]

  function scrubEffect(node: SceneNode | null, index: number, changes: Partial<Effect>) {
    if (!node) return
    if (!effectsBeforeScrub.current) {
      effectsBeforeScrub.current = {
        effects: node.effects.map((effect) => ({
          ...effect,
          color: { ...effect.color },
          offset: { ...effect.offset }
        })),
        effectStyleId: node.effectStyleId
      }
    }
    const effects = [...node.effects]
    effects[index] = { ...effects[index], ...changes }
    editor.updateNode(node.id, { effects })
    editor.requestRender()
  }

  function commitEffect(node: SceneNode | null, index: number, changes: Partial<Effect>) {
    if (!node) return
    const previous = effectsBeforeScrub.current
    effectsBeforeScrub.current = null
    const effects = [...node.effects]
    effects[index] = { ...effects[index], ...changes }
    if (previous) {
      editor.updateNode(node.id, { effects })
      editor.requestRender()
      editor.commitNodeUpdate(
        node.id,
        { effects: previous.effects, effectStyleId: previous.effectStyleId },
        'Change effect'
      )
      return
    }
    editor.updateNodeWithUndo(node.id, { effects }, 'Change effect')
  }

  function updateType(node: SceneNode | null, index: number, type: EffectType) {
    if (!node) return
    const changes: Partial<Effect> = { type }
    if (!isShadow(type)) {
      changes.offset = { x: 0, y: 0 }
      changes.spread = 0
    } else if (!isShadow(node.effects[index].type)) {
      changes.offset = { x: 0, y: 4 }
      changes.spread = 0
    }
    commitEffect(node, index, changes)
  }

  function updateColor(node: SceneNode | null, index: number, color: Color) {
    if (!node) return
    const effects = [...node.effects]
    effects[index] = { ...effects[index], color }
    editor.updateNodeWithUndo(node.id, { effects }, 'Change effect')
  }

  function addEffect(node: SceneNode | null) {
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { effects: [...node.effects, createDefaultEffect()] },
      'Add effect'
    )
  }

  function removeEffect(node: SceneNode | null, index: number) {
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { effects: node.effects.filter((_, itemIndex) => itemIndex !== index) },
      'Remove effect'
    )
    setExpandedIndex((current) => {
      if (current === index) return null
      if (current !== null && current > index) return current - 1
      return current
    })
  }

  function toggleVisibility(node: SceneNode | null, index: number) {
    if (!node) return
    const effects = [...node.effects]
    effects[index] = { ...effects[index], visible: !effects[index].visible }
    editor.updateNodeWithUndo(node.id, { effects }, 'Toggle effects visibility')
  }

  function toggleExpand(index: number) {
    setExpandedIndex((current) => (current === index ? null : index))
  }

  return {
    editor,
    expandedIndex,
    effectOptions,
    isShadow,
    createDefaultEffect,
    scrubEffect,
    commitEffect,
    updateType,
    updateColor,
    addEffect,
    removeEffect,
    toggleVisibility,
    toggleExpand
  }
}

export function patchEffectsForNodes(
  editor: Editor,
  nodes: SceneNode[],
  mutator: (effects: Effect[]) => Effect[],
  label: string
) {
  const apply = () => {
    for (const node of nodes) {
      editor.updateNodeWithUndo(node.id, { effects: mutator(structuredClone(node.effects)) }, label)
    }
  }
  if (nodes.length > 1) editor.undo.runBatch(label, apply)
  else apply()
}
