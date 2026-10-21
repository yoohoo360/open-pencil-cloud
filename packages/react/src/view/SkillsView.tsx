import { IS_BROWSER } from '@open-pencil/core/constants'

import { readActiveOrgId } from '#react/app/org/active'
import {
  parseSkillFrontmatter,
  upsertSkillFrontmatter
} from '#react/app/skills/frontmatter'
import { pasteDesignClipboardAsMarkdown } from '#react/app/skills/clipboard-xml'
import { zipSkillFolder } from '#react/app/skills/package-zip'
import {
  sanitizeSkillName,
  validateSkillName,
  type SkillNameIssue
} from '#react/app/skills/skill-name'
import { CodeEditor } from '#react/components/code-editor/CodeEditor'
import { AppButton } from '#react/components/ui/AppButton'
import { AppInput } from '#react/components/ui/AppInput'
import { AppMultiSelect } from '#react/components/ui/AppMultiSelect'
import { useDialogUI } from '#react/components/ui/dialog'
import { useI18n } from '#react/i18n'
import {
  getAPIErrorMessage,
  skillAPI,
  teamAPI,
  userAPI,
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
import { useNavigate, useSearchParams } from 'react-router-dom'

import { readSkillsTab, SKILLS_TAB, SKILLS_TAB_IDS } from '#react/app/skills/skills-url'

type ViewMode = 'list' | 'edit'

const OWNER_SKILLS_ID = SKILLS_TAB_IDS.ownerSkills

type Draft = {
  id?: string
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
    name: '',
    description: '',
    content,
    group_id: groupId
  }
}

function applyFrontmatterToDraft(draft: Draft, markdown: string): Draft {
  const meta = parseSkillFrontmatter(markdown)
  if (draft.id) {
    // Keep SKILL.md frontmatter name aligned with the form name.
    const content = upsertSkillFrontmatter(markdown, {
      name: draft.name,
      description: meta.description
    })
    return {
      ...draft,
      content,
      description: meta.description
    }
  }
  // Create: form name ↔ SKILL.md frontmatter name.
  const name = meta.name.trim() || draft.name
  return {
    ...draft,
    content: markdown,
    name,
    description: meta.description
  }
}

function toDraft(skill: PencilSkill): Draft {
  return {
    id: skill.id,
    name: skill.name || skill.skill_key,
    description: skill.description ?? '',
    content: skill.content,
    group_id: skill.group_id
  }
}

