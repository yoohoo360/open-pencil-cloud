import { useStore } from '@nanostores/react'
import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  isGroupEnabledForCodegen,
  isSkillEnabledForCodegen,
  skillChatPreferences,
  toggleEnabledSkill,
  toggleEnabledSkillGroup,
  type SkillChatScope
} from '#react/app/skills/preferences'
import { readActiveOrgId } from '#react/app/org/active'
import { FloatingMenu } from '#react/components/properties/variables/FloatingMenu'
import { useI18n } from '#react/i18n'
import { getAPIErrorMessage, skillAPI, type SkillCatalogCategory } from '#react/lib/client'

function personalGroups(categories: SkillCatalogCategory[]) {
  return (
    categories
      .find((category) => category.kind === 'personal')
      ?.groups.filter(
        (group) => !group.group_key?.startsWith('tr-') && !group.id.startsWith('__team_remotes__:')
      ) ?? []
  )
}

/** Per-chat skill toggles persisted in localStorage for design / codegen scopes. */
export function ChatSkillPicker({
  scope,
  enabledCount,
  ready
}: {
  scope: SkillChatScope
  enabledCount: number
  ready: boolean
}) {
  const { dialogs, panels } = useI18n()
  const prefs = useStore(skillChatPreferences(scope))
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<SkillCatalogCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError('')
    void skillAPI
      .catalog({ org_id: readActiveOrgId() || undefined })
      .then((response) => {
        if (cancelled) return
        setCategories(response.data ?? [])
      })
      .catch((reason) => {
        if (cancelled) return
        setError(getAPIErrorMessage(reason, panels.skillsLoadFailed))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, panels.skillsLoadFailed])

  const groups = useMemo(() => personalGroups(categories), [categories])
  const allGroupIds = groups.map((group) => group.id)
  const label = ready
    ? prefs.allEnabled
      ? dialogs.settingsSkills
      : `${dialogs.settingsSkills} (${enabledCount})`
    : dialogs.settingsSkills

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        data-test-id={`chat-skill-picker-${scope}`}
        className="inline-flex max-w-[10rem] items-center gap-0.5 truncate rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="size-3 shrink-0 opacity-70" aria-hidden="true" />
      </button>
      <FloatingMenu
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        side="bottom"
        align="end"
        className="z-50 max-h-72 w-64 overflow-y-auto rounded border border-border bg-panel p-2 shadow-lg"
      >
        <div data-test-id={`chat-skill-picker-menu-${scope}`} className="flex flex-col gap-1.5">
          <p className="text-[10px] text-muted">{dialogs.settingsSkillsHelp}</p>
          {prefs.allEnabled ? (
            <p className="text-[10px] text-accent">{dialogs.settingsSkillsAllSelected}</p>
          ) : null}
          {loading ? <p className="text-[11px] text-muted">{panels.loading}</p> : null}
          {error ? (
            <p role="alert" className="text-[11px] text-danger">
              {error}
            </p>
          ) : null}
          {!loading && groups.length === 0 ? (
            <p className="text-[11px] text-muted">{dialogs.settingsSkillsEmpty}</p>
          ) : null}
          {groups.map((group) => {
            const skills = (group.skills ?? []).filter((skill) => !skill.team_id)
            const siblingSkillIds = skills.map((skill) => skill.id)
            const groupEnabled = isGroupEnabledForCodegen(group.id, prefs)
            return (
              <div
                key={group.id}
                className="rounded border border-border px-2 py-1.5"
                data-test-id={`chat-skill-group-${group.id}`}
              >
                <label className="flex items-center gap-2 text-xs font-medium text-surface">
                  <input
                    type="checkbox"
                    className="size-3.5 accent-[var(--color-accent)]"
                    checked={groupEnabled}
                    onChange={(event) =>
                      toggleEnabledSkillGroup(
                        group.id,
                        event.target.checked,
                        allGroupIds,
                        scope
                      )
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{group.name}</span>
                  <span className="text-[10px] font-normal text-muted">{skills.length}</span>
                </label>
                {skills.length > 0 ? (
                  <ul className="mt-1.5 space-y-1 border-t border-border/60 pt-1.5 pl-5">
                    {skills.map((skill) => (
                      <li key={skill.id}>
                        <label className="flex items-center gap-2 text-[11px] text-muted">
                          <input
                            type="checkbox"
                            className="size-3 accent-[var(--color-accent)]"
                            checked={isSkillEnabledForCodegen(skill, prefs)}
                            onChange={(event) =>
                              toggleEnabledSkill(
                                skill.id,
                                event.target.checked,
                                {
                                  groupId: group.id,
                                  allGroupIds,
                                  siblingSkillIds
                                },
                                scope
                              )
                            }
                          />
                          <span className="min-w-0 truncate text-surface">{skill.name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )
          })}
        </div>
      </FloatingMenu>
    </div>
  )
}
