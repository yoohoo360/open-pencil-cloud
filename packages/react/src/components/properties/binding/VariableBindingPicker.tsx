import { useEffect, useRef, useState } from 'react'
import { Check, Diamond, Plus, Unlink } from 'lucide-react'

import { FloatingMenu } from '#react/components/properties/variables/FloatingMenu'
import { BindingTrigger } from '#react/components/ui/binding/BindingTrigger'
import { useBindingFieldUI, type BindingFieldUI } from '#react/components/ui/binding/ui'
import { Tip } from '#react/components/ui/Tip'
import { useBindableValue } from '#react/primitives/BindableValue/context'

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
}: {
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
}) {
  const binding = useBindableValue<unknown>()
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const createInputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const styles = useBindingFieldUI(
    { state: binding.state, open: binding.open, disabled, derived },
    ui
  )
  const canCreate = createName.trim().length > 0

  useEffect(() => {
    if (binding.open) return
    setCreating(false)
    binding.actions.setSearchTerm('')
  }, [binding.actions, binding.open])

  useEffect(() => {
    if (!creating) return
    createInputRef.current?.focus()
    createInputRef.current?.select()
  }, [creating])

  function submitCreate() {
    const name = createName.trim()
    if (!name) return
    binding.actions.create(name)
  }

  return (
    <span className="inline-flex shrink-0 items-center" data-slot="anchor">
      <span ref={triggerRef}>
        <Tip label={triggerLabel}>
          <BindingTrigger
            label={triggerLabel}
            state={binding.state}
            open={binding.open}
            disabled={disabled}
            derived={derived}
            ui={ui}
            onClick={() => binding.actions.togglePicker()}
          />
        </Tip>
      </span>
      <FloatingMenu
        open={binding.open}
        onClose={() => binding.actions.closePicker()}
        triggerRef={triggerRef}
        side="top"
        align="end"
        sideOffset={8}
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
          data-slot="search"
          onChange={(event) => binding.actions.setSearchTerm(event.target.value)}
        />
        <div className={styles.pickerViewport} data-slot="viewport">
          {binding.variables.length === 0 ? (
            <div className={styles.pickerEmpty} data-slot="empty">
              {emptyLabel}
            </div>
          ) : (
            binding.variables.map((variable) => {
              const selected = binding.variable?.id === variable.id
              return (
                <button
                  key={variable.id}
                  type="button"
                  className={styles.pickerItem}
                  data-slot="item"
                  data-highlighted={selected ? '' : undefined}
                  onClick={() => binding.actions.bind(variable.id)}
                >
                  <Diamond className={styles.pickerItemIcon} data-slot="itemIcon" />
                  <span className={styles.pickerItemLabel} data-slot="itemLabel">
                    {variable.name}
                  </span>
                  {selected ? (
                    <span className={styles.pickerItemIndicator} data-slot="itemIndicator">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
        <div className={styles.pickerFooter} data-slot="footer">
          {binding.state === 'bound' ? (
            <button
              type="button"
              className={styles.pickerAction}
              data-slot="action"
              onClick={() => {
                binding.actions.unbind()
                binding.actions.closePicker()
              }}
            >
              <Unlink className="size-3" />
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
            >
              <input
                ref={createInputRef}
                value={createName}
                placeholder={createNamePlaceholder}
                className={styles.createInput}
                data-slot="createInput"
                onKeyDown={(event) => {
                  if (event.code !== 'Escape') return
                  event.preventDefault()
                  event.stopPropagation()
                  setCreating(false)
                }}
                onChange={(event) => setCreateName(event.target.value)}
              />
              <button
                type="submit"
                disabled={!canCreate}
                className={styles.createSubmit}
                data-slot="createSubmit"
              >
                {createSubmitLabel}
              </button>
            </form>
          ) : createLabel ? (
            <button
              type="button"
              className={styles.pickerAction}
              data-slot="action"
              onClick={() => {
                setCreating(true)
                setCreateName(createDefaultName)
              }}
            >
              <Plus className="size-3" />
              <span className="min-w-0 flex-1 truncate">{createLabel}</span>
            </button>
          ) : null}
        </div>
      </FloatingMenu>
    </span>
  )
}
