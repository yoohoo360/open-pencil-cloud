import { ColorSwatch } from '#react/components/properties/builtin-text/ColorSwatch'
import { AppSelect } from '#react/components/ui/AppSelect'
import { IconButton } from '#react/components/ui/IconButton'
import { SegmentedControl } from '#react/components/ui/SegmentedControl'
import {
  adjustBlocksIndent,
  selectedBlocks,
  setBlocksHeading,
  toggleBlocksList
} from '#react/controls/builtin-text/edit'
import { MarkdownEditHistory } from '#react/controls/builtin-text/history'
import { clipboardImageFiles } from '#react/controls/builtin-text/images'
import type { HeadingLevel, RichImage } from '#react/controls/builtin-text/lists'
import { htmlToMarkdown, insertMarkdownImages } from '#react/controls/builtin-text/markdown'
import { useBuiltinEditorMode, type BuiltinEditorMode } from '#react/controls/builtin-text/mode'
import { useI18n } from '#react/i18n'
import { Image as ImageIcon, Link, List, ListOrdered, Strikethrough } from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent
} from 'react'

type EditorMode = BuiltinEditorMode

const EDITOR_CLASS =
  'min-h-24 w-full rounded border border-border bg-transparent px-1.5 py-1 text-[11px] outline-none focus:border-accent [&_a]:text-accent [&_a]:underline [&_[data-rich-marker]]:select-none [&_[data-rich-marker]]:pr-1 [&_[data-rich-marker]]:opacity-70 [&_h1]:text-[18px] [&_h1]:font-bold [&_h2]:text-[16px] [&_h2]:font-bold [&_h3]:text-[15px] [&_h3]:font-bold [&_h4]:text-[13px] [&_h4]:font-bold [&_h5]:text-[12px] [&_h5]:font-bold [&_h6]:text-[11px] [&_h6]:font-bold [&_img]:block [&_img]:max-w-full'

const MARKDOWN_CLASS =
  'min-h-24 w-full resize-y rounded border border-border bg-panel px-1.5 py-1 font-mono text-[11px] text-surface outline-none focus:border-accent'

const TOOL_INPUT_CLASS =
  'h-6 rounded border border-border bg-[#eee] px-1 text-[11px] text-[#1f1f1f] outline-none placeholder:text-[#9ca3af] focus:border-accent'

const CANVAS_SYNC_MS = 150

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

function imageBox(wrap: HTMLElement, img: HTMLImageElement): { width: number; height: number } {
  return {
    width: Math.max(1, Math.round(wrap.offsetWidth || img.width || 0)),
    height: Math.max(1, Math.round(wrap.offsetHeight || img.height || 0))
  }
}

function committedImageBox(img: HTMLImageElement): { width: number; height: number } {
  return {
    width: Number(img.getAttribute('width')) || 0,
    height: Number(img.getAttribute('height')) || 0
  }
}

function imageSizesChanged(root: HTMLElement): boolean {
  for (const wrap of root.querySelectorAll<HTMLElement>('[data-rich-image]')) {
    const img = wrap.querySelector('img')
    if (!img) continue
    const size = imageBox(wrap, img)
    const committed = committedImageBox(img)
    if (size.width !== committed.width || size.height !== committed.height) return true
  }
  return false
}

function writeImageSize(
  wrap: HTMLElement,
  img: HTMLImageElement,
  size: { width: number; height: number }
) {
  img.setAttribute('width', String(size.width))
  img.setAttribute('height', String(size.height))
  img.width = size.width
  img.height = size.height
  wrap.style.width = `${size.width}px`
  wrap.style.height = `${size.height}px`
}

