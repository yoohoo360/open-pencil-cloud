import { IS_BROWSER } from '@open-pencil/core/constants'

import { ColorSwatch } from '#react/components/properties/builtin-text/ColorSwatch'
import { AppSelect, type AppSelectOption } from '#react/components/ui/AppSelect'
import { IconButton } from '#react/components/ui/IconButton'
import { SegmentedControl } from '#react/components/ui/SegmentedControl'
import {
  adjustBlocksIndent,
  selectedBlocks,
  setBlocksHeading,
  toggleBlocksList
} from '#react/controls/builtin-text/edit'
import { MarkdownEditHistory } from '#react/controls/builtin-text/history'
import { clipboardImageFiles, IMAGE_PLACEHOLDER } from '#react/controls/builtin-text/images'
import type { HeadingLevel, RichImage } from '#react/controls/builtin-text/lists'
import {
  collectImageHashMap,
  htmlToMarkdown,
  insertMarkdownImages,
  looksLikeMarkdown,
  markdownToHTML
} from '#react/controls/builtin-text/markdown'
import { clampMarkdownImageSize } from '#react/controls/builtin-text/panel-image-scale'
import type { RichImageMap } from '#react/controls/builtin-text/storage'
import { useBuiltinEditorMode, type BuiltinEditorMode } from '#react/controls/builtin-text/mode'
import { useI18n } from '#react/i18n'
import {
  Image as ImageIcon,
  Link,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Strikethrough
} from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent
} from 'react'
import { createPortal } from 'react-dom'

type EditorMode = BuiltinEditorMode

const EDITOR_CLASS =
  'box-border min-h-56 bg-transparent px-1.5 py-1 text-[11px] outline-none [&_a]:text-accent [&_a]:underline [&_[data-rich-marker]]:select-none [&_[data-rich-marker]]:pr-1 [&_[data-rich-marker]]:opacity-70 [&_h1]:text-[18px] [&_h1]:font-bold [&_h2]:text-[16px] [&_h2]:font-bold [&_h3]:text-[15px] [&_h3]:font-bold [&_h4]:text-[13px] [&_h4]:font-bold [&_h5]:text-[12px] [&_h5]:font-bold [&_h6]:text-[11px] [&_h6]:font-bold [&_img]:block [&_[data-rich-image]]:my-1 [&_[data-rich-image]]:inline-block [&_[data-rich-image]]:min-h-[40px] [&_[data-rich-image]]:min-w-[40px] [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_pre]:my-2 [&_pre]:rounded [&_pre]:bg-muted/40 [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-[11px] [&_code]:font-mono [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:opacity-80'

const MARKDOWN_CLASS =
  'box-border min-h-56 resize-y bg-panel px-1.5 py-1 font-mono text-[11px] text-surface outline-none'

const TOOL_INPUT_CLASS =
  'h-6 rounded border border-border bg-[#eee] px-1 text-[11px] text-[#1f1f1f] outline-none placeholder:text-[#9ca3af] focus:border-accent'

const CANVAS_SYNC_MS = 150
/** Expanded float is wider than the properties panel, same height, docked right. */
const EXPAND_WIDTH_RATIO = 1.75

type PanelDockRect = {
  top: number
  right: number
  height: number
  width: number
}

function measurePropertiesDock(): PanelDockRect | null {
  if (!IS_BROWSER) return null
  const panel = document.querySelector<HTMLElement>('[data-test-id="properties-panel"]')
  if (!panel) return null
  const rect = panel.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) return null
  const width = Math.max(
    Math.round(rect.width * EXPAND_WIDTH_RATIO),
    Math.round(rect.width + 160)
  )
  return {
    top: Math.round(rect.top),
    right: Math.max(0, Math.round(window.innerWidth - rect.right)),
    height: Math.round(rect.height),
    width: Math.min(width, Math.round(window.innerWidth - 24))
  }
}

function cancelTimeout(timer: { current: ReturnType<typeof setTimeout> | null }) {
  if (timer.current == null) return
  clearTimeout(timer.current)
  timer.current = null
}

function isComposingKey(event: KeyboardEvent): boolean {
  return event.nativeEvent.isComposing || event.key === 'Process'
}

