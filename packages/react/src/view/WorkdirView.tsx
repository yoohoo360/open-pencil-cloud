import {
  agentEnvLabel,
  DEFAULT_SKILL_AGENT_ENVIRONMENTS,
  SKILL_AGENT_ENVIRONMENTS,
  toggleAgentEnvironment,
  type SkillAgentEnvironmentId
} from '#react/app/skills/agent-environments'
import { readActiveOrgId } from '#react/app/org/active'
import { collectPersonalSkills } from '#react/app/skills/package-load'
import { pickSkillWorkspaceDirectory } from '#react/app/skills/pick-directory'
import {
  probeAgentServerWorkdirReady,
  workdirAPI,
  type PlatformSkillRef,
  type Workdir,
  type WorkdirSkill
} from '#react/app/skills/workdir-api'
import { AppButton } from '#react/components/ui/AppButton'
import { useI18n } from '#react/i18n'
import { getAPIErrorMessage, skillAPI, type PencilSkill } from '#react/lib/client'
import {
  Check,
  FolderPlus,
  LoaderCircle,
  RefreshCw,
  Settings2,
  Trash2
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function toPlatformRefs(skills: readonly PencilSkill[]): PlatformSkillRef[] {
  return skills.map((skill) => ({
    id: skill.id,
    skill_key: skill.skill_key,
    name: skill.name,
    description: skill.description
  }))
}

/** Skill workspace: local disk skills + platform skills from skill API. */
export default function WorkdirView() {
  const { panels } = useI18n()
  const [ready, setReady] = useState<boolean | null>(null)
  const [workdirs, setWorkdirs] = useState<Workdir[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [skillSettingsKey, setSkillSettingsKey] = useState<string | null>(null)
  const [skillDetailKey, setSkillDetailKey] = useState<string | null>(null)
  const [cloudSkills, setCloudSkills] = useState<PencilSkill[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const skillSettingsRef = useRef<HTMLDivElement>(null)
  const skillDetailRef = useRef<HTMLDivElement>(null)

  const platformSkills = useMemo(() => toPlatformRefs(cloudSkills), [cloudSkills])

  const selected = useMemo(
    () => workdirs.find((item) => item.id === selectedId) ?? null,
    [workdirs, selectedId]
  )

  const settingsWorkdir = useMemo(
    () => workdirs.find((item) => item.id === settingsId) ?? null,
    [workdirs, settingsId]
  )

  const skillSettings = useMemo(
    () => selected?.skills.find((skill) => skill.key === skillSettingsKey) ?? null,
    [selected, skillSettingsKey]
  )

  const skillDetail = useMemo(
    () => selected?.skills.find((skill) => skill.key === skillDetailKey) ?? null,
    [selected, skillDetailKey]
  )

  const pullEnvs = selected?.agentEnvironments.length
    ? selected.agentEnvironments
    : [...DEFAULT_SKILL_AGENT_ENVIRONMENTS]

  /** Every enter / refresh: catalog + full disk scan (not only on add). */
  const refresh = useCallback(async () => {
    setError(null)
    const available = await probeAgentServerWorkdirReady()
    setReady(available)
    if (!available) {
      setWorkdirs([])
      setActiveId(null)
      return
    }

    let nextPlatform: PlatformSkillRef[] = []
    try {
      const response = await skillAPI.catalog({
        org_id: readActiveOrgId() || undefined
      })
      const personal = collectPersonalSkills(response.data ?? [])
      setCloudSkills(personal)
      nextPlatform = toPlatformRefs(personal)
    } catch {
      setCloudSkills([])
      nextPlatform = []
    }

    const listed = await workdirAPI.list({ platformSkills: nextPlatform })
    setWorkdirs(listed.workdirs)
    setActiveId(listed.index.activeWorkdirId)
    setSelectedId((current) => {
      if (current && listed.workdirs.some((item) => item.id === current)) return current
      return listed.index.activeWorkdirId ?? listed.workdirs[0]?.id ?? null
    })
  }, [])

  useEffect(() => {
    void refresh().catch((reason) => setError(getAPIErrorMessage(reason)))
  }, [refresh])

  useEffect(() => {
    if (!settingsId) return
    function onPointerDown(event: PointerEvent) {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setSettingsId(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [settingsId])

  useEffect(() => {
    if (!skillSettingsKey) return
    function onPointerDown(event: PointerEvent) {
      if (!skillSettingsRef.current?.contains(event.target as Node)) {
        setSkillSettingsKey(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [skillSettingsKey])

  useEffect(() => {
    if (!skillDetailKey) return
    function onPointerDown(event: PointerEvent) {
      if (!skillDetailRef.current?.contains(event.target as Node)) {
        setSkillDetailKey(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [skillDetailKey])

  async function addWorkdir() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const picked = await pickSkillWorkspaceDirectory({
        title: panels.workdirCreate,
        help: panels.workdirPathHelp,
        placeholder: panels.workdirPathPlaceholder,
        confirmLabel: panels.workdirCreate,
        cancelLabel: panels.cancel
      })
      if (!picked) return
      const created = await workdirAPI.create({
        path: picked.path,
        directoryHandle: picked.directoryHandle,
        agentEnvironments: [...DEFAULT_SKILL_AGENT_ENVIRONMENTS]
      })
      await workdirAPI.activate(created.id)
      await refresh()
      setSelectedId(created.id)
    } catch (reason) {
      setError(getAPIErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  async function activate(id: string) {
    setBusy(true)
    setError(null)
    try {
      await workdirAPI.activate(id)
      await refresh()
    } catch (reason) {
      setError(getAPIErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  async function removeWorkdir(id: string) {
    if (!window.confirm(panels.workdirDeleteConfirm)) return
    setBusy(true)
    setError(null)
    try {
      await workdirAPI.remove(id)
      await refresh()
    } catch (reason) {
      setError(getAPIErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  async function saveWorkdirEnvs(id: string, next: SkillAgentEnvironmentId[]) {
    if (next.length === 0) return
    setBusy(true)
    setError(null)
    try {
      await workdirAPI.update(
        id,
        { agentEnvironments: next },
        { platformSkills, syncEnabledSkills: true }
      )
      await refresh()
    } catch (reason) {
      setError(getAPIErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  async function toggleSkill(skill: WorkdirSkill, enabled: boolean) {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      await workdirAPI.setSkillEnabled(selected.id, skill.key, enabled, {
        source: skill.source,
        platformId: skill.platformId,
        platformSkills
      })
      await refresh()
    } catch (reason) {
      setError(getAPIErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  async function saveSkillEnvs(skill: WorkdirSkill, next: SkillAgentEnvironmentId[]) {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      await workdirAPI.setSkillAgentEnvironments(selected.id, skill.key, next, {
        source: skill.source,
        platformId: skill.platformId,
        platformSkills
      })
      await refresh()
    } catch (reason) {
      setError(getAPIErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-test-id="skill-workspace">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold">{panels.workdirTitle}</h2>
          <p className="text-[11px] text-muted">{panels.workdirHelp}</p>
        </div>
        <AppButton
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void refresh().catch((reason) => setError(getAPIErrorMessage(reason)))}
        >
          <RefreshCw className="size-3.5" />
          {panels.workdirRefresh}
        </AppButton>
      </div>

      {ready === null ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted">
          <LoaderCircle className="size-4 animate-spin" />
          {panels.workdirChecking}
        </div>
      ) : !ready ? (
        <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center gap-3 px-6">
          <p className="text-sm text-muted">{panels.workdirNeedsIndexedDb}</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[280px] shrink-0 flex-col border-r border-border/60">
            <div className="flex items-center justify-end border-b border-border/60 px-2 py-1.5">
              <button
                type="button"
                className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-surface disabled:opacity-50"
                title={panels.workdirCreate}
                disabled={busy}
                data-test-id="workdir-add"
                onClick={() => void addWorkdir()}
              >
                <FolderPlus className="size-4" />
              </button>
            </div>
            <div className="relative min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
              {workdirs.length === 0 ? (
                <p className="px-2 py-4 text-[11px] text-muted">{panels.workdirEmpty}</p>
              ) : (
                workdirs.map((workdir) => {
                  const isActive = workdir.id === activeId
                  const isSelected = workdir.id === selectedId
                  const envs =
                    workdir.agentEnvironments.length > 0
                      ? workdir.agentEnvironments
                      : [...DEFAULT_SKILL_AGENT_ENVIRONMENTS]
                  const settingsOpen = settingsId === workdir.id
                  return (
                    <div
                      key={workdir.id}
                      className={`flex items-center gap-0.5 rounded-lg px-2 py-1.5 ${
                        isSelected ? 'bg-hover' : 'hover:bg-hover/60'
                      }`}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => {
                          setSelectedId(workdir.id)
                          setSettingsId(null)
                          setSkillSettingsKey(null)
                          setSkillDetailKey(null)
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-medium">{workdir.name}</span>
                          {isActive ? (
                            <span className="shrink-0 rounded bg-accent/15 px-1 text-[10px] text-accent">
                              {panels.workdirActive}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-muted">
                          {envs.map(agentEnvLabel).join(' ')}
                        </p>
                      </button>
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          className="rounded p-1 text-muted hover:bg-surface hover:text-surface"
                          title={panels.workdirAgentEnvs}
                          disabled={busy}
                          aria-expanded={settingsOpen}
                          aria-haspopup="listbox"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSkillSettingsKey(null)
                            setSettingsId(settingsOpen ? null : workdir.id)
                          }}
                        >
                          <Settings2 className="size-3.5" />
                        </button>
                        {settingsOpen && settingsWorkdir?.id === workdir.id ? (
                          <div
                            ref={settingsRef}
                            role="listbox"
                            aria-label={panels.workdirAgentEnvs}
                            className="absolute right-0 top-full z-20 mt-1 w-[220px] rounded-lg border border-border/60 bg-surface p-3 shadow-lg"
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <p className="text-[11px] font-medium">{panels.workdirAgentEnvs}</p>
                            <p className="mt-1 text-[10px] text-muted">
                              {panels.workdirAgentEnvsHelp}
                            </p>
                            <div className="mt-2 flex max-h-56 flex-col gap-1 overflow-y-auto">
                              {SKILL_AGENT_ENVIRONMENTS.map((env) => {
                                const checked = (
                                  settingsWorkdir.agentEnvironments.length > 0
                                    ? settingsWorkdir.agentEnvironments
                                    : [...DEFAULT_SKILL_AGENT_ENVIRONMENTS]
                                ).includes(env.id)
                                return (
                                  <label
                                    key={env.id}
                                    className="flex items-center gap-2 text-[11px]"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={busy}
                                      onChange={() => {
                                        const current =
                                          settingsWorkdir.agentEnvironments.length > 0
                                            ? settingsWorkdir.agentEnvironments
                                            : [...DEFAULT_SKILL_AGENT_ENVIRONMENTS]
                                        void saveWorkdirEnvs(
                                          settingsWorkdir.id,
                                          toggleAgentEnvironment(current, env.id)
                                        )
                                      }}
                                    />
                                    <span className="font-mono">{env.label}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      {!isActive ? (
                        <button
                          type="button"
                          className="rounded p-1 text-muted hover:bg-surface hover:text-surface"
                          title={panels.workdirActivate}
                          disabled={busy}
                          onClick={() => void activate(workdir.id)}
                        >
                          <Check className="size-3.5" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="rounded p-1 text-muted hover:bg-surface hover:text-danger"
                        title={panels.workdirDelete}
                        disabled={busy}
                        onClick={() => void removeWorkdir(workdir.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col">
            {error ? (
              <div className="border-b border-danger/30 bg-danger/10 px-4 py-2 text-xs text-danger">
                {error}
              </div>
            ) : null}
            {!selected ? (
              <p className="p-6 text-sm text-muted">{panels.workdirSelectPrompt}</p>
            ) : (
              <>
                <div className="space-y-2 border-b border-border/60 px-4 py-3">
                  <div>
                    <h3 className="truncate text-sm font-semibold" title={selected.path}>
                      {selected.name}
                    </h3>
                    <p className="mt-1 font-mono text-[11px] text-muted">
                      {pullEnvs.map(agentEnvLabel).join(' ')}
                    </p>
                    {!selected.folderAccessible ? (
                      <p className="mt-1 text-[11px] text-danger">
                        {panels.workdirFolderInaccessible}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted">{panels.workdirSkillsHelp}</p>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {selected.skills.length === 0 ? (
                    <p className="text-sm text-muted">{panels.workdirNoSkills}</p>
                  ) : (
                    <ul className="space-y-2">
                      {selected.skills.map((skill) => {
                        const isPlatform = skill.source === 'platform'
                        const skillOpen = skillSettingsKey === skill.key
                        const detailOpen = skillDetailKey === skill.key
                        return (
                          <li
                            key={`${skill.source}:${skill.key}`}
                            className="relative flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={skill.enabled}
                                disabled={busy}
                                onChange={(event) =>
                                  void toggleSkill(skill, event.target.checked)
                                }
                              />
                              <div className="relative min-w-0 flex-1">
                                <button
                                  type="button"
                                  className="block max-w-full truncate text-left font-medium hover:text-accent"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setSettingsId(null)
                                    setSkillSettingsKey(null)
                                    setSkillDetailKey(detailOpen ? null : skill.key)
                                  }}
                                >
                                  {skill.name}
                                </button>
                                <span className="block truncate text-muted">{skill.key}</span>
                                {detailOpen && skillDetail?.key === skill.key ? (
                                  <div
                                    ref={skillDetailRef}
                                    className="absolute left-0 top-full z-20 mt-1 w-[min(360px,calc(100vw-48px))] rounded-lg border border-border/60 bg-surface p-3 shadow-lg"
                                    onPointerDown={(event) => event.stopPropagation()}
                                  >
                                    <p className="text-[11px] font-medium">{skillDetail.name}</p>
                                    <p className="mt-0.5 font-mono text-[10px] text-muted">
                                      {skillDetail.key}
                                    </p>
                                    <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-muted">
                                      {skillDetail.description.trim() ||
                                        panels.workdirSkillNoDescription}
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                                isPlatform
                                  ? 'bg-accent/15 text-accent'
                                  : 'bg-muted/20 text-muted'
                              }`}
                            >
                              {isPlatform
                                ? panels.workdirSkillPlatform
                                : panels.workdirSkillLocal}
                            </span>
                            <span className="max-w-[120px] shrink-0 truncate font-mono text-[10px] text-muted">
                              {skill.agentEnvironments.map(agentEnvLabel).join(' ') || '—'}
                            </span>
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                className="rounded p-1 text-muted hover:bg-hover hover:text-surface"
                                title={panels.workdirSkillAgentEnvs}
                                disabled={busy}
                                aria-expanded={skillOpen}
                                aria-haspopup="listbox"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setSettingsId(null)
                                  setSkillDetailKey(null)
                                  setSkillSettingsKey(skillOpen ? null : skill.key)
                                }}
                              >
                                <Settings2 className="size-3.5" />
                              </button>
                              {skillOpen && skillSettings?.key === skill.key ? (
                                <div
                                  ref={skillSettingsRef}
                                  role="listbox"
                                  aria-label={panels.workdirSkillAgentEnvs}
                                  className="absolute right-0 top-full z-20 mt-1 w-[220px] rounded-lg border border-border/60 bg-surface p-3 shadow-lg"
                                  onPointerDown={(event) => event.stopPropagation()}
                                >
                                  <p className="text-[11px] font-medium">
                                    {panels.workdirSkillAgentEnvs}
                                  </p>
                                  <p className="mt-1 text-[10px] text-muted">
                                    {panels.workdirSkillAgentEnvsHelp}
                                  </p>
                                  <div className="mt-2 flex max-h-56 flex-col gap-1 overflow-y-auto">
                                    {SKILL_AGENT_ENVIRONMENTS.map((env) => {
                                      const checked =
                                        skillSettings.agentEnvironments.includes(env.id) &&
                                        skillSettings.enabled
                                      return (
                                        <label
                                          key={env.id}
                                          className="flex items-center gap-2 text-[11px]"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={busy}
                                            onChange={() => {
                                              const current = skillSettings.enabled
                                                ? skillSettings.agentEnvironments
                                                : []
                                              const next = current.includes(env.id)
                                                ? current.filter((item) => item !== env.id)
                                                : [...current, env.id]
                                              void saveSkillEnvs(skillSettings, next)
                                            }}
                                          />
                                          <span className="font-mono">{env.label}</span>
                                        </label>
                                      )
                                    })}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
