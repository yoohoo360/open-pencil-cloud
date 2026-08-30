import { SlotInstancePicker } from '#react/components/properties/component-properties/SlotInstancePicker'
import { FloatingMenu } from '#react/components/properties/variables/FloatingMenu'
import { AppInput } from '#react/components/ui/AppInput'
import { AppSelect } from '#react/components/ui/AppSelect'
import { AppSwitch } from '#react/components/ui/AppSwitch'
import { useDialogUI } from '#react/components/ui/dialog'
import { IconButton } from '#react/components/ui/IconButton'
import { emptySlotDraft, type SlotPropertyDraft } from '#react/controls/component-props/model'
import { useI18n } from '#react/i18n'
import { Plus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { IS_BROWSER } from '@open-pencil/core/constants'

const LAYER_COUNTS = [1, 2, 3, 4, 5, 6, 8] as const

function layerValue(value: number | undefined) {
  return value === undefined ? 'none' : String(value)
}

export function CreateSlotPropertyDialog({
  mode,
  initial,
  components,
  onClose,
  onSubmit
}: {
  mode: 'create' | 'edit'
  initial?: SlotPropertyDraft
  components: { id: string; name: string }[]
  onClose: () => void
  onSubmit: (draft: SlotPropertyDraft) => void
}) {
  const { panels, dialogs } = useI18n()
  const cls = useDialogUI(undefined, { size: 'sm' })
  const preferredTriggerRef = useRef<HTMLElement>(null)
  const [draft, setDraft] = useState<SlotPropertyDraft>(
    () => initial ?? emptySlotDraft(panels.defaultSlotPropertyName)
  )
  const [preferredOpen, setPreferredOpen] = useState(false)
  const layerOptions = useMemo(
    () => [
      { value: 'none', label: panels.slotLayersNone },
      ...LAYER_COUNTS.map((count) => ({ value: String(count), label: String(count) }))
    ],
    [panels.slotLayersNone]
  )
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!IS_BROWSER) return null

  function setLayer(key: 'slotMinLayers' | 'slotMaxLayers', value: string) {
    setDraft((current) => ({
      ...current,
      [key]: value === 'none' ? undefined : Number(value)
    }))
  }

  function submit() {
    onSubmit({
      ...draft,
      name: draft.name.trim() || panels.defaultSlotPropertyName
    })
  }

  return createPortal(
    <>
      <div data-slot="dialog-overlay" className={cls.overlay} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-slot-property-title"
        data-slot="dialog-content"
        data-test-id="create-slot-property-dialog"
        className={cls.content}
      >
        <header data-slot="dialog-header" className={cls.header}>
          <h2 id="create-slot-property-title" className={cls.title}>
            {mode === 'create' ? panels.createProperty : panels.propertySettings}
          </h2>
          <button type="button" className={cls.close} aria-label={dialogs.close} onClick={onClose}>
            <X className="size-3.5" />
          </button>
        </header>
        <div data-slot="dialog-body" className={`${cls.body} flex flex-col gap-4`}>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] text-muted">{panels.variantPropertyName}</span>
            <AppInput
              value={draft.name}
              aria-label={panels.variantPropertyName}
              data-property="slot-name"
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] text-muted">{panels.slotDescription}</span>
            <AppInput
              value={draft.description}
              aria-label={panels.slotDescription}
              placeholder={panels.slotDescriptionPlaceholder}
              data-property="slot-description"
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>
          <section className="flex flex-col gap-3">
            <h3 className="text-[11px] font-medium text-surface">{panels.slotSettings}</h3>
            <label className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted">{panels.slotMinimumLayers}</span>
              <AppSelect
                label={panels.slotMinimumLayers}
                className="w-24"
                value={layerValue(draft.slotMinLayers)}
                options={layerOptions}
                onChange={(value) => setLayer('slotMinLayers', value)}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted">{panels.slotMaximumLayers}</span>
              <AppSelect
                label={panels.slotMaximumLayers}
                className="w-24"
                value={layerValue(draft.slotMaxLayers)}
                options={layerOptions}
                onChange={(value) => setLayer('slotMaxLayers', value)}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-surface">{panels.slotOnlyPreferredInstances}</span>
              <AppSwitch
                checked={draft.onlyPreferredInstances}
                label={panels.slotOnlyPreferredInstances}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({ ...current, onlyPreferredInstances: checked }))
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-surface">{panels.slotEmptyByDefault}</span>
              <AppSwitch
                checked={draft.emptySlotByDefault}
                label={panels.slotEmptyByDefault}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({ ...current, emptySlotByDefault: checked }))
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-surface">{panels.slotFillCounterAxis}</span>
              <AppSwitch
                checked={draft.fillCounterAxisByDefault}
                label={panels.slotFillCounterAxis}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({ ...current, fillCounterAxisByDefault: checked }))
                }
              />
            </label>
          </section>
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-surface">
                {panels.slotPreferredInstances}
              </span>
              <span className="text-[10px] text-muted">{panels.slotLearnMore}</span>
            </div>
            {draft.preferredValues.map((id) => {
              const component = components.find((item) => item.id === id)
              return (
                <div key={id} className="flex items-center gap-1">
                  <span className="min-w-0 flex-1 truncate text-[11px] text-surface">
                    {component?.name ?? id}
                  </span>
                  <IconButton
                    size="xs"
                    label={panels.detachSlotProperty}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        preferredValues: current.preferredValues.filter((value) => value !== id)
                      }))
                    }
                  >
                    <X className="size-3" />
                  </IconButton>
                </div>
              )
            })}
            <div className="relative">
              <span ref={preferredTriggerRef} className="inline-flex">
                <IconButton
                  size="xs"
                  label={panels.addPreferredInstance}
                  active={preferredOpen}
                  onClick={() => setPreferredOpen((open) => !open)}
                >
                  <Plus className="size-3.5" />
                </IconButton>
              </span>
              <FloatingMenu
                open={preferredOpen}
                triggerRef={preferredTriggerRef}
                onClose={() => setPreferredOpen(false)}
                className="z-[120] overflow-hidden rounded-xl bg-panel shadow-[0_8px_30px_rgb(0_0_0/0.4)]"
              >
                <SlotInstancePicker
                  excludeIds={draft.preferredValues}
                  onSelect={(componentId) => {
                    setDraft((current) => ({
                      ...current,
                      preferredValues: current.preferredValues.includes(componentId)
                        ? current.preferredValues
                        : [...current.preferredValues, componentId]
                    }))
                    setPreferredOpen(false)
                  }}
                />
              </FloatingMenu>
            </div>
          </section>
        </div>
        <footer data-slot="dialog-footer" className={cls.footer}>
          <button
            type="button"
            className="rounded bg-accent px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent/90"
            data-test-id="create-slot-property"
            onClick={submit}
          >
            {mode === 'create' ? panels.createProperty : dialogs.done}
          </button>
        </footer>
      </div>
    </>,
    document.body
  )
}
