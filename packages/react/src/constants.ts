import { IS_BROWSER } from '@open-pencil/core/constants'

export const HALF_FRAC = 3 / 7
export const HUD_TOP = 12 + 32 + 6 + 32 + 12
export const SWIPE_THRESHOLD = 30
export const SWIPE_VELOCITY_THRESHOLD = 500
export const DRAWER_SPRING_STIFFNESS = 800
export const DRAWER_SPRING_DAMPING = 50

export function getShareURL(roomId: string): string {
  const origin = IS_BROWSER ? window.location.origin : 'https://app.openpencil.dev'
  return `${origin}/share/${roomId}`
}

export function initials(name: string): string {
  return (
    name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  )
}
