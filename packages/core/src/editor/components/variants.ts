import { omit } from 'es-toolkit/object'

import type {
  ComponentPropertyDefinition,
  ComponentPropertyType,
  SceneGraph,
  SceneNode
} from '@open-pencil/scene-graph'
import { buildVariantName, parseVariantName } from '@open-pencil/scene-graph/variant-name'

import { reapplyInstanceComponentProperties } from '#core/editor/components/properties'
import type { EditorContext } from '#core/editor/types'
import { randomHex } from '#core/random'

export type VariantConflict = {
  values: Record<string, string>
  componentIds: string[]
}

function sortByCanvasPosition(a: SceneNode, b: SceneNode) {
  return a.y - b.y || a.x - b.x || a.name.localeCompare(b.name)
}

export function createVariantActions(ctx: EditorContext) {
  function getComponentSetPropertyDefs(componentSetId: string): ComponentPropertyDefinition[] {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return []
    return node.componentPropertyDefinitions
  }

  function addPropertyDefinition(
    componentSetId: string,
    name: string,
    type: ComponentPropertyType = 'VARIANT',
    defaultValue = ''
  ): string | undefined {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return undefined
    const id = `prop:${randomHex(8)}`
    const def: ComponentPropertyDefinition = {
      id,
      name,
      type,
      defaultValue,
      variantOptions: type === 'VARIANT' ? [defaultValue] : undefined
    }
    const prevDefs = [...node.componentPropertyDefinitions]
    ctx.graph.updateNode(componentSetId, {
      componentPropertyDefinitions: [...prevDefs, def]
    })
    ctx.undo.push({
      label: 'Add property',
      forward: () => {
        const n = ctx.graph.getNode(componentSetId)
        if (n) {
          ctx.graph.updateNode(componentSetId, {
            componentPropertyDefinitions: [...n.componentPropertyDefinitions, def]
          })
        }
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.updateNode(componentSetId, {
          componentPropertyDefinitions: prevDefs
        })
        ctx.requestRender()
      }
    })
    ctx.requestRender()
    return id
  }

  function removePropertyDefinition(componentSetId: string, propertyId: string) {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return
    const prevDefs = [...node.componentPropertyDefinitions]
    const def = prevDefs.find((d) => d.id === propertyId)
    if (!def) return
    ctx.graph.updateNode(componentSetId, {
      componentPropertyDefinitions: prevDefs.filter((d) => d.id !== propertyId)
    })
    for (const childId of node.childIds) {
      const child = ctx.graph.getNode(childId)
      if (!child) continue
      const values = omit(child.componentPropertyValues, [def.name])
      ctx.graph.updateNode(childId, { componentPropertyValues: values })
    }
    ctx.undo.push({
      label: 'Remove property',
      forward: () => {
        const n = ctx.graph.getNode(componentSetId)
        if (n) {
          ctx.graph.updateNode(componentSetId, {
            componentPropertyDefinitions: n.componentPropertyDefinitions.filter(
              (d) => d.id !== propertyId
            )
          })
          for (const cid of n.childIds) {
            const c = ctx.graph.getNode(cid)
            if (!c) continue
            const v = omit(c.componentPropertyValues, [def.name])
            ctx.graph.updateNode(cid, { componentPropertyValues: v })
          }
        }
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.updateNode(componentSetId, {
          componentPropertyDefinitions: prevDefs
        })
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function renamePropertyDefinition(componentSetId: string, propertyId: string, newName: string) {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return
    const def = node.componentPropertyDefinitions.find((d) => d.id === propertyId)
    if (!def) return
    const prevName = def.name
    const newDefs = node.componentPropertyDefinitions.map((d) =>
      d.id === propertyId ? { ...d, name: newName } : d
    )
    ctx.graph.updateNode(componentSetId, { componentPropertyDefinitions: newDefs })
    for (const childId of node.childIds) {
      const child = ctx.graph.getNode(childId)
      if (!child) continue
      const values = { ...child.componentPropertyValues }
      if (prevName in values) {
        const nextValues: Record<string, string> = omit(values, [prevName])
        nextValues[newName] = values[prevName]
        ctx.graph.updateNode(childId, { componentPropertyValues: nextValues })
      }
    }
    const renamePropertyDef = (name: string) => {
      const n = ctx.graph.getNode(componentSetId)
      if (!n) return
      ctx.graph.updateNode(componentSetId, {
        componentPropertyDefinitions: n.componentPropertyDefinitions.map((d) =>
          d.id === propertyId ? { ...d, name } : d
        )
      })
      ctx.requestRender()
    }
    ctx.undo.push({
      label: 'Rename property',
      forward: () => renamePropertyDef(newName),
      inverse: () => renamePropertyDef(prevName)
    })
    ctx.requestRender()
  }

  function collectVariantOptions(
    componentSetId: string,
    graph: SceneGraph = ctx.graph
  ): Map<string, Set<string>> {
    const node = graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return new Map()
    const options = new Map<string, Set<string>>()
    for (const childId of node.childIds) {
      const child = graph.getNode(childId)
      if (child?.type !== 'COMPONENT') continue
      for (const [key, value] of Object.entries(child.componentPropertyValues)) {
        const set = options.get(key) ?? new Set()
        set.add(value)
        options.set(key, set)
      }
    }
    return options
  }

  function getComponentSetVariants(
    componentSetId: string,
    graph: SceneGraph = ctx.graph
  ): SceneNode[] {
    const node = graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return []
    return node.childIds
      .map((id) => graph.getNode(id))
      .filter((child): child is SceneNode => child?.type === 'COMPONENT')
  }

  function findVariantByValues(
    componentSetId: string,
    values: Record<string, string>,
    graph?: SceneGraph
  ): SceneNode | undefined {
    const childs = getComponentSetVariants(componentSetId, graph).sort(sortByCanvasPosition)
    for (const child of childs) {
      const childValues = child.componentPropertyValues
      const matches = Object.entries(values).every(([k, v]) => childValues[k] === v)
      if (matches) return child
    }
    return undefined
  }

  function getDefaultVariantForComponentSet(
    componentSetId: string,
    graph: SceneGraph = ctx.graph
  ): SceneNode | undefined {
    const node = graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return undefined
    const defaultValues = Object.fromEntries(
      node.componentPropertyDefinitions
        .filter((def) => def.type === 'VARIANT' && def.defaultValue)
        .map((def) => [def.name, def.defaultValue])
    )
    if (Object.keys(defaultValues).length > 0) {
      const explicitDefault = findVariantByValues(componentSetId, defaultValues, graph)
      if (explicitDefault) return explicitDefault
    }
    return getComponentSetVariants(componentSetId, graph).sort(sortByCanvasPosition)[0]
  }

  function getComponentSetVariantConflicts(
    componentSetId: string,
    graph: SceneGraph = ctx.graph
  ): VariantConflict[] {
    const node = graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return []

    const propNames = node.componentPropertyDefinitions
      .filter((def) => def.type === 'VARIANT')
      .map((def) => def.name)
    const byKey = new Map<string, { values: Record<string, string>; componentIds: string[] }>()

    for (const variant of getComponentSetVariants(componentSetId)) {
      const values = Object.fromEntries(
        propNames.map((name) => [name, variant.componentPropertyValues[name] ?? ''])
      )
      const key = propNames.map((name) => `${name}=${values[name]}`).join('\u0000')
      const entry = byKey.get(key) ?? { values, componentIds: [] }
      entry.componentIds.push(variant.id)
      byKey.set(key, entry)
    }

    return [...byKey.values()].filter((entry) => entry.componentIds.length > 1)
  }

  function updateVariantOptions(componentSetId: string, properId: string, newOptions: string[]) {
    const node = ctx.graph.getNode(componentSetId)
    if (node?.type !== 'COMPONENT_SET') return
    const def = node.componentPropertyDefinitions.find((d) => d.id === properId)
    if (!def || def.type !== 'VARIANT') return

    const prevOptions = def.variantOptions ?? []

    const updateOptions = (options: string[]) => {
      // Update property definitions
      ctx.graph.updateNode(componentSetId, {
        componentPropertyDefinitions: node.componentPropertyDefinitions.map((d) =>
          d.id === def.id ? { ...d, variantOptions: options } : d
        )
      })
      // Update child componentPropertyValues
      for (const childId of node.childIds) {
        const child = ctx.graph.getNode(childId)
        if (child?.type !== 'COMPONENT') continue
        const value = child.componentPropertyValues[def.name]
        if (value && !newOptions.includes(value)) {
          const newValues = omit(child.componentPropertyValues, [def.name])
          ctx.graph.updateNode(childId, { componentPropertyValues: newValues })
        }
      }
    }

    updateOptions(newOptions)
    ctx.undo.push({
      label: 'Update variant options',
      forward: () => {
        updateOptions(newOptions)
        ctx.requestRender()
      },
      inverse: () => {
        updateOptions(prevOptions)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function switchInstanceVariant(instanceId: string, propertyName: string, newValue: string) {
    const instance = ctx.graph.getNode(instanceId)
    if (instance?.type !== 'INSTANCE' || !instance.componentId) return

    const component = ctx.graph.getNode(instance.componentId)
    if (!component) return
    const componentSetId = component.parentId
    if (!componentSetId) return
    const componentSet = ctx.graph.getNode(componentSetId)
    if (componentSet?.type !== 'COMPONENT_SET') return

    const currentValues = { ...component.componentPropertyValues }
    currentValues[propertyName] = newValue
    const remoteKey = componentSet.id.split(':')[0]
    const graph = componentSet.remote ? ctx.graph.getLib(remoteKey)?.graph : ctx.graph
    const target = findVariantByValues(componentSetId, currentValues, graph)
    if (!target || target.id === instance.componentId) return
    if (componentSet.remote) {
      ctx.graph.addRemoteComponent(remoteKey, target, componentSet)
      ctx.graph.removeRemoteComponent(remoteKey, component, componentSet)
    }
    const prevComponentId = instance.componentId
    ctx.graph.swapInstanceComponent(instanceId, target.id)
    ctx.undo.push({
      label: 'Switch variant',
      forward: () => {
        if (componentSet.remote) {
          ctx.graph.addRemoteComponent(remoteKey, target, componentSet)
          ctx.graph.removeRemoteComponent(remoteKey, component, componentSet)
        }

        ctx.graph.swapInstanceComponent(instanceId, target.id)

        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.swapInstanceComponent(instanceId, prevComponentId)
        if (componentSet.remote) {
          ctx.graph.removeRemoteComponent(remoteKey, target, componentSet)
          ctx.graph.addRemoteComponent(remoteKey, target, componentSet)
        }
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  return {
    getComponentSetPropertyDefs,
    addPropertyDefinition,
    removePropertyDefinition,
    renamePropertyDefinition,
    parseVariantName,
    buildVariantName,
    updateVariantOptions,
    collectVariantOptions,
    findVariantByValues,
    getDefaultVariantForComponentSet,
    getComponentSetVariantConflicts,
    switchInstanceVariant
  }
}
export function generateVariantName(name: string = ''): {
  name: string
  value: string
}[] {
  const hasSlash = name.includes('/')
  const hasKeyValue =
    /(?:^|[,/]\s*)[^=,/]+=[^=,/]+(?:\s*[,/]|$)|^[^=,/]+=[^=,/]+(?:\s*,\s*[^=,/]+=[^=,/]+)*$/.test(
      name
    )
  if (hasSlash && hasKeyValue) return []

  if (hasKeyValue) {
    return name.split(',').map((part) => {
      const [name, value] = part.trim().split('=')
      return {
        name,
        value
      }
    })
  }
  return hasSlash
    ? name.split('/').map((it, idx) => {
        const val = it.trim()
        let type: ComponentPropertyType = 'VARIANT'
        if (val === 'true' || val === 'false') {
          type = 'BOOLEAN'
        }
        return {
          name: `Variant${idx + 1}`,
          type: type,
          value: val
        }
      })
    : []
}
export function generatePropertyValues(name: string, defs: ComponentPropertyDefinition[]) {
  const nameList = generateVariantName(name)
  const result: Record<string, string> = {}
  defs.forEach((def) => {
    const match = nameList.find((n) => n.name === def.name)
    if (match) {
      result[def.name] = match.value
    }
  })
  return result
}
