import { openDocumentShareDialog } from '#react/app/document/access'
import { openPublishLibraryDialog } from '#react/app/libraries'
import { useOptionalAiReview } from '#react/components/AiReview/context'
import { CollabAvatarStack } from '#react/components/CollabPanel/CollabAvatarStack'
import { useOptionalComments } from '#react/components/Comments/context'
import { PublishLibraryDialog } from '#react/components/libraries/PublishLibraryDialog'
import { WorkspaceModeSwitcher } from '#react/components/Shell/WorkspaceModeSwitcher'
import { IconButton } from '#react/components/ui/IconButton'
import { usePopoverUI } from '#react/components/ui/popover'
import { useOptionalVersionHistory } from '#react/components/VersionHistory/context'
import { useI18n } from '#react/i18n'
import { ClipboardCheck, Ellipsis, History, MessageSquare, Share2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * Right-panel chrome: connected users on the left (max 3),
 * workspace mode immediately before more (comments / AI review / share).
 */
export function CollabPanel() {
  const comments = useOptionalComments()
  const aiReview = useOptionalAiReview()
  const versionHistory = useOptionalVersionHistory()
  const { dialogs, panels } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const popover = usePopoverUI({
    content: 'absolute right-0 top-full z-[60] mt-1.5 w-48 overflow-hidden p-1'
  })

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center">
          <div className="flex items-center rounded-full bg-[#0d99ff] p-0.5 shadow-sm">
            <CollabAvatarStack maxVisible={3} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <WorkspaceModeSwitcher />

          <div className="relative" ref={menuRef}>
            <IconButton
              label="More"
              data-test-id="document-more-menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Ellipsis className="size-3.5" />
            </IconButton>
            {menuOpen ? (
              <div className={popover.content} role="menu">
                {comments ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-hover"
                    onClick={() => {
                      setMenuOpen(false)
                      comments.toggle()
                    }}
                  >
                    <MessageSquare className="size-3.5 text-muted" />
                    {dialogs.comments}
                  </button>
                ) : null}
                {aiReview ? (
                  <button
                    type="button"
                    role="menuitem"
                    data-test-id="document-ai-review"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-hover"
                    onClick={() => {
                      setMenuOpen(false)
                      aiReview.toggle()
                    }}
                  >
                    <ClipboardCheck className="size-3.5 text-muted" />
                    {dialogs.aiReviews}
                  </button>
                ) : null}
                {versionHistory ? (
                  <button
                    type="button"
                    role="menuitem"
                    data-test-id="document-version-history"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-hover"
                    onClick={() => {
                      setMenuOpen(false)
                      versionHistory.toggle()
                    }}
                  >
                    <History className="size-3.5 text-muted" />
                    {dialogs.versionHistory}
                  </button>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  data-test-id="document-publish-library"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-hover"
                  onClick={() => {
                    setMenuOpen(false)
                    openPublishLibraryDialog()
                  }}
                >
                  <Upload className="size-3.5 text-muted" />
                  {panels.publishLibrary}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-hover"
                  onClick={() => {
                    setMenuOpen(false)
                    openDocumentShareDialog()
                  }}
                >
                  <Share2 className="size-3.5 text-muted" />
                  Share…
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <PublishLibraryDialog />
    </div>
  )
}
