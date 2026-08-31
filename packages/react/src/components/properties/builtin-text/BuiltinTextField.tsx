import { AppSelect } from '#react/components/ui/AppSelect'
import { IconButton } from '#react/components/ui/IconButton'
import { Tip } from '#react/components/ui/Tip'
import {
  adjustBlocksIndent,
  selectedBlocks,
  setBlocksHeading,
  toggleBlocksList
} from '#react/controls/builtin-text/edit'
import { clipboardImageFiles } from '#react/controls/builtin-text/images'
import type { HeadingLevel, RichImage } from '#react/controls/builtin-text/lists'
import { useI18n } from '#react/i18n'
import { Image as ImageIcon, Link, List, ListOrdered, Strikethrough } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const EDITOR_CLASS =
  'min-h-24 w-full rounded border border-border bg-[#eee] px-1.5 py-1 text-[11px] text-[#1f1f1f] outline-none focus:border-accent [&_a]:text-accent [&_a]:underline [&_[data-rich-marker]]:select-none [&_[data-rich-marker]]:pr-1 [&_[data-rich-marker]]:opacity-70 [&_h1]:text-[18px] [&_h1]:font-bold [&_h2]:text-[16px] [&_h2]:font-bold [&_h3]:text-[15px] [&_h3]:font-bold [&_h4]:text-[13px] [&_h4]:font-bold [&_h5]:text-[12px] [&_h5]:font-bold [&_h6]:text-[11px] [&_h6]:font-bold [&_img]:block [&_img]:max-w-full'

const TOOL_INPUT_CLASS =
  'h-6 rounded border border-border bg-[#eee] px-1 text-[11px] text-[#1f1f1f] outline-none placeholder:text-[#9ca3af] focus:border-accent'

function rememberRange(): Range | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  return selection.getRangeAt(0).cloneRange()
}

function restoreRange(range: Range | null) {
  if (!range) return
  const selection = window.getSelection()
  if (!selection) return
  selection.removeAllRanges()
  selection.addRange(range)
}

function rangeInside(root: HTMLElement, range: Range | null): range is Range {
  if (!range) return false
  const ancestor = range.commonAncestorContainer
  return ancestor === root || root.contains(ancestor)
}

function wrapRange(root: HTMLElement, saved: Range | null, property: string, value: string) {
  root.focus()
  let range = saved
  if (rangeInside(root, range)) restoreRange(range)
  else {
    const selection = window.getSelection()
    range =
      selection && selection.rangeCount > 0 && root.contains(selection.anchorNode)
        ? selection.getRangeAt(0)
        : null
  }
  if (!range || !rangeInside(root, range) || range.collapsed) {
    const block = selectedBlocks(root, range)[0]
    if (!block) return
    range = document.createRange()
    range.selectNodeContents(block)
    const marker = [...block.childNodes].find(
      (node) => node instanceof HTMLElement && node.dataset.richMarker != null
    )
    if (marker) range.setStartAfter(marker)
  }
  restoreRange(range)
  const span = document.createElement('span')
  span.style.setProperty(property, value)
  try {
    span.appendChild(range.extractContents())
    range.insertNode(span)
  } catch {
    return
  }
}

function ColorSwatch({
  label,
  value,
  kind,
  onChange
}: {
  label: string
  value: string
  kind: 'text' | 'background'
  onChange: (value: string) => void
}) {
  return (
    <Tip label={label}>
      <label className="relative flex size-6 shrink-0 cursor-pointer items-center justify-center rounded border border-border bg-white">
        {kind === 'text' ? (
          <span className="flex flex-col items-center leading-none">
            <span className="text-[11px] font-bold text-[#1f1f1f]">A</span>
            <span className="mt-px h-[3px] w-3 rounded-[1px]" style={{ background: value }} />
          </span>
        ) : (
          <span
            className="rounded-[2px] px-0.5 text-[10px] font-bold text-[#1f1f1f]"
            style={{ background: value }}
          >
            A
          </span>
        )}
        <input
          type="color"
          aria-label={label}
          value={value}
          className="absolute inset-0 cursor-pointer opacity-0"
          onMouseDown={(event) => event.preventDefault()}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </Tip>
  )
}

function insertNodeAt(root: HTMLElement, saved: Range | null, node: Node) {
  root.focus()
  let range = saved
  if (rangeInside(root, range)) restoreRange(range)
  else {
    range = document.createRange()
    range.selectNodeContents(root)
    range.collapse(false)
  }
  range.insertNode(node)
  range.setStartAfter(node)
  range.collapse(true)
  restoreRange(range)
}

