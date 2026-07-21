import type { ComponentType, MutableRefObject, RefObject } from 'react'

export type ReactComponent = ComponentType<Record<string, unknown>>

export type ElementRef<T extends Element = HTMLElement> = RefObject<T | null>

export type MutableRef<T> = MutableRefObject<T>
