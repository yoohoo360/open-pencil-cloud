import { useRef } from 'react'

import type { Editor } from '@open-pencil/core/editor'
import type { Effect, SceneNode } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

import { panelMessageDefaults } from '#react/i18n/messages/panels'

type EffectType = Effect['type']

const EFFECT_LABELS: Record<string, string> = {
  DROP_SHADOW: panelMessageDefaults.dropShadow,
  INNER_SHADOW: panelMessageDefaults.innerShadow,
  LAYER_BLUR: panelMessageDefaults.layerBlur,
  BACKGROUND_BLUR: panelMessageDefaults.backgroundBlur,
  FOREGROUND_BLUR: panelMessageDefaults.foregroundBlur
}

export const EFFECT_TYPES = Object.keys(EFFECT_LABELS) as EffectType[]
export const EFFECT_OPTIONS = EFFECT_TYPES.map((t) => ({
  value: t,
  label: EFFECT_LABELS[t]
}))

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

export function createEffectEditActions(
  editor: Editor,
  effectsBeforeScrub: { current: EffectEditSnapshot | null }
) {
  function scrubEffect(node: SceneNode | null, index: number, changes: Partial<Effect>) {
    if (!node) return
    if (!effectsBeforeScrub.current) {
      effectsBeforeScrub.current = {
        effects: node.effects.map((e) => ({
          ...e,
          color: { ...e.color },
          offset: { ...e.offset }
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
    editor.updateNode(node.id, { effects })
    editor.requestRender()
    if (previous) {
      editor.commitNodeUpdate(
        node.id,
        { effects: previous.effects, effectStyleId: previous.effectStyleId },
        'Change effect'
      )
    }
  }

  return { scrubEffect, commitEffect }
}

export function createEffectControlActions(expandedIndex: { current: number | null }) {
  function updateType(
    patch: (index: number, changes: Partial<Effect>) => void,
    node: SceneNode | null,
    index: number,
    type: EffectType
  ) {
    if (!node) return
    const changes: Partial<Effect> = { type }
    if (!isShadow(type)) {
      changes.offset = { x: 0, y: 0 }
      changes.spread = 0
    } else if (!isShadow(node.effects[index].type)) {
      changes.offset = { x: 0, y: 4 }
      changes.spread = 0
    }
    patch(index, changes)
  }

  function updateColor(
    patch: (index: number, changes: Partial<Effect>) => void,
    index: number,
    color: Color
  ) {
    patch(index, { color })
  }

  function adjustExpandedAfterRemove(index: number) {
    if (expandedIndex.current === index) expandedIndex.current = null
    else if (expandedIndex.current !== null && expandedIndex.current > index) expandedIndex.current--
  }

  function handleRemove(removeFn: (index: number) => void, index: number) {
    removeFn(index)
    adjustExpandedAfterRemove(index)
  }

  function toggleExpand(index: number) {
    expandedIndex.current = expandedIndex.current === index ? null : index
  }

  return { updateType, updateColor, handleRemove, adjustExpandedAfterRemove, toggleExpand }
}
