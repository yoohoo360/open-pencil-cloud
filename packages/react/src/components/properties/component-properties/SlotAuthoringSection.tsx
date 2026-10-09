import { IconButton } from '#react/components/ui/IconButton'
import { PanelSection } from '#react/components/ui/panel/PanelSection'
import { useSlotAuthoring } from '#react/controls/component-props/slot-authoring'
import { useI18n } from '#react/i18n'
import { Minus, Settings2, SquareDashed } from 'lucide-react'
import { useEffect, useState } from 'react'

/** Slots of the selected main component or slot frame — Vue `SlotAuthoringSection` parity. */
export function SlotAuthoringSection() {
  const authoring = useSlotAuthoring()
  const { active, canCreate, slots } = authoring
  const { panels } = useI18n()
  const [names, setNames] = useState<Record<string, string>>({})
  const [settingsId, setSettingsId] = useState<string | null>(null)

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const slot of slots) next[slot.id] = slot.name
    setNames(next)
  }, [slots])

  if (!active) return null

  function commitName(propertyId: string) {
    const name = names[propertyId]?.trim()
    const slot = slots.find((item) => item.id === propertyId)
    if (!slot) return
    if (name && name !== slot.name) authoring.rename(propertyId, name)
    else setNames((current) => ({ ...current, [propertyId]: slot.name }))
  }

  return (
    <PanelSection label={panels.slots} titleClass="text-component">
      <div className="flex flex-col gap-1.5">
        {canCreate ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 self-start rounded bg-hover px-2 py-1 text-[11px] text-surface hover:bg-border"
            data-property="create-slot"
            onClick={() => authoring.create()}
          >
            <SquareDashed className="size-3.5 text-slot" />
            {panels.createSlot}
          </button>
        ) : null}
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="relative flex items-center gap-1"
            data-property={`slot-definition-${slot.name}`}
          >
            <input
              className="h-6 min-w-0 flex-1 rounded border border-border bg-transparent px-1.5 text-[11px] text-surface outline-none focus:border-component"
              value={names[slot.id] ?? slot.name}
              aria-label={panels.slotName}
              onChange={(event) =>
                setNames((current) => ({ ...current, [slot.id]: event.target.value }))
              }
              onBlur={() => commitName(slot.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
              }}
            />
            <IconButton
              label={panels.slotSettings}
              active={settingsId === slot.id}
              data-property="slot-settings"
              onClick={() => setSettingsId((current) => (current === slot.id ? null : slot.id))}
            >
              <Settings2 className="size-3.5" />
            </IconButton>
            <IconButton label={panels.removeSlot} onClick={() => authoring.remove(slot.id)}>
              <Minus className="size-3.5" />
            </IconButton>
            {settingsId === slot.id ? (
              <SlotSettingsPanel
                description={slot.description}
                minChildren={slot.minChildren}
                maxChildren={slot.maxChildren}
                preferredOnly={slot.preferredOnly}
                onClose={() => setSettingsId(null)}
                onDescribe={(description) => authoring.describe(slot.id, description)}
                onSetLimits={(limits) => authoring.setLimits(slot.id, limits)}
                onSetPreferredOnly={(value) => authoring.setPreferredOnly(slot.id, value)}
              />
            ) : null}
          </div>
        ))}
      </div>
    </PanelSection>
  )
}

function SlotSettingsPanel({
  description,
  minChildren,
  maxChildren,
  preferredOnly,
  onClose,
  onDescribe,
  onSetLimits,
  onSetPreferredOnly
}: {
  description: string
  minChildren?: number
  maxChildren?: number
  preferredOnly: boolean
  onClose: () => void
  onDescribe: (description: string) => void
  onSetLimits: (limits: { minChildren?: number; maxChildren?: number }) => void
  onSetPreferredOnly: (value: boolean) => void
}) {
  const { panels } = useI18n()
  const [draftDescription, setDraftDescription] = useState(description)
  const [minimum, setMinimum] = useState(minChildren?.toString() ?? '')
  const [maximum, setMaximum] = useState(maxChildren?.toString() ?? '')

  useEffect(() => {
    setDraftDescription(description)
    setMinimum(minChildren?.toString() ?? '')
    setMaximum(maxChildren?.toString() ?? '')
  }, [description, minChildren, maxChildren])

  function limit(value: string): number | undefined {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined
  }

  return (
    <div className="absolute right-0 top-7 z-20 flex w-64 flex-col gap-2 rounded border border-border bg-panel p-3 shadow-lg">
      <label className="flex flex-col gap-1 text-[10px] text-muted">
        {panels.slotDescription}
        <textarea
          className="min-h-14 rounded border border-border bg-transparent px-1.5 py-1 text-[11px] text-surface outline-none focus:border-component"
          value={draftDescription}
          placeholder={panels.slotDescriptionPlaceholder}
          onChange={(event) => setDraftDescription(event.target.value)}
          onBlur={() => {
            const next = draftDescription.trim()
            setDraftDescription(next)
            if (next !== description) onDescribe(next)
          }}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[10px] text-muted">
          {panels.slotMinimumLayers}
          <input
            className="h-6 rounded border border-border bg-transparent px-1.5 text-[11px] text-surface outline-none focus:border-component"
            value={minimum}
            placeholder={panels.slotLayersNone}
            onChange={(event) => setMinimum(event.target.value)}
            onBlur={() => onSetLimits({ minChildren: limit(minimum), maxChildren: limit(maximum) })}
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-muted">
          {panels.slotMaximumLayers}
          <input
            className="h-6 rounded border border-border bg-transparent px-1.5 text-[11px] text-surface outline-none focus:border-component"
            value={maximum}
            placeholder={panels.slotLayersNone}
            onChange={(event) => setMaximum(event.target.value)}
            onBlur={() => onSetLimits({ minChildren: limit(minimum), maxChildren: limit(maximum) })}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-surface">
        <input
          type="checkbox"
          checked={preferredOnly}
          onChange={(event) => onSetPreferredOnly(event.target.checked)}
        />
        {panels.slotOnlyPreferredInstances}
      </label>
      <button
        type="button"
        className="self-end text-[11px] text-muted hover:text-surface"
        onClick={onClose}
      >
        Done
      </button>
    </div>
  )
}
