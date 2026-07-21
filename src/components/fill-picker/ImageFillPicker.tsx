import IconLucideImage from '~icons/lucide/image'
import { memo, useEffect, useRef, useState, type ChangeEvent } from 'react'

import AppSelect from '@/components/ui/AppSelect'
import { useEditorStore } from '@/app/editor/active-store'

import type { Fill, ImageScaleMode } from '@open-pencil/scene-graph'

const IMAGE_SCALE_MODES: { value: ImageScaleMode; label: string }[] = [
  { value: 'FILL', label: 'Fill' },
  { value: 'FIT', label: 'Fit' },
  { value: 'CROP', label: 'Crop' },
  { value: 'TILE', label: 'Tile' }
]

export type ImageFillPickerProps = {
  fill: Fill
  onUpdate?: (fill: Fill) => void
}

export const ImageFillPicker = memo(function ImageFillPicker({
  fill,
  onUpdate
}: ImageFillPickerProps) {
  const store = useEditorStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!fill.imageHash) {
      setImageBlob(null)
      return
    }
    const data = store.getImage(fill.imageHash)
    setImageBlob(data ? new Blob([new Uint8Array(data)]) : null)
  }, [fill.imageHash, store])

  useEffect(() => {
    if (!imageBlob) {
      setImagePreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(imageBlob)
    setImagePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageBlob])

  const pickImage = () => fileInputRef.current?.click()

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
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

  const scaleMode = fill.imageScaleMode ?? 'FILL'

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onFileChange}
      />
      {imagePreviewUrl ? (
        <div className="flex h-24 items-center justify-center overflow-hidden rounded border border-border">
          <img src={imagePreviewUrl} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      ) : null}
      <button
        type="button"
        className="flex h-7 w-full cursor-pointer items-center justify-center gap-1 rounded border border-border bg-input text-xs text-surface hover:bg-hover"
        data-test-id="fill-picker-choose-image"
        onClick={pickImage}
      >
        <IconLucideImage className="size-3" />
        {fill.imageHash ? 'Replace' : 'Choose image'}
      </button>
      <AppSelect
        value={scaleMode}
        options={IMAGE_SCALE_MODES}
        onValueChange={(mode) =>
          onUpdate?.({ ...fill, imageScaleMode: mode as ImageScaleMode })
        }
      />
    </div>
  )
})

ImageFillPicker.displayName = 'ImageFillPicker'
export default ImageFillPicker