function syncImageSizes(root: HTMLElement) {
  for (const wrap of root.querySelectorAll<HTMLElement>('[data-rich-image]')) {
    const img = wrap.querySelector('img')
    if (!img) continue
    writeImageSize(wrap, img, imageBox(wrap, img))
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
  onApply,
  onInsertImage
}: {
  selectionId: string
  html: string
  markdown: string
  onApply: (markdown: string) => void
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
  const headingOptions = [
    { value: 0, label: 'text' },
    { value: 1, label: 'h1' },
    { value: 2, label: 'h2' },
    { value: 3, label: 'h3' },
    { value: 4, label: 'h4' },
    { value: 5, label: 'h5' },
    { value: 6, label: 'h6' }
  ]

  useEffect(() => {
    const element = editorRef.current
    if (!element || mode !== 'preview') return
    if (skipHtmlSync.current) {
      skipHtmlSync.current = false
      return
    }
    if (element.innerHTML !== html) element.innerHTML = html
    decorateImages(element)
  }, [html, mode])

  useEffect(() => {
    const element = markdownRef.current
    if (!element || mode !== 'markdown') return
    if (skipMarkdownSync.current) {
      skipMarkdownSync.current = false
      return
    }
    if (element.value !== markdown) element.value = markdown
  }, [markdown, mode])

  useEffect(() => {
    if (mode !== 'preview') return
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
  }, [selectionId])

  useLayoutEffect(() => {
    return () => {
      cancelTimeout(syncTimer)
      flushCanvasSyncRef.current()
    }
  }, [])

  function emitPreview() {
    cancelTimeout(syncTimer)
    const element = editorRef.current
    if (!element) return
    syncImageSizes(element)
    const next = htmlToMarkdown(element.innerHTML)
    if (!historyRef.current.record(next)) {
      refreshToolbar()
      return
    }
    skipHtmlSync.current = true
    onApply(next)
    refreshToolbar()
  }

  function emitMarkdownPreview() {
    cancelTimeout(syncTimer)
    const element = markdownRef.current
    if (!element) return
    const next = element.value
    if (!historyRef.current.record(next)) return
    skipMarkdownSync.current = true
    onApply(next)
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
    if (mode === 'preview') emitPreview()
    else emitMarkdownPreview()
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
    emitPreview()
    beginGroup()
  }

  function refreshToolbar() {
    const element = editorRef.current
    if (!element) return
    const block = selectedBlocks(element, rememberRange())[0]
    const match = block ? /^H([1-6])$/.exec(block.tagName) : null
    setHeadingValue(match ? (Number(match[1]) as HeadingLevel) : 0)
    const img = selectedImage.current
    const wrap = img?.parentElement
    if (img && wrap) setImageSize(imageBox(wrap, img))
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
    const img = imageFromEvent(target)
    selectedImage.current = img
    const wrap = img?.parentElement
    setImageSize(img && wrap ? imageBox(wrap, img) : null)
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
    wrap.style[axis] = `${value}px`
    writeImageSize(wrap, img, {
      width: axis === 'width' ? value : img.width,
      height: axis === 'height' ? value : img.height
    })
    setImageSize({
      width: axis === 'width' ? value : img.width,
      height: axis === 'height' ? value : img.height
    })
    beginGroup()
    flushCanvasSync()
    beginGroup()
  }

  function run(command: string, value?: string) {
    restoreRange(savedRange.current)
    editorRef.current?.focus()
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(command, false, value)
    beginGroup()
    emitPreview()
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
    emitPreview()
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
    emitPreview()
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
    emitPreview()
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
    emitMarkdownPreview()
    beginGroup()
  }

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
              { value: 'preview', label: panels.editAsPreview },
              { value: 'markdown', label: panels.editAsMarkdown }
            ]}
            ui={{ root: 'shrink-0' }}
            onChange={(value) => switchMode(value as EditorMode)}
          />

          {mode === 'preview' && (
            <AppSelect<HeadingLevel>
              label={panels.headingText}
              value={heading}
              options={headingOptions}
              className="w-16"
              data-property="builtin-heading"
              onChange={setHeading}
            />
          )}
        </div>

        {mode === 'preview' ? (
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
      {mode === 'preview' ? (
        <div
          ref={editorRef}
          role="textbox"
          aria-label={panels.builtinText}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          data-property="builtin-text"
          className={EDITOR_CLASS}
          style={{ backgroundColor: pageBackground, color: pageInk }}
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
            const files = clipboardImageFiles(event)
            if (files.length === 0) return
            event.preventDefault()
            event.stopPropagation()
            void addImages(files)
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
            const files = clipboardImageFiles(event)
            if (files.length === 0) return
            event.preventDefault()
            event.stopPropagation()
            void addMarkdownImages(files)
          }}
          onBlur={() => {
            composing.current = false
            flushCanvasSync()
            beginGroup()
          }}
        />
      )}
    </div>
  )
}
