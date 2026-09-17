import {
  hasDocumentCapability,
  setDocumentAccess,
  useDocumentAccess,
  type AccessRole,
  type DocumentPermissionRequest
} from '#react/app/document/access'
import { documentAPI, getAPIErrorMessage, invitationAPI } from '#react/lib/client'
import { Shield, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'

export function DocumentShareDialog({
  fileKey,
  open,
  onClose
}: {
  fileKey: string
  open: boolean
  onClose: () => void
}) {
  const access = useDocumentAccess()
  const [invite, setInvite] = useState('')
  const [role, setRole] = useState<AccessRole>('write')
  const [allowCopy, setAllowCopy] = useState(true)
  const [requests, setRequests] = useState<DocumentPermissionRequest[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const canManage = hasDocumentCapability(access, 'manage_access')
  const grants = access?.grants ?? access?.members ?? []
  const pending = requests.filter((item) => item.status === 'pending')

  useEffect(() => {
    if (!open || !fileKey) return
    let cancelled = false
    void (async () => {
      try {
        const res = await documentAPI.getAccess(fileKey)
        if (cancelled || !res.data) return
        setDocumentAccess(res.data)
        setAllowCopy(res.data.allow_copy)
        if (res.data.capabilities.includes('manage_access')) {
          const req = await documentAPI.listAccessRequests(fileKey)
          if (!cancelled) setRequests(req.data ?? [])
        }
      } catch (reason) {
        if (!cancelled) setError(getAPIErrorMessage(reason))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fileKey, open])

  if (!open) return null

  async function refresh() {
    const res = await documentAPI.getAccess(fileKey)
    if (res.data) {
      setDocumentAccess(res.data)
      setAllowCopy(res.data.allow_copy)
    }
    if (canManage) {
      const req = await documentAPI.listAccessRequests(fileKey)
      setRequests(req.data ?? [])
    }
  }

  async function onGrant(event: FormEvent) {
    event.preventDefault()
    if (!invite.trim()) return
    setBusy(true)
    setError(null)
    try {
      await invitationAPI.create({
        target_type: 'document',
        target_id: fileKey,
        invitee: invite.trim(),
        role
      })
      setInvite('')
      await refresh()
    } catch (reason) {
      setError(getAPIErrorMessage(reason, 'Could not send invitation'))
    } finally {
      setBusy(false)
    }
  }

  async function onToggleCopy(next: boolean) {
    setBusy(true)
    setError(null)
    try {
      const res = await documentAPI.updateAccessSettings(fileKey, { allow_copy: next })
      if (res.data) {
        setDocumentAccess(res.data)
        setAllowCopy(res.data.allow_copy)
      }
    } catch (reason) {
      setError(getAPIErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-border bg-panel p-5 shadow-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Shield className="size-4 text-accent" aria-hidden />
            Share
          </div>
          <button type="button" className="rounded-md p-1 hover:bg-muted/40" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>

        {access ? (
          <p className="text-xs text-muted">
            {access.personal ? 'Personal file' : 'Team file'}
            {' · '}
            Your role: <span className="text-surface">{access.my_role}</span>
          </p>
        ) : null}

        {error ? <p className="text-xs text-danger">{error}</p> : null}

        {canManage ? (
          <>
            {pending.length > 0 ? (
              <div className="space-y-2 rounded-xl border border-accent/30 bg-accent/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-accent">
                    {pending.length} pending request{pending.length === 1 ? '' : 's'}
                  </span>
                </div>
                {pending.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-panel px-2.5 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {item.requester_name ||
                          item.requester_username ||
                          item.requester_email ||
                          item.requester_id}
                      </p>
                      <p className="text-muted">
                        wants {item.requested_role}
                        {item.requester_email ? ` · ${item.requester_email}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className="rounded-md bg-accent px-2.5 py-1 font-medium text-white disabled:opacity-50"
                        disabled={busy}
                        onClick={() => {
                          void documentAPI
                            .approveAccessRequest(fileKey, item.id)
                            .then(() => refresh())
                            .catch((reason) => setError(getAPIErrorMessage(reason)))
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded-md px-2.5 py-1 text-danger hover:bg-danger/10 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => {
                          void documentAPI
                            .rejectAccessRequest(fileKey, item.id)
                            .then(() => refresh())
                            .catch((reason) => setError(getAPIErrorMessage(reason)))
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={allowCopy}
                disabled={busy}
                onChange={(event) => void onToggleCopy(event.target.checked)}
              />
              Allow copy / duplicate / export for writers
            </label>

            <form className="flex flex-col gap-2" onSubmit={(event) => void onGrant(event)}>
              <div className="text-xs font-medium">Invite by username or email</div>
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-lg border border-border bg-canvas px-3 py-2 text-xs focus:border-accent focus:outline-none"
                  placeholder="username or email@example.com"
                  value={invite}
                  onChange={(event) => setInvite(event.target.value)}
                />
                <select
                  className="rounded-lg border border-border bg-canvas px-2 py-2 text-xs"
                  value={role}
                  onChange={(event) => setRole(event.target.value as AccessRole)}
                >
                  <option value="read">Can view</option>
                  <option value="write">Can edit</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                >
                  Invite
                </button>
              </div>
            </form>

            <div className="max-h-44 space-y-1 overflow-y-auto text-xs">
              {grants.map((grant) => (
                <div
                  key={`${grant.principal_type}:${grant.principal_id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {grant.principal_name ||
                        grant.principal_username ||
                        grant.principal_email ||
                        `${grant.principal_type}/${grant.principal_id}`}
                    </p>
                    {(grant.principal_username || grant.principal_email) && grant.principal_name ? (
                      <p className="truncate text-muted">
                        {grant.principal_username || grant.principal_email}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-muted">{grant.owner ? 'Owner' : grant.role}</span>
                  {!grant.owner ? (
                    <button
                      type="button"
                      className="shrink-0 text-danger"
                      disabled={busy}
                      onClick={() => {
                        void documentAPI
                          .revokeAccess(fileKey, grant.principal_id, grant.principal_type)
                          .then((res) => {
                            if (res.data) setDocumentAccess(res.data)
                            return refresh()
                          })
                          .catch((reason) => setError(getAPIErrorMessage(reason)))
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : (
          <RequestAccessPanel fileKey={fileKey} onDone={onClose} />
        )}
      </div>
    </div>,
    document.body
  )
}

function RequestAccessPanel({ fileKey, onDone }: { fileKey: string; onDone: () => void }) {
  const [role, setRole] = useState<'read' | 'write'>('write')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await documentAPI.requestAccess(fileKey, { role, message: message.trim() || undefined })
      setSent(true)
    } catch (reason) {
      setError(getAPIErrorMessage(reason))
    }
  }

  if (sent) {
    return (
      <div className="space-y-3 text-xs">
        <p>Access request sent. An admin will review it.</p>
        <button type="button" className="rounded-lg bg-accent px-3 py-1.5 text-white" onClick={onDone}>
          Close
        </button>
      </div>
    )
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
      <p className="text-xs text-muted">Request access to this file.</p>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <select
        className="rounded-lg border border-border bg-canvas px-2 py-1.5 text-xs"
        value={role}
        onChange={(event) => setRole(event.target.value as 'read' | 'write')}
      >
        <option value="read">Can view</option>
        <option value="write">Can edit</option>
      </select>
      <textarea
        className="min-h-20 rounded-lg border border-border bg-canvas px-2 py-1.5 text-xs"
        placeholder="Optional message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      <button type="submit" className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white">
        Request access
      </button>
    </form>
  )
}
