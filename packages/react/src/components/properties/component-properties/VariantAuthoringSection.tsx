import { useEffect, useState, type ReactNode } from 'react'
import { Copy, Minus, Plus, Settings2, Trash2 } from 'lucide-react'
import type { ComponentPropertyType } from '@open-pencil/scene-graph'

import { PropertySettingsPopover } from '#react/components/properties/component-properties/PropertySettingsPopover'
import { VariantValueField } from '#react/components/properties/component-properties/VariantValueField'
import { IconButton } from '#react/components/ui/IconButton'
import { menuItem, useMenuUI } from '#react/components/ui/menu'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useVariantAuthoring, type VariantDefinitionControl } from '#react/controls/component-props'
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
    renameValue,
    setPropertyDefaultValue,
    applyVariantValue,
    addVariant,
    duplicateVariant,
    removeVariant
  } = useVariantAuthoring()
  const { panels } = useI18n()
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({})
  const [mutationConflictIds, setMutationConflictIds] = useState<string[]>([])
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const menuCls = useMenuUI({ content: 'absolute right-0 z-20 mt-1 min-w-40' })
  const itemCls = menuItem({ justify: 'start' })

  useEffect(() => {
    const selected: Record<string, string> = {}
    for (const definition of definitions) {
      selected[definition.id] =
        variant?.componentPropertyValues[definition.name] ??
        definition.defaultValue ??
        definition.values[0] ??
        ''
    }
    setSelectedValues(selected)
  }, [definitions, variant])

  useEffect(() => {
    if (!addMenuOpen) return
    function close() {
      setAddMenuOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [addMenuOpen])

  if (!active) return null

  const conflictIds = new Set([
    ...diagnostics.flatMap((diagnostic) => diagnostic.componentIds),
    ...mutationConflictIds
  ])
  const selectedHasConflict = variant?.id ? conflictIds.has(variant.id) : false
  const sectionLabel =
    definitions.length === 0 || definitions.every((definition) => definition.type === 'VARIANT')
      ? panels.variants
      : panels.componentProperties
  function createProperty(type: ComponentPropertyType) {
    const presets = {
      VARIANT: { name: panels.defaultVariantPropertyName, value: panels.defaultVariantPropertyValue },
      BOOLEAN: { name: panels.defaultBooleanPropertyName, value: 'true' },
      TEXT: { name: panels.defaultTextPropertyName, value: '' },
      INSTANCE_SWAP: { name: panels.defaultInstanceSwapPropertyName, value: '' }
    }
    const preset = presets[type]
    addProperty(type, preset.name, preset.value)
    setAddMenuOpen(false)
  }

  function commitSelectedValue(propertyId: string, value: string) {
    setSelectedValues((current) => ({ ...current, [propertyId]: value }))
    const result = applyVariantValue(propertyId, value)
    setMutationConflictIds(result.kind === 'conflict' ? result.componentIds : [])
    if (result.kind === 'invalid' || result.kind === 'conflict') {
      const definition = definitions.find((item) => item.id === propertyId)
      setSelectedValues((current) => ({
        ...current,
        [propertyId]: variant?.componentPropertyValues[definition?.name ?? ''] ?? ''
      }))
    }
  }

  const propertyTypes: { type: ComponentPropertyType; label: string }[] = [
    { type: 'VARIANT', label: panels.propertyTypeVariant },
    { type: 'BOOLEAN', label: panels.propertyTypeBoolean },
    { type: 'TEXT', label: panels.propertyTypeText },
    { type: 'INSTANCE_SWAP', label: panels.propertyTypeInstanceSwap }
  ]

  return (
    <PanelSection
      label={sectionLabel}
      titleClass="text-component"
      actions={
        <>
          <div className="relative" onPointerDown={(event) => event.stopPropagation()}>
            <IconButton
              label={panels.addComponentProperty}
              active={addMenuOpen}
              onClick={() => setAddMenuOpen((open) => !open)}
            >
              <Plus className="size-3.5" />
            </IconButton>
            {addMenuOpen ? (
              <div className={menuCls.content}>
                {variant ? (
                  <button
                    type="button"
                    className={itemCls}
                    onClick={() => {
                      duplicateVariant()
                      setAddMenuOpen(false)
                    }}
                  >
                    {panels.duplicateVariant}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={itemCls}
                    onClick={() => {
                      addVariant()
                      setAddMenuOpen(false)
                    }}
                  >
                    {panels.addVariant}
                  </button>
                )}
                <div className={menuCls.separator} />
                {propertyTypes.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className={itemCls}
                    onClick={() => createProperty(item.type)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {variant ? (
            <>
              <IconButton label={panels.duplicateVariant} onClick={() => duplicateVariant()}>
                <Copy className="size-3.5" />
              </IconButton>
              <IconButton label={panels.removeVariant} onClick={() => removeVariant()}>
                <Trash2 className="size-3.5" />
              </IconButton>
            </>
          ) : null}
        </>
      }
    >
      {definitions.length ? (
        <div className="flex flex-col gap-1">
          {definitions.map((definition) => (
            <PropertyRow
              key={definition.id}
              definition={definition}
              selectedValue={selectedValues[definition.id] ?? ''}
              showValueField={Boolean(variant) && definition.type === 'VARIANT'}
              invalid={selectedHasConflict && definition.type === 'VARIANT'}
              settingsOpen={settingsId === definition.id}
              onSelectValue={(value) => commitSelectedValue(definition.id, value)}
              onToggleSettings={() =>
                setSettingsId((current) => (current === definition.id ? null : definition.id))
              }
              onRemove={() => {
                if (settingsId === definition.id) setSettingsId(null)
                removeProperty(definition.id)
              }}
              settings={
                settingsId === definition.id ? (
                  <PropertySettingsPopover
                    definition={definition}
                    onClose={() => setSettingsId(null)}
                    onRename={(name) => renameProperty(definition.id, name)}
                    onRenameValue={(previous, next) => renameValue(definition.id, previous, next)}
                    onSetDefaultValue={(value) => setPropertyDefaultValue(definition.id, value)}
                  />
                ) : null
              }
            />
          ))}
          {selectedHasConflict || diagnostics.length ? (
            <p role="alert" className="rounded bg-danger/10 px-2 py-1.5 text-[10px] leading-4 text-danger">
              {panels.duplicateVariantValues}. {panels.variantConflictHelp}.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="py-1 text-[10px] text-muted">{panels.noVariantProperties}</p>
      )}
    </PanelSection>
  )
}

function propertyValuesLabel(definition: VariantDefinitionControl, selectedValue: string) {
  if (definition.type === 'VARIANT') {
    return definition.values.join(', ') || selectedValue
  }
  if (definition.type === 'BOOLEAN') return definition.defaultValue === 'true' ? 'true' : 'false'
  return selectedValue || definition.defaultValue
}

function PropertyRow({
  definition,
  selectedValue,
  showValueField,
  invalid,
  settingsOpen,
  onSelectValue,
  onToggleSettings,
  onRemove,
  settings
}: {
  definition: VariantDefinitionControl
  selectedValue: string
  showValueField: boolean
  invalid: boolean
  settingsOpen: boolean
  onSelectValue: (value: string) => void
  onToggleSettings: () => void
  onRemove: () => void
  settings: ReactNode
}) {
  const { panels } = useI18n()
  const valuesLabel = propertyValuesLabel(definition, selectedValue)
  return (
    <div
      className="relative flex items-center gap-0.5 overflow-visible rounded px-0.5"
      data-property={definition.id}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
        <span className="shrink-0 text-[11px] text-surface">{definition.name}</span>
        {valuesLabel || showValueField ? (
          <span className="shrink-0 text-[11px] text-muted" aria-hidden="true">
            ·
          </span>
        ) : null}
        {showValueField ? (
          <div className="min-w-0 flex-1">
            <VariantValueField
              label={definition.name}
              value={selectedValue}
              options={definition.values}
              invalid={invalid}
              propertyId={definition.id}
              onCommit={onSelectValue}
            />
          </div>
        ) : valuesLabel ? (
          <span className="min-w-0 truncate text-[11px] text-muted">{valuesLabel}</span>
        ) : null}
      </div>
      <IconButton
        size="xs"
        label={panels.propertySettings}
        active={settingsOpen}
        onClick={onToggleSettings}
      >
        <Settings2 className="size-3.5" />
      </IconButton>
      <IconButton size="xs" label={panels.removeVariantProperty} onClick={onRemove}>
        <Minus className="size-3.5" />
      </IconButton>
      {settings}
    </div>
  )
}
