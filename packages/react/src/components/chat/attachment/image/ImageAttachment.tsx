import { useState } from 'react'

import type { ImageAttachmentPresentation } from '#react/app/ai/attachment/image/types'

export function ImageAttachment({ attachment }: { attachment: ImageAttachmentPresentation }) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const viewLabel = `View image ${attachment.name}`

  return (
    <>
      <button
        type="button"
        aria-label={viewLabel}
        className="group block overflow-hidden rounded-lg border border-white/25 bg-black/15 text-left shadow-xs transition-colors hover:border-white/50 focus-visible:border-white/60 focus-visible:outline-2 focus-visible:outline-white"
        onClick={() => setViewerOpen(true)}
      >
        <img
          src={attachment.previewURL}
          alt={attachment.name}
          className="h-20 w-28 border-b border-white/15 bg-black/10 object-contain"
        />
        <span className="block max-w-28 truncate px-1.5 py-1 text-[9px] leading-tight text-white/85 group-hover:text-white">
          {attachment.name}
        </span>
      </button>
      {viewerOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close image preview"
            onClick={() => setViewerOpen(false)}
          />
          <div className="relative z-10 max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl border border-border bg-panel shadow-xl">
            <div className="border-b border-border px-4 py-2 text-xs text-surface">{attachment.name}</div>
            <div className="flex items-center justify-center bg-canvas p-4">
              <img
                src={attachment.previewURL}
                alt={attachment.name}
                className="max-h-[75vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
