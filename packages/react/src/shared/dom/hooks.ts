import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject
} from 'react'

/** Subscribe to a DOM event on a target (element ref, Window, Document, or MediaQueryList). */
export function useEventListener<K extends keyof WindowEventMap>(
  target: Window | null | undefined | RefObject<Window | null>,
  event: K,
  handler: (ev: WindowEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): void
export function useEventListener<K extends keyof DocumentEventMap>(
  target: Document | null | undefined | RefObject<Document | null>,
  event: K,
  handler: (ev: DocumentEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): void
export function useEventListener<K extends keyof HTMLElementEventMap>(
  target: HTMLElement | null | undefined | RefObject<HTMLElement | null>,
  event: K,
  handler: (ev: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): void
export function useEventListener(
  target: EventTarget | null | undefined | RefObject<EventTarget | null>,
  event: string,
  handler: (ev: Event) => void,
  options?: boolean | AddEventListenerOptions
): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const el = target && 'current' in target ? target.current : target
    if (!el) return
    const listener = (ev: Event) => handlerRef.current(ev)
    el.addEventListener(event, listener, options)
    return () => el.removeEventListener(event, listener, options)
  }, [target, event, options])
}

/** Call handler when a pointer/click happens outside the element. */
export function useOnClickOutside(
  target: RefObject<HTMLElement | null>,
  handler: (event: PointerEvent) => void
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const el = target.current
      if (!el) return
      if (event.target instanceof Node && el.contains(event.target)) return
      handlerRef.current(event)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [target])
}

/** VueUse-compatible alias. */
export const onClickOutside = useOnClickOutside

/** Resolve a ref to a DOM element. */
export function unrefElement<T extends Element>(
  el: T | null | undefined | RefObject<T | null>
): T | null {
  if (!el) return null
  if (typeof el === 'object' && 'current' in el) return el.current
  return el
}

/** Prefer dark system preference. */
export function usePreferredDark(): boolean {
  const get = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  const [dark, setDark] = useState(get)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return dark
}

/** Persist a value in localStorage. */
export function useLocalStorage<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const read = (): T => {
    if (typeof window === 'undefined') return initial
    try {
      const raw = window.localStorage.getItem(key)
      if (raw == null) return initial
      return JSON.parse(raw) as T
    } catch {
      return initial
    }
  }
  const [value, setValue] = useState<T>(read)
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved))
        } catch {
          /* ignore quota */
        }
        return resolved
      })
    },
    [key]
  )
  return [value, set]
}

/** Active focused element. */
export function useActiveElement(): Element | null {
  const [el, setEl] = useState<Element | null>(() =>
    typeof document !== 'undefined' ? document.activeElement : null
  )
  useEffect(() => {
    const update = () => setEl(document.activeElement)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    return () => {
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
    }
  }, [])
  return el
}

/** Simple clipboard write helper. */
export function useClipboard() {
  const copy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
  }, [])
  return { copy }
}

/** File dialog helper. */
export function useFileDialog(options?: { accept?: string; multiple?: boolean }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [files, setFiles] = useState<FileList | null>(null)

  useEffect(() => {
    const input = document.createElement('input')
    input.type = 'file'
    if (options?.accept) input.accept = options.accept
    if (options?.multiple) input.multiple = true
    input.style.display = 'none'
    input.addEventListener('change', () => setFiles(input.files))
    document.body.appendChild(input)
    inputRef.current = input
    return () => {
      input.remove()
      inputRef.current = null
    }
  }, [options?.accept, options?.multiple])

  const open = useCallback(() => {
    inputRef.current?.click()
  }, [])

  return { files, open, reset: () => setFiles(null) }
}

export function promiseTimeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Run cleanup on unmount (VueUse tryOnScopeDispose equivalent). */
export function tryOnScopeDispose(fn: () => void) {
  useEffect(() => () => {
    fn()
  }, [fn])
}

/** Debounced effect — call fn after delay when deps change. */
export function useDebouncedEffect(fn: () => void, deps: unknown[], delay: number) {
  useEffect(() => {
    const id = window.setTimeout(fn, delay)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay])
}

export function useMemoizedFn<T extends (...args: never[]) => unknown>(fn: T): T {
  const ref = useRef(fn)
  ref.current = fn
  return useMemo(() => ((...args: never[]) => ref.current(...args)) as T, [])
}

/** Responsive breakpoint helper (VueUse-compatible). */
export function useBreakpoints(breakpoints: Record<string, number>) {
  const entries = Object.entries(breakpoints)

  function matches(name: string): boolean {
    const max = breakpoints[name]
    if (max == null) return false
    return typeof window !== 'undefined' && window.matchMedia(`(max-width: ${max - 1}px)`).matches
  }

  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(entries.map(([name]) => [name, matches(name)]))
  )

  useEffect(() => {
    const mqs = entries.map(([name, max]) => ({
      name,
      mq: window.matchMedia(`(max-width: ${max - 1}px)`)
    }))
    const update = () => {
      setState(Object.fromEntries(mqs.map(({ name, mq }) => [name, mq.matches])))
    }
    for (const { mq } of mqs) mq.addEventListener('change', update)
    update()
    return () => {
      for (const { mq } of mqs) mq.removeEventListener('change', update)
    }
  }, [])

  return {
    smaller(name: string) {
      return state[name] ?? false
    }
  }
}

/** Debounced timeout scheduler (VueUse-compatible). */
export function useTimeoutFn(fn: () => void, ms: number, _options?: { immediate?: boolean }) {
  const fnRef = useRef(fn)
  fnRef.current = fn
  const idRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = useCallback(() => {
    if (idRef.current != null) clearTimeout(idRef.current)
    idRef.current = null
  }, [])

  const start = useCallback(() => {
    stop()
    idRef.current = setTimeout(() => fnRef.current(), ms)
  }, [ms, stop])

  useEffect(() => stop, [stop])

  return { start, stop }
}

/** Interval scheduler (VueUse-compatible). */
export function useIntervalFn(fn: () => void, ms: number, _options?: { immediate?: boolean }) {
  const fnRef = useRef(fn)
  fnRef.current = fn
  const idRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const pause = useCallback(() => {
    if (idRef.current != null) clearInterval(idRef.current)
    idRef.current = null
  }, [])

  const resume = useCallback(() => {
    pause()
    idRef.current = setInterval(() => fnRef.current(), ms)
  }, [ms, pause])

  useEffect(() => pause, [pause])

  return { pause, resume }
}

/** Case-insensitive substring filter (inline filter helper). */
export function createStringFilter(options?: { sensitivity?: 'base' | 'accent' | 'case' }) {
  const sensitivity = options?.sensitivity ?? 'base'
  return {
    contains(value: string, term: string) {
      if (sensitivity === 'base') {
        return value.toLocaleLowerCase().includes(term.toLocaleLowerCase())
      }
      return value.includes(term)
    }
  }
}

/** Resolve a value or getter (Vue toValue replacement). */
export function resolveMaybe<T>(value: T | (() => T)): T {
  return typeof value === 'function' ? (value as () => T)() : value
}
