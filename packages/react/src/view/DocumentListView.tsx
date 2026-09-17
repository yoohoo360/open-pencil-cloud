import { OssCoverImage } from '#react/app/document/oss-cover'
import { readStoredUser } from '#react/app/auth/storage'
import type { DocumentPermissionRequest } from '#react/app/document/access'
import {
  authAPI,
  documentAPI,
  getAPIErrorMessage,
  inboxAPI,
  invitationAPI,
  orgAPI,
  teamAPI,
  userAPI,
  type MembershipInvitation,
  type OrganizationSummary,
  type PencilDocument,
  type TeamSummary
} from '#react/lib/client'
import {
  Bell,
  Building2,
  ChevronDown,
  Clock3,
  File,
  FileText,
  FolderOpen,
  LoaderCircle,
  LogOut,
  Pencil,
  Plus,
  Settings,
  Shield,
  Trash2,
  Users,
  X
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

type NavId = 'recents' | 'drafts' | 'all-teams' | 'trash' | string

type MemberChip = {
  id: string
  label: string
}

const ACTIVE_ORG_KEY = 'open-pencil.active-org-id'

const TEAM_COLORS = [
  'bg-[#0d99ff]',
  'bg-[#7b61ff]',
  'bg-[#1bc47d]',
  'bg-[#f24822]',
  'bg-[#ffcd29]',
  'bg-[#e05a33]'
]

function toMillis(value: string | number | undefined): number {
  if (typeof value === 'number') return value
  if (!value) return 0
  const parsed = Date.parse(String(value))
  return Number.isNaN(parsed) ? 0 : parsed
}

function formatEdited(timestamp: string | number | undefined): string {
  const millis = toMillis(timestamp)
  if (!millis) return ''
  const days = Math.floor((Date.now() - millis) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Edited today'
  if (days === 1) return 'Edited yesterday'
  if (days < 30) return `Edited ${days} days ago`
  return new Date(millis).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatOpened(timestamp: string | number | undefined): string {
  const millis = toMillis(timestamp)
  if (!millis) return ''
  const days = Math.floor((Date.now() - millis) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Opened today'
  if (days === 1) return 'Opened yesterday'
  if (days < 30) return `Opened ${days} days ago`
  return new Date(millis).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function teamInitial(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : 'T'
}

function teamColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return TEAM_COLORS[hash % TEAM_COLORS.length]!
}

/** Normalize CHAR(36)/UUID ids — DB may pad with spaces. */
function normalizeOrgId(id: string | null | undefined): string {
  return id?.trim() ?? ''
}

function readStoredOrgId(): string {
  try {
    return normalizeOrgId(localStorage.getItem(ACTIVE_ORG_KEY))
  } catch {
    return ''
  }
}

function writeStoredOrgId(id: string) {
  try {
    const normalized = normalizeOrgId(id)
    if (normalized) localStorage.setItem(ACTIVE_ORG_KEY, normalized)
    else localStorage.removeItem(ACTIVE_ORG_KEY)
  } catch {
    /* ignore */
  }
}

function pickRandomOrgId(list: OrganizationSummary[]): string {
  if (!list.length) return ''
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return normalizeOrgId(list[bytes[0]! % list.length]!.id)
}

/**
 * After /api/orgs/mine succeeds: keep cached org if it is still in the list;
 * otherwise pick a random org and persist it.
 */
function resolveActiveOrgId(
  list: Array<{ id: string }>,
  storedId: string
): { orgId: string; changed: boolean } {
  if (!list.length) return { orgId: '', changed: Boolean(normalizeOrgId(storedId)) }
  const cached = normalizeOrgId(storedId)
  const matched = cached
    ? list.find((org) => normalizeOrgId(org.id) === cached)
    : undefined
  if (matched) {
    return { orgId: normalizeOrgId(matched.id), changed: false }
  }
  return { orgId: pickRandomOrgId(list as OrganizationSummary[]), changed: true }
}

export default function DocumentListView() {
  const navigate = useNavigate()
  const [nav, setNav] = useState<NavId>('recents')
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [orgMenuOpen, setOrgMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [files, setFiles] = useState<PencilDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showCreateFile, setShowCreateFile] = useState(false)
  const [fileName, setFileName] = useState('')
  const [fileBusy, setFileBusy] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [editingOrg, setEditingOrg] = useState<OrganizationSummary | null>(null)
  const [orgName, setOrgName] = useState('')
  const [orgDescription, setOrgDescription] = useState('')
  const [orgBusy, setOrgBusy] = useState(false)
  const [orgError, setOrgError] = useState<string | null>(null)

  const [showTransfer, setShowTransfer] = useState(false)
  const [transferOwner, setTransferOwner] = useState('')
  const [transferBusy, setTransferBusy] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)

  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [editingTeam, setEditingTeam] = useState<TeamSummary | null>(null)
  const [teamStep, setTeamStep] = useState<1 | 2 | 3>(1)
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [memberInput, setMemberInput] = useState('')
  const [members, setMembers] = useState<MemberChip[]>([])
  const [teamBusy, setTeamBusy] = useState(false)
  const [teamError, setTeamError] = useState<string | null>(null)

  const [inboxOpen, setInboxOpen] = useState(false)
  const [invitations, setInvitations] = useState<MembershipInvitation[]>([])
  const [accessRequests, setAccessRequests] = useState<DocumentPermissionRequest[]>([])
  const [inboxBusy, setInboxBusy] = useState(false)

  const [deleteTeam, setDeleteTeam] = useState<TeamSummary | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const currentUserId = readStoredUser()?.id?.trim() ?? ''
  const selectedOrg = orgs.find((org) => normalizeOrgId(org.id) === selectedOrgId) ?? null
  const inboxCount = invitations.length + accessRequests.length

  const title = useMemo(() => {
    if (nav === 'recents') return 'Recents'
    if (nav === 'drafts') return 'Drafts'
    if (nav === 'all-teams') return 'All teams'
    if (nav === 'trash') return 'Trash'
    return teams.find((team) => team.id === nav)?.name ?? 'Team'
  }, [nav, teams])

  function selectOrg(id: string) {
    const normalized = normalizeOrgId(id)
    setSelectedOrgId(normalized)
    writeStoredOrgId(normalized)
    setOrgMenuOpen(false)
    setNav('all-teams')
  }

  async function refreshOrgs() {
    try {
      const res = await orgAPI.mine()
      const list = res.data ?? []
      setOrgs(list)
      const storedId = readStoredOrgId()
      const { orgId, changed } = resolveActiveOrgId(list, storedId)
      setSelectedOrgId(orgId)
      // Only rewrite cache when selection actually changes (avoid churn).
      if (changed) writeStoredOrgId(orgId)
    } catch {
      setOrgs([])
    }
  }

  async function refreshTeams() {
    if (!selectedOrgId) {
      setTeams([])
      return
    }
    try {
      const res = await teamAPI.myTeams({ org_id: selectedOrgId })
      setTeams(res.data ?? [])
    } catch {
      setTeams([])
    }
  }

  async function refreshInbox() {
    try {
      const [inviteRes, accessRes] = await Promise.all([
        invitationAPI.mine(),
        inboxAPI.pendingAccessRequests()
      ])
      setInvitations(inviteRes.data ?? [])
      setAccessRequests(accessRes.data ?? [])
    } catch {
      setInvitations([])
      setAccessRequests([])
    }
  }

  async function refreshFiles() {
    if (nav === 'all-teams' || nav === 'trash') {
      setFiles([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (nav === 'recents') {
        const res = await documentAPI.list({ recent: true })
        const sorted = [...(res.data ?? [])].sort(
          (a, b) => toMillis(b.last_opened_at ?? b.updated_at) - toMillis(a.last_opened_at ?? a.updated_at)
        )
        setFiles(sorted.slice(0, 40))
      } else if (nav === 'drafts') {
        const res = await documentAPI.list({ personal: true })
        setFiles(res.data ?? [])
      } else {
        const res = await documentAPI.list({ team_id: nav })
        setFiles(res.data ?? [])
      }
    } catch (reason) {
      setError(getAPIErrorMessage(reason))
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshOrgs()
    void userAPI
      .me()
      .then((res) => setIsAdmin(Boolean(res.data?.is_admin)))
      .catch(() => setIsAdmin(false))
  }, [])

  useEffect(() => {
    void refreshTeams()
  }, [selectedOrgId])

  useEffect(() => {
    void refreshFiles()
  }, [nav])

  useEffect(() => {
    let cancelled = false
    async function tick() {
      try {
        const [inviteRes, accessRes] = await Promise.all([
          invitationAPI.mine(),
          inboxAPI.pendingAccessRequests()
        ])
        if (cancelled) return
        setInvitations(inviteRes.data ?? [])
        setAccessRequests(accessRes.data ?? [])
      } catch {
        if (!cancelled) {
          setInvitations([])
          setAccessRequests([])
        }
      }
    }
    void tick()
    const timer = window.setInterval(() => void tick(), 20_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const visibleFiles = useMemo(() => {
    const list = [...files]
    list.sort((a, b) => toMillis(b.updated_at) - toMillis(a.updated_at))
    return list
  }, [files])

  async function handleCreateFile(event: FormEvent) {
    event.preventDefault()
    if (!fileName.trim()) {
      setFileError('Please enter a file name')
      return
    }
    setFileBusy(true)
    setFileError(null)
    try {
      const teamId =
        nav !== 'drafts' && nav !== 'recents' && nav !== 'all-teams' && nav !== 'trash'
          ? nav
          : undefined
      const res = await documentAPI.create({
        name: fileName.trim(),
        team_id: teamId
      })
      if (res.success && res.data) void navigate(`/design/${res.data.key}`)
    } catch (reason) {
      setFileError(getAPIErrorMessage(reason))
    } finally {
      setFileBusy(false)
    }
  }

  async function handleDeleteFile(key: string) {
    if (!confirm('Delete this file?')) return
    try {
      await documentAPI.delete(key)
      await refreshFiles()
    } catch (reason) {
      alert(getAPIErrorMessage(reason))
    }
  }

  function openCreateOrg() {
    setEditingOrg(null)
    setOrgName('')
    setOrgDescription('')
    setOrgError(null)
    setShowCreateOrg(true)
  }

  function openEditOrg(org?: OrganizationSummary | null) {
    const target = org ?? selectedOrg
    if (!target) return
    setEditingOrg(target)
    setOrgName(target.name)
    setOrgDescription(target.description ?? '')
    setOrgError(null)
    setShowCreateOrg(true)
  }

  async function submitOrgForm(event: FormEvent) {
    event.preventDefault()
    if (!orgName.trim()) {
      setOrgError('Organization name is required')
      return
    }
    setOrgBusy(true)
    setOrgError(null)
    try {
      if (editingOrg) {
        await orgAPI.update(editingOrg.id, {
          name: orgName.trim(),
          description: orgDescription.trim() || undefined
        })
        setShowCreateOrg(false)
        await refreshOrgs()
      } else {
        const res = await orgAPI.create({
          name: orgName.trim(),
          description: orgDescription.trim() || undefined
        })
        setShowCreateOrg(false)
        await refreshOrgs()
        if (res.data?.id) selectOrg(res.data.id)
      }
    } catch (reason) {
      setOrgError(
        getAPIErrorMessage(
          reason,
          editingOrg ? 'Could not update organization' : 'Could not create organization'
        )
      )
    } finally {
      setOrgBusy(false)
    }
  }

  async function submitTransfer(event: FormEvent) {
    event.preventDefault()
    if (!selectedOrgId || !transferOwner.trim()) {
      setTransferError('Enter username or email')
      return
    }
    setTransferBusy(true)
    setTransferError(null)
    try {
      await orgAPI.transfer(selectedOrgId, transferOwner.trim())
      setShowTransfer(false)
      await refreshOrgs()
    } catch (reason) {
      setTransferError(getAPIErrorMessage(reason, 'Could not transfer ownership'))
    } finally {
      setTransferBusy(false)
    }
  }

  function openCreateTeam() {
    if (!selectedOrgId) {
      alert('Create or select an organization first')
      openCreateOrg()
      return
    }
    setEditingTeam(null)
    setTeamStep(1)
    setTeamName('')
    setTeamDescription('')
    setMemberInput('')
    setMembers([])
    setTeamError(null)
    setShowCreateTeam(true)
  }

  function openEditTeam(team: TeamSummary) {
    setEditingTeam(team)
    setTeamName(team.name)
    setTeamDescription(team.description ?? '')
    setTeamError(null)
    setShowCreateTeam(false)
  }

  function addMemberChip() {
    const value = memberInput.trim()
    if (!value) return
    if (members.some((member) => member.label.toLowerCase() === value.toLowerCase())) {
      setMemberInput('')
      return
    }
    setMembers((prev) => [...prev, { id: value, label: value }])
    setMemberInput('')
  }

  async function submitCreateTeam() {
    if (!teamName.trim()) {
      setTeamError('Add a name')
      setTeamStep(1)
      return
    }
    if (!selectedOrgId) {
      setTeamError('Select an organization first')
      return
    }
    setTeamBusy(true)
    setTeamError(null)
    try {
      const res = await teamAPI.create({
        name: teamName.trim(),
        parent_id: selectedOrgId
      })
      if (res.data?.id && members.length) {
        await Promise.allSettled(
          members.map((member) =>
            invitationAPI.create({
              target_type: 'team',
              target_id: res.data!.id,
              invitee: member.label,
              role: 'member'
            })
          )
        )
      }
      setShowCreateTeam(false)
      await refreshTeams()
      if (res.data?.id) setNav(res.data.id)
    } catch (reason) {
      setTeamError(getAPIErrorMessage(reason, 'Could not create team'))
    } finally {
      setTeamBusy(false)
    }
  }

  async function submitEditTeam(event: FormEvent) {
    event.preventDefault()
    if (!editingTeam) return
    if (!teamName.trim()) {
      setTeamError('Add a name')
      return
    }
    setTeamBusy(true)
    setTeamError(null)
    try {
      await teamAPI.update(editingTeam.id, {
        name: teamName.trim(),
        description: teamDescription.trim() || undefined
      })
      setEditingTeam(null)
      await refreshTeams()
    } catch (reason) {
      setTeamError(getAPIErrorMessage(reason, 'Could not update team'))
    } finally {
      setTeamBusy(false)
    }
  }

  function openDeleteTeam(team: TeamSummary) {
    setDeleteTeam(team)
    setDeleteConfirmName('')
    setDeleteError(null)
  }

  async function submitDeleteTeam() {
    if (!deleteTeam) return
    if (deleteConfirmName.trim() !== deleteTeam.name) {
      setDeleteError('Type the team name exactly to confirm')
      return
    }
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await teamAPI.delete(deleteTeam.id)
      if (nav === deleteTeam.id) setNav('all-teams')
      setDeleteTeam(null)
      await refreshTeams()
    } catch (reason) {
      setDeleteError(getAPIErrorMessage(reason, 'Failed to delete team'))
    } finally {
      setDeleteBusy(false)
    }
  }

  const isOrgOwner =
    Boolean(selectedOrg) &&
    Boolean(currentUserId) &&
    Boolean(selectedOrg?.owner_id) &&
    currentUserId === selectedOrg?.owner_id?.trim()

  const navItemClass = (id: NavId) =>
    `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition ${
      nav === id
        ? 'bg-hover font-medium text-surface shadow-sm'
        : 'text-muted hover:bg-hover/70 hover:text-surface'
    }`

  return (
    <main className="flex h-full min-h-0 flex-col bg-canvas text-surface" data-test-id="file-workspace">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4">
        <div className="relative">
          <button
            type="button"
            className="flex max-w-[220px] items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-hover"
            onClick={() => setOrgMenuOpen((open) => !open)}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
              <Building2 className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">
              {selectedOrg?.name || 'Select organization'}
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-muted" />
          </button>
          {orgMenuOpen ? (
            <div className="absolute left-0 z-40 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-canvas shadow-xl">
              <div className="max-h-56 overflow-y-auto py-1">
                {orgs.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-hover ${
                      normalizeOrgId(org.id) === selectedOrgId ? 'bg-hover font-medium' : ''
                    }`}
                    onClick={() => selectOrg(org.id)}
                  >
                    <Building2 className="size-3.5 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate">{org.name}</span>
                  </button>
                ))}
                {orgs.length === 0 ? (
                  <p className="px-3 py-2 text-[11px] text-muted">No organizations yet</p>
                ) : null}
              </div>
              <div className="border-t border-border p-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-accent hover:bg-accent/10"
                  onClick={() => {
                    setOrgMenuOpen(false)
                    openCreateOrg()
                  }}
                >
                  <Plus className="size-3.5" />
                  Create organization
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <button
              type="button"
              className="relative flex size-9 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-surface"
              aria-label="Notifications"
              onClick={() => setInboxOpen((open) => !open)}
            >
              <Bell className="size-4" />
              {inboxCount > 0 ? (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                  {inboxCount > 99 ? '99+' : inboxCount}
                </span>
              ) : null}
            </button>
            {inboxOpen ? (
              <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-canvas shadow-xl">
                <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                  <span className="text-xs font-semibold">Messages</span>
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted hover:bg-hover"
                    onClick={() => setInboxOpen(false)}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {inboxCount === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-muted">No pending items</p>
                  ) : (
                    <>
                      {invitations.map((item) => (
                        <div
                          key={`inv-${item.id}`}
                          className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2.5 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">
                              {item.inviter_name || item.inviter_username || 'Someone'} invited you
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-muted">
                              {item.target_type} ·{' '}
                              {item.target_name || item.target_key || item.target_id}
                              {item.role ? ` · ${item.role}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              disabled={inboxBusy}
                              className="rounded-md bg-accent px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50"
                              onClick={() => {
                                setInboxBusy(true)
                                void invitationAPI
                                  .accept(item.id)
                                  .then(() => refreshInbox())
                                  .then(() => {
                                    if (item.target_type === 'organization') void refreshOrgs()
                                    if (item.target_type === 'team') void refreshTeams()
                                  })
                                  .catch((reason) => alert(getAPIErrorMessage(reason)))
                                  .finally(() => setInboxBusy(false))
                              }}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={inboxBusy}
                              className="rounded-md px-2 py-1 text-[10px] text-danger hover:bg-danger/10 disabled:opacity-50"
                              onClick={() => {
                                setInboxBusy(true)
                                void invitationAPI
                                  .reject(item.id)
                                  .then(() => refreshInbox())
                                  .catch((reason) => alert(getAPIErrorMessage(reason)))
                                  .finally(() => setInboxBusy(false))
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                      {accessRequests.map((item) => (
                        <div
                          key={`req-${item.id}`}
                          className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2.5 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">
                              {item.requester_name ||
                                item.requester_username ||
                                item.requester_email ||
                                'Someone'}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-muted">
                              wants {item.requested_role} on{' '}
                              {item.resource_name || item.resource_key || 'a file'}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              disabled={inboxBusy || !item.resource_key}
                              className="rounded-md bg-accent px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50"
                              onClick={() => {
                                if (!item.resource_key) return
                                setInboxBusy(true)
                                void documentAPI
                                  .approveAccessRequest(item.resource_key, item.id)
                                  .then(() => refreshInbox())
                                  .catch((reason) => alert(getAPIErrorMessage(reason)))
                                  .finally(() => setInboxBusy(false))
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={inboxBusy || !item.resource_key}
                              className="rounded-md px-2 py-1 text-[10px] text-danger hover:bg-danger/10 disabled:opacity-50"
                              onClick={() => {
                                if (!item.resource_key) return
                                setInboxBusy(true)
                                void documentAPI
                                  .rejectAccessRequest(item.resource_key, item.id)
                                  .then(() => refreshInbox())
                                  .catch((reason) => alert(getAPIErrorMessage(reason)))
                                  .finally(() => setInboxBusy(false))
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-surface"
            aria-label="Log out"
            onClick={() => void authAPI.logout().then(() => navigate('/login'))}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-border/60 bg-canvas">
          <nav className="space-y-0.5 px-2 pt-3 pb-2">
            <button type="button" className={navItemClass('recents')} onClick={() => setNav('recents')}>
              <Clock3 className="size-3.5 opacity-70" />
              Recents
            </button>
            <button type="button" className={navItemClass('drafts')} onClick={() => setNav('drafts')}>
              <FileText className="size-3.5 opacity-70" />
              Drafts
            </button>
            <button
              type="button"
              className={navItemClass('all-teams')}
              onClick={() => setNav('all-teams')}
            >
              <Users className="size-3.5 opacity-70" />
              All teams
            </button>
            <button type="button" className={navItemClass('trash')} onClick={() => setNav('trash')}>
              <Trash2 className="size-3.5 opacity-70" />
              Trash
            </button>
          </nav>

          <div className="mx-3 border-t border-border/60" />

          <div className="flex min-h-0 flex-1 flex-col px-2 pt-3 pb-2">
            <div className="mb-1.5 flex items-center justify-between px-2.5">
              <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                Your teams
              </span>
              <button
                type="button"
                className="rounded-md p-1 text-muted hover:bg-hover hover:text-surface"
                title="Create team"
                onClick={openCreateTeam}
              >
                <Plus className="size-3.5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
              {!selectedOrgId ? (
                <p className="px-2.5 py-3 text-[11px] leading-relaxed text-muted">
                  Create an organization to start adding teams.
                </p>
              ) : teams.length === 0 ? (
                <p className="px-2.5 py-3 text-[11px] text-muted">No teams in this organization yet.</p>
              ) : (
                teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    className={navItemClass(team.id)}
                    onClick={() => setNav(team.id)}
                  >
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-white ${teamColor(team.id)}`}
                    >
                      {teamInitial(team.name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{team.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-canvas">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 px-6">
            <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
            <div className="ml-auto flex items-center gap-2">
              {nav !== 'trash' && nav !== 'all-teams' && nav !== 'recents' && nav !== 'drafts' ? (
                (() => {
                  const activeTeam = teams.find((team) => team.id === nav)
                  const isOwner =
                    activeTeam &&
                    currentUserId &&
                    activeTeam.owner_id &&
                    currentUserId === activeTeam.owner_id.trim()
                  return isOwner && activeTeam ? (
                    <>
                      <button
                        type="button"
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-hover hover:text-surface"
                        onClick={() => openEditTeam(activeTeam)}
                      >
                        Edit team
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
                        onClick={() => openDeleteTeam(activeTeam)}
                      >
                        Delete team
                      </button>
                    </>
                  ) : null
                })()
              ) : null}
              {nav !== 'trash' && nav !== 'all-teams' ? (
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-accent/90"
                  onClick={() => {
                    setFileName('')
                    setFileError(null)
                    setShowCreateFile(true)
                  }}
                >
                  <Plus className="size-3.5" />
                  New file
                </button>
              ) : null}
              {nav === 'all-teams' ? (
                <>
                  {isOrgOwner ? (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-hover hover:text-surface"
                      onClick={() => openEditOrg()}
                    >
                      <Settings className="size-3.5" />
                      Organization settings
                    </button>
                  ) : null}
                  {isAdmin ? (
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-surface"
                      title="Manage all organizations"
                      onClick={() => void navigate('/admin/orgs')}
                    >
                      <Shield className="size-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-accent/90"
                    onClick={openCreateTeam}
                  >
                    <Plus className="size-3.5" />
                    Create team
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {error ? (
              <p className="mb-4 text-xs text-danger" role="alert">
                {error}
              </p>
            ) : null}

            {nav === 'all-teams' ? (
            <AllTeamsPanel
              teams={teams}
              orgName={selectedOrg?.name}
              currentUserId={currentUserId}
              onOpenTeam={(id) => setNav(id)}
              onEditTeam={openEditTeam}
              onDeleteTeam={openDeleteTeam}
            />
            ) : null}

            {nav === 'trash' ? (
              <EmptyState
                icon={Trash2}
                title="Trash is empty"
                description="Deleted files will show up here."
              />
            ) : null}

            {nav !== 'all-teams' && nav !== 'trash' ? (
              loading ? (
                <div className="flex h-48 items-center justify-center">
                  <LoaderCircle className="size-5 animate-spin text-muted" />
                </div>
              ) : visibleFiles.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
                  {visibleFiles.map((file) => (
                    <FileCard
                      key={file.key}
                      file={file}
                      showOpened={nav === 'recents'}
                      onOpen={() => void navigate(`/design/${file.key}`)}
                      onDelete={
                        file.capabilities?.includes('delete')
                          ? () => void handleDeleteFile(file.key)
                          : undefined
                      }
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={FolderOpen}
                  title="No files yet"
                  description="Create a file to get started."
                  action={{
                    label: 'New file',
                    onClick: () => {
                      setFileName('')
                      setFileError(null)
                      setShowCreateFile(true)
                    }
                  }}
                />
              )
            ) : null}
          </div>
        </section>
      </div>

      {showCreateOrg ? (
        <Modal
          title={editingOrg ? 'Organization settings' : 'Create organization'}
          onClose={() => setShowCreateOrg(false)}
        >
          <form className="space-y-4" onSubmit={(event) => void submitOrgForm(event)}>
            <label className="block text-xs font-medium">
              Name
              <input
                value={orgName}
                autoFocus
                placeholder="Organization display name"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
                onChange={(event) => setOrgName(event.target.value)}
              />
            </label>
            {editingOrg ? (
              <label className="block text-xs font-medium">
                Org code
                <input
                  value={editingOrg.org_code ?? ''}
                  disabled
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-hover/40 px-3 font-mono text-sm text-muted"
                />
              </label>
            ) : null}
            <label className="block text-xs font-medium">
              Description
              <textarea
                value={orgDescription}
                rows={3}
                placeholder="Optional"
                className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:border-accent focus:outline-none"
                onChange={(event) => setOrgDescription(event.target.value)}
              />
            </label>
            <p className="text-[11px] leading-relaxed text-muted">
              Display names can repeat. Org code is generated automatically and cannot be changed.
            </p>
            {editingOrg ? (
              <button
                type="button"
                className="text-[12px] text-muted underline-offset-2 hover:text-surface hover:underline"
                onClick={() => {
                  setShowCreateOrg(false)
                  setTransferOwner('')
                  setTransferError(null)
                  setShowTransfer(true)
                }}
              >
                Transfer ownership…
              </button>
            ) : null}
            {orgError ? <p className="text-xs text-danger">{orgError}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-hover"
                onClick={() => setShowCreateOrg(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={orgBusy}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {orgBusy ? 'Saving…' : editingOrg ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {showTransfer ? (
        <Modal title="Transfer ownership" onClose={() => setShowTransfer(false)}>
          <form className="space-y-4" onSubmit={(event) => void submitTransfer(event)}>
            <p className="text-[13px] leading-relaxed text-muted">
              Transfer{' '}
              <span className="font-medium text-surface">
                {selectedOrg?.name}
              </span>{' '}
              to another user. You will remain an admin.
            </p>
            <label className="block text-xs font-medium">
              New owner
              <input
                value={transferOwner}
                autoFocus
                placeholder="Username or email"
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
                onChange={(event) => setTransferOwner(event.target.value)}
              />
            </label>
            {transferError ? <p className="text-xs text-danger">{transferError}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-hover"
                onClick={() => setShowTransfer(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={transferBusy}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {transferBusy ? 'Transferring…' : 'Transfer'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {showCreateFile ? (
        <Modal title="New file" onClose={() => setShowCreateFile(false)}>
          <form className="space-y-4" onSubmit={(event) => void handleCreateFile(event)}>
            <label className="block text-xs font-medium">
              Name
              <input
                value={fileName}
                autoFocus
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
                onChange={(event) => setFileName(event.target.value)}
              />
            </label>
            {fileError ? <p className="text-xs text-danger">{fileError}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-hover"
                onClick={() => setShowCreateFile(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={fileBusy}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {fileBusy ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {showCreateTeam ? (
        <Modal title="Create a team" onClose={() => setShowCreateTeam(false)} wide>
          <div className="mb-5 flex gap-2 text-[11px]">
            {(
              [
                [1, 'Name your team'],
                [2, 'Invite members'],
                [3, 'Finish setup']
              ] as const
            ).map(([step, label]) => (
              <div
                key={step}
                className={`flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2 ${
                  teamStep === step ? 'bg-accent/10 text-accent' : 'bg-hover/40 text-muted'
                }`}
              >
                <span
                  className={`flex size-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                    teamStep === step ? 'bg-accent text-white' : 'bg-muted/40'
                  }`}
                >
                  {step}
                </span>
                <span className="truncate">{label}</span>
              </div>
            ))}
          </div>

          {teamStep === 1 ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium">
                Team name
                <input
                  value={teamName}
                  autoFocus
                  placeholder="Add a name"
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
                  onChange={(event) => setTeamName(event.target.value)}
                />
              </label>
              <p className="text-[11px] leading-relaxed text-muted">
                This team will belong to{' '}
                <span className="font-medium text-surface">
                  {selectedOrg?.name || 'your organization'}
                </span>
                .
              </p>
            </div>
          ) : null}

          {teamStep === 2 ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium">
                Invite team members
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={memberInput}
                    placeholder="Username or email"
                    className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
                    onChange={(event) => setMemberInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addMemberChip()
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="rounded-lg border border-border px-3 text-xs hover:bg-hover"
                    onClick={addMemberChip}
                  >
                    Add
                  </button>
                </div>
              </label>
              {members.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {members.map((member) => (
                    <span
                      key={member.id}
                      className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] text-accent"
                    >
                      {member.label}
                      <button
                        type="button"
                        className="text-accent/70 hover:text-accent"
                        onClick={() =>
                          setMembers((prev) => prev.filter((item) => item.id !== member.id))
                        }
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted">
                  Optional — they will receive an invitation to accept.
                </p>
              )}
            </div>
          ) : null}

          {teamStep === 3 ? (
            <div className="space-y-2 rounded-xl bg-hover/40 p-4 text-[13px]">
              <p>
                <span className="text-muted">Organization</span> ·{' '}
                {selectedOrg?.name}
              </p>
              <p>
                <span className="text-muted">Team</span> · {teamName.trim() || 'Untitled team'}
              </p>
              <p>
                <span className="text-muted">Invites</span> · {members.length}
              </p>
              {members.length > 0 ? (
                <p className="text-[11px] text-muted">{members.map((m) => m.label).join(', ')}</p>
              ) : null}
              <p className="pt-2 text-[11px] leading-relaxed text-muted">
                Invited people must accept before they join the team.
              </p>
            </div>
          ) : null}

          {teamError ? <p className="mt-3 text-xs text-danger">{teamError}</p> : null}

          <div className="mt-6 flex justify-between gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-hover disabled:opacity-40"
              disabled={teamStep === 1 || teamBusy}
              onClick={() => setTeamStep((step) => (step === 1 ? 1 : ((step - 1) as 1 | 2 | 3)))}
            >
              Back
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-hover"
                onClick={() => setShowCreateTeam(false)}
              >
                Cancel
              </button>
              {teamStep < 3 ? (
                <button
                  type="button"
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white"
                  onClick={() => {
                    if (teamStep === 1 && !teamName.trim()) {
                      setTeamError('Add a name')
                      return
                    }
                    setTeamError(null)
                    setTeamStep((step) => (step + 1) as 1 | 2 | 3)
                  }}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  disabled={teamBusy}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  onClick={() => void submitCreateTeam()}
                >
                  {teamBusy ? 'Creating…' : 'Create team'}
                </button>
              )}
            </div>
          </div>
        </Modal>
      ) : null}

      {editingTeam ? (
        <Modal title="Edit team" onClose={() => setEditingTeam(null)}>
          <form className="space-y-4" onSubmit={(event) => void submitEditTeam(event)}>
            <label className="block text-xs font-medium">
              Team name
              <input
                value={teamName}
                autoFocus
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
                onChange={(event) => setTeamName(event.target.value)}
              />
            </label>
            <label className="block text-xs font-medium">
              Description
              <textarea
                value={teamDescription}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:border-accent focus:outline-none"
                onChange={(event) => setTeamDescription(event.target.value)}
              />
            </label>
            <p className="text-[11px] leading-relaxed text-muted">
              Team names only need to be unique inside this organization.
            </p>
            {teamError ? <p className="text-xs text-danger">{teamError}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-hover"
                onClick={() => setEditingTeam(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={teamBusy}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {teamBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleteTeam ? (
        <Modal title="Delete team" onClose={() => setDeleteTeam(null)}>
          <div className="space-y-4">
            <p className="text-[13px] leading-relaxed text-muted">
              This will permanently delete <span className="font-medium text-surface">{deleteTeam.name}</span>
              . Type the team name to confirm.
            </p>
            <label className="block text-xs font-medium">
              Team name
              <input
                value={deleteConfirmName}
                autoFocus
                placeholder={deleteTeam.name}
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
                onChange={(event) => setDeleteConfirmName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void submitDeleteTeam()
                  }
                }}
              />
            </label>
            {deleteError ? <p className="text-xs text-danger">{deleteError}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-hover"
                onClick={() => setDeleteTeam(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteBusy || deleteConfirmName.trim() !== deleteTeam.name}
                className="rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                onClick={() => void submitDeleteTeam()}
              >
                {deleteBusy ? 'Deleting…' : 'Delete team'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

    </main>
  )
}
function AllTeamsPanel({
  teams,
  orgName,
  currentUserId,
  onOpenTeam,
  onEditTeam,
  onDeleteTeam
}: {
  teams: TeamSummary[]
  orgName?: string
  currentUserId: string
  onOpenTeam: (id: string) => void
  onEditTeam: (team: TeamSummary) => void
  onDeleteTeam: (team: TeamSummary) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-[12px] font-semibold tracking-wide text-muted uppercase">
          Your teams{orgName ? ` · ${orgName}` : ''}
        </h2>
        {teams.length === 0 ? (
          <p className="text-sm text-muted">
            {orgName ? 'No teams in this organization yet.' : 'Select or create an organization first.'}
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {teams.map((team) => {
              const isOwner =
                Boolean(currentUserId) &&
                Boolean(team.owner_id) &&
                currentUserId === team.owner_id?.trim()
              return (
                <div
                  key={team.id}
                  className="group relative flex items-start gap-3.5 rounded-2xl border border-border/50 bg-canvas px-4 py-4 transition hover:border-accent/35 hover:bg-hover/30"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-3.5 text-left"
                    onClick={() => onOpenTeam(team.id)}
                  >
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white ${teamColor(team.id)}`}
                    >
                      {teamInitial(team.name)}
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span className="block truncate text-sm font-semibold">{team.name}</span>
                      <span className="mt-1 block text-[12px] text-muted">
                        {team.member_count != null ? `${team.member_count} members` : 'Team'}
                      </span>
                    </span>
                  </button>
                  {isOwner ? (
                    <div className="absolute top-3 right-3 flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-surface"
                        title="Edit team"
                        onClick={(event) => {
                          event.stopPropagation()
                          onEditTeam(team)
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-danger"
                        title="Delete team"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDeleteTeam(team)
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function FileCard({
  file,
  showOpened,
  onOpen,
  onDelete
}: {
  file: PencilDocument
  showOpened?: boolean
  onOpen: () => void
  onDelete?: () => void
}) {
  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-2xl border border-border/50 bg-canvas transition hover:-translate-y-0.5 hover:border-accent/30 hover:bg-hover/20"
      onClick={onOpen}
    >
      <div className="aspect-[16/11] bg-hover/30">
        {file.thumbnail_url ? (
          <OssCoverImage path={file.thumbnail_url} alt={file.name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <File className="size-10 text-muted/70" />
          </div>
        )}
      </div>
      <div className="flex items-start gap-2 p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">{file.name || 'Untitled'}</p>
          <p className="mt-1 text-[12px] text-muted">
            {showOpened
              ? formatOpened(file.last_opened_at) || formatEdited(file.updated_at)
              : formatEdited(file.updated_at)}
          </p>
        </div>
        {onDelete ? (
          <button
            type="button"
            className="rounded-md p-1 text-muted opacity-0 transition group-hover:opacity-100 hover:bg-hover hover:text-danger"
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: typeof FolderOpen
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
      <div className="mb-1 flex size-14 items-center justify-center rounded-2xl bg-hover">
        <Icon className="size-7 text-muted" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {description ? <p className="max-w-xs text-[12px] text-muted">{description}</p> : null}
      {action ? (
        <button
          type="button"
          className="mt-3 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-medium text-white"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
  wide
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        className={`relative w-full rounded-2xl border border-border bg-canvas p-6 shadow-2xl ${
          wide ? 'max-w-lg' : 'max-w-md'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">{title}</h2>
          <button type="button" className="rounded-md p-1 text-muted hover:bg-hover" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
