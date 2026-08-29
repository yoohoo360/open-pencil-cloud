import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

import { AppInput } from '#react/components/ui/AppInput'
import { AppSwitch } from '#react/components/ui/AppSwitch'
import { IconButton } from '#react/components/ui/IconButton'
import { usePopoverUI } from '#react/components/ui/popover'
import type { VariantDefinitionControl } from '#react/controls/component-props'
import { useI18n } from '#react/i18n'

export function PropertySettingsPopover({
  definition,
  onClose,
  onRename,
  onRenameValue,
  onSetDefaultValue
}: {
  definition: VariantDefinitionControl
  onClose: () => void
  onRename: (name: string) => boolean
  onRenameValue: (previous: string, next: string) => boolean
  onSetDefaultValue: (value: string) => boolean
}) {
  const { panels, dialogs } = useI18n()
  const popover = usePopoverUI({
    header: 'flex items-center justify-between gap-2 pb-2',
    body: 'flex flex-col gap-3'
  })
  const rootRef = useRef<HTMLDivElement>(null)
  const [name, setName] = useState(definition.name)
  const [defaultValue, setDefaultValue] = useState(definition.defaultValue)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(definition.values.map((value) => [value, value]))
  )
  const valuesKey = definition.values.join('\u0000')

  useEffect(() => {
    setName(definition.name)
    setDefaultValue(definition.defaultValue)
    setValues(Object.fromEntries(definition.values.map((value) => [value, value])))
  }, [definition.id, definition.name, definition.defaultValue, valuesKey])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      const row = target instanceof Element ? target.closest('[data-property]') : null
      if (row?.getAttribute('data-property') === definition.id) return
      onClose()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [definition.id, onClose])

  function commitName() {
    const next = name.trim()
    if (!next || !onRename(next)) setName(definition.name)
  }

  function commitValue(previous: string) {
    const next = values[previous]?.trim()
    if (!next || !onRenameValue(previous, next)) {
      setValues((current) => ({ ...current, [previous]: previous }))
    }
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={panels.propertySettings}
      className={`${popover.content} absolute top-full left-0 z-30 mt-2 w-80 p-3`}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        aria-hidden="true"
        className="absolute -top-1.5 left-3 size-3 rotate-45 bg-panel shadow-[-1px_-1px_1px_rgb(0_0_0/0.08)]"
      />
      <div className={popover.header}>
        <span className="text-[12px] font-medium text-surface">{panels.propertySettings}</span>
        <IconButton size="xs" label={dialogs.close} onClick={onClose}>
          <X className="size-3.5" />
        </IconButton>
      </div>
      <div className={popover.body}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] text-muted">{panels.variantPropertyName}</span>
          <AppInput
            value={name}
            aria-label={panels.variantPropertyName}
            onChange={(event) => setName(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
        </label>
        {definition.type === 'VARIANT' ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-muted">{panels.propertyValues}</span>
            {definition.values.map((value) => (
              <AppInput
                key={value}
                value={values[value] ?? value}
                aria-label={`${definition.name}: ${value}`}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [value]: event.target.value }))
                }
                onBlur={() => commitValue(value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                }}
              />
            ))}
          </div>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] text-muted">{panels.propertyValue}</span>
            {definition.type === 'BOOLEAN' ? (
              <div className="flex h-6 items-center">
                <AppSwitch
                  checked={defaultValue === 'true'}
                  label={panels.propertyValue}
                  onCheckedChange={(checked) => {
                    const next = String(checked)
                    setDefaultValue(next)
                    onSetDefaultValue(next)
                  }}
                />
              </div>
            ) : (
              <AppInput
                value={defaultValue}
                aria-label={panels.propertyValue}
                onChange={(event) => setDefaultValue(event.target.value)}
                onBlur={() => {
                  if (!onSetDefaultValue(defaultValue)) setDefaultValue(definition.defaultValue)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                }}
              />
            )}
          </label>
        )}
      </div>
    </div>
  )
}
