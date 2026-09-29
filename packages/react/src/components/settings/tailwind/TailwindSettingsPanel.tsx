import { useEffect, useState } from 'react'
import { useStore } from '@nanostores/react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'

import type { TailwindConfigLike } from '#core/io/formats/jsx'

import {
  hydrateTailwindConfig,
  saveTailwindConfigList,
  tailwindConfigStore,
  type TailwindConfigEntry
} from '#react/app/code/tailwind-config/store'
import { AppButton } from '#react/components/ui/AppButton'
import { AppInput } from '#react/components/ui/AppInput'
import { SettingsField } from '#react/components/settings/SettingsField'
import { useI18n } from '#react/i18n'

function newEntryId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function formatConfig(config: TailwindConfigLike): string {
  return JSON.stringify(config, null, 2)
}

function parseConfigJson(raw: string): { ok: true; config: TailwindConfigLike } | { ok: false; error: string } {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Config must be a JSON object.' }
    }
    return { ok: true, config: parsed as TailwindConfigLike }
  } catch {
    return { ok: false, error: 'Invalid JSON.' }
  }
}

type DraftEntry = {
  id: string
  name: string
  text: string
  error: string
}

function toDrafts(entries: TailwindConfigEntry[]): DraftEntry[] {
  return entries.map((entry) => ({
    id: entry.id,
    name: entry.name ?? '',
    text: formatConfig(entry.config),
    error: ''
  }))
}

export function TailwindSettingsPanel() {
  const { dialogs } = useI18n()
  const list = useStore(tailwindConfigStore)
  const [drafts, setDrafts] = useState<DraftEntry[]>(() => toDrafts(list.configs))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void hydrateTailwindConfig()
  }, [])

  useEffect(() => {
    setDrafts(toDrafts(list.configs))
  }, [list])

  function updateDraft(id: string, patch: Partial<DraftEntry>) {
    setSaved(false)
    setSaveError('')
    setDrafts((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
  }

  function moveDraft(id: string, delta: -1 | 1) {
    setSaved(false)
    setSaveError('')
    setDrafts((current) => {
      const index = current.findIndex((entry) => entry.id === id)
      const nextIndex = index + delta
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current
      const copy = [...current]
      const [item] = copy.splice(index, 1)
      copy.splice(nextIndex, 0, item)
      return copy
    })
  }

  function addDraft() {
    setSaved(false)
    setSaveError('')
    setDrafts((current) => [
      ...current,
      {
        id: newEntryId(),
        name: `Config ${current.length + 1}`,
        text: formatConfig({ theme: { extend: { colors: {}, spacing: {} } } }),
        error: ''
      }
    ])
  }

  function removeDraft(id: string) {
    setSaved(false)
    setSaveError('')
    setDrafts((current) => current.filter((entry) => entry.id !== id))
  }

  async function save() {
    const next: TailwindConfigEntry[] = []
    const withErrors = drafts.map((draft) => {
      const parsed = parseConfigJson(draft.text)
      if (!parsed.ok) return { ...draft, error: parsed.error }
      next.push({
        id: draft.id,
        name: draft.name.trim() || undefined,
        config: parsed.config
      })
      return { ...draft, error: '' }
    })
    setDrafts(withErrors)
    if (withErrors.some((draft) => draft.error)) {
      setSaveError(dialogs.tailwindConfigInvalid)
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await saveTailwindConfigList({ version: 1, configs: next })
      setSaved(true)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : dialogs.tailwindConfigSaveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-4" data-test-id="settings-tailwind-panel">
      <div>
        <h3 className="text-xs font-semibold text-surface">{dialogs.settingsTailwind}</h3>
        <p className="mt-1 text-[11px] text-muted">{dialogs.settingsTailwindDescription}</p>
      </div>

      <div className="flex flex-col gap-3">
        {drafts.length === 0 ? (
          <p className="rounded border border-dashed border-border px-3 py-4 text-[11px] text-muted">
            {dialogs.tailwindConfigEmpty}
          </p>
        ) : null}

        {drafts.map((draft, index) => (
          <div
            key={draft.id}
            className="flex flex-col gap-2 rounded border border-border p-3"
            data-test-id={`tailwind-config-entry-${index}`}
          >
            <div className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-[10px] text-muted">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <SettingsField label={dialogs.tailwindConfigName} htmlFor={`tw-config-name-${draft.id}`}>
                  <AppInput
                    id={`tw-config-name-${draft.id}`}
                    value={draft.name}
                    onChange={(event) => updateDraft(draft.id, { name: event.target.value })}
                  />
                </SettingsField>
              </div>
              <AppButton
                color="neutral"
                variant="ghost"
                size="xs"
                shape="square"
                disabled={index === 0}
                aria-label={dialogs.tailwindConfigMoveUp}
                onClick={() => moveDraft(draft.id, -1)}
              >
                <ArrowUp className="size-3" />
              </AppButton>
              <AppButton
                color="neutral"
                variant="ghost"
                size="xs"
                shape="square"
                disabled={index === drafts.length - 1}
                aria-label={dialogs.tailwindConfigMoveDown}
                onClick={() => moveDraft(draft.id, 1)}
              >
                <ArrowDown className="size-3" />
              </AppButton>
              <AppButton
                color="neutral"
                variant="ghost"
                size="xs"
                shape="square"
                aria-label={dialogs.tailwindConfigRemove}
                onClick={() => removeDraft(draft.id)}
              >
                <Trash2 className="size-3" />
              </AppButton>
            </div>
            <textarea
              value={draft.text}
              spellCheck={false}
              aria-label={dialogs.tailwindConfigJson}
              data-test-id={`tailwind-config-json-${index}`}
              className="min-h-40 w-full resize-y rounded border border-border bg-transparent px-2 py-1.5 font-mono text-[11px] text-surface outline-none focus:border-accent"
              onChange={(event) => updateDraft(draft.id, { text: event.target.value, error: '' })}
            />
            {draft.error ? (
              <p className="text-[10px] text-[var(--color-error)]" role="alert">
                {draft.error}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AppButton color="neutral" variant="ghost" size="xs" onClick={addDraft}>
          <Plus className="size-3" />
          {dialogs.tailwindConfigAdd}
        </AppButton>
        <AppButton
          color="primary"
          variant="solid"
          size="xs"
          disabled={saving}
          data-test-id="tailwind-config-save"
          onClick={() => void save()}
        >
          {saving ? dialogs.tailwindConfigSaving : dialogs.tailwindConfigSave}
        </AppButton>
        {saved ? (
          <span className="text-[10px] text-[var(--color-success)]">{dialogs.tailwindConfigSaved}</span>
        ) : null}
        {saveError ? (
          <span className="text-[10px] text-[var(--color-error)]" role="alert">
            {saveError}
          </span>
        ) : null}
      </div>
    </section>
  )
}
