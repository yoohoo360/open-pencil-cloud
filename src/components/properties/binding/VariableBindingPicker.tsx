import IconLucideCheck from '~icons/lucide/check'
import IconLucideDiamond from '~icons/lucide/diamond'
import IconLucidePlus from '~icons/lucide/plus'
import IconLucideUnlink from '~icons/lucide/unlink'
import * as Popover from '@radix-ui/react-popover'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useBindableValue } from '@open-pencil/react'

import Tip from '@/components/ui/Tip'
import { BindingTrigger, useBindingFieldUI, type BindingFieldUI } from '@/components/ui/binding'

export type VariableBindingPickerProps = {
  triggerLabel: string
  searchPlaceholder: string
  emptyLabel: string
  detachLabel: string
  createLabel?: string
  createNamePlaceholder?: string
  createSubmitLabel?: string
  createDefaultName?: string
  disabled?: boolean
  derived?: boolean
  ui?: BindingFieldUI
}

export const VariableBindingPicker = memo(function VariableBindingPicker({
  triggerLabel,
  searchPlaceholder,
  emptyLabel,
  detachLabel,
  createLabel,
  createNamePlaceholder = 'Variable name',
  createSubmitLabel = 'Create',
  createDefaultName = '',
  disabled = false,
  derived = false,
  ui
}: VariableBindingPickerProps) {
  const binding = useBindableValue()
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const createInputRef = useRef<HTMLInputElement>(null)
  const styles = useMemo(
    () =>
      useBindingFieldUI(
        {
          state: binding.state,
          open: binding.open,
          disabled,
          derived
        },
        ui
      ),
    [binding.open, binding.state, derived, disabled, ui]
  )

  const canCreate = createName.trim().length > 0

  const startCreate = useCallback(() => {
    setCreating(true)
    setCreateName(createDefaultName)
    requestAnimationFrame(() => {
      createInputRef.current?.focus()
      createInputRef.current?.select()
    })
  }, [createDefaultName])

  const submitCreate = useCallback(() => {
    const name = createName.trim()
    if (!name) return
    binding.actions.create(name)
  }, [binding.actions, createName])

  const detach = useCallback(() => {
    binding.actions.unbind()
    binding.actions.closePicker()
  }, [binding.actions])

  useEffect(() => {
    if (binding.open) return
    setCreating(false)
    binding.actions.setSearchTerm('')
  }, [binding.actions, binding.open])

  return (
    <Popover.Root
      open={binding.open}
      onOpenChange={(open) => {
        if (open) binding.actions.openPicker()
        else binding.actions.closePicker()
      }}
    >
      <Popover.Anchor asChild>
        <span className="inline-flex shrink-0 items-center" data-slot="anchor">
          <Tip label={triggerLabel}>
            <Popover.Trigger asChild>
              <BindingTrigger
                label={triggerLabel}
                state={binding.state}
                open={binding.open}
                disabled={disabled}
                derived={derived}
                ui={ui}
              />
            </Popover.Trigger>
          </Tip>
        </span>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          side="left"
          align="center"
          sideOffset={8}
          collisionPadding={8}
          className={styles.pickerContent}
          data-slot="content"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <input
            value={binding.searchTerm}
            placeholder={searchPlaceholder}
            className={styles.pickerSearch}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-slot="search"
            onChange={(event) => binding.actions.setSearchTerm(event.target.value)}
          />
          <div className={styles.pickerViewport} data-slot="viewport">
            {binding.variables.length === 0 ? (
              <div className={styles.pickerEmpty} data-slot="empty">
                {emptyLabel}
              </div>
            ) : null}
            {binding.variables.map((variable) => (
              <button
                key={variable.id}
                type="button"
                className={styles.pickerItem}
                data-slot="item"
                onClick={() => binding.actions.bind(variable.id)}
              >
                <IconLucideDiamond className={styles.pickerItemIcon} data-slot="itemIcon" />
                <span className={styles.pickerItemLabel} data-slot="itemLabel">
                  {variable.name}
                </span>
                {binding.variable?.id === variable.id ? (
                  <span className={styles.pickerItemIndicator} data-slot="itemIndicator">
                    <IconLucideCheck className="size-3" />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className={styles.pickerFooter} data-slot="footer">
            {binding.state === 'bound' ? (
              <button type="button" className={styles.pickerAction} data-slot="action" onClick={detach}>
                <IconLucideUnlink className="size-3" />
                <span>{detachLabel}</span>
              </button>
            ) : null}
            {creating ? (
              <form
                className={styles.createForm}
                data-slot="createForm"
                onSubmit={(event) => {
                  event.preventDefault()
                  submitCreate()
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    event.stopPropagation()
                    setCreating(false)
                  }
                }}
              >
                <input
                  ref={createInputRef}
                  value={createName}
                  placeholder={createNamePlaceholder}
                  className={styles.createInput}
                  data-slot="createInput"
                  onChange={(event) => setCreateName(event.target.value)}
                />
                <button
                  disabled={!canCreate}
                  className={styles.createSubmit}
                  data-slot="createSubmit"
                  type="submit"
                >
                  {createSubmitLabel}
                </button>
              </form>
            ) : createLabel ? (
              <button type="button" className={styles.pickerAction} data-slot="action" onClick={startCreate}>
                <IconLucidePlus className="size-3" />
                <span className="min-w-0 flex-1 truncate">{createLabel}</span>
              </button>
            ) : null}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
})

VariableBindingPicker.displayName = 'VariableBindingPicker'
export default VariableBindingPicker
