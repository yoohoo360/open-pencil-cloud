import { IS_BROWSER } from '@open-pencil/core/constants'

import { readActiveOrgId } from '#react/app/org/active'
import {
  parseSkillFrontmatter,
  upsertSkillFrontmatter
} from '#react/app/skills/frontmatter'
import { zipSkillFolder } from '#react/app/skills/package-zip'
import { CodeEditor } from '#react/components/code-editor/CodeEditor'
import { AppButton } from '#react/components/ui/AppButton'
import { AppInput } from '#react/components/ui/AppInput'
import { useDialogUI } from '#react/components/ui/dialog'
import { useI18n } from '#react/i18n'
import {
  getAPIErrorMessage,
  skillAPI,
  teamAPI,
  type PencilSkill,
  type PencilSkillGroup,
  type SkillCatalogCategory,
  type SkillEntry,
  type SkillEntryKind,
  type SkillMergeRequest,
  type TeamSummary,
  type UpsertSkillRequest
} from '#react/lib/client'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  FilePlus,
  FileText,
  Folder,
  FolderPlus,
  GitPullRequest,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

type ViewMode = 'list' | 'edit'

type Draft = {
  id?: string
  skill_key: string
  name: string
  description: string
  content: string
  group_id: string
}

const EMPTY_BODY = `# Skill

## When to use
Describe when this skill should guide codegen.

## Instructions
- Prefer clear, idiomatic output
- Match the requested format (Design JSX, Tailwind JSX, or HTML/CSS)
- Follow project naming and structure conventions
`

function emptyDraft(groupId: string): Draft {
  const content = upsertSkillFrontmatter(EMPTY_BODY, { name: '', description: '' })
  return {
    skill_key: '',
    name: '',
    description: '',
    content,
    group_id: groupId
  }
}

function applyFrontmatterToDraft(draft: Draft, markdown: string): Draft {
  const meta = parseSkillFrontmatter(markdown)
  if (draft.id) {
    // Key/name are locked after create; keep frontmatter name aligned with key.
    const content = upsertSkillFrontmatter(markdown, {
      name: draft.skill_key,
      description: meta.description
    })
    return {
      ...draft,
      content,
      name: draft.skill_key,
      description: meta.description
    }
  }
  // Create: SKILL.md frontmatter name ↔ form key.
  const key = meta.name.trim() || draft.skill_key
  return {
    ...draft,
    content: markdown,
    skill_key: key,
    name: key,
    description: meta.description
  }
}

function toDraft(skill: PencilSkill): Draft {
  return {
    id: skill.id,
    skill_key: skill.skill_key,
    name: skill.name,
    description: skill.description ?? '',
    content: skill.content,
    group_id: skill.group_id
  }
}

function categoryLabel(category: SkillCatalogCategory, personalLabel: string): string {
  if (category.kind === 'personal') return personalLabel
  return category.team_name?.trim() || 'Team'
}

function findEntry(nodes: SkillEntry[], id: string): SkillEntry | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const child = findEntry(node.children ?? [], id)
    if (child) return child
  }
  return null
}

function findEntryByPath(nodes: SkillEntry[], path: string): SkillEntry | null {
  for (const node of nodes) {
    if (node.path === path) return node
    const child = findEntryByPath(node.children ?? [], path)
    if (child) return child
  }
  return null
}

function flattenFiles(nodes: SkillEntry[]): SkillEntry[] {
  const out: SkillEntry[] = []
  for (const node of nodes) {
    if (node.kind === 'file') out.push(node)
    if (node.children?.length) out.push(...flattenFiles(node.children))
  }
  return out
}

function isTeamRemote(skill: PencilSkill): boolean {
  return Boolean(skill.team_id && skill.team_id.trim())
}

