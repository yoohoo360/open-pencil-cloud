import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { tv } from 'tailwind-variants'
import { ArrowLeft, RefreshCw } from 'lucide-react'

import type { CodegenArtifacts } from '#react/app/skills/codegen-reply'
import { useEditorStore } from '#react/app/editor/store'
import {
  isMakeSelectionPayload,
  MakeBridgeType,
  pingMakePrototype,
  requestMakeSelection,
  subscribeMakeBridge,
  type MakeSelectionNode
} from '#react/app/make/bridge'
import {
  requestBaselineFromPrototype,
  requestNodePreviewsFromPrototype,
  waitForPrototypeConnection
} from '#react/app/make/prototype-client'
import {
  MAKE_LOCK_PLACEHOLDER,
  isMakePackageJsonFile,
  parseMakeProjectFiles,
  serializeMakeProjectFiles
} from '#react/app/make/project-files'
import {
  applyMakeLockFile,
  buildMakeSandboxProject,
  makeProjectHasPreview,
  mergeMakeProjectUpdates,
  projectFromFiles,
  upsertMakeProjectFile,
  type MakeSandboxProject
} from '#react/app/make/sandbox'
import { makeSandboxServerURL } from '#react/app/make/settings'
import { parseMakeNodeIdsFromSearch } from '#react/app/make/session'
import type { CodegenPhase } from '#react/app/skills/use-codegen-chat'
import { MakeCodePanel } from '#react/components/make/MakeCodePanel'
import { MakeSelectionDialog } from '#react/components/make/MakeSelectionDialog'
import { CodegenChat } from '#react/components/code/CodegenChat'
import { MakeSandboxPreview } from '#react/components/properties/MakeSandboxPreview'
import { IconButton } from '#react/components/ui/IconButton'
import { SegmentedControl } from '#react/components/ui/SegmentedControl'
import {
  SplitterGroup,
  SplitterPanel,
  SplitterResizeHandle
} from '#react/components/ui/splitter'
import { useI18n } from '#react/i18n'
import splitterTheme from '#react/theme/splitter'

type SideTab = 'chat' | 'code'

const STALE_HEARTBEAT_MS = 5000

function formatLockJson(raw: string): string {
  try {
    return `${JSON.stringify(JSON.parse(raw), null, 2)}\n`
  } catch {
    return raw.endsWith('\n') ? raw : `${raw}\n`
  }
}

function packageDepsKey(project: MakeSandboxProject): string {
  return JSON.stringify(project.packageJson.dependencies ?? {})
}

