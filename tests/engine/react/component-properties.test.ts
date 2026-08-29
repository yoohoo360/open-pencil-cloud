import { describe, expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core/editor'

import {
  findFirstUnboundDescendant,
  instanceBooleanPropertyValue,
  instanceTextPropertyValue,
  instanceVariantOptions,
  orderedVariantValues,
  propertyDefinitionOwners,
  resolveVariantAuthoringChange,
  uniquePropertyName,
  withPropertyReference
} from '../../../packages/react/src/controls/component-props'

function setupButtonSet() {
  const editor = createEditor()
  const page = editor.graph.getPages()[0]
  const componentSet = editor.graph.createNode('COMPONENT_SET', page.id, {
    name: 'Button',
    componentPropertyDefinitions: [
      {
        id: 'variant:type',
        name: 'Type',
        type: 'VARIANT',
        defaultValue: 'Primary',
        variantOptions: ['Primary', 'Secondary']
      },
      {
        id: 'variant:size',
        name: 'Size',
        type: 'VARIANT',
        defaultValue: 'Small',
        variantOptions: ['Small', 'Large']
      },
      { id: 'prop:label', name: 'Label', type: 'TEXT', defaultValue: 'Button' }
    ]
  })
  const primarySmall = editor.graph.createNode('COMPONENT', componentSet.id, {
    name: 'Type=Primary, Size=Small',
    componentPropertyValues: { Type: 'Primary', Size: 'Small' }
  })
  const primaryLarge = editor.graph.createNode('COMPONENT', componentSet.id, {
    name: 'Type=Primary, Size=Large',
    x: 160,
    componentPropertyValues: { Type: 'Primary', Size: 'Large' }
  })
  const secondarySmall = editor.graph.createNode('COMPONENT', componentSet.id, {
    name: 'Type=Secondary, Size=Small',
    y: 120,
    componentPropertyValues: { Type: 'Secondary', Size: 'Small' }
  })
  return { editor, componentSet, primarySmall, primaryLarge, secondarySmall }
}

describe('orderedVariantValues', () => {
  test('keeps preferred order and appends new present values', () => {
    expect(orderedVariantValues(['Large', 'Small'], ['Small', 'Medium', 'Large'])).toEqual([
      'Large',
      'Small',
      'Medium'
    ])
  })
})

describe('uniquePropertyName', () => {
  test('increments numbered Figma-style defaults', () => {
    expect(uniquePropertyName([], 'Property 1')).toBe('Property 1')
    expect(uniquePropertyName(['Property 1'], 'Property 1')).toBe('Property 2')
    expect(uniquePropertyName(['Boolean'], 'Boolean')).toBe('Boolean 2')
  })
})

describe('instanceVariantOptions', () => {
  test('keeps unavailable combinations disabled and includes the current value', () => {
    const options = instanceVariantOptions(
      [
        { value: 'Primary', available: true },
        { value: 'Secondary', available: false }
      ],
      ['Ghost'],
      'Ghost'
    )
    expect(options).toEqual([
      { value: 'Primary', label: 'Primary', disabled: false },
      { value: 'Secondary', label: 'Secondary', disabled: true },
      { value: 'Ghost', label: 'Ghost' }
    ])
  })
})

describe('resolveVariantAuthoringChange', () => {
  test('selects an existing combination instead of mutating the current variant', () => {
    const { editor, primarySmall, primaryLarge } = setupButtonSet()
    const result = resolveVariantAuthoringChange(
      primarySmall.id,
      { Type: 'Primary', Size: 'Small' },
      'Size',
      'Large',
      (values) => editor.findVariantByValues(primarySmall.parentId ?? '', values)
    )
    expect(result).toEqual({ kind: 'select', id: primaryLarge.id })
  })

  test('sets a new value when the combination does not exist', () => {
    const { editor, secondarySmall } = setupButtonSet()
    const result = resolveVariantAuthoringChange(
      secondarySmall.id,
      { Type: 'Secondary', Size: 'Small' },
      'Size',
      'Large',
      (values) => editor.findVariantByValues(secondarySmall.parentId ?? '', values)
    )
    expect(result).toEqual({ kind: 'set', value: 'Large' })
  })
})

describe('instanceTextPropertyValue', () => {
  test('uses the live bound text when the instance has no assignment', () => {
    const editor = createEditor()
    const page = editor.graph.getPages()[0]
    const componentSet = editor.graph.createNode('COMPONENT_SET', page.id, {
      componentPropertyDefinitions: [
        { id: 'prop:label', name: 'Label', type: 'TEXT', defaultValue: 'Button' }
      ]
    })
    const variant = editor.graph.createNode('COMPONENT', componentSet.id, {
      name: 'Type=Primary',
      componentPropertyValues: { Type: 'Primary' }
    })
    editor.graph.createNode('TEXT', variant.id, {
      name: 'Label',
      text: 'Primary',
      componentPropertyReferences: [{ propertyId: 'prop:label', field: 'TEXT' }]
    })
    const instance = editor.graph.createInstance(variant.id, page.id)
    if (!instance) throw new Error('Expected instance')
    const definition = componentSet.componentPropertyDefinitions[0]
    expect(
      instanceTextPropertyValue(instance, definition, (id) => editor.graph.getChildren(id))
    ).toBe('Primary')
    expect(editor.getInstanceComponentPropertyValue(instance.id, definition)).toBe('Button')

    editor.setInstanceComponentProperty(instance.id, 'prop:label', 'Hello')
    const updated = editor.graph.getNode(instance.id)
    if (!updated) throw new Error('Expected updated instance')
    expect(
      instanceTextPropertyValue(updated, definition, (id) => editor.graph.getChildren(id))
    ).toBe('Hello')
    expect(editor.graph.getChildren(instance.id)[0]?.text).toBe('Hello')
  })
})

describe('text property binding', () => {
  test('binds text content to the first unbound text descendant', () => {
    const editor = createEditor()
    const page = editor.graph.getPages()[0]
    const component = editor.graph.createNode('COMPONENT', page.id, { name: 'Card' })
    editor.graph.createNode('RECTANGLE', component.id, { name: 'Icon' })
    const label = editor.graph.createNode('TEXT', component.id, { name: 'Label', text: 'Hello' })
    const bound = findFirstUnboundDescendant(
      component,
      'TEXT',
      (id) => editor.graph.getChildren(id),
      true
    )
    expect(bound?.id).toBe(label.id)
    expect(withPropertyReference([], 'TEXT', 'prop:label')).toEqual([
      { propertyId: 'prop:label', field: 'TEXT' }
    ])
    expect(propertyDefinitionOwners(label, (id) => editor.graph.getNode(id)).map((node) => node.id)).toEqual([
      component.id
    ])
  })
})

describe('boolean property binding', () => {
  test('uses the live bound visibility when the instance has no assignment', () => {
    const editor = createEditor()
    const page = editor.graph.getPages()[0]
    const componentSet = editor.graph.createNode('COMPONENT_SET', page.id, {
      componentPropertyDefinitions: [
        { id: 'prop:show-icon', name: 'Show icon', type: 'BOOLEAN', defaultValue: 'true' }
      ]
    })
    const variant = editor.graph.createNode('COMPONENT', componentSet.id, {
      name: 'Type=Primary'
    })
    editor.graph.createNode('RECTANGLE', variant.id, {
      name: 'Icon',
      visible: false,
      componentPropertyReferences: [{ propertyId: 'prop:show-icon', field: 'VISIBLE' }]
    })
    const instance = editor.graph.createInstance(variant.id, page.id)
    if (!instance) throw new Error('Expected instance')
    const definition = componentSet.componentPropertyDefinitions[0]
    expect(
      instanceBooleanPropertyValue(instance, definition, (id) => editor.graph.getChildren(id))
    ).toBe('false')

    editor.setInstanceComponentProperty(instance.id, 'prop:show-icon', 'true')
    expect(editor.graph.getChildren(instance.id)[0]?.visible).toBe(true)
  })

  test('binds visibility to the first unbound descendant', () => {
    const editor = createEditor()
    const page = editor.graph.getPages()[0]
    const component = editor.graph.createNode('COMPONENT', page.id, { name: 'Card' })
    const icon = editor.graph.createNode('RECTANGLE', component.id, { name: 'Icon' })
    const bound = findFirstUnboundDescendant(
      component,
      'VISIBLE',
      (id) => editor.graph.getChildren(id),
      true
    )
    expect(bound?.id).toBe(icon.id)
    expect(withPropertyReference([], 'VISIBLE', 'prop:show')).toEqual([
      { propertyId: 'prop:show', field: 'VISIBLE' }
    ])
    expect(propertyDefinitionOwners(icon, (id) => editor.graph.getNode(id)).map((node) => node.id)).toEqual([
      component.id
    ])
  })
})

describe('component property authoring', () => {
  test('adds boolean and text properties on a component set', () => {
    const { editor, componentSet } = setupButtonSet()
    expect(editor.addPropertyDefinition(componentSet.id, 'Show icon', 'BOOLEAN', 'true')).toBeTruthy()
    expect(editor.addPropertyDefinition(componentSet.id, 'Caption', 'TEXT', '')).toBeTruthy()
    const types = editor
      .getComponentSetPropertyDefs(componentSet.id)
      .map((definition) => definition.type)
    expect(types).toEqual(['VARIANT', 'VARIANT', 'TEXT', 'BOOLEAN', 'TEXT'])
  })

  test('instance variant dropdowns disable missing combinations', () => {
    const { editor, primarySmall, secondarySmall } = setupButtonSet()
    const page = editor.graph.getPages()[0]
    const instance = editor.graph.createInstance(primarySmall.id, page.id)
    if (!instance) throw new Error('Expected instance')
    expect(editor.getVariantOptionAvailability(instance.id, 'Type')).toEqual([
      { value: 'Primary', available: true },
      { value: 'Secondary', available: true }
    ])
    expect(editor.getVariantOptionAvailability(instance.id, 'Size')).toEqual([
      { value: 'Small', available: true },
      { value: 'Large', available: true }
    ])
    editor.switchInstanceVariant(instance.id, 'Type', 'Secondary')
    expect(instance.componentId).toBe(secondarySmall.id)
    expect(editor.getVariantOptionAvailability(instance.id, 'Size')).toEqual([
      { value: 'Small', available: true },
      { value: 'Large', available: false }
    ])
  })
})
