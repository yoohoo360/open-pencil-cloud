import {
  isGroupSelected,
  isSkillSelected,
  skillSelectionOf,
  toggleSkill,
  toggleSkillGroup
} from '#react/app/document/ai-review/skills'
import type { AiReviewPayload, AiReviewSkillSelection } from '#react/app/document/ai-review/types'
import { readActiveOrgId } from '#react/app/org/active'
import { useI18n } from '#react/i18n'
import { getAPIErrorMessage, skillAPI, type SkillCatalogCategory } from '#react/lib/client'
import { useEffect, useMemo, useState } from 'react'

export function AiReviewSkillPicker({
  payload,
  onChange,
  readOnly = false
}: {
  payload: AiReviewPayload
  onChange?: (skills: AiReviewSkillSelection) => void
  readOnly?: boolean
}) {
  const { dialogs, panels } = useI18n()
  const selection = skillSelectionOf(payload)
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

  const personalGroups = useMemo(
    () =>
      categories
        .find((category) => category.kind === 'personal')
        ?.groups.filter(
          (group) => !group.group_key?.startsWith('tr-') && !group.id.startsWith('__team_remotes__:')
        ) ?? [],
    [categories]
  )
  const allGroupIds = personalGroups.map((group) => group.id)

  return (
    <div className="flex flex-col gap-1.5" data-test-id="ai-review-skill-picker">
      <span className="text-[11px] text-muted">{dialogs.aiReviewSkills}</span>
      {selection.all ? (
        <p className="text-[10px] text-accent">{dialogs.settingsSkillsAllSelected}</p>
      ) : null}
      {loading ? <p className="text-[11px] text-muted">{panels.loading}</p> : null}
      {error ? (
        <p role="alert" className="text-[11px] text-danger">
          {error}
        </p>
      ) : null}
      {!loading && personalGroups.length === 0 ? (
        <p className="text-[11px] text-muted">{dialogs.aiReviewSkillsEmpty}</p>
      ) : null}
      <div className="flex flex-col gap-2">
        {personalGroups.map((group) => {
          const groupEnabled = isGroupSelected(group.id, selection)
          const skills = (group.skills ?? []).filter((skill) => !skill.team_id)
          const siblingSkillIds = skills.map((skill) => skill.id)
          return (
            <div
              key={group.id}
              className="rounded border border-border px-2 py-1.5"
              data-test-id={`ai-review-skill-group-${group.id}`}
            >
              <label className="flex items-center gap-2 text-xs font-medium text-surface">
                <input
                  type="checkbox"
                  className="size-3.5 accent-[var(--color-accent)]"
                  checked={groupEnabled}
                  disabled={readOnly || !onChange}
                  onChange={(event) =>
                    onChange?.(
                      toggleSkillGroup(selection, group.id, event.target.checked, allGroupIds)
                    )
                  }
                />
                <span className="min-w-0 flex-1 truncate">{group.name}</span>
                <span className="text-[10px] font-normal text-muted">{skills.length}</span>
              </label>
              {skills.length > 0 ? (
                <ul className="mt-1.5 space-y-1 border-t border-border/60 pt-1.5 pl-5">
                  {skills.map((skill) => {
                    const skillEnabled = isSkillSelected(skill, selection)
                    return (
                      <li key={skill.id}>
                        <label className="flex items-center gap-2 text-[11px] text-muted">
                          <input
                            type="checkbox"
                            className="size-3 accent-[var(--color-accent)]"
                            checked={skillEnabled}
                            disabled={readOnly || !onChange}
                            onChange={(event) =>
                              onChange?.(
                                toggleSkill(selection, skill.id, event.target.checked, {
                                  groupId: group.id,
                                  allGroupIds,
                                  siblingSkillIds
                                })
                              )
                            }
                          />
                          <span className="min-w-0 truncate text-surface">{skill.name}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