function shouldSyncOnKeyUp(event: KeyboardEvent): boolean {
  if (isComposingKey(event) || event.metaKey || event.ctrlKey) return false
  const key = event.key
  if (
    key === 'Shift' ||
    key === 'Control' ||
    key === 'Alt' ||
    key === 'Meta' ||
    key === 'CapsLock' ||
    key === 'Escape' ||
    key === 'Tab' ||
    key.startsWith('Arrow') ||
    key === 'Home' ||
    key === 'End' ||
    key === 'PageUp' ||
    key === 'PageDown'
  ) {
    return false
  }
  return true
}

function isKeyboardInput(event: { nativeEvent: Event }): boolean {
  if (!(event.nativeEvent instanceof InputEvent)) return false
  const type = event.nativeEvent.inputType
  return (
    type === 'insertText' ||
    type === 'insertCompositionText' ||
    type === 'insertLineBreak' ||
    type === 'insertParagraph' ||
    type === 'deleteContentBackward' ||
    type === 'deleteContentForward' ||
    type === 'deleteWordBackward' ||
    type === 'deleteWordForward' ||
    type === 'deleteSoftLineBackward' ||
    type === 'deleteSoftLineForward'
  )
}

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

function committedImageBox(img: HTMLImageElement): { width: number; height: number } {
  return {
    width: Number(img.getAttribute('width')) || img.width || 160,
    height: Number(img.getAttribute('height')) || img.height || 100
  }
}

/** Panel images use canvas document pixels 1:1 (no panel-width scale). */
function layoutPanelImages(root: HTMLElement) {
  for (const wrap of root.querySelectorAll<HTMLElement>('[data-rich-image]')) {
    const img = wrap.querySelector('img')
    if (!img) continue
    const doc = committedImageBox(img)
    const nextWidth = `${doc.width}px`
    const nextHeight = `${doc.height}px`
    if (
      wrap.style.width === nextWidth &&
      wrap.style.height === nextHeight &&
      wrap.style.display === 'inline-block'
    ) {
      continue
    }
    wrap.style.display = 'inline-block'
    wrap.style.width = nextWidth
    wrap.style.height = nextHeight
    wrap.style.maxWidth = 'none'
    wrap.style.overflow = 'hidden'
    wrap.style.resize = 'both'
    wrap.style.background = wrap.style.background || '#ececec'
    img.style.width = '100%'
    img.style.height = '100%'
    img.style.display = 'block'
    img.style.objectFit = 'fill'
  }
}

function imageElement(image: RichImage): HTMLElement {
  const wrap = document.createElement('span')
  wrap.contentEditable = 'false'
  wrap.dataset.richImage = '1'
  wrap.dataset.imageHash = image.hash
  wrap.dataset.ossPath = image.ossPath
  const docW = Math.max(1, image.width || 160)
  const docH = Math.max(1, image.height || 100)
  wrap.style.display = 'inline-block'
  wrap.style.resize = 'both'
  wrap.style.overflow = 'hidden'
  wrap.style.maxWidth = 'none'
  wrap.style.width = `${docW}px`
  wrap.style.height = `${docH}px`
  wrap.style.background = '#ececec'
  const img = document.createElement('img')
  img.src = image.src || IMAGE_PLACEHOLDER
  img.alt = ''
  img.dataset.imageHash = image.hash
  img.dataset.ossPath = image.ossPath
  img.setAttribute('width', String(docW))
  img.setAttribute('height', String(docH))
  img.width = docW
  img.height = docH
  img.draggable = false
  img.style.width = '100%'
  img.style.height = '100%'
  img.style.display = 'block'
  img.style.objectFit = 'fill'
  wrap.appendChild(img)
  return wrap
}

function decorateImages(root: HTMLElement) {
  for (const img of [...root.querySelectorAll('img')]) {
    const width = Number(img.getAttribute('width')) || img.width || img.naturalWidth || 160
    const height = Number(img.getAttribute('height')) || img.height || img.naturalHeight || 100
    if (img.parentElement?.dataset.richImage != null) {
      if (!img.getAttribute('src')) img.src = IMAGE_PLACEHOLDER
      img.setAttribute('width', String(Math.max(1, width)))
      img.setAttribute('height', String(Math.max(1, height)))
      continue
    }
    img.replaceWith(
      imageElement({
        hash: img.dataset.imageHash || img.dataset.ossPath || 'image',
        ossPath: img.dataset.ossPath ?? '',
        src: img.src,
        width,
        height
      })
    )
  }
  layoutPanelImages(root)
}

function displayImageBox(wrap: HTMLElement, img: HTMLImageElement): { width: number; height: number } {
  return {
    width: Math.max(1, Math.round(wrap.offsetWidth || img.width || 0)),
    height: Math.max(1, Math.round(wrap.offsetHeight || img.height || 0))
  }
}

