import { useRef, useState, type RefObject } from 'react'

import { useEventListener } from '#react/shared/dom/hooks'

export function useSpaceHeld() {
  const [spaceHeld, setSpaceHeld] = useState(false)
  useEventListener(window, 'keydown', (event: KeyboardEvent) => {
    if (event.code === 'Space') setSpaceHeld(true)
  })
  useEventListener(window, 'keyup', (event: KeyboardEvent) => {
    if (event.code === 'Space') setSpaceHeld(false)
  })
  return spaceHeld
}
