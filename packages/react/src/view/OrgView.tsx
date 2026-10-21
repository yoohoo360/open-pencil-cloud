import { readStoredUser } from '#react/app/auth/storage'
import { normalizeOrgId, writeActiveOrgId } from '#react/app/org/active'
import {
  getAPIErrorMessage,
  orgAPI,
  teamAPI,
  type OrganizationSummary,
  type TeamSummary
} from '#react/lib/client'
import { ArrowLeft, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

/**
 * Organization management: teams and org settings live here.
 * Dashboard only switches org / browses files — create/edit teams requires this page.
 */
export default function OrgView() {
  const { orgId: orgIdParam = '' } = useParams()
  const orgId = normalizeOrgId(orgIdParam)
  const navigate = useNavigate()
  const currentUserId = readStoredUser()?.id?.trim() ?? ''

  const [org, setOrg] = useState<OrganizationSummary | null>(null)
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [orgName, setOrgName] = useState('')
  const [orgDescription, setOrgDescription] = useState('')
  const [orgBusy, setOrgBusy] = useState(false)
  const [orgError, setOrgError] = useState<string | null>(null)

  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamBusy, setTeamBusy] = useState(false)
  const [teamError, setTeamError] = useState<string | null>(null)

  const [editingTeam, setEditingTeam] = useState<TeamSummary | null>(null)
  const [deleteTeam, setDeleteTeam] = useState<TeamSummary | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const isOwner = useMemo(
    () =>
      Boolean(org?.owner_id) &&
      Boolean(currentUserId) &&
      currentUserId === org?.owner_id?.trim(),
    [org, currentUserId]
  )

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const mine = await orgAPI.mine()
      const found =
        (mine.data ?? []).find((item) => normalizeOrgId(item.id) === orgId) ?? null
      if (!found) {
        setOrg(null)
        setTeams([])
        setError('Organization not found or you are not a member.')
        return
      }
      setOrg(found)
      setOrgName(found.name)
      setOrgDescription(found.description ?? '')
      writeActiveOrgId(found.id)
      const teamRes = await teamAPI.myTeams({ org_id: found.id })
      setTeams(teamRes.data ?? [])
    } catch (reason) {
      setError(getAPIErrorMessage(reason, 'Could not load organization'))
      setOrg(null)
      setTeams([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!orgId) {
      void navigate('/dashboard', { replace: true })
      return
    }
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when route org changes
  }, [orgId])

  async function saveOrg(event: FormEvent) {
    event.preventDefault()
    if (!org || !isOwner) return
    if (!orgName.trim()) {
      setOrgError('Name is required')
      return
    }
    setOrgBusy(true)
    setOrgError(null)
    try {
      await orgAPI.update(org.id, {
        name: orgName.trim(),
        description: orgDescription.trim() || undefined
      })
      await reload()
    } catch (reason) {
      setOrgError(getAPIErrorMessage(reason, 'Could not update organization'))
    } finally {
      setOrgBusy(false)
    }
  }

  async function createTeam(event: FormEvent) {
    event.preventDefault()
    if (!org) return
    if (!teamName.trim()) {
      setTeamError('Add a name')
      return
    }
    setTeamBusy(true)
    setTeamError(null)
    try {
      await teamAPI.create({ name: teamName.trim(), parent_id: org.id })
      setShowCreateTeam(false)
      setTeamName('')
      await reload()
    } catch (reason) {
      setTeamError(getAPIErrorMessage(reason, 'Could not create team'))
    } finally {
      setTeamBusy(false)
    }
  }

  async function saveTeam(event: FormEvent) {
    event.preventDefault()
    if (!editingTeam) return
    if (!teamName.trim()) {
      setTeamError('Add a name')
      return
    }
    setTeamBusy(true)
    setTeamError(null)
    try {
      await teamAPI.update(editingTeam.id, { name: teamName.trim() })
      setEditingTeam(null)
      setTeamName('')
      await reload()
    } catch (reason) {
      setTeamError(getAPIErrorMessage(reason, 'Could not update team'))
    } finally {
      setTeamBusy(false)
    }
  }

  async function confirmDeleteTeam() {
    if (!deleteTeam) return
    if (deleteConfirmName.trim() !== deleteTeam.name) {
      setDeleteError('Type the team name exactly to confirm')
      return
    }
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await teamAPI.delete(deleteTeam.id)
      setDeleteTeam(null)
      setDeleteConfirmName('')
      await reload()
    } catch (reason) {
      setDeleteError(getAPIErrorMessage(reason, 'Failed to delete team'))
    } finally {
      setDeleteBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-canvas text-muted">
        <LoaderCircle className="size-4 animate-spin" />
        Loading organization…
      </div>
    )
  }

  if (!org) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-3 px-6 bg-canvas text-surface">
        <p className="text-sm text-danger">{error || 'Organization not found.'}</p>
        <Link to="/dashboard" className="text-sm text-accent hover:underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-surface" data-test-id="org-manage">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-muted hover:bg-hover hover:text-surface"
          onClick={() => void navigate('/orgs')}
        >
          <ArrowLeft className="size-3.5" />
          Organizations
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold">{org.name}</h1>
          <p className="truncate font-mono text-[11px] text-muted">{org.org_code || org.id}</p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-hover hover:text-surface"
          onClick={() => {
            writeActiveOrgId(org.id)
            void navigate('/dashboard')
          }}
        >
          Dashboard
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-8">
        {error ? (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {isOwner ? (
          <section className="space-y-3 rounded-xl border border-border/60 bg-panel/30 p-5">
            <h2 className="text-[14px] font-semibold">Organization settings</h2>
            <form className="space-y-3" onSubmit={(event) => void saveOrg(event)}>
              <label className="block space-y-1">
                <span className="text-[11px] text-muted">Name</span>
                <input
                  className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-[13px]"
                  value={orgName}
                  onChange={(event) => setOrgName(event.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-muted">Description</span>
                <textarea
                  className="min-h-20 w-full rounded-md border border-border bg-input px-2 py-1.5 text-[13px]"
                  value={orgDescription}
                  onChange={(event) => setOrgDescription(event.target.value)}
                />
              </label>
              {orgError ? <p className="text-xs text-danger">{orgError}</p> : null}
              <button
                type="submit"
                disabled={orgBusy}
                className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {orgBusy ? 'Saving…' : 'Save organization'}
              </button>
            </form>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[14px] font-semibold">Teams</h2>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-medium text-white"
              onClick={() => {
                setTeamName('')
                setTeamError(null)
                setShowCreateTeam(true)
              }}
            >
              <Plus className="size-3.5" />
              Create team
            </button>
          </div>

          {teams.length === 0 ? (
            <p className="text-sm text-muted">No teams yet.</p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
              {teams.map((team) => {
                const teamOwner =
                  Boolean(team.owner_id) && currentUserId === team.owner_id?.trim()
                return (
                  <li
                    key={team.id}
                    className="flex flex-wrap items-center gap-2 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{team.name}</p>
                    </div>
                    {teamOwner ? (
                      <>
                        <button
                          type="button"
                          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-hover hover:text-surface"
                          onClick={() => {
                            setEditingTeam(team)
                            setTeamName(team.name)
                            setTeamError(null)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
                          onClick={() => {
                            setDeleteTeam(team)
                            setDeleteConfirmName('')
                            setDeleteError(null)
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>

      {showCreateTeam ? (
        <Modal title="Create a team" onClose={() => setShowCreateTeam(false)}>
          <form className="space-y-3" onSubmit={(event) => void createTeam(event)}>
            <label className="block space-y-1">
              <span className="text-[11px] text-muted">Team name</span>
              <input
                autoFocus
                className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-[13px]"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
              />
            </label>
            {teamError ? <p className="text-xs text-danger">{teamError}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-hover"
                onClick={() => setShowCreateTeam(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={teamBusy}
                className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {teamBusy ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editingTeam ? (
        <Modal title="Edit team" onClose={() => setEditingTeam(null)}>
          <form className="space-y-3" onSubmit={(event) => void saveTeam(event)}>
            <label className="block space-y-1">
              <span className="text-[11px] text-muted">Team name</span>
              <input
                autoFocus
                className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-[13px]"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
              />
            </label>
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
                className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {teamBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleteTeam ? (
        <Modal title="Delete team" onClose={() => setDeleteTeam(null)}>
          <div className="space-y-3">
            <p className="text-[12px] text-muted">
              Type <span className="font-medium text-surface">{deleteTeam.name}</span> to confirm.
            </p>
            <input
              className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-[13px]"
              value={deleteConfirmName}
              onChange={(event) => setDeleteConfirmName(event.target.value)}
            />
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
                disabled={deleteBusy}
                className="rounded-lg bg-danger px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                onClick={() => void confirmDeleteTeam()}
              >
                {deleteBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

function Modal({
  title,
  onClose,
  children
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-panel p-5 shadow-xl">
        <h3 className="mb-3 text-[14px] font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  )
}