function imageSizesChanged(root: HTMLElement): boolean {
  for (const wrap of root.querySelectorAll<HTMLElement>('[data-rich-image]')) {
    const img = wrap.querySelector('img')
    if (!img) continue
    const size = displayImageBox(wrap, img)
    const committed = committedImageBox(img)
    if (size.width !== committed.width || size.height !== committed.height) return true
  }
  return false
}

function writeDocumentImageSize(
  wrap: HTMLElement,
  img: HTMLImageElement,
  size: { width: number; height: number },
  hostContentWidth: number
) {
  const next = clampMarkdownImageSize(size, hostContentWidth)
  img.setAttribute('width', String(next.width))
  img.setAttribute('height', String(next.height))
  img.width = next.width
  img.height = next.height
  wrap.style.width = `${next.width}px`
  wrap.style.height = `${next.height}px`
  return next
}

function syncImageSizes(root: HTMLElement, hostContentWidth: number) {
  for (const wrap of root.querySelectorAll<HTMLElement>('[data-rich-image]')) {
    const img = wrap.querySelector('img')
    if (!img) continue
    writeDocumentImageSize(wrap, img, displayImageBox(wrap, img), hostContentWidth)
  }
  layoutPanelImages(root)
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

function handleHistoryKey(event: KeyboardEvent, onUndo: () => void, onRedo: () => void): boolean {
  const modifier = event.metaKey || event.ctrlKey
  if (!modifier) return false
  if (event.code === 'KeyZ') {
    event.preventDefault()
    event.stopPropagation()
    if (event.shiftKey) onRedo()
    else onUndo()
    return true
  }
  if (event.code === 'KeyY') {
    event.preventDefault()
    event.stopPropagation()
    onRedo()
    return true
  }
  return false
}

export function BuiltinTextField({
  selectionId,
  html,
  markdown,
  contentWidth,
  onApply,
  onInsertImage
}: {
  selectionId: string
  html: string
  markdown: string
  /** Canvas Markdown content width — panel editor and images match this 1:1. */
  contentWidth: number
  onApply: (markdown: string, imageHashes?: RichImageMap) => void
  onInsertImage: (file: File) => Promise<RichImage | null>
}) {
  const { panels, menu } = useI18n()
  const { mode, setMode, pageBackground, pageInk } = useBuiltinEditorMode()
  const editorRef = useRef<HTMLDivElement>(null)
  const markdownRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const skipHtmlSync = useRef(false)
  const skipMarkdownSync = useRef(false)
  const savedRange = useRef<Range | null>(null)
  const contentWidthRef = useRef(contentWidth)
  contentWidthRef.current = Math.max(1, contentWidth)
  const canvasWidth = contentWidthRef.current
  const [expanded, setExpanded] = useState(false)
  const [dock, setDock] = useState<PanelDockRect | null>(null)
  const [heading, setHeadingValue] = useState<HeadingLevel>(0)
  const [linkURL, setLinkURL] = useState('https://')
  const [textColor, setTextColor] = useState('#1f1f1f')
  const [highlightColor, setHighlightColor] = useState('#ffe58f')
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const selectedImage = useRef<HTMLImageElement | null>(null)
  const commitResizeRef = useRef<() => void>(() => {})
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const composing = useRef(false)
  const flushCanvasSyncRef = useRef<() => void>(() => {})
  const historyRef = useRef(new MarkdownEditHistory(markdown))
  const selectionIdRef = useRef(selectionId)
  const headingOptions: AppSelectOption<HeadingLevel>[] = [
    { value: 0, label: 'text' },
    { value: 1, label: 'h1' },
    { value: 2, label: 'h2' },
    { value: 3, label: 'h3' },
    { value: 4, label: 'h4' },
    { value: 5, label: 'h5' },
    { value: 6, label: 'h6' }
  ]

  useLayoutEffect(() => {
    const element = editorRef.current
    if (!element || mode !== 'rich') return
    if (skipHtmlSync.current) {
      skipHtmlSync.current = false
      layoutPanelImages(element)
      return
    }
    if (element.innerHTML !== html) element.innerHTML = html
    decorateImages(element)
  }, [html, mode, contentWidth, expanded])

  useLayoutEffect(() => {
    const element = markdownRef.current
    if (!element || mode !== 'markdown') return
    if (skipMarkdownSync.current) {
      skipMarkdownSync.current = false
      return
    }
    if (element.value !== markdown) element.value = markdown
  }, [markdown, mode, expanded])

  useEffect(() => {
    if (mode !== 'rich') return
    function onPointerUp() {
      const root = editorRef.current
      if (!root || !imageSizesChanged(root)) return
      commitResizeRef.current()
    }
    window.addEventListener('pointerup', onPointerUp, true)
    window.addEventListener('mouseup', onPointerUp, true)
    return () => {
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('mouseup', onPointerUp, true)
    }
  }, [mode])

  useEffect(() => {
    if (selectionIdRef.current === selectionId) return
    selectionIdRef.current = selectionId
    flushCanvasSyncRef.current()
    historyRef.current.clear(historyRef.current.value)
    setExpanded(false)
  }, [selectionId])

  useLayoutEffect(() => {
    if (!expanded) {
      setDock(null)
      return
    }
    function updateDock() {
      setDock(measurePropertiesDock())
    }
    updateDock()
    const panel = document.querySelector('[data-test-id="properties-panel"]')
    const observer =
      typeof ResizeObserver !== 'undefined' && panel
        ? new ResizeObserver(updateDock)
        : null
    if (panel && observer) observer.observe(panel)
    window.addEventListener('resize', updateDock)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateDock)
    }
  }, [expanded])

  useEffect(() => {
    if (!expanded) return
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  useLayoutEffect(() => {
    return () => {
      cancelTimeout(syncTimer)
      flushCanvasSyncRef.current()
    }
  }, [])

  function emitRich() {
    cancelTimeout(syncTimer)
    const element = editorRef.current
    if (!element) return
    syncImageSizes(element, contentWidthRef.current)
    const hashes = collectImageHashMap(element.innerHTML)
    const next = htmlToMarkdown(element.innerHTML)
    if (!historyRef.current.record(next)) {
      if (Object.keys(hashes).length > 0) onApply(next, hashes)
      refreshToolbar()
      return
    }
    skipHtmlSync.current = true
    onApply(next, hashes)
    refreshToolbar()
  }

  function emitMarkdown() {
    cancelTimeout(syncTimer)
    const element = markdownRef.current
    if (!element) return
    const next = element.value
    const hashes = collectImageHashMap(next)
    if (!historyRef.current.record(next)) {
      if (Object.keys(hashes).length > 0) onApply(next, hashes)
      return
    }
    skipMarkdownSync.current = true
    onApply(next, hashes)
  }

  function beginGroup() {
    historyRef.current.beginGroup()
  }

  function restoreHistory(next: string | null) {
    if (next == null) return
    skipHtmlSync.current = false
    skipMarkdownSync.current = false
    onApply(next)
  }

  function undoEdit() {
    flushCanvasSync()
    restoreHistory(historyRef.current.undo())
  }

  function redoEdit() {
    cancelTimeout(syncTimer)
    restoreHistory(historyRef.current.redo())
  }

  function flushCanvasSync() {
    cancelTimeout(syncTimer)
    if (mode === 'rich') emitRich()
    else emitMarkdown()
  }

  function scheduleCanvasSync() {
    if (composing.current) return
    cancelTimeout(syncTimer)
    syncTimer.current = setTimeout(() => {
      syncTimer.current = null
      flushCanvasSyncRef.current()
    }, CANVAS_SYNC_MS)
  }

  flushCanvasSyncRef.current = flushCanvasSync

  function commitImageResize() {
    const element = editorRef.current
    if (!element || !imageSizesChanged(element)) return
    beginGroup()
    emitRich()
    beginGroup()
  }

  function selectedDocumentImageSize(): { width: number; height: number } | null {
    const img = selectedImage.current
    const wrap = img?.parentElement
    if (!img || !wrap) return null
    return displayImageBox(wrap, img)
  }

  function refreshToolbar() {
    const element = editorRef.current
    if (!element) return
    const block = selectedBlocks(element, rememberRange())[0]
    const match = block ? /^H([1-6])$/.exec(block.tagName) : null
    setHeadingValue(match ? (Number(match[1]) as HeadingLevel) : 0)
    setImageSize(selectedDocumentImageSize())
  }

  function switchMode(next: EditorMode) {
    if (next === mode) return
    flushCanvasSync()
    beginGroup()
    skipHtmlSync.current = false
    skipMarkdownSync.current = false
    setMode(next)
  }

  function pickImage(target: EventTarget | null) {
    selectedImage.current = imageFromEvent(target)
    setImageSize(selectedDocumentImageSize())
  }

  commitResizeRef.current = commitImageResize

  function onEditorInput(event: FormEvent) {
    if (composing.current || isKeyboardInput(event)) return
    flushCanvasSync()
  }

  function onEditorKeyUp(event: KeyboardEvent) {
    if (!shouldSyncOnKeyUp(event)) return
    scheduleCanvasSync()
  }

  function onEditorCompositionStart() {
    composing.current = true
  }

  function onEditorCompositionEnd() {
    composing.current = false
    scheduleCanvasSync()
  }

  function setSelectedImageSize(axis: 'width' | 'height', value: number) {
    const img = selectedImage.current
    const wrap = img?.parentElement
    if (!img || !wrap || !Number.isFinite(value) || value <= 0) return
    // Document pixels 1:1 with the canvas; aspect is not locked.
    const current = committedImageBox(img)
    const next = writeDocumentImageSize(
      wrap,
      img,
      {
        width: axis === 'width' ? Math.max(1, Math.round(value)) : current.width,
        height: axis === 'height' ? Math.max(1, Math.round(value)) : current.height
      },
      contentWidthRef.current
    )
    setImageSize(next)
    beginGroup()
    flushCanvasSync()
    beginGroup()
  }

  function closeExpanded() {
    setExpanded(false)
  }

  function run(command: string, value?: string) {
    restoreRange(savedRange.current)
    editorRef.current?.focus()
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(command, false, value)
    beginGroup()
    emitRich()
    beginGroup()
  }

  function applyColor(property: 'color' | 'background-color', value: string) {
    const element = editorRef.current
    if (!element) return
    if (property === 'color') setTextColor(value)
    else setHighlightColor(value)
    wrapRange(element, savedRange.current, property, value)
    savedRange.current = rememberRange()
    beginGroup()
    emitRich()
    beginGroup()
  }

  function applyBlock(mutate: (root: HTMLElement, range: Range | null) => void) {
    const element = editorRef.current
    if (!element) return
    element.focus()
    restoreRange(savedRange.current)
    mutate(element, savedRange.current)
    savedRange.current = rememberRange()
    beginGroup()
    emitRich()
    beginGroup()
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
    beginGroup()
    for (const file of files) {
      const image = await onInsertImage(file)
      if (!image) continue
      insertNodeAt(element, savedRange.current, imageElement(image))
      savedRange.current = rememberRange()
    }
    emitRich()
    beginGroup()
  }

  async function addMarkdownImages(files: File[]) {
    const element = markdownRef.current
    if (!element || files.length === 0) return
    beginGroup()
    const images: RichImage[] = []
    for (const file of files) {
      const image = await onInsertImage(file)
      if (image) images.push(image)
    }
    const next = insertMarkdownImages(
      element.value,
      element.selectionStart,
      element.selectionEnd,
      images
    )
    element.value = next.value
    element.setSelectionRange(next.cursor, next.cursor)
    emitMarkdown()
    beginGroup()
  }

  const editorSurfaceStyle = {
    width: canvasWidth,
    minWidth: canvasWidth,
    backgroundColor: pageBackground,
    color: pageInk
  } as const

  function openExpanded() {
    flushCanvasSync()
    setDock(measurePropertiesDock())
    setExpanded(true)
  }

  const editorBody =
    mode === 'rich' ? (
      <div
        ref={editorRef}
        role="textbox"
        aria-label={panels.builtinText}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-property="builtin-text"
        className={EDITOR_CLASS}
        style={editorSurfaceStyle}
        onFocus={() => {
          beginGroup()
        }}
        onMouseDown={(event) => {
          pickImage(event.target)
        }}
        onInput={onEditorInput}
        onKeyUp={onEditorKeyUp}
        onCompositionStart={onEditorCompositionStart}
        onCompositionEnd={onEditorCompositionEnd}
        onDragEnd={flushCanvasSync}
        onDrop={flushCanvasSync}
        onMouseUp={() => {
          refreshToolbar()
          commitImageResize()
        }}
        onKeyDown={(event) => {
          if (handleHistoryKey(event, undoEdit, redoEdit)) return
          if (event.key !== 'Tab') return
          event.preventDefault()
          applyBlock((root, range) => adjustBlocksIndent(root, range, event.shiftKey ? -1 : 1))
        }}
        onPaste={(event) => {
          const text = event.clipboardData?.getData('text/plain') ?? ''
          const files = clipboardImageFiles(event)
          if (files.length > 0 && !text.trim()) {
            event.preventDefault()
            event.stopPropagation()
            void addImages(files)
            return
          }
          if (text.trim() && looksLikeMarkdown(text)) {
            event.preventDefault()
            event.stopPropagation()
            const fragment = markdownToHTML(text)
            const root = editorRef.current
            if (!root) return
            root.focus()
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0)
              range.deleteContents()
              const template = document.createElement('template')
              template.innerHTML = fragment
              const node = template.content
              range.insertNode(node)
              selection.collapseToEnd()
            } else {
              root.insertAdjacentHTML('beforeend', fragment)
            }
            emitRich()
          }
        }}
        onBlur={() => {
          composing.current = false
          flushCanvasSync()
          beginGroup()
        }}
      />
    ) : (
      <textarea
        ref={markdownRef}
        aria-label={panels.editAsMarkdown}
        data-property="builtin-markdown"
        defaultValue={markdown}
        className={MARKDOWN_CLASS}
        style={{ width: canvasWidth, minWidth: canvasWidth }}
        spellCheck={false}
        onFocus={() => {
          beginGroup()
        }}
        onInput={onEditorInput}
        onKeyUp={onEditorKeyUp}
        onCompositionStart={onEditorCompositionStart}
        onCompositionEnd={onEditorCompositionEnd}
        onKeyDown={(event) => {
          handleHistoryKey(event, undoEdit, redoEdit)
        }}
        onPaste={(event) => {
          const text = event.clipboardData?.getData('text/plain') ?? ''
          const files = clipboardImageFiles(event)
          if (files.length > 0 && !text.trim()) {
            event.preventDefault()
            event.stopPropagation()
            void addMarkdownImages(files)
            return
          }
          requestAnimationFrame(() => {
            flushCanvasSync()
          })
        }}
        onBlur={() => {
          composing.current = false
          flushCanvasSync()
          beginGroup()
        }}
      />
    )

  const floatDock =
    dock ??
    (expanded && IS_BROWSER
      ? {
          top: 0,
          right: 0,
          height: window.innerHeight,
          width: Math.min(Math.round(window.innerWidth * 0.4), 560)
        }
      : null)

  const expandedFloat =
    expanded && floatDock && IS_BROWSER
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={panels.expandBuiltinText}
            data-slot="builtin-text-expand"
            className="fixed z-[110] flex flex-col overflow-hidden rounded-lg border border-border bg-panel shadow-[0_8px_30px_rgb(0_0_0/0.4)]"
            style={{
              top: floatDock.top,
              right: floatDock.right,
              width: floatDock.width,
              height: floatDock.height
            }}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-2 py-1.5">
              <span className="text-xs font-medium text-surface">{panels.builtinText}</span>
              <IconButton
                label={panels.collapseBuiltinText}
                size="xs"
                onMouseDown={(event) => event.preventDefault()}
                onClick={closeExpanded}
              >
                <Minimize2 className="size-3" />
              </IconButton>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-2">{editorBody}</div>
          </div>,
          document.body
        )
      : null

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex flex-wrap items-center gap-1"
        onMouseDown={() => {
          savedRange.current = rememberRange()
        }}
      >
        <div className={'flex gap-3'}>
          <SegmentedControl
            label={panels.builtinTextMode}
            size="sm"
            value={mode}
            options={[
              { value: 'rich', label: panels.editAsRichText },
              { value: 'markdown', label: panels.editAsMarkdown }
            ]}
            ui={{ root: 'shrink-0' }}
            onChange={(value) => switchMode(value as EditorMode)}
          />

          {mode === 'rich' && (
            <AppSelect<HeadingLevel>
              label={panels.headingText}
              value={heading}
              options={headingOptions}
              className="w-16"
              data-property="builtin-heading"
              onChange={setHeading}
            />
          )}
          <IconButton
            label={expanded ? panels.collapseBuiltinText : panels.expandBuiltinText}
            size="xs"
            active={expanded}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (expanded) closeExpanded()
              else openExpanded()
            }}
          >
            {expanded ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
          </IconButton>
        </div>

        {mode === 'rich' ? (
          <div className={'inline-flex items-center'}>
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
        ) : null}
      </div>
      {expanded ? (
        <div
          className="h-64 w-full rounded border border-dashed border-border/60"
          aria-hidden
        />
      ) : (
        <div className="max-h-64 w-full overflow-auto rounded border border-border">
          {editorBody}
        </div>
      )}
      {expandedFloat}
    </div>
  )
}