function imageElement(image: RichImage): HTMLElement {
  const wrap = document.createElement('span')
  wrap.contentEditable = 'false'
  wrap.dataset.richImage = '1'
  wrap.style.display = 'inline-block'
  wrap.style.resize = 'both'
  wrap.style.overflow = 'hidden'
  wrap.style.maxWidth = '100%'
  const width = Math.max(1, image.width || 120)
  const height = Math.max(1, image.height || 80)
  wrap.style.width = `${width}px`
  wrap.style.height = `${height}px`
  const img = document.createElement('img')
  img.src = image.src
  img.alt = ''
  img.dataset.imageHash = image.hash
  img.dataset.ossPath = image.ossPath
  img.width = width
  img.height = height
  img.draggable = false
  img.style.width = '100%'
  img.style.height = '100%'
  img.style.display = 'block'
  wrap.appendChild(img)
  return wrap
}

function decorateImages(root: HTMLElement) {
  for (const img of [...root.querySelectorAll('img')]) {
    if (img.parentElement?.dataset.richImage != null) continue
    const image: RichImage = {
      hash: img.dataset.imageHash ?? '',
      ossPath: img.dataset.ossPath ?? '',
      src: img.src,
      width: img.width || img.naturalWidth || 120,
      height: img.height || img.naturalHeight || 80
    }
    if (!image.hash) continue
    img.replaceWith(imageElement(image))
  }
}

function syncImageSizes(root: HTMLElement) {
  for (const wrap of root.querySelectorAll<HTMLElement>('[data-rich-image]')) {
    const img = wrap.querySelector('img')
    if (!img) continue
    const width = Math.max(1, Math.round(wrap.offsetWidth || img.width || 0))
    const height = Math.max(1, Math.round(wrap.offsetHeight || img.height || 0))
    img.width = width
    img.height = height
  }
}

function imageFromEvent(target: EventTarget | null): HTMLImageElement | null {
  if (target instanceof HTMLImageElement) return target
  if (target instanceof Element) {
    const wrap = target.closest('[data-rich-image]')
    const img = wrap?.querySelector('img')
    return img instanceof HTMLImageElement ? img : null
  }
  return null
}

