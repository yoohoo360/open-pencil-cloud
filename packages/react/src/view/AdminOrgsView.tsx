import {
  getAPIErrorMessage,
  orgAPI,
  userAPI,
  type OrganizationSummary
} from '#react/lib/client'
import { ArrowLeft, ChevronLeft, ChevronRight, LoaderCircle, Pencil, Search } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

const PAGE_SIZE = 20

function toIsoStart(localValue: string): string | undefined {
  const trimmed = localValue.trim()
  if (!trimmed) return undefined
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

function toIsoEnd(localValue: string): string | undefined {
  const trimmed = localValue.trim()
  if (!trimmed) return undefined
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return undefined
  // datetime-local without seconds → treat as inclusive end of that minute
  date.setSeconds(59, 999)
  return date.toISOString()
}

function formatCreatedAt(value?: string | number): string {
  if (value == null || value === '') return '—'
  const millis = typeof value === 'number' ? value : Date.parse(String(value))
  if (Number.isNaN(millis)) return '—'
  return new Date(millis).toLocaleString()
}

export default function AdminOrgsView() {
  const navigate = useNavigate()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [createdFromInput, setCreatedFromInput] = useState('')
  const [createdToInput, setCreatedToInput] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<OrganizationSummary | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState('approved')
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    void userAPI
      .me()
      .then((res) => {
        if (!res.data?.is_admin) {
          setAllowed(false)
          void navigate('/dashboard', { replace: true })
          return
        }
        setAllowed(true)
      })
      .catch(() => {
        setAllowed(false)
        void navigate('/dashboard', { replace: true })
      })
  }, [navigate])

  async function refresh(nextPage = page) {
    setLoading(true)
    setError(null)
    try {
      const res = await orgAPI.adminList({
        search: search.trim() || undefined,
        page: nextPage,
        size: PAGE_SIZE,
        created_from: createdFrom || undefined,
        created_to: createdTo || undefined
      })
      setOrgs(res.data ?? [])
      setTotal(res.total ?? res.data?.length ?? 0)
      setPage(nextPage)
    } catch (reason) {
      setError(getAPIErrorMessage(reason))
      setOrgs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!allowed) return
    void refresh(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when filters change
  }, [allowed, search, createdFrom, createdTo])

  function applyFilters(event: FormEvent) {
    event.preventDefault()
    setSearch(searchInput.trim())
    setCreatedFrom(toIsoStart(createdFromInput) ?? '')
    setCreatedTo(toIsoEnd(createdToInput) ?? '')
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setCreatedFromInput('')
    setCreatedToInput('')
    setCreatedFrom('')
    setCreatedTo('')
  }

  function openEdit(org: OrganizationSummary) {
    setEditing(org)
    setEditName(org.name)
    setEditDescription(org.description ?? '')
    setEditStatus(org.approval_status ?? 'approved')
    setEditError(null)
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    setEditBusy(true)
    setEditError(null)
    try {
      await orgAPI.adminUpdate(editing.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        approval_status: editStatus
      })
      setEditing(null)
      await refresh(page)
    } catch (reason) {
      setEditError(getAPIErrorMessage(reason, 'Failed to update organization'))
    } finally {
      setEditBusy(false)
    }
  }

  if (allowed !== true) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <LoaderCircle className="size-5 animate-spin text-muted" />
      </div>
    )
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-canvas text-surface">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-6">
        <button
          type="button"
          className="rounded-lg p-2 text-muted hover:bg-hover hover:text-surface"
          onClick={() => void navigate('/dashboard')}
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight">Organizations</h1>
          <p className="text-[11px] text-muted">Super-admin · {total} total</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <form
          className="mb-5 flex flex-wrap items-end gap-3"
          onSubmit={applyFilters}
        >
          <label className="block min-w-[200px] flex-1 text-[11px] font-medium text-muted">
            Search
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
              <input
                value={searchInput}
                placeholder="Name or org code"
                className="h-9 w-full rounded-lg border border-border bg-canvas pr-2 pl-8 text-xs text-surface focus:border-accent focus:outline-none"
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
          </label>
          <label className="block text-[11px] font-medium text-muted">
            Created from
            <input
              type="datetime-local"
              value={createdFromInput}
              className="mt-1 h-9 rounded-lg border border-border bg-canvas px-2 text-xs text-surface focus:border-accent focus:outline-none"
              onChange={(event) => setCreatedFromInput(event.target.value)}
            />
          </label>
          <label className="block text-[11px] font-medium text-muted">
            Created to
            <input
              type="datetime-local"
              value={createdToInput}
              className="mt-1 h-9 rounded-lg border border-border bg-canvas px-2 text-xs text-surface focus:border-accent focus:outline-none"
              onChange={(event) => setCreatedToInput(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="h-9 rounded-lg bg-accent px-3 text-xs font-medium text-white"
          >
            Apply
          </button>
          <button
            type="button"
            className="h-9 rounded-lg border border-border px-3 text-xs text-muted hover:bg-hover hover:text-surface"
            onClick={clearFilters}
          >
            Clear
          </button>
        </form>

        {error ? (
          <p className="mb-4 text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <LoaderCircle className="size-5 animate-spin text-muted" />
          </div>
        ) : orgs.length === 0 ? (
          <p className="text-sm text-muted">No organizations found.</p>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-border bg-hover/30 text-[11px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-4 py-2.5 font-semibold">Org code</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Created</th>
                    <th className="px-4 py-2.5 font-semibold">Members</th>
                    <th className="px-4 py-2.5 font-semibold">Teams</th>
                    <th className="px-4 py-2.5 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((org) => (
                    <tr key={org.id} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-3 font-medium">{org.name}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-muted">
                        {org.org_code || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={org.approval_status} />
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted">
                        {formatCreatedAt(org.created_at as string | number | undefined)}
                      </td>
                      <td className="px-4 py-3 text-muted">{org.member_count ?? 0}</td>
                      <td className="px-4 py-3 text-muted">{org.team_count ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted hover:bg-hover hover:text-surface"
                          onClick={() => openEdit(org)}
                        >
                          <Pencil className="size-3" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 0 || loading}
                  className="flex size-8 items-center justify-center rounded-lg border border-border text-muted hover:bg-hover hover:text-surface disabled:opacity-40"
                  onClick={() => void refresh(page - 1)}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={page + 1 >= totalPages || loading}
                  className="flex size-8 items-center justify-center rounded-lg border border-border text-muted hover:bg-hover hover:text-surface disabled:opacity-40"
                  onClick={() => void refresh(page + 1)}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {editing ? (
        <Modal title="Edit organization" onClose={() => setEditing(null)}>
          <form className="space-y-4" onSubmit={(event) => void submitEdit(event)}>
            <label className="block text-xs font-medium">
              Name
              <input
                value={editName}
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
                onChange={(event) => setEditName(event.target.value)}
              />
            </label>
            <label className="block text-xs font-medium">
              Org code
              <input
                value={editing.org_code ?? ''}
                disabled
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-hover/40 px-3 font-mono text-sm text-muted"
              />
            </label>
            <label className="block text-xs font-medium">
              Description
              <textarea
                value={editDescription}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:border-accent focus:outline-none"
                onChange={(event) => setEditDescription(event.target.value)}
              />
            </label>
            <label className="block text-xs font-medium">
              Approval status
              <select
                value={editStatus}
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-canvas px-3 text-sm focus:border-accent focus:outline-none"
                onChange={(event) => setEditStatus(event.target.value)}
              >
                <option value="approved">approved</option>
                <option value="pending">pending</option>
                <option value="rejected">rejected</option>
              </select>
            </label>
            {editError ? <p className="text-xs text-danger">{editError}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-hover"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editBusy}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {editBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </main>
  )
}

function StatusPill({ status }: { status?: string }) {
  const value = status || 'unknown'
  const tone =
    value === 'approved'
      ? 'bg-[#1bc47d]/15 text-[#1bc47d]'
      : value === 'pending'
        ? 'bg-[#ffcd29]/20 text-[#a67c00]'
        : value === 'rejected'
          ? 'bg-danger/10 text-danger'
          : 'bg-hover text-muted'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {value}
    </span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-canvas p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-4 text-[16px] font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  )
}
