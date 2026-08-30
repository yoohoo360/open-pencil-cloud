import { type CollabState } from '#react/app/collab/types'
import {
  COLLAB_NAME_STORAGE_KEY,
  PEER_COLORS,
  ROOM_ID_CHARS,
  ROOM_ID_LENGTH
} from '#react/constants'

import { IS_BROWSER } from '@open-pencil/core/constants'
import { randomIndex } from '@open-pencil/core/random'

export function generateRoomId(): string {
  let result = ''
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    result += ROOM_ID_CHARS[randomIndex(ROOM_ID_CHARS.length)]
  }
  return result
}

export function parseShareRoomId(value: string): string {
  return value.trim().replace(/.*\/share\//, '')
}

export function readStoredCollabName(): string {
  if (!IS_BROWSER) return ''
  return localStorage.getItem(COLLAB_NAME_STORAGE_KEY) ?? ''
}

export function persistCollabName(name: string) {
  if (!IS_BROWSER) return
  localStorage.setItem(COLLAB_NAME_STORAGE_KEY, name)
}

export function createInitialCollabState(): CollabState {
  return {
    connected: false,
    roomId: null,
    peers: [],
    localName: readStoredCollabName(),
    localColor: PEER_COLORS[randomIndex(PEER_COLORS.length)]
  }
}
