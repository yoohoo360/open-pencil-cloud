import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'

import { AppInput } from '#react/components/ui/AppInput'
import { IconButton } from '#react/components/ui/IconButton'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useVariantAuthoring } from '#react/controls/component-props'
import { useI18n } from '#react/i18n'

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
    duplicateVariant,
    removeVariant
  } = useVariantAuthoring()
  const { panels } = useI18n()
  const [propertyNames, setPropertyNames] = useState<Record<string, string>>({})
  const [propertyValues, setPropertyValues] = useState<Record<string, string>>({})
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({})
  const [newPropertyName, setNewPropertyName] = useState('')
  const [newPropertyValue, setNewPropertyValue] = useState('')
  const [mutationConflictIds, setMutationConflictIds] = useState<string[]>([])

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

  function createProperty() {
    const name = newPropertyName.trim()
    const value = newPropertyValue.trim()
    if (!name || !value) return
    addProperty(name, value)
    setNewPropertyName('')
    setNewPropertyValue('')
  }

  return (
    <PanelSection
      label={panels.variants}
      empty={definitions.length === 0}
      actions={
        <>
          <IconButton
            label={variant ? panels.duplicateVariant : panels.addVariant}
            onClick={() => (variant ? duplicateVariant() : addVariant())}
          >
            <Plus className="size-3.5" />
          </IconButton>
          {variant ? (
            <IconButton label={panels.removeVariant} onClick={() => removeVariant()}>
              <Trash2 className="size-3.5" />
            </IconButton>
          ) : null}
        </>
      }
    >
      {variant ? (
        <div className="flex flex-col gap-1.5">
          {definitions.map((definition) => (
            <PanelFieldGroup key={definition.id} label={definition.name}>
              <AppInput
                value={selectedValues[definition.id] ?? ''}
                aria-label={definition.name}
                data-property={definition.id}
                onChange={(event) =>
                  setSelectedValues((current) => ({
                    ...current,
                    [definition.id]: event.target.value
                  }))
                }
                onBlur={() => {
                  const value = selectedValues[definition.id]?.trim()
                  if (!value) return
                  const result = setVariantValue(definition.id, value)
                  setMutationConflictIds(result.kind === 'conflict' ? result.componentIds : [])
                }}
              />
            </PanelFieldGroup>
          ))}
          {selectedHasConflict ? (
            <p role="alert" className="rounded bg-danger/10 px-2 py-1.5 text-[10px] leading-4 text-danger">
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
                <AppInput
                  value={propertyNames[definition.id] ?? definition.name}
                  aria-label={panels.variantPropertyName}
                  onChange={(event) =>
                    setPropertyNames((current) => ({
                      ...current,
                      [definition.id]: event.target.value
                    }))
                  }
                  onBlur={() => {
                    const name = propertyNames[definition.id]?.trim()
                    if (!name || !renameProperty(definition.id, name)) {
                      setPropertyNames((current) => ({ ...current, [definition.id]: definition.name }))
                    }
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
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
              {definition.values.map((value, valueIndex) => (
                <div key={value} className="flex items-center gap-1">
                  <AppInput
                    value={propertyValues[`${definition.id}:${value}`] ?? value}
                    aria-label={`${definition.name}: ${value}`}
                    onChange={(event) =>
                      setPropertyValues((current) => ({
                        ...current,
                        [`${definition.id}:${value}`]: event.target.value
                      }))
                    }
                    onBlur={() => {
                      const next = propertyValues[`${definition.id}:${value}`]?.trim()
                      if (!next || !renameValue(definition.id, value, next)) {
                        setPropertyValues((current) => ({
                          ...current,
                          [`${definition.id}:${value}`]: value
                        }))
                      }
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
            <p role="alert" className="rounded bg-danger/10 px-2 py-1.5 text-[10px] leading-4 text-danger">
              {panels.duplicateVariantValues}. {panels.variantConflictHelp}.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="py-1 text-[10px] text-muted">{panels.noVariantProperties}</p>
      )}

      <form
        className="mt-2 flex flex-col gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          createProperty()
        }}
      >
        <div className="grid grid-cols-2 gap-1">
          <AppInput
            value={newPropertyName}
            placeholder={panels.variantPropertyName}
            aria-label={panels.variantPropertyName}
            onChange={(event) => setNewPropertyName(event.target.value)}
          />
          <AppInput
            value={newPropertyValue}
            placeholder={panels.variantPropertyValue}
            aria-label={panels.variantPropertyValue}
            onChange={(event) => setNewPropertyValue(event.target.value)}
          />
        </div>
        <button
          type="submit"
          className="h-6 rounded bg-hover px-2 text-[10px] text-surface hover:bg-active disabled:opacity-50"
          disabled={!newPropertyName.trim() || !newPropertyValue.trim()}
        >
          {panels.addVariantProperty}
        </button>
      </form>
    </PanelSection>
  )
}
