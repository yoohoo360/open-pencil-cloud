import { ComponentPropertyTextField } from '#react/components/properties/component-properties/ComponentPropertyTextField'
import {
  propertyBindingTooltip,
  PropertyTypeIcon
} from '#react/components/properties/component-properties/PropertyTypeIcon'
import { InstanceSwapControl } from '#react/components/properties/component-properties/InstanceSwapControl'
import { SlotPropertyRow } from '#react/components/properties/component-properties/SlotPropertyRow'
import { AppSelect } from '#react/components/ui/AppSelect'
import { AppSwitch } from '#react/components/ui/AppSwitch'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { Tip } from '#react/components/ui/Tip'
import { useComponentProperties } from '#react/controls/component-props'
import { useSlotProperties } from '#react/controls/component-props/slots'
import { MIXED } from '#react/controls/mixed'
import { useI18n } from '#react/i18n'

const PROPERTY_ROW = {
  label: 'mb-0 min-w-0 w-24 shrink-0',
  container: 'min-w-0 flex-1 flex-row items-center'
}

export function ComponentPropertiesSection() {
  const { active, controls, setValue } = useComponentProperties()
  const slotProperties = useSlotProperties()
  const { slots } = slotProperties
  const { panels } = useI18n()
  const visible = active || slots.length > 0
  if (!visible) return null

  const sectionLabel =
    slots.length === 0 && controls.every((control) => control.type === 'VARIANT')
      ? panels.variants
      : panels.componentProperties

  return (
    <PanelSection label={sectionLabel} titleClass="text-component">
      <div className="flex flex-col gap-1.5">
        {controls.map((control) => {
          const selectOptions =
            control.value === MIXED
              ? [{ value: 'MIXED', label: panels.mixed }, ...control.options]
              : control.options
          const selectValue = control.value === MIXED ? 'MIXED' : control.value
          return (
            <PanelFieldGroup
              key={control.id}
              className="flex items-center gap-2"
              ui={PROPERTY_ROW}
              label={
                <>
                  <Tip
                    label={propertyBindingTooltip(
                      control.type,
                      panels,
                      control.boundLayerNames
                    )}
                  >
                    <PropertyTypeIcon
                      type={control.type}
                      className="size-3 shrink-0 text-component"
                    />
                  </Tip>
                  <span className="truncate">{control.name}</span>
                </>
              }
            >
              {control.type === 'TEXT' ? (
                <ComponentPropertyTextField
                  label={control.name}
                  value={control.value === MIXED ? '' : control.value}
                  propertyId={control.id}
                  mixed={control.value === MIXED}
                  mixedPlaceholder={panels.mixed}
                  onCommit={(value) => setValue(control.id, value)}
                />
              ) : null}
              {control.type === 'BOOLEAN' ? (
                <div className="flex h-6 flex-1 items-center justify-end">
                  <AppSwitch
                    checked={control.value !== MIXED && control.value === 'true'}
                    label={control.name}
                    state={control.value === MIXED ? 'mixed' : 'idle'}
                    data-property={control.id}
                    onCheckedChange={(checked) => setValue(control.id, String(checked))}
                  />
                </div>
              ) : null}
              {control.type === 'INSTANCE_SWAP' ? (
                <InstanceSwapControl
                  propertyId={control.id}
                  value={control.value === MIXED ? '' : control.value}
                  preferredValues={control.preferredValues}
                  mixed={control.value === MIXED}
                  mixedPlaceholder={panels.mixed}
                  onSelect={(componentId, sourceLibraryKey) => {
                    setValue(control.id, componentId, sourceLibraryKey)
                  }}
                />
              ) : null}
              {control.type === 'VARIANT' ? (
                <AppSelect
                  label={control.name}
                  data-property={control.id}
                  value={selectValue}
                  options={selectOptions}
                  onChange={(value) => {
                    if (value !== 'MIXED') setValue(control.id, value)
                  }}
                />
              ) : null}
            </PanelFieldGroup>
          )
        })}
        {slots.map((slot) => (
          <SlotPropertyRow
            key={slot.id}
            name={slot.name}
            propertyId={slot.id}
            modified={slot.modified}
            itemCount={slot.itemCount}
            limits={slot.limits}
            preferredValues={slot.preferredValues}
            preferredOnly={slot.preferredOnly}
            onAdd={(componentId) => slotProperties.add(slot.frameId, componentId)}
            onReset={() => slotProperties.reset(slot.frameId)}
            onDeleteContents={() => slotProperties.clear(slot.frameId)}
            onSelectLayers={() => slotProperties.selectLayers(slot.offendingIds)}
          />
        ))}
      </div>
    </PanelSection>
  )
}
