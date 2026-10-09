import { IconButton } from '#react/components/ui/IconButton'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useVariantAuthoring } from '#react/controls/component-props'
import { useI18n } from '#react/i18n'
import { ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function VariantAuthoringSection() {
  const {
    active,
    variant,
    definitions,
    diagnostics,
    addProperty,
    renameProperty,
    removeProperty,
    reorderProperties,
    renameValue,
    reorderValues,
    setVariantValue,
    addVariant,
    duplicateVariant
  } = useVariantAuthoring()
  const { panels } = useI18n()
  const [propertyNames, setPropertyNames] = useState<Record<string, string>>({})
  const [propertyValues, setPropertyValues] = useState<Record<string, string>>({})
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({})
  const [mutationConflictIds, setMutationConflictIds] = useState<string[]>([])
  const nameInputRefs = useRef(new Map<string, HTMLInputElement>())

  useEffect(() => {
    const names: Record<string, string> = {}
    const values: Record<string, string> = {}
    const selected: Record<string, string> = {}
    for (const definition of definitions) {
      names[definition.id] = definition.name
      for (const value of definition.values) values[`${definition.id}:${value}`] = value
      selected[definition.id] =
        variant?.componentPropertyValues[definition.name] ?? definition.values[0] ?? ''
    }
    setPropertyNames(names)
    setPropertyValues(values)
    setSelectedValues(selected)
  }, [definitions, variant])

  if (!active) return null

  const conflictIds = new Set([
    ...diagnostics.flatMap((diagnostic) => diagnostic.componentIds),
    ...mutationConflictIds
  ])
  const selectedHasConflict = variant?.id ? conflictIds.has(variant.id) : false

  function commitPropertyName(propertyId: string) {
    const name = propertyNames[propertyId]?.trim()
    const definition = definitions.find((item) => item.id === propertyId)
    if (!name || !definition || !renameProperty(propertyId, name)) {
      if (definition) setPropertyNames((current) => ({ ...current, [propertyId]: definition.name }))
    }
  }

  function moveProperty(propertyId: string, offset: -1 | 1) {
    const ids = definitions.map((definition) => definition.id)
    const index = ids.indexOf(propertyId)
    const destination = index + offset
    if (index === -1 || destination < 0 || destination >= ids.length) return
    const [moved] = ids.splice(index, 1)
    if (!moved) return
    ids.splice(destination, 0, moved)
    reorderProperties(ids)
  }

  function moveValue(propertyId: string, value: string, offset: -1 | 1) {
    const definition = definitions.find((item) => item.id === propertyId)
    if (!definition) return
    const values = [...definition.values]
    const index = values.indexOf(value)
    const destination = index + offset
    if (index === -1 || destination < 0 || destination >= values.length) return
    const [moved] = values.splice(index, 1)
    if (!moved) return
    values.splice(destination, 0, moved)
    reorderValues(propertyId, values)
  }

  function commitPropertyValue(propertyId: string, previousValue: string) {
    const key = `${propertyId}:${previousValue}`
    const value = propertyValues[key]?.trim()
    if (!value || !renameValue(propertyId, previousValue, value)) {
      setPropertyValues((current) => ({ ...current, [key]: previousValue }))
    }
  }

  function commitSelectedValue(propertyId: string) {
    const value = selectedValues[propertyId]?.trim()
    const definition = definitions.find((item) => item.id === propertyId)
    if (!value || !definition) return
    const result = setVariantValue(propertyId, value)
    setMutationConflictIds(result.kind === 'conflict' ? result.componentIds : [])
    if (result.kind === 'invalid' || result.kind === 'conflict') {
      setSelectedValues((current) => ({
        ...current,
        [propertyId]: variant?.componentPropertyValues[definition.name] ?? ''
      }))
    }
  }

  function createProperty() {
    const id = addProperty()
    if (!id) return
    queueMicrotask(() => nameInputRefs.current.get(id)?.select())
  }

  return (
    <PanelSection
      label={panels.variants}
      titleClass="text-component"
      actions={
        <IconButton
          label={variant ? panels.duplicateVariant : panels.addVariantProperty}
          onClick={() => (variant ? duplicateVariant() : createProperty())}
        >
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      {variant ? (
        <div className="flex flex-col gap-1.5">
          {definitions.map((definition) => (
            <PanelFieldGroup key={definition.id} label={definition.name}>
              <input
                className="h-6 w-full rounded border border-border bg-transparent px-1.5 text-[11px] text-surface outline-none focus:border-component data-[invalid]:border-danger"
                value={selectedValues[definition.id] ?? ''}
                aria-label={definition.name}
                data-property={definition.id}
                data-invalid={selectedHasConflict ? '' : undefined}
                onChange={(event) =>
                  setSelectedValues((current) => ({
                    ...current,
                    [definition.id]: event.target.value
                  }))
                }
                onBlur={() => commitSelectedValue(definition.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
                }}
              />
            </PanelFieldGroup>
          ))}
          {selectedHasConflict ? (
            <p
              role="alert"
              className="rounded bg-danger/10 px-2 py-1.5 text-[10px] leading-4 text-danger"
            >
              {panels.duplicateVariantValues}. {panels.variantConflictHelp}.
            </p>
          ) : null}
        </div>
      ) : definitions.length ? (
        <div className="flex flex-col gap-2">
          {definitions.map((definition) => (
            <div
              key={definition.id}
              className="flex flex-col gap-1.5 rounded border border-border p-1.5"
              data-property={definition.id}
            >
              <div className="flex items-center gap-1">
                <input
                  ref={(input) => {
                    if (input) nameInputRefs.current.set(definition.id, input)
                    else nameInputRefs.current.delete(definition.id)
                  }}
                  className="h-6 min-w-0 flex-1 rounded border border-border bg-transparent px-1.5 text-[11px] text-surface outline-none focus:border-component"
                  value={propertyNames[definition.id] ?? definition.name}
                  aria-label={panels.variantPropertyName}
                  onChange={(event) =>
                    setPropertyNames((current) => ({
                      ...current,
                      [definition.id]: event.target.value
                    }))
                  }
                  onBlur={() => commitPropertyName(definition.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
                  }}
                />
                <IconButton
                  label={panels.moveVariantPropertyUp}
                  disabled={definitions[0]?.id === definition.id}
                  onClick={() => moveProperty(definition.id, -1)}
                >
                  <ChevronUp className="size-3.5" />
                </IconButton>
                <IconButton
                  label={panels.moveVariantPropertyDown}
                  disabled={definitions.at(-1)?.id === definition.id}
                  onClick={() => moveProperty(definition.id, 1)}
                >
                  <ChevronDown className="size-3.5" />
                </IconButton>
                <IconButton
                  label={panels.removeVariantProperty}
                  onClick={() => removeProperty(definition.id)}
                >
                  <Minus className="size-3.5" />
                </IconButton>
              </div>
              {definition.values.map((value, valueIndex) => (
                <div key={value} className="flex items-center gap-1">
                  <input
                    className="h-6 min-w-0 flex-1 rounded border border-border bg-transparent px-1.5 text-[11px] text-surface outline-none focus:border-component"
                    value={propertyValues[`${definition.id}:${value}`] ?? value}
                    aria-label={`${definition.name}: ${value}`}
                    onChange={(event) =>
                      setPropertyValues((current) => ({
                        ...current,
                        [`${definition.id}:${value}`]: event.target.value
                      }))
                    }
                    onBlur={() => commitPropertyValue(definition.id, value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
                    }}
                  />
                  <IconButton
                    label={panels.moveVariantValueUp}
                    disabled={valueIndex === 0}
                    onClick={() => moveValue(definition.id, value, -1)}
                  >
                    <ChevronUp className="size-3.5" />
                  </IconButton>
                  <IconButton
                    label={panels.moveVariantValueDown}
                    disabled={valueIndex === definition.values.length - 1}
                    onClick={() => moveValue(definition.id, value, 1)}
                  >
                    <ChevronDown className="size-3.5" />
                  </IconButton>
                </div>
              ))}
            </div>
          ))}
          {diagnostics.length ? (
            <p
              role="alert"
              className="rounded bg-danger/10 px-2 py-1.5 text-[10px] leading-4 text-danger"
            >
              {panels.duplicateVariantValues}. {panels.variantConflictHelp}.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="py-1 text-[10px] text-muted">{panels.noVariantProperties}</p>
      )}

      {!variant ? (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 self-start rounded bg-hover px-2 py-1 text-[11px] text-surface hover:bg-border"
          onClick={() => addVariant()}
        >
          <Plus className="size-3.5" />
          {panels.addVariant}
        </button>
      ) : null}
    </PanelSection>
  )
}
