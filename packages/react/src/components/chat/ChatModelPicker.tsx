import { useMemo, useRef, useState } from 'react'
import { useStore } from '@nanostores/react'
import { Bot, Check, ChevronDown } from 'lucide-react'

import {
  chatModelSelectionLabel,
  chatProviderSettings,
  enabledChatModels,
  setActiveChatModelId,
  type ChatModelEntry,
  type ModelTier
} from '#react/app/ai/chat/settings'
import { FloatingMenu } from '#react/components/properties/variables/FloatingMenu'
import { useI18n } from '#react/i18n'

function tierLabel(tier: ModelTier, labels: { high: string; medium: string; low: string }) {
  if (tier === 'high') return labels.high
  if (tier === 'low') return labels.low
  return labels.medium
}

/** Composer control: Auto or a specific enabled model (Cursor-style). */
export function ChatModelPicker() {
  const { dialogs } = useI18n()
  const settings = useStore(chatProviderSettings)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const models = useMemo(() => enabledChatModels(settings), [settings])
  const label = chatModelSelectionLabel(settings)
  const tierLabels = {
    high: dialogs.modelTierHigh,
    medium: dialogs.modelTierMedium,
    low: dialogs.modelTierLow
  }

  function select(id: 'auto' | string) {
    setActiveChatModelId(id)
    setOpen(false)
  }

  return (
    <div className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        data-test-id="chat-model-picker"
        className="inline-flex max-w-[11rem] items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] text-muted hover:bg-hover hover:text-surface"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      >
        <Bot className="size-3 shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronDown className="size-3 shrink-0 opacity-70" aria-hidden="true" />
      </button>
      <FloatingMenu
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        side="top"
        align="start"
        className="z-50 max-h-64 w-56 overflow-y-auto rounded border border-border bg-panel p-1.5 shadow-lg"
      >
        <div role="listbox" aria-label={dialogs.modelPickerLabel} className="flex flex-col gap-0.5">
          <ModelOption
            selected={settings.activeModelId === 'auto'}
            title={dialogs.modelAuto}
            subtitle={dialogs.modelAutoHint}
            onSelect={() => select('auto')}
          />
          {models.map((model) => (
            <ModelOption
              key={model.id}
              selected={settings.activeModelId === model.id}
              title={model.name}
              subtitle={`${model.modelId} · ${tierLabel(model.tier, tierLabels)}`}
              onSelect={() => select(model.id)}
            />
          ))}
          {models.length === 0 ? (
            <p className="px-2 py-1.5 text-[10px] text-muted">{dialogs.modelNoneEnabled}</p>
          ) : null}
        </div>
      </FloatingMenu>
    </div>
  )
}

function ModelOption({
  selected,
  title,
  subtitle,
  onSelect
}: {
  selected: boolean
  title: string
  subtitle: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={`flex w-full items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-hover ${
        selected ? 'bg-hover/80' : ''
      }`}
      onClick={onSelect}
    >
      <span className="mt-0.5 size-3 shrink-0">
        {selected ? <Check className="size-3 text-accent" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] text-surface">{title}</span>
        <span className="block truncate text-[10px] text-muted">{subtitle}</span>
      </span>
    </button>
  )
}

export function modelTierShort(entry: ChatModelEntry, labels: Record<ModelTier, string>): string {
  return labels[entry.tier]
}
