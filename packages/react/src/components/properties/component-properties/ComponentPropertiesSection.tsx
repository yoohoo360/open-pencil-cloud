import { MIXED } from '#react/controls/mixed'
import { useComponentProperties } from '#react/controls/component-props'
import { AppInput } from '#react/components/ui/AppInput'
import { AppSelect } from '#react/components/ui/AppSelect'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
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
                <AppInput
                  defaultValue={control.value === MIXED ? '' : control.value}
                  placeholder={control.value === MIXED ? panels.mixed : undefined}
                  aria-label={control.name}
                  data-property={control.id}
                  key={`${control.id}:${control.value === MIXED ? 'mixed' : control.value}`}
                  onBlur={(event) => {
                    const next = event.currentTarget.value
                    if (next !== '' && next !== control.value) setValue(control.id, next)
                  }}
                />
              ) : null}
              {control.type === 'BOOLEAN' ? (
                <div className="flex h-6 items-center">
                  <input
                    type="checkbox"
                    className="accent-accent"
                    aria-label={control.name}
                    data-property={control.id}
                    checked={control.value !== MIXED && control.value === 'true'}
                    onChange={(event) => setValue(control.id, String(event.target.checked))}
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
