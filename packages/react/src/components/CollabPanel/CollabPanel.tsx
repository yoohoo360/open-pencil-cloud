import { openDocumentShareDialog } from '#react/app/document/access'
import { CollabAvatarStack } from '#react/components/CollabPanel/CollabAvatarStack'
import { useOptionalComments } from '#react/components/Comments/context'
import { IconButton } from '#react/components/ui/IconButton'
import { usePopoverUI } from '#react/components/ui/popover'
import { useI18n } from '#react/i18n'
import { Ellipsis, MessageSquare, Share2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * Right-panel chrome: connected users on the left (max 3), comments + more/share on the right.
 */
export function CollabPanel() {
  const comments = useOptionalComments()
  const { dialogs } = useI18n()
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
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex min-w-0 items-center">
        <div className="flex items-center rounded-full bg-[#0d99ff] p-0.5 shadow-sm">
          <CollabAvatarStack maxVisible={3} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {comments ? (
          <IconButton
            active={comments.open}
            label={dialogs.comments}
            data-test-id="comments-toggle"
            onClick={() => comments.toggle()}
          >
            <MessageSquare className="size-3.5" />
          </IconButton>
        ) : null}

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
  )
}
