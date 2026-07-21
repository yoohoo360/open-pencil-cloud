import { MIXED, useComponentProperties, useI18n } from '@open-pencil/react'
import { memo, useCallback, useMemo } from 'react'

import ComponentPropertyTextField from '@/components/properties/component-properties/ComponentPropertyTextField'
import AppSelect from '@/components/ui/AppSelect'
import AppSwitch from '@/components/ui/AppSwitch'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup'
import PanelSection from '@/components/ui/panel/PanelSection'

export const ComponentPropertiesSection = memo(function ComponentPropertiesSection() {
  const { active, controls, setValue } = useComponentProperties()
  const { panels } = useI18n()
  const componentSectionUI = useMemo(() => ({ title: 'text-component' }), [])

  const selectOptions = useCallback(
    (control: (typeof controls)[number]) =>
      control.value === MIXED
        ? [{ value: 'MIXED', label: panels.mixed }, ...control.options]
        : control.options,
    [panels.mixed]
  )

  const selectValue = useCallback(
    (control: (typeof controls)[number]) => (control.value === MIXED ? 'MIXED' : control.value),
    []
  )

  const updateSelect = useCallback(
    (propertyId: string, value: string) => {
      if (value !== 'MIXED') setValue(propertyId, value)
    },
    [setValue]
  )

  const booleanValue = useCallback(
    (control: (typeof controls)[number]) => control.value !== MIXED && control.value === 'true',
    []
  )

  const sectionLabel = useMemo(
    () =>
      controls.every((control) => control.type === 'VARIANT')
        ? panels.variants
        : panels.componentProperties,
    [controls, panels.componentProperties, panels.variants]
  )

  if (!active) return null

  return (
    <PanelSection label={sectionLabel} ui={componentSectionUI}>
      <div className="flex flex-col gap-1.5">
        {controls.map((control) => (
          <PanelFieldGroup key={control.id} label={control.name}>
            {control.type === 'TEXT' ? (
              <ComponentPropertyTextField
                value={control.value}
                label={control.name}
                data-property={control.id}
                onCommit={(value) => setValue(control.id, value)}
              />
            ) : control.type === 'BOOLEAN' ? (
              <div className="flex h-field items-center">
                <AppSwitch
                  checked={booleanValue(control)}
                  label={control.name}
                  state={control.value === MIXED ? 'mixed' : 'idle'}
                  data-property={control.id}
                  onCheckedChange={(checked) => setValue(control.id, String(checked))}
                />
              </div>
            ) : (
              <AppSelect
                label={control.name}
                value={selectValue(control)}
                options={selectOptions(control)}
                data-property={control.id}
                onValueChange={(value) => updateSelect(control.id, value)}
              />
            )}
          </PanelFieldGroup>
        ))}
      </div>
    </PanelSection>
  )
})

ComponentPropertiesSection.displayName = 'ComponentPropertiesSection'
export default ComponentPropertiesSection
