import { useEffect, useState } from 'react'

import IconImage from '~icons/lucide/image'

import { AppSelect } from '@/components/ui/AppSelect'
import { useEditorStore } from '@/app/editor/active-store'

import type { Fill, ImageScaleMode } from '@open-pencil/scene-graph'

const IMAGE_SCALE_MODES: { value: ImageScaleMode; label: string }[] = [
  { value: 'FILL', label: 'Fill' },
  { value: 'FIT', label: 'Fit' },
  { value: 'CROP', label: 'Crop' },
  { value: 'TILE', label: 'Tile' }
]

interface ImageFillPickerProps {
  fill: Fill
  onUpdate?: (fill: Fill) => void
}

export function ImageFillPicker({ fill, onUpdate }: ImageFillPickerProps) {
  const store = useEditorStore()
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!fill.imageHash) {
      setImagePreviewUrl(null)
      return
    }
    const data = store.getImage(fill.imageHash)
    if (!data) {
      setImagePreviewUrl(null)
      return
    }
    const blob = new Blob([data])
    const url = URL.createObjectURL(blob)
    setImagePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [fill.imageHash])

  function pickImage() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/webp'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const bytes = new Uint8Array(await file.arrayBuffer())
      const hash = store.storeImage(bytes)
      onUpdate?.({
        ...fill,
        type: 'IMAGE',
        imageHash: hash,
        imageScaleMode: fill.imageScaleMode ?? 'FILL'
      })
    }
    input.click()
  }

  return (
    <div className="space-y-2">
      {imagePreviewUrl && (
        <div className="flex h-24 items-center justify-center overflow-hidden rounded border border-border">
          <img src={imagePreviewUrl} className="max-h-full max-w-full object-contain" />
        </div>
      )}
      <button
        className="flex h-7 w-full cursor-pointer items-center justify-center gap-1 rounded border border-border bg-input text-xs text-surface hover:bg-hover"
        data-test-id="fill-picker-choose-image"
        onClick={pickImage}
      >
        <IconImage className="size-3" />
        {fill.imageHash ? 'Replace' : 'Choose image'}
      </button>
      <AppSelect
        value={fill.imageScaleMode ?? 'FILL'}
        options={IMAGE_SCALE_MODES}
        onChange={(m) => onUpdate?.({ ...fill, imageScaleMode: m as ImageScaleMode })}
      />
    </div>
  )
}