export function BuiltinTextField({
  html,
  onPreview,
  onFocusSnapshot,
  onCommit,
  onInsertImage
}: {
  html: string
  onPreview: (html: string) => void
  onFocusSnapshot: () => void
  onCommit: () => void
  onInsertImage: (file: File) => Promise<RichImage | null>
}) {
  const { panels, menu } = useI18n()
  const editorRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const focused = useRef(false)
  const savedRange = useRef<Range | null>(null)
  const [heading, setHeadingValue] = useState<HeadingLevel>(0)
  const [linkURL, setLinkURL] = useState('https://')
  const [textColor, setTextColor] = useState('#1f1f1f')
  const [highlightColor, setHighlightColor] = useState('#ffe58f')
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const selectedImage = useRef<HTMLImageElement | null>(null)
  const headingOptions = [
    { value: 0, label: panels.headingText },
    { value: 1, label: 'h1' },
    { value: 2, label: 'h2' },
    { value: 3, label: 'h3' },
    { value: 4, label: 'h4' },
    { value: 5, label: 'h5' },
    { value: 6, label: 'h6' }
  ]

  useEffect(() => {
    const element = editorRef.current
    if (!element || focused.current) return
    if (element.innerHTML !== html) element.innerHTML = html
    decorateImages(element)
  }, [html])

  function emitPreview() {
    const element = editorRef.current
    if (!element) return
    syncImageSizes(element)
    onPreview(element.innerHTML)
    const block = selectedBlocks(element, rememberRange())[0]
    const match = block ? /^H([1-6])$/.exec(block.tagName) : null
    setHeadingValue(match ? (Number(match[1]) as HeadingLevel) : 0)
    const img = selectedImage.current
    if (img) setImageSize({ width: img.width, height: img.height })
  }

  function pickImage(target: EventTarget | null) {
    const img = imageFromEvent(target)
    selectedImage.current = img
    setImageSize(
      img ? { width: img.width || img.offsetWidth, height: img.height || img.offsetHeight } : null
    )
  }

  function setSelectedImageSize(axis: 'width' | 'height', value: number) {
    const img = selectedImage.current
    const wrap = img?.parentElement
    if (!img || !wrap || !Number.isFinite(value) || value <= 0) return
    wrap.style[axis] = `${value}px`
    img[axis] = value
    setImageSize({
      width: axis === 'width' ? value : img.width,
      height: axis === 'height' ? value : img.height
    })
    emitPreview()
  }

  function run(command: string, value?: string) {
    restoreRange(savedRange.current)
    editorRef.current?.focus()
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(command, false, value)
    emitPreview()
  }

  function applyColor(property: 'color' | 'background-color', value: string) {
    const element = editorRef.current
    if (!element) return
    if (property === 'color') setTextColor(value)
    else setHighlightColor(value)
    wrapRange(element, savedRange.current, property, value)
    savedRange.current = rememberRange()
    emitPreview()
  }

  function applyBlock(mutate: (root: HTMLElement, range: Range | null) => void) {
    const element = editorRef.current
    if (!element) return
    element.focus()
    restoreRange(savedRange.current)
    mutate(element, savedRange.current)
    savedRange.current = rememberRange()
    emitPreview()
  }

  function setHeading(level: HeadingLevel) {
    applyBlock((root, range) => setBlocksHeading(root, range, level))
    setHeadingValue(level)
  }

  function applyLink() {
    const href = linkURL.trim()
    if (!href) return
    run('createLink', href)
  }

  async function addImages(files: File[]) {
    const element = editorRef.current
    if (!element || files.length === 0) return
    onFocusSnapshot()
    focused.current = true
    for (const file of files) {
      const image = await onInsertImage(file)
      if (!image) continue
      insertNodeAt(element, savedRange.current, imageElement(image))
      savedRange.current = rememberRange()
    }
    emitPreview()
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex flex-wrap items-center gap-1"
        onMouseDown={() => {
          savedRange.current = rememberRange()
        }}
      >
        <AppSelect<HeadingLevel>
          label={panels.headingText}
          value={heading}
          options={headingOptions}
          className="w-16"
          data-property="builtin-heading"
          onChange={setHeading}
        />
        <div className="flex items-center gap-0.5 rounded border border-border bg-white p-0.5">
          <ColorSwatch
            kind="text"
            label={panels.textColor}
            value={textColor}
            onChange={(value) => applyColor('color', value)}
          />
          <ColorSwatch
            kind="background"
            label={panels.textBackground}
            value={highlightColor}
            onChange={(value) => applyColor('background-color', value)}
          />
        </div>
        <IconButton
          label={panels.insertImage}
          size="xs"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => fileRef.current?.click()}
        >
          <ImageIcon className="size-3" />
        </IconButton>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          className="hidden"
          aria-label={panels.insertImage}
          onChange={(event) => {
            const files = [...(event.target.files ?? [])]
            event.target.value = ''
            void addImages(files)
          }}
        />
        <IconButton
          label={panels.insertLink}
          size="xs"
          onMouseDown={(event) => event.preventDefault()}
          onClick={applyLink}
        >
          <Link className="size-3" />
        </IconButton>
        <input
          aria-label={panels.linkURL}
          value={linkURL}
          placeholder="https://"
          className={`w-28 ${TOOL_INPUT_CLASS}`}
          onChange={(event) => setLinkURL(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              applyLink()
            }
          }}
        />
        <IconButton
          label={menu.strikethrough}
          size="xs"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run('strikeThrough')}
        >
          <Strikethrough className="size-3" />
        </IconButton>
        <IconButton
          label={panels.orderedList}
          size="xs"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyBlock((root, range) => toggleBlocksList(root, range, 'ol'))}
        >
          <ListOrdered className="size-3" />
        </IconButton>
        <IconButton
          label={panels.unorderedList}
          size="xs"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyBlock((root, range) => toggleBlocksList(root, range, 'ul'))}
        >
          <List className="size-3" />
        </IconButton>
        {imageSize ? (
          <>
            <input
              type="number"
              min={1}
              aria-label={panels.width}
              value={imageSize.width}
              className={`w-14 ${TOOL_INPUT_CLASS}`}
              onMouseDown={(event) => event.preventDefault()}
              onChange={(event) => setSelectedImageSize('width', Number(event.target.value))}
            />
            <input
              type="number"
              min={1}
              aria-label={panels.height}
              value={imageSize.height}
              className={`w-14 ${TOOL_INPUT_CLASS}`}
              onMouseDown={(event) => event.preventDefault()}
              onChange={(event) => setSelectedImageSize('height', Number(event.target.value))}
            />
          </>
        ) : null}
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-label={panels.builtinText}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-property="builtin-text"
        className={EDITOR_CLASS}
        onFocus={() => {
          focused.current = true
          onFocusSnapshot()
        }}
        onMouseDown={(event) => {
          pickImage(event.target)
        }}
        onInput={emitPreview}
        onMouseUp={emitPreview}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          event.preventDefault()
          applyBlock((root, range) => adjustBlocksIndent(root, range, event.shiftKey ? -1 : 1))
        }}
        onPaste={(event) => {
          const files = clipboardImageFiles(event)
          if (files.length === 0) return
          event.preventDefault()
          event.stopPropagation()
          void addImages(files)
        }}
        onBlur={() => {
          focused.current = false
          emitPreview()
          onCommit()
        }}
      />
    </div>
  )
}
