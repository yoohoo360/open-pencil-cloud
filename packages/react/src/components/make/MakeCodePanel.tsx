import { useEffect, useMemo, useState } from 'react'

import {
  isMakeLockFile,
  isMakeServerOwnedFile,
  MAKE_APP_FILE,
  sortMakeFiles
} from '#react/app/make/project-files'
import type { MakeSandboxFile } from '#react/app/make/sandbox'
import { CodeEditor } from '#react/components/code-editor/CodeEditor'
import { useI18n } from '#react/i18n'

function shortName(filename: string): string {
  const parts = filename.split('/')
  return parts[parts.length - 1] || filename
}

export function MakeCodePanel({
  files,
  onChangeFile,
  onBlur
}: {
  files: readonly MakeSandboxFile[]
  onChangeFile: (filename: string, code: string) => void
  onBlur?: () => void
}) {
  const { panels } = useI18n()
  const sorted = useMemo(() => sortMakeFiles(files), [files])
  const [openPath, setOpenPath] = useState(
    () =>
      sorted.find((file) => file.filename === MAKE_APP_FILE)?.filename ??
      sorted[0]?.filename ??
      MAKE_APP_FILE
  )

  // Keep selection valid when the dynamic tree gains/loses files.
  useEffect(() => {
    if (sorted.some((file) => file.filename === openPath)) return
    setOpenPath(sorted[0]?.filename ?? MAKE_APP_FILE)
  }, [openPath, sorted])

  const active =
    sorted.find((file) => file.filename === openPath) ?? sorted[0] ?? null
  const readOnly = active ? isMakeServerOwnedFile(active.filename) : false

  if (!active) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-3 text-[11px] text-muted">
        {panels.makeCodePlaceholder}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col" data-test-id="make-code-panel">
      <div
        className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-border px-1 py-1"
        role="tablist"
        aria-label={panels.makeCodeFiles}
      >
        {sorted.map((file) => {
          const selected = file.filename === active.filename
          const lock = isMakeLockFile(file.filename)
          return (
            <button
              key={file.filename}
              type="button"
              role="tab"
              aria-selected={selected}
              title={
                lock ? `${file.filename} (${panels.makeLockFromServer})` : file.filename
              }
              data-test-id={`make-code-file-${shortName(file.filename)}`}
              className={`shrink-0 rounded px-2 py-1 text-[10px] ${
                selected ? 'bg-hover font-medium text-surface' : 'text-muted hover:bg-hover/60'
              }`}
              onClick={() => setOpenPath(file.filename)}
            >
              {shortName(file.filename)}
              {lock ? (
                <span className="ml-1 text-[9px] font-normal text-muted">· server</span>
              ) : null}
            </button>
          )
        })}
      </div>
      {readOnly ? (
        <div className="shrink-0 border-b border-border px-2 py-1 text-[10px] text-muted">
          {panels.makeLockFromServer}
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1" onBlur={onBlur}>
        <div className="absolute inset-0 flex min-h-0 flex-col">
          <CodeEditor
            key={active.filename}
            label={active.filename}
            language="tailwind-jsx"
            value={active.code}
            readOnly={readOnly}
            onChange={(value) => {
              if (readOnly) return
              onChangeFile(active.filename, value)
            }}
          />
        </div>
      </div>
    </div>
  )
}