function skillNameIssueMessage(
  issue: SkillNameIssue,
  panels: {
    skillNameEmpty: string
    skillNameInvalid: string
    skillNameTooLong: string
  }
): string {
  if (issue === 'empty') return panels.skillNameEmpty
  if (issue === 'too_long') return panels.skillNameTooLong
  return panels.skillNameInvalid
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

function isXmlSkillPath(path: string): boolean {
  const lower = path.toLowerCase()
  return lower.endsWith('.xml') || lower.endsWith('.html')
}

function isTeamRemote(skill: PencilSkill): boolean {
  return Boolean(skill.team_id && skill.team_id.trim())
}

function isRemotesGroup(group: PencilSkillGroup): boolean {
  return Boolean(group.group_key?.startsWith('tr-') || group.id.startsWith('__team_remotes__:'))
}

/** Owned by me and not bound to any team. */
function isOwnerGroup(group: PencilSkillGroup): boolean {
  return (
    Boolean(group.owned_by_me) &&
    !isRemotesGroup(group) &&
    (group.team_ids?.length ?? 0) === 0
  )
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
  const [searchParams] = useSearchParams()
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
  const [selectedGroupId, setSelectedGroupId] = useState<string>(OWNER_SKILLS_ID)
  const [mode, setMode] = useState<ViewMode>('list')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [skillNameIssue, setSkillNameIssue] = useState<SkillNameIssue | null>(null)
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupNameIssue, setNewGroupNameIssue] = useState<SkillNameIssue | null>(null)
  const [newGroupTeamId, setNewGroupTeamId] = useState<string | null>(null)
  const [addingGroup, setAddingGroup] = useState(false)
  const [editGroupOpen, setEditGroupOpen] = useState(false)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupNameIssue, setEditGroupNameIssue] = useState<SkillNameIssue | null>(null)
  const [savingGroup, setSavingGroup] = useState(false)
  const [groupManagers, setGroupManagers] = useState<string[]>([])
  const [managerUsername, setManagerUsername] = useState('')
  const [managerError, setManagerError] = useState('')
  const [managerBusy, setManagerBusy] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeRequests, setMergeRequests] = useState<SkillMergeRequest[]>([])
  const [shareSkillId, setShareSkillId] = useState<string | null>(null)
  const [shareTeamId, setShareTeamId] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [shareBusy, setShareBusy] = useState(false)
  const [deleteSkillTarget, setDeleteSkillTarget] = useState<{ id: string; name: string } | null>(
    null
  )
  const [deletingSkill, setDeletingSkill] = useState(false)
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
  const deleteSkillDialog = useDialogUI(
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
  const remotesGroup = selectedGroup ? isRemotesGroup(selectedGroup.group) : false
  const skillGroupCategory = useMemo(
    () => categories.find((category) => category.kind === 'personal') ?? null,
    [categories]
  )
  const teamRemoteCategories = useMemo(
    () => categories.filter((category) => category.kind === 'team'),
    [categories]
  )
  const ownerGroups = useMemo(
    () => (skillGroupCategory?.groups ?? []).filter(isOwnerGroup),
    [skillGroupCategory]
  )
  /** Bound to one or more teams — listed flat, not nested under a team. */
  const boundGroups = useMemo(
    () =>
      (skillGroupCategory?.groups ?? []).filter(
        (group) => !isRemotesGroup(group) && !isOwnerGroup(group)
      ),
    [skillGroupCategory]
  )
  const ownerSkills = useMemo(() => {
    const unique = new Map<string, PencilSkill>()
    for (const group of ownerGroups) {
      for (const skill of group.skills ?? []) {
        if (!isTeamRemote(skill)) unique.set(skill.id, skill)
      }
    }
    return [...unique.values()]
  }, [ownerGroups])
  const showingOwnerSkills = selectedGroupId === OWNER_SKILLS_ID
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
    if (showingOwnerSkills) return ownerSkills
    return skills
  }, [showingOwnerSkills, ownerSkills, skills])

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
    const allGroups = next.flatMap((category) => category.groups)
    const exists =
      preferred === OWNER_SKILLS_ID ||
      (Boolean(preferred) && allGroups.some((group) => group.id === preferred))
    setSelectedGroupId(exists && preferred ? preferred : OWNER_SKILLS_ID)
  }

  useEffect(() => {
    if (readSkillsTab(searchParams) === SKILLS_TAB.workspace) {
      void navigate('/skill-workspace', { replace: true })
    }
  }, [navigate, searchParams])

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
      (showingOwnerSkills ? ownerGroups[0]?.id : null) ||
      (selectedGroup && !remotesGroup ? selectedGroup.group.id : null) ||
      ownerGroups[0]?.id
    if (!groupId) return
    const next = emptyDraft(groupId)
    setDraft(next)
    setTree([])
    setSelectedEntryId('')
    setFileDraft(next.content)
    setSkillNameIssue('empty')
    setMode('edit')
    setError('')
  }

  function syncDraftFromSkillMd(markdown: string) {
    setFileDraft(markdown)
    setDraft((prev) => {
      if (!prev) return prev
      const next = applyFrontmatterToDraft(prev, markdown)
      const checked = validateSkillName(next.name)
      setSkillNameIssue(checked.ok ? null : checked.issue)
      return next
    })
  }

  function updateDraftMeta(patch: Partial<Pick<Draft, 'description' | 'name'>>) {
    setDraft((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      if (patch.name !== undefined) {
        const checked = validateSkillName(patch.name)
        setSkillNameIssue(checked.ok ? null : checked.issue)
      }
      if (patch.name !== undefined || patch.description !== undefined) {
        const content = upsertSkillFrontmatter(next.content, {
          name: next.name,
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

  function selectGroup(groupId: string) {
    setSelectedGroupId(groupId)
    setMode('list')
    setDraft(null)
    setTree([])
    setSelectedEntryId('')
    setFileDraft('')
    setError('')
  }

  function openEditSkill(skill: PencilSkill) {
    const base = toDraft(skill)
    const withMeta = applyFrontmatterToDraft(base, skill.content || base.content)
    setDraft(withMeta)
    setFileDraft(withMeta.content)
    const checked = validateSkillName(withMeta.name)
    setSkillNameIssue(checked.ok ? null : checked.issue)
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
    setSkillNameIssue(null)
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
    const nameCheck = validateSkillName(draft.name)
    if (!nameCheck.ok) {
      setSkillNameIssue(nameCheck.issue)
      setError(skillNameIssueMessage(nameCheck.issue, panels))
      return
    }
    setSaving(true)
    setError('')
    setSkillNameIssue(null)
    try {
      const orgId = readActiveOrgId()
      if (!orgId) throw new Error(panels.skillsOrgRequired)
      const skillMd =
        !draft.id || findEntry(tree, selectedEntryId)?.path === 'SKILL.md'
          ? fileDraft || draft.content
          : draft.content
      const name = nameCheck.name
      const syncedMd = upsertSkillFrontmatter(skillMd, {
        name,
        description: parseSkillFrontmatter(skillMd).description || draft.description
      })
      const payload: UpsertSkillRequest = {
        // API still stores uniqueness under skill_key; value is the display name.
        skill_key: name,
        name,
        description: parseSkillFrontmatter(syncedMd).description.trim() || undefined,
        content: draft.id ? undefined : syncedMd,
        group_id: draft.group_id,
        org_id: orgId
      }
      if (!payload.name || !payload.group_id) {
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
              prev ? { ...prev, content: syncedMd, name, description: payload.description ?? '' } : prev
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

  function requestDeleteSkill(id: string, name: string) {
    setDeleteSkillTarget({ id, name: name.trim() || id })
    setError('')
  }

  async function confirmDeleteSkill() {
    if (!deleteSkillTarget) return
    const { id } = deleteSkillTarget
    setDeletingSkill(true)
    setError('')
    try {
      await skillAPI.remove(id)
      setDeleteSkillTarget(null)
      await reload(selectedGroupId)
      if (draft?.id === id) backToList()
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillsDeleteFailed))
    } finally {
      setDeletingSkill(false)
    }
  }

  function canManageSelectedGroup(): boolean {
    return Boolean(selectedGroup?.group.managed_by_me || selectedGroup?.group.owned_by_me)
  }

  function openNewGroupDialog(teamId?: string | null) {
    setNewGroupName('')
    setNewGroupNameIssue(null)
    setNewGroupTeamId(teamId ?? null)
    setError('')
    setNewGroupOpen(true)
  }

  function closeNewGroupDialog() {
    if (addingGroup) return
    setNewGroupOpen(false)
    setNewGroupName('')
    setNewGroupNameIssue(null)
    setNewGroupTeamId(null)
  }

  async function loadGroupManagers(groupId: string) {
    try {
      const res = await skillAPI.listGroupManagers(groupId)
      setGroupManagers(res.data ?? [])
    } catch {
      setGroupManagers([])
    }
  }

  function openEditGroupDialog() {
    if (!canManageSelectedGroup() || remotesGroup || !selectedGroup) return
    setEditGroupName(selectedGroup.group.name)
    const checked = validateSkillName(selectedGroup.group.name)
    setEditGroupNameIssue(checked.ok ? null : checked.issue)
    setManagerUsername('')
    setManagerError('')
    setError('')
    setEditGroupOpen(true)
    void loadGroupManagers(selectedGroup.group.id)
  }

  function closeEditGroupDialog() {
    if (savingGroup || managerBusy) return
    setEditGroupOpen(false)
    setManagerUsername('')
    setManagerError('')
    setEditGroupNameIssue(null)
  }

  async function addGroupManager() {
    if (!selectedGroup) return
    const username = managerUsername.trim()
    if (!username) {
      setManagerError(panels.skillGroupManagerUsernameEmpty)
      return
    }
    setManagerBusy(true)
    setManagerError('')
    setError('')
    try {
      const orgId = readActiveOrgId() || undefined
      // Confirm the username exists before adding (clearer than a generic server error).
      const lookedUp = await userAPI.lookup(username)
      if (!lookedUp.data?.id?.trim()) throw new Error(panels.skillGroupManagerNotFound)
      await skillAPI.addGroupManager(selectedGroup.group.id, username, {
        org_id: orgId
      })
      setManagerUsername('')
      await loadGroupManagers(selectedGroup.group.id)
      await reload(selectedGroup.group.id)
    } catch (reason) {
      const message = getAPIErrorMessage(reason, panels.skillGroupManagerAddFailed)
      setManagerError(
        /not found|404/i.test(message) ? panels.skillGroupManagerNotFound : message
      )
    } finally {
      setManagerBusy(false)
    }
  }

  async function removeGroupManager(managerId: string) {
    if (!selectedGroup) return
    setManagerBusy(true)
    setError('')
    try {
      const orgId = readActiveOrgId() || undefined
      await skillAPI.removeGroupManager(selectedGroup.group.id, managerId, { org_id: orgId })
      await loadGroupManagers(selectedGroup.group.id)
      await reload(selectedGroup.group.id)
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillGroupManagerRemoveFailed))
    } finally {
      setManagerBusy(false)
    }
  }

  async function createGroup() {
    const checked = validateSkillName(newGroupName)
    if (!checked.ok) {
      setNewGroupNameIssue(checked.issue)
      setError(skillNameIssueMessage(checked.issue, panels))
      return
    }
    setAddingGroup(true)
    setError('')
    setNewGroupNameIssue(null)
    try {
      const orgId = readActiveOrgId()
      if (!orgId) throw new Error(panels.skillsOrgRequired)
      const response = await skillAPI.createGroup(
        {
          name: checked.name,
          team_ids: newGroupTeamId ? [newGroupTeamId] : undefined
        },
        { org_id: orgId }
      )
      setNewGroupOpen(false)
      setNewGroupName('')
      setNewGroupTeamId(null)
      await reload(response.data?.id)
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillGroupSaveFailed))
    } finally {
      setAddingGroup(false)
    }
  }

  async function saveGroup() {
    if (!canManageSelectedGroup() || !selectedGroup) return
    const checked = validateSkillName(editGroupName)
    if (!checked.ok) {
      setEditGroupNameIssue(checked.issue)
      setError(skillNameIssueMessage(checked.issue, panels))
      return
    }
    setSavingGroup(true)
    setError('')
    setEditGroupNameIssue(null)
    try {
      const orgId = readActiveOrgId()
      if (!orgId) throw new Error(panels.skillsOrgRequired)
      await skillAPI.updateGroup(
        selectedGroup.group.id,
        {
          name: checked.name,
          description: selectedGroup.group.description
        },
        { org_id: orgId }
      )
      setEditGroupOpen(false)
      await reload(selectedGroup.group.id)
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillGroupUpdateFailed))
    } finally {
      setSavingGroup(false)
    }
  }

  useEffect(() => {
    if (!newGroupOpen && !editGroupOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape' && event.code !== 'Escape') return
      if (addingGroup || savingGroup) return
      if (newGroupOpen) {
        setNewGroupOpen(false)
        setNewGroupName('')
        setNewGroupTeamId(null)
      }
      if (editGroupOpen) setEditGroupOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [newGroupOpen, editGroupOpen, addingGroup, savingGroup])

  async function deleteGroup(group: PencilSkillGroup) {
    if (!group.managed_by_me && !group.owned_by_me) return
    setError('')
    try {
      await skillAPI.removeGroup(group.id)
      await reload()
    } catch (reason) {
      setError(getAPIErrorMessage(reason, panels.skillGroupDeleteFailed))
    }
  }

  async function setBoundTeams(teamIds: string[]) {
    if (!canManageSelectedGroup() || remotesGroup || !selectedGroup) return
    setError('')
    try {
      const orgId = readActiveOrgId() || undefined
      await skillAPI.setGroupTeams(selectedGroup.group.id, teamIds, { org_id: orgId })
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
      downloadBlob(blob, `${sanitizeSkillName(skill.name || skill.skill_key) || 'skill'}.zip`)
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
    const targetGroupId = ownerGroups[0]?.id || selectedGroupId
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
    <main
      className="flex h-full min-h-0 flex-col bg-canvas text-surface select-text"
      data-test-id="skills-page"
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-6">
        <button
          type="button"
          className="rounded-lg p-2 text-muted hover:bg-hover hover:text-surface"
          aria-label="Back"
          onClick={() => {
            if (mode === 'edit') backToList()
            else void navigate('/skill-workspace')
          }}
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight">
          {mode === 'edit'
            ? draft?.id
              ? panels.updateSkill
              : panels.createSkill
            : panels.manageSkills}
        </h1>
      </header>

      {mode === 'list' ? (
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-64 shrink-0 flex-col border-r border-border/60">
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              {loading ? (
                <p className="px-2 py-3 text-[11px] text-muted">{panels.loading}</p>
              ) : (
                <>
                  <div className="mb-4 space-y-0.5">
                    <button
                      type="button"
                      data-test-id="skill-owner-skills"
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs ${
                        showingOwnerSkills
                          ? 'bg-hover font-medium text-surface'
                          : 'text-muted hover:bg-hover hover:text-surface'
                      }`}
                      onClick={() => selectGroup(OWNER_SKILLS_ID)}
                    >
                      <Sparkles className="size-3.5 shrink-0 opacity-70" />
                      <span className="min-w-0 flex-1 truncate">{panels.ownerSkills}</span>
                      <span className="shrink-0 text-[10px] text-muted">{ownerSkills.length}</span>
                    </button>
                  </div>

                  <div className="mb-4">
                    <div className="mb-1 flex items-center gap-1 px-2.5">
                      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
                        {panels.skillsNavGroups}
                      </div>
                      <button
                        type="button"
                        className="rounded p-0.5 text-muted hover:bg-hover hover:text-surface"
                        title={panels.createSkillGroup}
                        data-test-id="add-skill-group"
                        onClick={() => openNewGroupDialog(null)}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    {ownerGroups.length === 0 ? (
                      <p className="px-2.5 py-1 text-[11px] text-muted">
                        {panels.noOwnerSkillGroups}
                      </p>
                    ) : (
                      <div className="space-y-0.5">
                        {ownerGroups.map((group) => (
                          <div key={group.id} className="group/row flex items-center gap-0.5">
                            <button
                              type="button"
                              data-test-id={`skill-group-${group.id}`}
                              className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs ${
                                selectedGroupId === group.id
                                  ? 'bg-hover font-medium text-surface'
                                  : 'text-muted hover:bg-hover hover:text-surface'
                              }`}
                              onClick={() => selectGroup(group.id)}
                            >
                              <span className="min-w-0 flex-1 truncate">{group.name}</span>
                              <span className="shrink-0 text-[10px] text-muted">
                                {group.skill_count ?? group.skills?.length ?? 0}
                              </span>
                            </button>
                            {(group.managed_by_me || group.owned_by_me) ? (
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

                  {boundGroups.length > 0 ? (
                    <div className="mb-4">
                      <div className="mb-1 flex items-center gap-1.5 px-2.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
                        {panels.skillsNavBound}
                      </div>
                      <div className="space-y-0.5">
                        {boundGroups.map((group) => (
                          <div key={group.id} className="group/row flex items-center gap-0.5">
                            <button
                              type="button"
                              data-test-id={`skill-group-${group.id}`}
                              className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs ${
                                selectedGroupId === group.id
                                  ? 'bg-hover font-medium text-surface'
                                  : 'text-muted hover:bg-hover hover:text-surface'
                              }`}
                              onClick={() => selectGroup(group.id)}
                            >
                              <span className="min-w-0 flex-1 truncate">{group.name}</span>
                              <span className="shrink-0 text-[10px] text-muted">
                                {group.skill_count ?? group.skills?.length ?? 0}
                              </span>
                            </button>
                            {(group.managed_by_me || group.owned_by_me) ? (
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
                    </div>
                  ) : null}

                  <div className="mb-2">
                    <div className="mb-1 flex items-center gap-1 px-2.5">
                      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
                        <Users className="size-3 opacity-70" />
                        {panels.skillsFilterTeam}
                      </div>
                    </div>
                    {teams.length === 0 ? (
                      <p className="px-2.5 py-1 text-[11px] text-muted">
                        {panels.noTeamsToShareSkillGroup}
                      </p>
                    ) : (
                      teams.map((team) => {
                        const remotes = teamRemoteCategories.find(
                          (category) => category.team_id === team.id
                        )
                        return (
                          <div key={team.id} className="mb-2">
                            <div className="flex items-center gap-1 px-2.5 py-0.5">
                              <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-muted">
                                {team.name}
                              </span>
                              <button
                                type="button"
                                className="rounded p-0.5 text-muted hover:bg-hover hover:text-surface"
                                title={panels.createSkillGroup}
                                data-test-id={`add-skill-group-team-${team.id}`}
                                onClick={() => openNewGroupDialog(team.id)}
                              >
                                <Plus className="size-3.5" />
                              </button>
                            </div>
                            {remotes?.groups.map((group) => (
                              <button
                                key={group.id}
                                type="button"
                                data-test-id={`skill-group-${group.id}`}
                                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs ${
                                  selectedGroupId === group.id
                                    ? 'bg-hover font-medium text-surface'
                                    : 'text-muted hover:bg-hover hover:text-surface'
                                }`}
                                onClick={() => selectGroup(group.id)}
                              >
                                <span className="min-w-0 flex-1 truncate">{group.name}</span>
                                <span className="shrink-0 text-[10px] text-muted">
                                  {group.skill_count ?? group.skills?.length ?? 0}
                                </span>
                              </button>
                            ))}
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 px-5">
              <h2 className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                {showingOwnerSkills
                  ? panels.ownerSkills
                  : (selectedGroup?.group.name ?? panels.manageSkills)}
              </h2>
              {canManageSelectedGroup() && !remotesGroup ? (
                <AppMultiSelect
                  className="w-44"
                  label={panels.bindSkillGroupTeams}
                  placeholder={panels.bindSkillGroupTeams}
                  data-test-id="skills-bind-teams"
                  values={[...(selectedGroup?.group.team_ids ?? [])]}
                  options={teams.map((team) => ({ value: team.id, label: team.name }))}
                  onChange={(next) => void setBoundTeams(next)}
                />
              ) : null}
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
              {canManageSelectedGroup() && !remotesGroup ? (
                <AppButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  data-test-id="skills-edit-group"
                  onClick={openEditGroupDialog}
                >
                  {panels.editSkillGroup}
                </AppButton>
              ) : null}
              {!remotesGroup && (showingOwnerSkills || selectedGroup) ? (
                <AppButton
                  color="primary"
                  variant="solid"
                  size="sm"
                  data-test-id="skills-add"
                  disabled={showingOwnerSkills ? ownerGroups.length === 0 : !selectedGroup}
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

            {error ? (
              <p
                role="alert"
                className="border-b border-danger/20 bg-danger/10 px-5 py-2 text-[11px] text-danger"
              >
                {error}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {!showingOwnerSkills && !selectedGroup ? (
                <div className="flex flex-col items-start gap-3 py-10">
                  <p className="text-[12px] text-muted">{panels.noOwnerSkillGroups}</p>
                </div>
              ) : loading ? (
                <p className="text-[11px] text-muted">{panels.loading}</p>
              ) : listSkills.length === 0 ? (
                <div className="flex flex-col items-start gap-3 py-10">
                  <p className="text-[12px] text-muted">
                    {showingOwnerSkills ? panels.noSkills : panels.noSkillsInGroup}
                  </p>
                  {!remotesGroup ? (
                    <AppButton
                      color="primary"
                      variant="solid"
                      size="sm"
                      disabled={showingOwnerSkills && ownerGroups.length === 0}
                      onClick={openCreateSkill}
                    >
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
                              ) : showingOwnerSkills ||
                                (selectedGroup && isOwnerGroup(selectedGroup.group)) ? (
                                <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">
                                  {panels.ownerSkills}
                                </span>
                              ) : null}
                            </span>
                            {skill.description ? (
                              <span className="mt-0.5 block truncate text-[11px] text-muted">
                                {skill.description.split(/\r?\n/).find((line) => line.trim()) ?? ''}
                              </span>
                            ) : null}
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
              <span className="text-[11px] text-muted">{panels.skillName}</span>
              <AppInput
                value={draft.name}
                data-test-id="skill-name"
                aria-invalid={skillNameIssue ? true : undefined}
                onChange={(event) => updateDraftMeta({ name: event.target.value })}
              />
              <span className="text-[10px] text-muted">{panels.skillNameHelp}</span>
              {skillNameIssue ? (
                <span role="alert" className="text-[10px] text-danger">
                  {skillNameIssueMessage(skillNameIssue, panels)}
                </span>
              ) : null}
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
                <span className="text-[10px] text-muted">
                  {isXmlSkillPath(
                    draft.id ? (findEntry(tree, selectedEntryId)?.path ?? 'SKILL.md') : 'SKILL.md'
                  )
                    ? 'XML'
                    : 'Markdown'}
                </span>
              </div>
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                <p className="shrink-0 border-b border-border/40 px-5 py-1.5 text-[10px] text-muted">
                  {panels.skillClipboardXmlHint}
                </p>
                <CodeEditor
                  value={fileDraft}
                  language={
                    isXmlSkillPath(
                      draft.id ? (findEntry(tree, selectedEntryId)?.path ?? 'SKILL.md') : 'SKILL.md'
                    )
                      ? 'xml'
                      : 'markdown'
                  }
                  label={panels.skillContent}
                  resolvePaste={(event) => pasteDesignClipboardAsMarkdown(event.clipboardData)}
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
                      if (draft.id) requestDeleteSkill(draft.id, draft.name)
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
                          skill_key: draft.name,
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
                  disabled={saving || skillNameIssue !== null || !draft.name.trim()}
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
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-muted">{panels.newSkillGroupName}</span>
                    <AppInput
                      autoFocus
                      value={newGroupName}
                      placeholder={panels.newSkillGroupPlaceholder}
                      data-test-id="new-skill-group-name"
                      aria-invalid={newGroupNameIssue ? true : undefined}
                      onChange={(event) => {
                        const value = event.target.value
                        setNewGroupName(value)
                        const checked = validateSkillName(value)
                        setNewGroupNameIssue(checked.ok ? null : checked.issue)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void createGroup()
                      }}
                    />
                    <span className="text-[10px] text-muted">{panels.skillGroupNameHelp}</span>
                    {newGroupNameIssue ? (
                      <span role="alert" className="text-[10px] text-danger">
                        {skillNameIssueMessage(newGroupNameIssue, panels)}
                      </span>
                    ) : null}
                  </label>
                  {error && newGroupOpen && !newGroupNameIssue ? (
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
                    disabled={addingGroup || newGroupNameIssue !== null || !newGroupName.trim()}
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

      {IS_BROWSER && editGroupOpen
        ? createPortal(
            <>
              <div
                data-slot="dialog-overlay"
                className={newGroupDialog.overlay}
                onClick={closeEditGroupDialog}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-skill-group-title"
                data-slot="dialog-content"
                data-test-id="edit-skill-group-dialog"
                className={newGroupDialog.content}
              >
                <header data-slot="dialog-header" className={newGroupDialog.header}>
                  <h2 id="edit-skill-group-title" className={newGroupDialog.title}>
                    {panels.editSkillGroupTitle}
                  </h2>
                  <button
                    type="button"
                    className={newGroupDialog.close}
                    aria-label={dialogs.close}
                    disabled={savingGroup}
                    onClick={closeEditGroupDialog}
                  >
                    <X className="size-3.5" />
                  </button>
                </header>
                <div data-slot="dialog-body" className={`${newGroupDialog.body} flex flex-col gap-3`}>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-muted">{panels.newSkillGroupName}</span>
                    <AppInput
                      autoFocus
                      value={editGroupName}
                      data-test-id="edit-skill-group-name"
                      aria-invalid={editGroupNameIssue ? true : undefined}
                      onChange={(event) => {
                        const value = event.target.value
                        setEditGroupName(value)
                        const checked = validateSkillName(value)
                        setEditGroupNameIssue(checked.ok ? null : checked.issue)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void saveGroup()
                      }}
                    />
                    <span className="text-[10px] text-muted">{panels.skillGroupNameHelp}</span>
                    {editGroupNameIssue ? (
                      <span role="alert" className="text-[10px] text-danger">
                        {skillNameIssueMessage(editGroupNameIssue, panels)}
                      </span>
                    ) : null}
                  </label>
                  <div className="space-y-2 rounded-lg border border-border/60 p-3">
                    <p className="text-[12px] font-medium">{panels.skillGroupManagers}</p>
                    {groupManagers.length === 0 ? (
                      <p className="text-[11px] text-muted">—</p>
                    ) : (
                      <ul className="space-y-1">
                        {groupManagers.map((id) => (
                          <li
                            key={id}
                            className="flex items-center gap-2 rounded-md bg-hover/40 px-2 py-1"
                          >
                            <span className="min-w-0 flex-1 truncate font-mono text-[11px]">
                              {id}
                            </span>
                            <button
                              type="button"
                              className="shrink-0 text-[11px] text-muted hover:text-danger"
                              disabled={managerBusy || groupManagers.length <= 1}
                              data-test-id={`skill-group-remove-manager-${id}`}
                              onClick={() => void removeGroupManager(id)}
                            >
                              {panels.skillGroupRemoveManager}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-2">
                        <AppInput
                          className="min-w-0 flex-1"
                          placeholder={panels.skillGroupManagerUsername}
                          value={managerUsername}
                          data-test-id="skill-group-manager-username"
                          aria-invalid={managerError ? true : undefined}
                          onChange={(event) => {
                            setManagerUsername(event.target.value)
                            if (managerError) setManagerError('')
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') void addGroupManager()
                          }}
                        />
                        <AppButton
                          color="neutral"
                          variant="ghost"
                          size="sm"
                          disabled={managerBusy || !managerUsername.trim()}
                          data-test-id="skill-group-add-manager"
                          onClick={() => void addGroupManager()}
                        >
                          {panels.skillGroupAddManager}
                        </AppButton>
                      </div>
                      <span className="text-[10px] text-muted">
                        {panels.skillGroupManagerUsernameHelp}
                      </span>
                      {managerError ? (
                        <span role="alert" className="text-[10px] text-danger">
                          {managerError}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {error && editGroupOpen && !editGroupNameIssue && !managerError ? (
                    <p role="alert" className="text-[11px] text-danger">
                      {error}
                    </p>
                  ) : null}
                </div>
                <footer data-slot="dialog-footer" className={newGroupDialog.footer}>
                  <AppButton variant="ghost" disabled={savingGroup} onClick={closeEditGroupDialog}>
                    {panels.cancel}
                  </AppButton>
                  <AppButton
                    color="primary"
                    variant="solid"
                    disabled={savingGroup || editGroupNameIssue !== null || !editGroupName.trim()}
                    data-test-id="edit-skill-group-confirm"
                    onClick={() => void saveGroup()}
                  >
                    {savingGroup ? panels.savingSkill : panels.updateSkill}
                  </AppButton>
                </footer>
              </div>
            </>,
            document.body
          )
        : null}

      {IS_BROWSER && deleteSkillTarget
        ? createPortal(
            <>
              <div
                data-slot="dialog-overlay"
                className={deleteSkillDialog.overlay}
                onClick={() => {
                  if (!deletingSkill) setDeleteSkillTarget(null)
                }}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-skill-title"
                data-slot="dialog-content"
                data-test-id="delete-skill-dialog"
                className={deleteSkillDialog.content}
              >
                <header data-slot="dialog-header" className={deleteSkillDialog.header}>
                  <h2 id="delete-skill-title" className={deleteSkillDialog.title}>
                    {panels.deleteSkillConfirmTitle}
                  </h2>
                  <button
                    type="button"
                    className={deleteSkillDialog.close}
                    aria-label={dialogs.close}
                    disabled={deletingSkill}
                    onClick={() => setDeleteSkillTarget(null)}
                  >
                    <X className="size-3.5" />
                  </button>
                </header>
                <div data-slot="dialog-body" className={deleteSkillDialog.body}>
                  <p className="text-xs leading-relaxed text-surface">
                    {panels.deleteSkillConfirm({ name: deleteSkillTarget.name })}
                  </p>
                  {error ? (
                    <p role="alert" className="mt-2 text-[11px] text-danger">
                      {error}
                    </p>
                  ) : null}
                </div>
                <footer data-slot="dialog-footer" className={deleteSkillDialog.footer}>
                  <AppButton
                    variant="ghost"
                    disabled={deletingSkill}
                    onClick={() => setDeleteSkillTarget(null)}
                  >
                    {panels.cancel}
                  </AppButton>
                  <AppButton
                    color="error"
                    variant="solid"
                    disabled={deletingSkill}
                    data-test-id="delete-skill-confirm"
                    onClick={() => void confirmDeleteSkill()}
                  >
                    {deletingSkill ? panels.savingSkill : panels.deleteSkillConfirmAction}
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
