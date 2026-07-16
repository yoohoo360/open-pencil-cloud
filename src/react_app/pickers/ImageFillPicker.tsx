import { Image } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { AppSelect } from '@/react_app/ui/AppSelect'
import { useEditor } from '@open-pencil/react'

import type { Fill, ImageScaleMode } from '@open-pencil/core'

const IMAGE_SCALE_MODES: { value: ImageScaleMode; label: string }[] = [
  { value: 'FILL', label: 'Fill' },
  { value: 'FIT', label: 'Fit' },
  { value: 'CROP', label: 'Crop' },
  { value: 'TILE', label: 'Tile' }
]

export function ImageFillPicker({
  fill,
  onUpdate
}: {
  fill: Fill
  onUpdate: (fill: Fill) => void
}) {
  const store = useEditor() as ReturnType<typeof useEditor> & {
    getImage: (hash: string) => Uint8Array | undefined
    storeImage: (bytes: Uint8Array) => string
  }
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!fill.imageHash) {
      setPreviewUrl(null)
      return
    }
    const data = store.getImage(fill.imageHash)
    if (!data) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(new Blob([new Uint8Array(data)]))
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [fill.imageHash, store])

  async function onFileChange(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    const bytes = new Uint8Array(await file.arrayBuffer())
    const hash = store.storeImage(bytes)
    onUpdate({
      ...fill,
      type: 'IMAGE',
      imageHash: hash,
      imageScaleMode: fill.imageScaleMode ?? 'FILL'
    })
  }

  const scaleMode = fill.imageScaleMode ?? ('FILL' as ImageScaleMode)

  return (
    <div className="space-y-2">
      {previewUrl ? (
        <div className="flex h-24 items-center justify-center overflow-hidden rounded border border-border">
          <img src={previewUrl} className="max-h-full max-w-full object-contain" alt="" />
        </div>
      ) : null}
      <button
        type="button"
        className="flex h-7 w-full cursor-pointer items-center justify-center gap-1 rounded border border-border bg-input text-xs text-surface hover:bg-hover"
        data-test-id="fill-picker-choose-image"
        onClick={() => inputRef.current?.click()}
      >
        <Image className="size-3" />
        {fill.imageHash ? 'Replace' : 'Choose image'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => void onFileChange(e.currentTarget.files)}
      />
      <AppSelect
        value={scaleMode}
        options={IMAGE_SCALE_MODES}
        onValueChange={(m) => onUpdate({ ...fill, imageScaleMode: m })}
      />
    </div>
  )
}
