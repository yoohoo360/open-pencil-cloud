import { useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'

import IconDiamond from '~icons/lucide/diamond'
import IconCheck from '~icons/lucide/check'
import IconUnlink from '~icons/lucide/unlink'
import IconPlus from '~icons/lucide/plus'

import { BindableValuePicker, useBindableValue } from '@open-pencil/react'
import { BindingTrigger, useBindingFieldUI } from '@/components/ui/binding'
import type { BindingFieldUI } from '@/components/ui/binding'

export interface VariableBindingPickerProps {
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

export function VariableBindingPicker({
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
  const binding = useBindableValue<number>()
  const styles = useBindingFieldUI(
    { state: binding.state, open: binding.open, disabled, derived },
    ui
  )
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const createInputRef = useRef<HTMLInputElement>(null)
  const canCreate = createName.trim().length > 0

  function startCreate() {
    setCreating(true)
    setCreateName(createDefaultName)
    requestAnimationFrame(() => {
      createInputRef.current?.focus()
      createInputRef.current?.select()
    })
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = createName.trim()
    if (!name) return
    binding.actions.create(name)
  }

  function detach() {
    binding.actions.unbind()
    binding.actions.closePicker()
  }

  return (
    <BindableValuePicker>
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
      <Popover.Portal>
        {binding.open && (
          <Popover.Content
            side="left"
            align="center"
            sideOffset={8}
            collisionPadding={8}
            className={styles.pickerContent}
          >
            <input
              value={binding.searchTerm}
              placeholder={searchPlaceholder}
              className={styles.pickerSearch}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => binding.actions.setSearchTerm(e.target.value)}
            />
            <div className={styles.pickerViewport}>
              {binding.variables.length === 0 ? (
                <div className={styles.pickerEmpty}>{emptyLabel}</div>
              ) : (
                binding.variables.map((variable) => (
                  <button
                    key={variable.id}
                    className={styles.pickerItem}
                    onClick={() => binding.actions.bind(variable.id)}
                  >
                    <IconDiamond className={styles.pickerItemIcon} />
                    <span className={styles.pickerItemLabel}>{variable.name}</span>
                    {binding.variable?.id === variable.id && (
                      <IconCheck className={styles.pickerItemIndicator} />
                    )}
                  </button>
                ))
              )}
            </div>
            <div className={styles.pickerFooter}>
              {binding.state === 'bound' && (
                <button type="button" className={styles.pickerAction} onClick={detach}>
                  <IconUnlink className="size-3" />
                  <span>{detachLabel}</span>
                </button>
              )}
              {creating ? (
                <form
                  className={styles.createForm}
                  onSubmit={submitCreate}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      e.stopPropagation()
                      setCreating(false)
                    }
                  }}
                >
                  <input
                    ref={createInputRef}
                    value={createName}
                    placeholder={createNamePlaceholder}
                    className={styles.createInput}
                    onChange={(e) => setCreateName(e.target.value)}
                  />
                  <button disabled={!canCreate} className={styles.createSubmit} type="submit">
                    {createSubmitLabel}
                  </button>
                </form>
              ) : (createLabel ? (
                <button type="button" className={styles.pickerAction} onClick={startCreate}>
                  <IconPlus className="size-3" />
                  <span className="min-w-0 flex-1 truncate">{createLabel}</span>
                </button>
              ) : null)}
            </div>
          </Popover.Content>
        )}
      </Popover.Portal>
    </BindableValuePicker>
  )
}
