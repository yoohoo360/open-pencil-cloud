import { tv } from 'tailwind-variants'
import { colorToCSS } from '@open-pencil/core/color'

import { Tip } from '#react/components/ui/Tip'
import { initials } from '#react/constants'
import { useCollabPanelContext } from '#react/components/CollabPanel/context'
import collaborationTheme from '#react/theme/collaboration'
import { useI18n } from '#react/i18n'

export function CollabAvatarStack() {
  const collab = useCollabPanelContext()
  const { dialogs } = useI18n()
  const collaboration = tv(collaborationTheme)
  const avatar = collaboration({ size: 'sm', bordered: true })

  return (
    <div className="flex -space-x-1.5">
      <Tip label={`${collab.state.localName || dialogs.you} (${dialogs.youSuffix})`}>
        <div
          data-test-id="collab-local-avatar"
          className={avatar.avatar()}
          style={{ background: colorToCSS(collab.state.localColor) }}
        >
          {initials(collab.state.localName || dialogs.you)}
        </div>
      </Tip>
    </div>
  )
}
