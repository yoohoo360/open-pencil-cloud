import { normalizeOrgId, writeActiveOrgId } from '#react/app/org/active'
import {
  getAPIErrorMessage,
  orgAPI,
  type OrganizationSummary
} from '#react/lib/client'
import { ArrowLeft, Building2, LoaderCircle, Plus, Settings2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Standalone organization management: list, create, and open an org.
 * Team CRUD lives under `/org/:orgId` after you enter an organization.
 */
export default function OrgsView() {
  const navigate = useNavigate()
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const res = await orgAPI.mine()
      setOrgs(res.data ?? [])
    } catch (reason) {
      setError(getAPIErrorMessage(reason, 'Could not load organizations'))
      setOrgs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  function openOrg(org: OrganizationSummary) {
    writeActiveOrgId(org.id)
    void navigate(`/org/${normalizeOrgId(org.id)}`)
  }

  async function createOrg(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setFormError('Organization name is required')
      return
    }
    setBusy(true)
    setFormError(null)
    try {
      const res = await orgAPI.create({
        name: name.trim(),
        description: description.trim() || undefined
      })
      setShowCreate(false)
      setName('')
      setDescription('')
      await reload()
      if (res.data?.id) openOrg(res.data)
    } catch (reason) {
      setFormError(getAPIErrorMessage(reason, 'Could not create organization'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-surface" data-test-id="orgs-manage">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-muted hover:bg-hover hover:text-surface"
          onClick={() => void navigate('/dashboard')}
        >
          <ArrowLeft className="size-3.5" />
          Dashboard
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold">Organizations</h1>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-medium text-white"
          onClick={() => {
            setName('')
            setDescription('')
            setFormError(null)
            setShowCreate(true)
          }}
        >
          <Plus className="size-3.5" />
          Create organization
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-8">
        {error ? (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin" />
            Loading…
          </div>
        ) : orgs.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-panel/30 px-5 py-8 text-center">
            <Building2 className="mx-auto mb-3 size-8 text-muted" />
            <p className="text-sm font-medium">No organizations yet</p>
            <p className="mt-1 text-[12px] text-muted">Create an organization to get started.</p>
            <button
              type="button"
              className="mt-4 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-medium text-white"
              onClick={() => setShowCreate(true)}
            >
              Create organization
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
            {orgs.map((org) => (
              <li key={org.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-90"
                  onClick={() => openOrg(org)}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <Building2 className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{org.name}</span>
                    <span className="block truncate font-mono text-[11px] text-muted">
                      {org.org_code || org.id}
                      {org.team_count != null ? ` · ${org.team_count} teams` : ''}
                      {org.member_count != null ? ` · ${org.member_count} members` : ''}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-hover hover:text-surface"
                  onClick={() => openOrg(org)}
                >
                  <Settings2 className="size-3.5" />
                  Manage
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close"
            onClick={() => setShowCreate(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-panel p-5 shadow-xl">
            <h2 className="mb-1 text-[14px] font-semibold">Create organization</h2>
            <p className="mb-3 text-[11px] text-muted">
              Display names can repeat. Org code is generated automatically.
            </p>
            <form className="space-y-3" onSubmit={(event) => void createOrg(event)}>
              <label className="block space-y-1">
                <span className="text-[11px] text-muted">Name</span>
                <input
                  autoFocus
                  className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-[13px]"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-muted">Description</span>
                <textarea
                  className="min-h-16 w-full rounded-md border border-border bg-input px-2 py-1.5 text-[13px]"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              {formError ? <p className="text-xs text-danger">{formError}</p> : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-hover"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {busy ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
