import { MIXED, useI18n, useSharedStyleBinding } from '@open-pencil/react'
import { memo, useCallback, useMemo } from 'react'

import AppSelect from '@/components/ui/AppSelect'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup'
import PanelGrid from '@/components/ui/panel/PanelGrid'

import type { SharedStyleKind } from '@open-pencil/scene-graph'

export type SharedStyleFieldProps = {
  kind: SharedStyleKind
  label: string
}

export const SharedStyleField = memo(function SharedStyleField({
  kind,
  label
}: SharedStyleFieldProps) {
  const { panels } = useI18n()
  const binding = useSharedStyleBinding(kind)
  const { active, styleId, styles } = binding

  const visible = useMemo(
    () => active && (styles.length > 0 || styleId === MIXED || styleId !== null),
    [active, styleId, styles.length]
  )

  const options = useMemo(() => {
    const result: Array<{ value: string; label: string }> = [
      { value: 'NONE', label: panels.none }
    ]
    if (styleId === MIXED) result.unshift({ value: 'MIXED', label: panels.mixed })
    for (const style of styles) result.push({ value: style.id, label: style.name })
    if (typeof styleId === 'string' && !styles.some((style) => style.id === styleId)) {
      result.push({ value: styleId, label: panels.missingStyle({ id: styleId }) })
    }
    return result
  }, [panels, styleId, styles])

  const update = useCallback(
    (value: string) => {
      if (value === 'MIXED') return
      if (value === 'NONE') binding.unbind()
      else binding.bind(value)
    },
    [binding]
  )

  if (!visible) return null

  return (
    <PanelGrid columns="fill" className="mb-1.5">
      <PanelFieldGroup label={label}>
        <AppSelect
          value={styleId === MIXED ? 'MIXED' : (styleId ?? 'NONE')}
          options={options}
          label={label}
          data-property={`${kind}-style`}
          onValueChange={update}
        />
      </PanelFieldGroup>
    </PanelGrid>
  )
})

SharedStyleField.displayName = 'SharedStyleField'
export default SharedStyleField
