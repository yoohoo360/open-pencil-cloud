import { AppInput } from '#react/components/ui/AppInput'
import { AppSelect } from '#react/components/ui/AppSelect'
import { IconButton } from '#react/components/ui/IconButton'
import { PanelFieldGroup } from '#react/components/ui/panel/PanelFieldGroup'
import { PanelGrid } from '#react/components/ui/panel/PanelGrid'
import { MIXED } from '#react/controls/mixed'
import type { SharedStyleBinding } from '#react/controls/shared-style/use'
import { useI18n } from '#react/i18n'
import { Check, Plus } from 'lucide-react'
import { useState } from 'react'

import type { SharedStyleKind } from '@open-pencil/scene-graph'

function defaultStyleName(kind: SharedStyleKind, panels: ReturnType<typeof useI18n>['panels']) {
  if (kind === 'fill' || kind === 'stroke') return panels.colorStyle
  if (kind === 'text') return panels.textStyle
  if (kind === 'effect') return panels.effectStyle
  return panels.gridStyle
}

export function SharedStyleField({
  binding,
  label
}: {
  binding: SharedStyleBinding
  label: string
}) {
  const { panels } = useI18n()
  const [creating, setCreating] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  if (!binding.visible) return null

  const options: Array<{ value: string; label: string }> = [{ value: 'NONE', label: panels.none }]
  if (binding.styleId === MIXED) options.unshift({ value: 'MIXED', label: panels.mixed })
  for (const style of binding.styles) options.push({ value: style.id, label: style.name })
  if (
    typeof binding.styleId === 'string' &&
    !binding.styles.some((style) => style.id === binding.styleId)
  ) {
    options.push({
      value: binding.styleId,
      label: panels.missingStyle({ id: binding.styleId })
    })
  }

  function commitCreate() {
    binding.create(nameDraft)
    setCreating(false)
    setNameDraft('')
  }

  return (
    <PanelGrid className="mb-1.5">
      <PanelFieldGroup label={label}>
        <div className="flex min-w-0 items-center gap-1">
          <AppSelect
            className="min-w-0 flex-1"
            value={binding.styleId === MIXED ? 'MIXED' : (binding.styleId ?? 'NONE')}
            options={options}
            label={label}
            data-property={`${binding.kind}-style`}
            onChange={(value) => {
              if (value === 'MIXED') return
              if (value === 'NONE') binding.unbind()
              else binding.bind(value)
            }}
          />
          {binding.canCreate ? (
            <IconButton
              label={panels.createStyle}
              onClick={() => {
                setNameDraft(defaultStyleName(binding.kind, panels))
                setCreating(true)
              }}
            >
              <Plus className="size-3.5" />
            </IconButton>
          ) : null}
        </div>
      </PanelFieldGroup>
      {creating ? (
        <div className="mt-1.5 flex min-w-0 items-center gap-1">
          <AppInput
            value={nameDraft}
            aria-label={panels.styleName}
            placeholder={panels.styleName}
            autoFocus
            onChange={(event) => setNameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitCreate()
              if (event.key === 'Escape') setCreating(false)
            }}
          />
          <IconButton label={panels.createStyle} onClick={commitCreate}>
            <Check className="size-3.5" />
          </IconButton>
        </div>
      ) : null}
    </PanelGrid>
  )
}