function isRemotesGroup(group: PencilSkillGroup): boolean {
  return Boolean(group.group_key?.startsWith('tr-') || group.id.startsWith('__team_remotes__:'))
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function SkillsView() {
  const navigate = useNavigate()
  const { panels, dialogs } = useI18n()
  const newGroupDialog = useDialogUI(
    {
      overlay: 'z-[100]',
      content: 'z-[110]'
    },
    { size: 'sm' }
  )
  const [categories, setCategories] = useState<SkillCatalogCategory[]>([])
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('__all_personal__')
  const [mode, setMode] = useState<ViewMode>('list')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeRequests, setMergeRequests] = useState<SkillMergeRequest[]>([])
  const [shareSkillId, setShareSkillId] = useState<string | null>(null)
  const [shareTeamId, setShareTeamId] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [shareBusy, setShareBusy] = useState(false)
  const [packageBusy, setPackageBusy] = useState(false)
  const zipInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [tree, setTree] = useState<SkillEntry[]>([])
  const [selectedEntryId, setSelectedEntryId] = useState('')
  const [fileDraft, setFileDraft] = useState('')
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => new Set())
  const [entryDialog, setEntryDialog] = useState<{
    kind: SkillEntryKind
    parentId?: string
  } | null>(null)
  const [entryName, setEntryName] = useState('')
  const [entryBusy, setEntryBusy] = useState(false)
  const newEntryDialog = useDialogUI(
    { overlay: 'z-[100]', content: 'z-[110]' },
    { size: 'sm' }
  )
  const shareSkillDialog = useDialogUI(
    { overlay: 'z-[100]', content: 'z-[110]' },
    { size: 'sm' }
  )

  const selectedGroup = useMemo(() => {
    for (const category of categories) {
      const group = category.groups.find((item) => item.id === selectedGroupId)
      if (group) return { category, group }
    }
    return null
  }, [categories, selectedGroupId])

  const skills = selectedGroup?.group.skills ?? []
  const sharedTeamIds = new Set(selectedGroup?.group.team_ids ?? [])
  const remotesGroup = selectedGroup ? isRemotesGroup(selectedGroup.group) : false
  const personalGroups = useMemo(
    () =>
      categories
        .filter((category) => category.kind === 'personal')
        .flatMap((category) => category.groups)
        .filter((group) => group.owned_by_me && !isRemotesGroup(group)),
    [categories]
  )
  const teamRemoteKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const category of categories) {
      if (category.kind !== 'team') continue
      for (const group of category.groups) {
        for (const skill of group.skills ?? []) {
          if (isTeamRemote(skill) || isRemotesGroup(group)) keys.add(skill.skill_key)
        }
      }
    }
    return keys
  }, [categories])
  const allPersonalSkills = useMemo(() => {
    const unique = new Map<string, PencilSkill>()
    for (const group of personalGroups) {
      for (const skill of group.skills ?? []) {
        if (!isTeamRemote(skill)) unique.set(skill.id, skill)
      }
    }
    return [...unique.values()]
  }, [personalGroups])
  const ALL_PERSONAL_ID = '__all_personal__'
  const editingRemote = useMemo(() => {
    if (!draft?.id) return false
    for (const category of categories) {
      for (const group of category.groups) {
        const skill = group.skills?.find((item) => item.id === draft.id)
        if (skill) return isTeamRemote(skill)
      }
    }
    return remotesGroup
  }, [categories, draft?.id, remotesGroup])
  const listSkills = useMemo(() => {
    if (selectedGroupId === ALL_PERSONAL_ID) return allPersonalSkills
    return skills
  }, [ALL_PERSONAL_ID, allPersonalSkills, selectedGroupId, skills])
  const showingPersonalAll = selectedGroupId === ALL_PERSONAL_ID

  async function reload(preferGroupId?: string) {
    const orgId = readActiveOrgId() || undefined
    const [catalogRes, teamRes, mrRes] = await Promise.all([
      skillAPI.catalog({ org_id: orgId }),
      orgId ? teamAPI.myTeams({ org_id: orgId }) : Promise.resolve({ data: [] as TeamSummary[], success: true }),
      orgId
        ? skillAPI.listMergeRequests({ org_id: orgId, status: 'open' })
        : Promise.resolve({ data: [] as SkillMergeRequest[], success: true })
    ])
    const next = catalogRes.data ?? []
    setCategories(next)
    setTeams(teamRes.data ?? [])
    setMergeRequests(mrRes.data ?? [])
    const preferred = preferGroupId || selectedGroupId
    const exists =
      preferred === ALL_PERSONAL_ID ||
      next.some((category) => category.groups.some((group) => group.id === preferred))
    const fallback =
      ALL_PERSONAL_ID ||
      next.find((category) => category.kind === 'personal')?.groups[0]?.id ||
      next.flatMap((category) => category.groups)[0]?.id ||
      ''
    setSelectedGroupId(exists && preferred ? preferred : fallback)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    void reload()
      .catch((reason) => {
        if (!cancelled) setError(getAPIErrorMessage(reason, panels.skillsLoadFailed))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load
  }, [panels.skillsLoadFailed])

  async function loadTree(skillId: string, preferEntryId?: string) {
    const response = await skillAPI.tree(skillId)
    const next = response.data ?? []
    setTree(next)
    const dirs = new Set<string>()
    function walk(nodes: SkillEntry[]) {
      for (const node of nodes) {
        if (node.kind === 'directory') {
          dirs.add(node.id)
          walk(node.children ?? [])
        }
      }
    }
    walk(next)
    setExpandedDirs(dirs)
    const preferred =
      (preferEntryId && findEntry(next, preferEntryId)) ||
      findEntryByPath(next, 'SKILL.md') ||
      flattenFiles(next)[0] ||
      null
    setSelectedEntryId(preferred?.id ?? '')
    setFileDraft(preferred?.kind === 'file' ? (preferred.content ?? '') : '')
    if (preferred?.kind === 'file' && preferred.path === 'SKILL.md') {
      setDraft((prev) => (prev ? { ...prev, content: preferred.content ?? '' } : prev))
    }
  }

  function openCreateSkill() {
    const groupId =
      (showingPersonalAll ? personalGroups[0]?.id : null) ||
      (selectedGroup && !remotesGroup ? selectedGroup.group.id : null) ||
      personalGroups[0]?.id
    if (!groupId) return
    const next = emptyDraft(groupId)
    setDraft(next)
    setTree([])
    setSelectedEntryId('')
    setFileDraft(next.content)
    setMode('edit')
    setError('')
  }

  function syncDraftFromSkillMd(markdown: string) {
    setFileDraft(markdown)
    setDraft((prev) => (prev ? applyFrontmatterToDraft(prev, markdown) : prev))
  }

  function updateDraftMeta(patch: Partial<Pick<Draft, 'description' | 'skill_key'>>) {
    setDraft((prev) => {
      if (!prev) return prev
      if (prev.id && patch.skill_key !== undefined) {
        const { skill_key: _ignored, ...rest } = patch
        patch = rest
      }
      const next = { ...prev, ...patch }
      if (patch.skill_key !== undefined) {
        next.name = next.skill_key
      } else {
        next.name = next.skill_key
      }
      if (patch.skill_key !== undefined || patch.description !== undefined) {
        const content = upsertSkillFrontmatter(next.content, {
          name: next.skill_key,
          description: next.description
        })
        next.content = content
        if (!prev.id || findEntry(tree, selectedEntryId)?.path === 'SKILL.md') {
          setFileDraft(content)
        }
      }
      return next
    })
  }

  function openEditSkill(skill: PencilSkill) {
    const base = toDraft(skill)
    const withMeta = applyFrontmatterToDraft(base, skill.content || base.content)
    setDraft(withMeta)
    setFileDraft(withMeta.content)
    setMode('edit')
    setError('')
    void loadTree(skill.id).catch((reason) => {
      setError(getAPIErrorMessage(reason, panels.skillsLoadFailed))
    })
  }

  function backToList() {
    setMode('list')
    setDraft(null)
    setTree([])
    setSelectedEntryId('')
    setFileDraft('')
    setEntryDialog(null)
    setError('')
    setShareOpen(false)
  }

  function selectEntry(entry: SkillEntry) {
    if (entry.kind === 'directory') {
      setExpandedDirs((prev) => {
        const next = new Set(prev)
        if (next.has(entry.id)) next.delete(entry.id)
        else next.add(entry.id)
        return next
      })
      return
    }
    setSelectedEntryId(entry.id)
    setFileDraft(entry.content ?? '')
  }

  async function saveSkill() {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      const orgId = readActiveOrgId()
      if (!orgId) throw new Error(panels.skillsOrgRequired)
      const skillMd =
        !draft.id || findEntry(tree, selectedEntryId)?.path === 'SKILL.md'
          ? fileDraft || draft.content
          : draft.content
      const key = draft.skill_key.trim()
      const syncedMd = upsertSkillFrontmatter(skillMd, {
        name: key,
        description: parseSkillFrontmatter(skillMd).description || draft.description
      })
      const payload: UpsertSkillRequest = {
        skill_key: key,
        name: key,
        description: parseSkillFrontmatter(syncedMd).description.trim() || undefined,
        content: draft.id ? undefined : syncedMd,
        group_id: draft.group_id,
        org_id: orgId
      }
      if (!payload.skill_key || !payload.group_id) {
        throw new Error(panels.skillsRequiredFields)
      }
      if (!draft.id && !(payload.content ?? '').trim()) {
        throw new Error(panels.skillsRequiredFields)
      }
      if (draft.id) {
        await skillAPI.update(draft.id, payload)
        const selected = findEntry(tree, selectedEntryId)
        if (selected?.kind === 'file') {
          const content = selected.path === 'SKILL.md' ? syncedMd : fileDraft
          await skillAPI.updateEntry(selected.id, { content })
          if (selected.path === 'SKILL.md') {
            setFileDraft(syncedMd)
            setDraft((prev) =>
              prev ? { ...prev, content: syncedMd, name: key, description: payload.description ?? '' } : prev
            )
          }
        }
        await loadTree(draft.id, selectedEntryId)
        await reload(draft.group_id)
      } else {
        const created = await skillAPI.create(payload)
        const skillId = created.data?.id
        if (!skillId) throw new Error(panels.skillsSaveFailed)
        setDraft((prev) => (prev ? { ...prev, id: skillId, content: payload.content ?? '' } : prev))
        await loadTree(skillId)
        await reload(draft.group_id)
      }
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillsSaveFailed))
    } finally {
      setSaving(false)
    }
  }

  async function createEntry() {
    if (!draft?.id || !entryDialog || !entryName.trim()) return
    setEntryBusy(true)
    setError('')
    try {
      const response = await skillAPI.createEntry(draft.id, {
        kind: entryDialog.kind,
        name: entryName.trim(),
        parent_id: entryDialog.parentId,
        content: entryDialog.kind === 'file' ? `# ${entryName.trim()}\n` : undefined
      })
      setEntryDialog(null)
      setEntryName('')
      await loadTree(draft.id, response.data?.id)
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillEntrySaveFailed))
    } finally {
      setEntryBusy(false)
    }
  }

  async function deleteEntry(entry: SkillEntry) {
    if (!draft?.id || entry.path === 'SKILL.md') return
    setError('')
    try {
      await skillAPI.removeEntry(entry.id)
      await loadTree(draft.id)
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillEntryDeleteFailed))
    }
  }

  function openEntryDialog(kind: SkillEntryKind) {
    const selected = findEntry(tree, selectedEntryId)
    const parentId =
      selected?.kind === 'directory'
        ? selected.id
        : selected?.parent_id || undefined
    setEntryName(kind === 'directory' ? 'references' : 'notes.md')
    setEntryDialog({ kind, parentId })
  }

  function renderTree(nodes: SkillEntry[], depth = 0): ReactNode {
    return nodes.map((entry) => {
      const selected = entry.id === selectedEntryId
      const expanded = expandedDirs.has(entry.id)
      return (
        <div key={entry.id}>
          <div
            className={`group/file flex items-center gap-0.5 rounded-md ${
              selected && entry.kind === 'file' ? 'bg-hover' : 'hover:bg-hover/70'
            }`}
            style={{ paddingLeft: 8 + depth * 12 }}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-1.5 py-1 pr-1 text-left text-[11px]"
              onClick={() => selectEntry(entry)}
            >
              {entry.kind === 'directory' ? (
                expanded ? (
                  <ChevronDown className="size-3 shrink-0 text-muted" />
                ) : (
                  <ChevronRight className="size-3 shrink-0 text-muted" />
                )
              ) : (
                <span className="w-3 shrink-0" />
              )}
              {entry.kind === 'directory' ? (
                <Folder className="size-3 shrink-0 text-muted" />
              ) : (
                <FileText className="size-3 shrink-0 text-muted" />
              )}
              <span className="min-w-0 truncate">{entry.name}</span>
            </button>
            {entry.path !== 'SKILL.md' ? (
              <button
                type="button"
                className="rounded p-1 text-muted opacity-0 hover:text-danger group-hover/file:opacity-100"
                title={panels.deleteSkillEntry}
                onClick={() => void deleteEntry(entry)}
              >
                <Trash2 className="size-3" />
              </button>
            ) : null}
          </div>
          {entry.kind === 'directory' && expanded
            ? renderTree(entry.children ?? [], depth + 1)
            : null}
        </div>
      )
    })
  }

  async function deleteSkill(id: string) {
    setError('')
    try {
      await skillAPI.remove(id)
      await reload(selectedGroupId)
      if (draft?.id === id) backToList()
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillsDeleteFailed))
    }
  }

  function openNewGroupDialog() {
    setNewGroupName('')
    setError('')
    setNewGroupOpen(true)
  }

  function closeNewGroupDialog() {
    if (addingGroup) return
    setNewGroupOpen(false)
    setNewGroupName('')
  }

  async function createGroup() {
    if (!newGroupName.trim()) return
    setAddingGroup(true)
    setError('')
    try {
      const orgId = readActiveOrgId() || undefined
      const response = await skillAPI.createGroup({ name: newGroupName.trim() }, { org_id: orgId })
      setNewGroupOpen(false)
      setNewGroupName('')
      await reload(response.data?.id)
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillGroupSaveFailed))
    } finally {
      setAddingGroup(false)
    }
  }

  useEffect(() => {
    if (!newGroupOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape' && event.code !== 'Escape') return
      if (addingGroup) return
      setNewGroupOpen(false)
      setNewGroupName('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [newGroupOpen, addingGroup])

  async function deleteGroup(group: PencilSkillGroup) {
    if (!group.owned_by_me) return
    setError('')
    try {
      await skillAPI.removeGroup(group.id)
      await reload()
      setShareOpen(false)
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillGroupDeleteFailed))
    }
  }

  async function toggleTeamShare(teamId: string) {
    if (!selectedGroup?.group.owned_by_me || remotesGroup) return
    const next = new Set(selectedGroup.group.team_ids ?? [])
    if (next.has(teamId)) next.delete(teamId)
    else next.add(teamId)
    setError('')
    try {
      const orgId = readActiveOrgId() || undefined
      await skillAPI.setGroupTeams(selectedGroup.group.id, [...next], { org_id: orgId })
      await reload(selectedGroup.group.id)
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillGroupShareFailed))
    }
  }

  async function downloadSkill(skill: PencilSkill) {
    setError('')
    try {
      const response = await skillAPI.download(skill.id)
      const blob = response.data
      if (!(blob instanceof Blob)) throw new Error(panels.skillDownloadFailed)
      downloadBlob(blob, `${skill.skill_key}.zip`)
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillDownloadFailed))
    }
  }

  async function uploadPackage(file: File | Blob) {
    if (!draft?.id) return
    setPackageBusy(true)
    setError('')
    try {
      await skillAPI.upload(draft.id, file)
      await loadTree(draft.id)
      await reload(draft.group_id)
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillUploadFailed))
    } finally {
      setPackageBusy(false)
    }
  }

  async function onZipSelected(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    await uploadPackage(file)
    if (zipInputRef.current) zipInputRef.current.value = ''
  }

  async function onFolderSelected(fileList: FileList | null) {
    if (!fileList?.length) return
    setPackageBusy(true)
    setError('')
    try {
      const zip = await zipSkillFolder(fileList)
      await uploadPackage(zip)
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillUploadFailed))
      setPackageBusy(false)
    } finally {
      if (folderInputRef.current) folderInputRef.current.value = ''
    }
  }

  async function submitShareSkill() {
    if (!shareSkillId || !shareTeamId) return
    setShareBusy(true)
    setError('')
    try {
      await skillAPI.share(shareSkillId, {
        team_id: shareTeamId,
        message: shareMessage.trim() || undefined
      })
      setShareSkillId(null)
      setShareTeamId('')
      setShareMessage('')
      await reload(selectedGroupId)
      setMergeOpen(true)
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillShareFailed))
    } finally {
      setShareBusy(false)
    }
  }

  async function fetchRemote(skill: PencilSkill) {
    const orgId = readActiveOrgId()
    const teamId = skill.team_id || selectedGroup?.category.team_id
    const targetGroupId = personalGroups[0]?.id || selectedGroupId
    if (!orgId || !teamId || !targetGroupId) {
      setError(panels.skillsOrgRequired)
      return
    }
    setError('')
    try {
      const response = await skillAPI.fetch({
        org_id: orgId,
        team_id: teamId,
        skill_key: skill.skill_key,
        group_id: targetGroupId
      })
      await reload(response.data?.group_id || targetGroupId)
      if (response.data) openEditSkill(response.data)
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillFetchFailed))
    }
  }

  async function mergeRequestAction(
    id: string,
    action: 'merge' | 'approve' | 'reject' | 'cancel'
  ) {
    setError('')
    try {
      if (action === 'merge') await skillAPI.mergeMergeRequest(id)
      else if (action === 'approve') await skillAPI.approveMergeRequest(id)
      else if (action === 'reject') await skillAPI.rejectMergeRequest(id)
      else await skillAPI.cancelMergeRequest(id)
      await reload(selectedGroupId)
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillMergeFailed))
    }
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-canvas text-surface" data-test-id="skills-page">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-6">
        <button
          type="button"
          className="rounded-lg p-2 text-muted hover:bg-hover hover:text-surface"
          aria-label="Back"
          onClick={() => {
            if (mode === 'edit') backToList()
            else void navigate('/dashboard')
          }}
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[17px] font-semibold tracking-tight">
            {mode === 'edit'
              ? draft?.id
                ? panels.updateSkill
                : panels.createSkill
              : panels.manageSkills}
          </h1>
          <p className="truncate text-[11px] text-muted">
            {mode === 'edit' ? panels.skillContent : panels.manageSkillsHelp}
          </p>
        </div>
      </header>

      {mode === 'list' ? (
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-64 shrink-0 flex-col border-r border-border/60">
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              {loading ? (
                <p className="px-2 py-3 text-[11px] text-muted">{panels.loading}</p>
              ) : (
                categories.map((category) => (
                  <div key={`${category.kind}:${category.team_id ?? 'personal'}`} className="mb-4">
                    <div className="mb-1 flex items-center gap-1.5 px-2.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
                      {category.kind === 'personal' ? (
                        <Sparkles className="size-3 opacity-70" />
                      ) : (
                        <Users className="size-3 opacity-70" />
                      )}
                      {categoryLabel(category, panels.skillsFilterPersonal)}
                    </div>
                    {category.kind === 'personal' ? (
                      <div className="mb-0.5 space-y-0.5">
                        <button
                          type="button"
                          data-test-id="skill-group-all-personal"
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs ${
                            selectedGroupId === ALL_PERSONAL_ID
                              ? 'bg-hover font-medium text-surface'
                              : 'text-muted hover:bg-hover hover:text-surface'
                          }`}
                          onClick={() => {
                            setSelectedGroupId(ALL_PERSONAL_ID)
                            setMode('list')
                            setDraft(null)
                            setShareOpen(false)
                          }}
                        >
                          <span className="min-w-0 flex-1 truncate">{panels.allMySkills}</span>
                          <span className="shrink-0 text-[10px] text-muted">
                            {allPersonalSkills.length}
                          </span>
                        </button>
                      </div>
                    ) : null}
                    {category.groups.length === 0 && category.kind !== 'personal' ? (
                      <p className="px-2.5 py-1 text-[11px] text-muted">
                        {panels.noSkillGroupsTeam}
                      </p>
                    ) : category.groups.length === 0 && category.kind === 'personal' ? (
                      <p className="px-2.5 py-1 text-[11px] text-muted">
                        {panels.noSkillGroupsPersonal}
                      </p>
                    ) : (
                      <div className="space-y-0.5">
                        {category.groups.map((group) => (
                          <div key={group.id} className="group/row flex items-center gap-0.5">
                            <button
                              type="button"
                              data-test-id={`skill-group-${group.id}`}
                              className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs ${
                                selectedGroupId === group.id
                                  ? 'bg-hover font-medium text-surface'
                                  : 'text-muted hover:bg-hover hover:text-surface'
                              }`}
                              onClick={() => {
                                setSelectedGroupId(group.id)
                                setMode('list')
                                setDraft(null)
                                setShareOpen(false)
                              }}
                            >
                              <span className="min-w-0 flex-1 truncate">{group.name}</span>
                              <span className="shrink-0 text-[10px] text-muted">
                                {group.skill_count ?? group.skills?.length ?? 0}
                              </span>
                            </button>
                            {group.owned_by_me && !isRemotesGroup(group) ? (
                              <button
                                type="button"
                                className="rounded p-1 text-muted opacity-0 hover:bg-hover hover:text-danger group-hover/row:opacity-100"
                                title={panels.deleteSkillGroup}
                                onClick={() => void deleteGroup(group)}
                              >
                                <Trash2 className="size-3" />
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="shrink-0 border-t border-border/60 p-2">
              <AppButton
                color="neutral"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                data-test-id="add-skill-group"
                onClick={openNewGroupDialog}
              >
                <FolderPlus className="size-3.5" />
                {panels.createSkillGroup}
              </AppButton>
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 px-5">
              <h2 className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                {showingPersonalAll
                  ? panels.allMySkills
                  : (selectedGroup?.group.name ?? panels.manageSkills)}
              </h2>
              <AppButton
                color="neutral"
                variant="ghost"
                size="sm"
                data-test-id="skills-merge-requests"
                onClick={() => setMergeOpen((open) => !open)}
              >
                <GitPullRequest className="size-3.5" />
                {panels.skillMergeRequests}
                {mergeRequests.length > 0 ? (
                  <span className="text-[10px] text-muted">({mergeRequests.length})</span>
                ) : null}
              </AppButton>
              {selectedGroup?.group.owned_by_me && !remotesGroup ? (
                <AppButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  data-test-id="skills-share-group"
                  onClick={() => setShareOpen((open) => !open)}
                >
                  <Share2 className="size-3.5" />
                  {panels.shareSkillGroup}
                </AppButton>
              ) : null}
              {!remotesGroup && (showingPersonalAll || selectedGroup) ? (
                <AppButton
                  color="primary"
                  variant="solid"
                  size="sm"
                  data-test-id="skills-add"
                  disabled={showingPersonalAll ? personalGroups.length === 0 : !selectedGroup}
                  onClick={openCreateSkill}
                >
                  <Plus className="size-3.5" />
                  {panels.createSkill}
                </AppButton>
              ) : null}
            </div>

            {mergeOpen ? (
              <div className="shrink-0 border-b border-border/60 px-5 py-3">
                <p className="mb-2 text-[11px] text-muted">{panels.skillMergeRequestsHelp}</p>
                {mergeRequests.length === 0 ? (
                  <p className="text-[11px] text-muted">{panels.noSkillMergeRequests}</p>
                ) : (
                  <ul className="space-y-2">
                    {mergeRequests.map((mr) => (
                      <li
                        key={mr.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-3 py-2"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-medium">
                            {mr.title || mr.skill_key}
                          </span>
                          <span className="block truncate text-[10px] text-muted">
                            {mr.skill_key}
                            {mr.target_team_name ? ` → ${mr.target_team_name}` : ''}
                            {` · ${mr.status}`}
                          </span>
                        </span>
                        {mr.status === 'pending' || mr.status === 'approved' ? (
                          <>
                            <AppButton
                              color="primary"
                              variant="solid"
                              size="xs"
                              onClick={() => void mergeRequestAction(mr.id, 'merge')}
                            >
                              {panels.mergeSkillRequest}
                            </AppButton>
                            <AppButton
                              color="neutral"
                              variant="ghost"
                              size="xs"
                              onClick={() => void mergeRequestAction(mr.id, 'reject')}
                            >
                              {panels.rejectSkillRequest}
                            </AppButton>
                          </>
                        ) : null}
                        {mr.status === 'pending' ? (
                          <AppButton
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            onClick={() => void mergeRequestAction(mr.id, 'cancel')}
                          >
                            {panels.cancelSkillRequest}
                          </AppButton>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {shareOpen && selectedGroup?.group.owned_by_me && !remotesGroup ? (
              <div className="shrink-0 border-b border-border/60 px-5 py-3">
                <p className="mb-2 text-[11px] text-muted">{panels.shareSkillGroupHelp}</p>
                {teams.length === 0 ? (
                  <p className="text-[11px] text-muted">{panels.noTeamsToShareSkillGroup}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {teams.map((team) => {
                      const active = sharedTeamIds.has(team.id)
                      return (
                        <button
                          key={team.id}
                          type="button"
                          className={`rounded-full border px-2.5 py-1 text-[11px] ${
                            active
                              ? 'border-accent bg-accent/10 text-surface'
                              : 'border-border text-muted hover:bg-hover'
                          }`}
                          onClick={() => void toggleTeamShare(team.id)}
                        >
                          {team.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="border-b border-danger/20 bg-danger/10 px-5 py-2 text-[11px] text-danger"
              >
                {error}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {!showingPersonalAll && !selectedGroup ? (
                <div className="flex flex-col items-start gap-3 py-10">
                  <p className="text-[12px] text-muted">{panels.noSkillGroupsPersonal}</p>
                  <p className="text-[11px] text-muted">{panels.createSkillGroupFirst}</p>
                </div>
              ) : loading ? (
                <p className="text-[11px] text-muted">{panels.loading}</p>
              ) : listSkills.length === 0 ? (
                <div className="flex flex-col items-start gap-3 py-10">
                  <p className="text-[12px] text-muted">
                    {showingPersonalAll ? panels.noSkills : panels.noSkillsInGroup}
                  </p>
                  {!remotesGroup ? (
                    <AppButton color="primary" variant="solid" size="sm" onClick={openCreateSkill}>
                      <Plus className="size-3.5" />
                      {panels.createSkill}
                    </AppButton>
                  ) : null}
                </div>
              ) : (
                <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
                  {listSkills.map((skill) => {
                    const remote = isTeamRemote(skill)
                    const fetched =
                      !remote && teamRemoteKeys.has(skill.skill_key)
                    return (
                      <li key={skill.id} className="flex items-stretch">
                        <button
                          type="button"
                          data-test-id={`skill-row-${skill.id}`}
                          className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left hover:bg-hover"
                          onClick={() => openEditSkill(skill)}
                        >
                          <Sparkles className="mt-0.5 size-4 shrink-0 text-muted" />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-[13px] font-medium">{skill.name}</span>
                              {remote ? (
                                <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">
                                  {panels.skillTeamRemote}
                                </span>
                              ) : fetched ? (
                                <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">
                                  {panels.skillFetchedBadge}
                                </span>
                              ) : showingPersonalAll ||
                                selectedGroup?.category.kind === 'personal' ? (
                                <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">
                                  {panels.skillOwnedBadge}
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-muted">
                              {skill.skill_key}
                              {skill.description
                                ? ` · ${skill.description.split(/\r?\n/).find((line) => line.trim()) ?? ''}`
                                : ''}
                            </span>
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center gap-0.5 pr-2">
                          <AppButton
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            shape="square"
                            title={panels.downloadSkill}
                            onClick={() => void downloadSkill(skill)}
                          >
                            <Download className="size-3.5" />
                          </AppButton>
                          {remote ? (
                            <AppButton
                              color="neutral"
                              variant="ghost"
                              size="xs"
                              title={panels.fetchSkill}
                              onClick={() => void fetchRemote(skill)}
                            >
                              {panels.fetchSkill}
                            </AppButton>
                          ) : (
                            <AppButton
                              color="neutral"
                              variant="ghost"
                              size="xs"
                              title={panels.shareSkillToTeam}
                              onClick={() => {
                                setShareSkillId(skill.id)
                                setShareTeamId(teams[0]?.id ?? '')
                                setShareMessage('')
                              }}
                            >
                              <Share2 className="size-3.5" />
                            </AppButton>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      ) : draft ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 space-y-3 border-b border-border/60 px-5 py-4">
            <label className="block space-y-1">
              <span className="text-[11px] text-muted">{panels.skillKey}</span>
              <AppInput
                value={draft.skill_key}
                data-test-id="skill-key"
                disabled={Boolean(draft.id)}
                title={draft.id ? panels.skillNameLocked : undefined}
                onChange={(event) => updateDraftMeta({ skill_key: event.target.value })}
              />
              <span className="text-[10px] text-muted">{panels.skillKeySyncHelp}</span>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] text-muted">{panels.skillDescription}</span>
              <textarea
                value={draft.description}
                data-test-id="skill-description"
                rows={5}
                spellCheck={false}
                className="min-h-24 w-full resize-y rounded-md border border-border bg-input px-2 py-1.5 text-[11px] leading-relaxed text-surface outline-none focus:border-accent focus:ring-1 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
                onChange={(event) => updateDraftMeta({ description: event.target.value })}
              />
              <span className="text-[10px] text-muted">{panels.skillFrontmatterSyncHelp}</span>
            </label>
            {error ? (
              <p role="alert" className="text-[11px] text-danger">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex min-h-0 flex-1">
            {draft.id ? (
              <aside className="flex w-56 shrink-0 flex-col border-r border-border/60">
                <div className="flex shrink-0 items-center gap-1 border-b border-border/60 px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted">
                    {panels.skillPackage}
                  </span>
                  <AppButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    shape="square"
                    title={panels.newSkillFile}
                    onClick={() => openEntryDialog('file')}
                  >
                    <FilePlus className="size-3.5" />
                  </AppButton>
                  <AppButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    shape="square"
                    title={panels.newSkillFolder}
                    onClick={() => openEntryDialog('directory')}
                  >
                    <FolderPlus className="size-3.5" />
                  </AppButton>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto py-1">{renderTree(tree)}</div>
              </aside>
            ) : null}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 py-2">
                <span className="truncate text-[11px] font-medium text-muted">
                  {draft.id
                    ? (findEntry(tree, selectedEntryId)?.path ?? panels.skillContent)
                    : 'SKILL.md'}
                </span>
                <span className="text-[10px] text-muted">Markdown</span>
              </div>
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                <CodeEditor
                  value={fileDraft}
                  language="markdown"
                  label={panels.skillContent}
                  onChange={(content) => {
                    const editingSkillMd =
                      !draft.id || findEntry(tree, selectedEntryId)?.path === 'SKILL.md'
                    if (editingSkillMd) syncDraftFromSkillMd(content)
                    else setFileDraft(content)
                  }}
                />
              </div>
            </div>
          </div>
          <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 px-5 py-3">
            <div className="flex items-center gap-1">
              {draft.id ? (
                <>
                  <AppButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    data-test-id="skill-delete"
                    onClick={() => {
                      const id = draft.id
                      if (id) void deleteSkill(id)
                    }}
                  >
                    <Trash2 className="size-3" />
                    {panels.deleteSkill}
                  </AppButton>
                  <AppButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    title={panels.downloadSkill}
                    onClick={() => {
                      const skill = skills.find((item) => item.id === draft.id)
                      if (skill) void downloadSkill(skill)
                      else
                        void downloadSkill({
                          id: draft.id!,
                          skill_key: draft.skill_key,
                          name: draft.name,
                          content: draft.content,
                          group_id: draft.group_id
                        })
                    }}
                  >
                    <Download className="size-3.5" />
                    {panels.downloadSkill}
                  </AppButton>
                  {!editingRemote ? (
                    <>
                      <AppButton
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        disabled={packageBusy}
                        onClick={() => zipInputRef.current?.click()}
                      >
                        <Upload className="size-3.5" />
                        {packageBusy ? panels.uploadingSkill : panels.uploadSkillZip}
                      </AppButton>
                      <AppButton
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        disabled={packageBusy}
                        onClick={() => folderInputRef.current?.click()}
                      >
                        <Folder className="size-3.5" />
                        {panels.uploadSkillFolder}
                      </AppButton>
                      <AppButton
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          setShareSkillId(draft.id!)
                          setShareTeamId(teams[0]?.id ?? '')
                          setShareMessage('')
                        }}
                      >
                        <Share2 className="size-3.5" />
                        {panels.shareSkillToTeam}
                      </AppButton>
                    </>
                  ) : (
                    <AppButton
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        const skill = skills.find((item) => item.id === draft.id)
                        if (skill) void fetchRemote(skill)
                      }}
                    >
                      {panels.fetchSkill}
                    </AppButton>
                  )}
                </>
              ) : null}
              <input
                ref={zipInputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={(event) => void onZipSelected(event.target.files)}
              />
              <input
                ref={folderInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={(event) => void onFolderSelected(event.target.files)}
                {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
              />
            </div>
            <div className="flex items-center gap-2">
              <AppButton color="neutral" variant="ghost" size="sm" onClick={backToList}>
                {panels.cancel}
              </AppButton>
              {!editingRemote ? (
                <AppButton
                  color="primary"
                  variant="solid"
                  size="sm"
                  data-test-id="skill-save"
                  disabled={saving}
                  onClick={() => void saveSkill()}
                >
                  {saving ? panels.savingSkill : draft.id ? panels.updateSkill : panels.createSkill}
                </AppButton>
              ) : null}
            </div>
          </footer>
        </div>
      ) : null}

      {IS_BROWSER && entryDialog
        ? createPortal(
            <>
              <div
                data-slot="dialog-overlay"
                className={newEntryDialog.overlay}
                onClick={() => {
                  if (!entryBusy) setEntryDialog(null)
                }}
              />
              <div
                role="dialog"
                aria-modal="true"
                data-slot="dialog-content"
                data-test-id="new-skill-entry-dialog"
                className={newEntryDialog.content}
              >
                <header data-slot="dialog-header" className={newEntryDialog.header}>
                  <h2 className={newEntryDialog.title}>
                    {entryDialog.kind === 'directory'
                      ? panels.newSkillFolder
                      : panels.newSkillFile}
                  </h2>
                  <button
                    type="button"
                    className={newEntryDialog.close}
                    aria-label={dialogs.close}
                    disabled={entryBusy}
                    onClick={() => setEntryDialog(null)}
                  >
                    <X className="size-3.5" />
                  </button>
                </header>
                <div data-slot="dialog-body" className={`${newEntryDialog.body} flex flex-col gap-3`}>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-muted">{panels.newSkillEntryName}</span>
                    <AppInput
                      autoFocus
                      value={entryName}
                      onChange={(event) => setEntryName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void createEntry()
                      }}
                    />
                  </label>
                </div>
                <footer data-slot="dialog-footer" className={newEntryDialog.footer}>
                  <AppButton variant="ghost" disabled={entryBusy} onClick={() => setEntryDialog(null)}>
                    {panels.cancel}
                  </AppButton>
                  <AppButton
                    color="primary"
                    variant="solid"
                    disabled={entryBusy || !entryName.trim()}
                    onClick={() => void createEntry()}
                  >
                    {entryBusy ? panels.savingSkill : panels.createSkillEntry}
                  </AppButton>
                </footer>
              </div>
            </>,
            document.body
          )
        : null}

      {IS_BROWSER && newGroupOpen
        ? createPortal(
            <>
              <div
                data-slot="dialog-overlay"
                className={newGroupDialog.overlay}
                onClick={closeNewGroupDialog}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-skill-group-title"
                data-slot="dialog-content"
                data-test-id="new-skill-group-dialog"
                className={newGroupDialog.content}
              >
                <header data-slot="dialog-header" className={newGroupDialog.header}>
                  <h2 id="new-skill-group-title" className={newGroupDialog.title}>
                    {panels.newSkillGroupTitle}
                  </h2>
                  <button
                    type="button"
                    className={newGroupDialog.close}
                    aria-label={dialogs.close}
                    disabled={addingGroup}
                    onClick={closeNewGroupDialog}
                  >
                    <X className="size-3.5" />
                  </button>
                </header>
                <div data-slot="dialog-body" className={`${newGroupDialog.body} flex flex-col gap-3`}>
                  <p className="text-xs text-muted">{panels.newSkillGroupHelp}</p>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-muted">{panels.newSkillGroupName}</span>
                    <AppInput
                      autoFocus
                      value={newGroupName}
                      placeholder={panels.newSkillGroupPlaceholder}
                      data-test-id="new-skill-group-name"
                      onChange={(event) => setNewGroupName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void createGroup()
                      }}
                    />
                  </label>
                  {error && newGroupOpen ? (
                    <p role="alert" className="text-[11px] text-danger">
                      {error}
                    </p>
                  ) : null}
                </div>
                <footer data-slot="dialog-footer" className={newGroupDialog.footer}>
                  <AppButton variant="ghost" disabled={addingGroup} onClick={closeNewGroupDialog}>
                    {panels.cancel}
                  </AppButton>
                  <AppButton
                    color="primary"
                    variant="solid"
                    disabled={addingGroup || !newGroupName.trim()}
                    data-test-id="new-skill-group-confirm"
                    onClick={() => void createGroup()}
                  >
                    {addingGroup ? panels.savingSkill : panels.createSkillGroup}
                  </AppButton>
                </footer>
              </div>
            </>,
            document.body
          )
        : null}

      {IS_BROWSER && shareSkillId
        ? createPortal(
            <>
              <div
                data-slot="dialog-overlay"
                className={shareSkillDialog.overlay}
                onClick={() => {
                  if (!shareBusy) setShareSkillId(null)
                }}
              />
              <div
                role="dialog"
                aria-modal="true"
                data-slot="dialog-content"
                data-test-id="share-skill-dialog"
                className={shareSkillDialog.content}
              >
                <header data-slot="dialog-header" className={shareSkillDialog.header}>
                  <h2 className={shareSkillDialog.title}>{panels.shareSkillToTeam}</h2>
                  <button
                    type="button"
                    className={shareSkillDialog.close}
                    aria-label={dialogs.close}
                    disabled={shareBusy}
                    onClick={() => setShareSkillId(null)}
                  >
                    <X className="size-3.5" />
                  </button>
                </header>
                <div data-slot="dialog-body" className={`${shareSkillDialog.body} flex flex-col gap-3`}>
                  <p className="text-xs text-muted">{panels.shareSkillToTeamHelp}</p>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-muted">{panels.skillsTeam}</span>
                    <select
                      className="h-8 rounded-md border border-border bg-canvas px-2 text-xs"
                      value={shareTeamId}
                      onChange={(event) => setShareTeamId(event.target.value)}
                    >
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-muted">{panels.skillShareMessage}</span>
                    <AppInput
                      value={shareMessage}
                      onChange={(event) => setShareMessage(event.target.value)}
                    />
                  </label>
                </div>
                <footer data-slot="dialog-footer" className={shareSkillDialog.footer}>
                  <AppButton variant="ghost" disabled={shareBusy} onClick={() => setShareSkillId(null)}>
                    {panels.cancel}
                  </AppButton>
                  <AppButton
                    color="primary"
                    variant="solid"
                    disabled={shareBusy || !shareTeamId}
                    onClick={() => void submitShareSkill()}
                  >
                    {shareBusy ? panels.savingSkill : panels.submitSkillShare}
                  </AppButton>
                </footer>
              </div>
            </>,
            document.body
          )
        : null}
    </main>
  )
}