/** Full-page Make workspace — data comes from the open prototype tab. */
export function MakePage({ onClose }: { onClose: () => void }) {
  const store = useEditorStore()
  const { panels } = useI18n()
  const { fileKey = '' } = useParams<{ fileKey: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const serverURL = makeSandboxServerURL()
  const horizontalSplitter = useMemo(() => tv(splitterTheme)({ direction: 'horizontal' }), [])
  const lastHeartbeatRef = useRef(0)

  const [selectedNodes, setSelectedNodes] = useState<MakeSelectionNode[]>(() => {
    const initialIds = parseMakeNodeIdsFromSearch(searchParams.toString())
    return initialIds.map((id) => ({ id, name: id, type: 'UNKNOWN' }))
  })
  const [prototypeConnected, setPrototypeConnected] = useState(false)
  const [error, setError] = useState('')
  const [project, setProject] = useState<MakeSandboxProject>(() => buildMakeSandboxProject())
  /** Snapshot pushed to fe-esbuild-package — frozen while AI streams into the code tab. */
  const [previewProject, setPreviewProject] = useState<MakeSandboxProject>(() =>
    buildMakeSandboxProject()
  )
  const projectRef = useRef(project)
  projectRef.current = project
  const [reloadToken, setReloadToken] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [sideTab, setSideTab] = useState<SideTab>('chat')
  const [selectionDialogOpen, setSelectionDialogOpen] = useState(false)
  const [previewNodes, setPreviewNodes] = useState<MakeSelectionNode[]>([])
  const [previewsLoading, setPreviewsLoading] = useState(false)

  const selectedIds = useMemo(() => selectedNodes.map((node) => node.id), [selectedNodes])
  const firstName = selectedNodes[0]?.name
  const hasPreview = makeProjectHasPreview(previewProject)

  useEffect(() => {
    if (!fileKey) return
    let cancelled = false
    void waitForPrototypeConnection(fileKey).then((ok) => {
      if (!cancelled) {
        setPrototypeConnected(ok)
        if (ok) lastHeartbeatRef.current = Date.now()
      }
    })

    const stop = subscribeMakeBridge((message) => {
      if (
        message.type === MakeBridgeType.Heartbeat ||
        message.type === MakeBridgeType.Pong ||
        message.type === MakeBridgeType.SelectionChanged
      ) {
        const key =
          message.payload &&
          typeof message.payload === 'object' &&
          'fileKey' in message.payload &&
          typeof (message.payload as { fileKey: unknown }).fileKey === 'string'
            ? (message.payload as { fileKey: string }).fileKey
            : ''
        if (key && key !== fileKey) return
        lastHeartbeatRef.current = Date.now()
        setPrototypeConnected(true)
      }

      if (message.type !== MakeBridgeType.SelectionChanged) return
      if (!isMakeSelectionPayload(message.payload)) return
      if (message.payload.fileKey !== fileKey) return
      const payload = message.payload
      setSelectedNodes(payload.nodes)
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (payload.nodeIds.length > 0) next.set('nodes', payload.nodeIds.join(','))
          else next.delete('nodes')
          return next
        },
        { replace: true }
      )
    })

    const ping = window.setInterval(() => {
      pingMakePrototype(fileKey)
      requestMakeSelection(fileKey)
      if (Date.now() - lastHeartbeatRef.current > STALE_HEARTBEAT_MS) {
        setPrototypeConnected(false)
      }
    }, 2000)

    return () => {
      cancelled = true
      stop()
      window.clearInterval(ping)
    }
  }, [fileKey, setSearchParams])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code === 'Escape') {
        if (selectionDialogOpen) setSelectionDialogOpen(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, selectionDialogOpen])

  const getBaselineCode = useCallback(async () => {
    const serialized = serializeMakeProjectFiles(project.files).trim()
    const parts: string[] = []
    if (serialized) {
      parts.push(`Current Make project files:\n${serialized}`)
    } else {
      parts.push(
        '(Empty project — skills must author /src/index.tsx, /src/App.tsx, and /package.json.)'
      )
    }
    if (fileKey && prototypeConnected) {
      try {
        const baseline = await requestBaselineFromPrototype(fileKey, selectedIds)
        setError('')
        if (baseline.trim()) {
          parts.push(
            `Selection JSX reference from the design tab (context only; rewrite via skills):\n\`\`\`tsx\n${baseline.trim()}\n\`\`\``
          )
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : panels.makePrototypeDisconnected)
      }
    } else if (!prototypeConnected) {
      setError(panels.makePrototypeDisconnected)
    }
    return parts.join('\n\n')
  }, [fileKey, panels.makePrototypeDisconnected, project.files, prototypeConnected, selectedIds])

  const applyProjectText = useCallback((raw: string, opts?: { preview?: boolean }) => {
    const updates = parseMakeProjectFiles(raw)
    if (updates.length === 0) return
    const current = projectRef.current
    const depsBefore = packageDepsKey(current)
    const merged = projectFromFiles(mergeMakeProjectUpdates(current.files, updates))
    const depsChanged = packageDepsKey(merged) !== depsBefore
    const next = projectFromFiles(
      depsChanged ? applyMakeLockFile(merged.files, MAKE_LOCK_PLACEHOLDER) : merged.files
    )
    projectRef.current = next
    setProject(next)
    if (opts?.preview) {
      setPreviewProject(next)
      if (depsChanged) setReloadToken((token) => token + 1)
    }
    setError('')
  }, [])

  const applyCode = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      if (!trimmed) return
      applyProjectText(trimmed, { preview: true })
      setGenerating(false)
    },
    [applyProjectText]
  )

  const onArtifacts = useCallback(
    (artifacts: CodegenArtifacts, phase: CodegenPhase) => {
      const generated = artifacts.code ?? ''
      if (phase === 'generate' || phase === 'done') {
        if (generated) {
          applyProjectText(generated, { preview: phase === 'done' })
        }
        setGenerating(phase === 'generate')
        return
      }
      if (phase === 'route' || phase === 'loading-skills') {
        setGenerating(true)
      }
    },
    [applyProjectText]
  )

  function onChangeFile(filename: string, code: string) {
    const current = projectRef.current
    if (isMakePackageJsonFile(filename)) {
      const next = projectFromFiles(
        applyMakeLockFile(
          upsertMakeProjectFile(current.files, filename, code),
          MAKE_LOCK_PLACEHOLDER
        )
      )
      projectRef.current = next
      setProject(next)
      if (!generating) {
        setPreviewProject(next)
        setReloadToken((token) => token + 1)
      }
      return
    }
    const next = projectFromFiles(upsertMakeProjectFile(current.files, filename, code))
    projectRef.current = next
    setProject(next)
    if (!generating) setPreviewProject(next)
  }

  function onLockFileChange(lockJson: string) {
    const formatted = formatLockJson(lockJson)
    const next = projectFromFiles(applyMakeLockFile(projectRef.current.files, formatted))
    projectRef.current = next
    setProject(next)
    setPreviewProject((current) => projectFromFiles(applyMakeLockFile(current.files, formatted)))
  }

  function refreshPreview() {
    setPreviewProject(projectFromFiles(project.files))
    setReloadToken((token) => token + 1)
  }

  async function openSelectionDialog() {
    setSelectionDialogOpen(true)
    if (!fileKey || selectedIds.length === 0) {
      setPreviewNodes([])
      return
    }
    if (!prototypeConnected) {
      setPreviewNodes(selectedNodes)
      return
    }
    setPreviewsLoading(true)
    try {
      const nodes = await requestNodePreviewsFromPrototype(fileKey, selectedIds)
      setPreviewNodes(nodes)
    } catch {
      setPreviewNodes(selectedNodes)
    } finally {
      setPreviewsLoading(false)
    }
  }

  const sideOptions = useMemo(
    () => [
      { value: 'chat', label: panels.makeChatTitle },
      { value: 'code', label: panels.makeCodeLabel }
    ],
    [panels.makeChatTitle, panels.makeCodeLabel]
  )

  const previewEmptyHint = !prototypeConnected
    ? panels.makePrototypeDisconnected
    : !serverURL
      ? panels.makeSandboxMissing
      : !hasPreview
        ? panels.makeWaitingForChat
        : error

  const selectionSummary =
    selectedNodes.length === 0
      ? panels.makeSelectedNodesEmpty
      : selectedNodes.length === 1
        ? panels.makeSelectedNodesSummaryOne({ name: firstName ?? '' })
        : panels.makeSelectedNodesSummaryMany({
            count: String(selectedNodes.length),
            name: firstName ?? ''
          })

  return (
    <div
      data-test-id="make-page"
      className="flex h-full min-h-0 w-full flex-col bg-panel text-surface"
    >
      {!prototypeConnected ? (
        <div
          className="shrink-0 border-b border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger"
          role="alert"
          data-test-id="make-prototype-disconnected"
        >
          {panels.makePrototypeDisconnected}
        </div>
      ) : null}

      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-3 py-2.5">
        <div className="flex min-w-0 items-start gap-2">
          <IconButton label={panels.makeBackToDesign} onClick={onClose}>
            <ArrowLeft className="size-3.5" />
          </IconButton>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold">{panels.makePreviewTitle}</h1>
            <p className="text-[11px] text-muted">{panels.makePreviewHint}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconButton label={panels.makeRefreshPreview} onClick={refreshPreview}>
            <RefreshCw className="size-3.5" />
          </IconButton>
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-[10px] font-medium text-muted">{panels.makeSelectedNodes}</span>
        <button
          type="button"
          data-test-id="make-selection-summary"
          className="min-w-0 truncate rounded px-1.5 py-0.5 text-left text-[11px] text-surface hover:bg-hover"
          onClick={() => void openSelectionDialog()}
        >
          {selectionSummary}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <SplitterGroup
          id="make-page-workspace"
          direction="horizontal"
          autoSaveId="make-page-workspace"
          className="min-h-0 flex-1 overflow-hidden"
        >
          <SplitterPanel defaultSize={68} minSize={40} className="flex min-h-0 min-w-0 flex-col">
            {serverURL && hasPreview && prototypeConnected ? (
              <MakeSandboxPreview
                serverURL={serverURL}
                project={previewProject}
                title={panels.makePreviewTitle}
                reloadToken={reloadToken}
                live={!generating}
                onLockFileChange={onLockFileChange}
              />
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center bg-neutral-200 p-4 text-center text-[11px] text-muted">
                {previewEmptyHint}
              </div>
            )}
          </SplitterPanel>

          <SplitterResizeHandle className={horizontalSplitter.handle()}>
            <div className={horizontalSplitter.divider()} />
          </SplitterResizeHandle>

          <SplitterPanel
            defaultSize={32}
            minSize={22}
            maxSize={55}
            className="flex min-h-0 min-w-0 flex-col border-l border-border"
          >
            <div className="flex shrink-0 items-center border-b border-border px-2 py-1.5">
              <SegmentedControl
                label={panels.makeSidePanel}
                value={sideTab}
                options={sideOptions}
                onChange={(value) => setSideTab(value as SideTab)}
              />
            </div>
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div
                className={`absolute inset-0 flex min-h-0 flex-col ${sideTab === 'chat' ? '' : 'invisible pointer-events-none'}`}
                aria-hidden={sideTab !== 'chat'}
              >
                <CodegenChat
                  active
                  store={store}
                  sourceLabel="React Tailwind JSX"
                  getBaselineCode={getBaselineCode}
                  onArtifacts={onArtifacts}
                  onApplyCode={applyCode}
                  skillScope="make"
                  title={panels.makeChatTitle}
                />
              </div>
              <div
                className={`absolute inset-0 flex min-h-0 flex-col ${sideTab === 'code' ? '' : 'invisible pointer-events-none'}`}
                aria-hidden={sideTab !== 'code'}
              >
                <MakeCodePanel files={project.files} onChangeFile={onChangeFile} />
              </div>
            </div>
          </SplitterPanel>
        </SplitterGroup>
      </div>

      <MakeSelectionDialog
        open={selectionDialogOpen}
        nodes={previewNodes}
        loading={previewsLoading}
        onClose={() => setSelectionDialogOpen(false)}
      />
    </div>
  )
}
