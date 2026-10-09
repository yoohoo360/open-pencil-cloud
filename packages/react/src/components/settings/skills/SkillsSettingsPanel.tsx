import { useEffect, useState } from 'react'
import { useStore } from '@nanostores/react'
import { useNavigate } from 'react-router-dom'

import { readActiveOrgId } from '#react/app/org/active'
import { closeSettingsDialog } from '#react/app/settings/dialog'
import {
  skillCodegenPreferences,
  toggleEnabledSkill,
  toggleEnabledSkillGroup
} from '#react/app/skills/preferences'
import { getAPIErrorMessage, skillAPI, type SkillCatalogCategory } from '#react/lib/client'
import { useI18n } from '#react/i18n'

export function SkillsSettingsPanel() {
  const navigate = useNavigate()
  const { dialogs, panels } = useI18n()
  const prefs = useStore(skillCodegenPreferences)
  const [categories, setCategories] = useState<SkillCatalogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
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
  }, [panels.skillsLoadFailed])

  const personalGroups =
    categories.find((category) => category.kind === 'personal')?.groups.filter(
      (group) => !group.group_key?.startsWith('tr-') && !group.id.startsWith('__team_remotes__:')
    ) ?? []

  return (
    <section className="flex flex-col gap-4" data-test-id="settings-skills-panel">
      <div>
        <h3 className="text-xs font-semibold text-surface">{dialogs.settingsSkills}</h3>
        <p className="mt-1 text-[11px] text-muted">{dialogs.settingsSkillsHelp}</p>
      </div>

      {loading ? <p className="text-[11px] text-muted">{panels.loading}</p> : null}
      {error ? (
        <p role="alert" className="text-[11px] text-danger">
          {error}
        </p>
      ) : null}

      {!loading && personalGroups.length === 0 ? (
        <p className="text-[11px] text-muted">{dialogs.settingsSkillsEmpty}</p>
      ) : null}

      <div className="flex flex-col gap-3">
        {personalGroups.map((group) => {
          const groupEnabled = prefs.enabledGroupIds.includes(group.id)
          const skills = (group.skills ?? []).filter((skill) => !skill.team_id)
          return (
            <div
              key={group.id}
              className="rounded border border-border p-3"
              data-test-id={`settings-skill-group-${group.id}`}
            >
              <label className="flex items-center gap-2 text-xs font-medium text-surface">
                <input
                  type="checkbox"
                  className="size-3.5 accent-[var(--color-accent)]"
                  checked={groupEnabled}
                  onChange={(event) => toggleEnabledSkillGroup(group.id, event.target.checked)}
                />
                <span className="min-w-0 flex-1 truncate">{group.name}</span>
                <span className="text-[10px] font-normal text-muted">{skills.length}</span>
              </label>
              {skills.length > 0 ? (
                <ul className="mt-2 space-y-1.5 border-t border-border/60 pt-2 pl-5">
                  {skills.map((skill) => {
                    const skillEnabled =
                      groupEnabled || prefs.enabledSkillIds.includes(skill.id)
                    return (
                      <li key={skill.id}>
                        <label className="flex items-center gap-2 text-[11px] text-muted">
                          <input
                            type="checkbox"
                            className="size-3 accent-[var(--color-accent)]"
                            checked={skillEnabled}
                            disabled={groupEnabled}
                            onChange={(event) =>
                              toggleEnabledSkill(skill.id, event.target.checked)
                            }
                          />
                          <span className="min-w-0 truncate text-surface">{skill.name}</span>
                          <span className="shrink-0 text-[10px]">{skill.skill_key}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-2 pl-5 text-[10px] text-muted">{panels.noSkillsInGroup}</p>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-muted">
        {dialogs.settingsSkillsManageHint}{' '}
        <button
          type="button"
          className="text-accent underline-offset-2 hover:underline"
          onClick={() => {
            closeSettingsDialog()
            void navigate('/skills')
          }}
        >
          {panels.manageSkills}
        </button>
      </p>
    </section>
  )
}
