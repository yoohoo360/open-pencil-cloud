import { ComponentPropertyTextField } from '#react/components/properties/component-properties/ComponentPropertyTextField'
import { AppSelect } from '#react/components/ui/AppSelect'
import { AppSwitch } from '#react/components/ui/AppSwitch'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useComponentProperties } from '#react/controls/component-props'
import { MIXED } from '#react/controls/mixed'
import { useI18n } from '#react/i18n'

export function ComponentPropertiesSection() {
  const { active, controls, setValue } = useComponentProperties()
  const { panels } = useI18n()
  if (!active) return null

  const sectionLabel = controls.every((control) => control.type === 'VARIANT')
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
            <PanelFieldGroup key={control.id} label={control.name}>
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
                <div className="flex h-6 items-center">
                  <AppSwitch
                    checked={control.value !== MIXED && control.value === 'true'}
                    label={control.name}
                    state={control.value === MIXED ? 'mixed' : 'idle'}
                    data-property={control.id}
                    onCheckedChange={(checked) => setValue(control.id, String(checked))}
                  />
                </div>
              ) : null}
              {control.type !== 'TEXT' && control.type !== 'BOOLEAN' ? (
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
      </div>
    </PanelSection>
  )
}
