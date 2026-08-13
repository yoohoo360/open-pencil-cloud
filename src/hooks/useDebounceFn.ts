import { onScopeDispose } from 'vue'

/**
 * 防抖函数参数类型
 */
export interface DebounceOptions {
  /**
   * 防抖延迟时间 (毫秒)
   * @default 1000
   */
  wait?: number
  /**
   * 是否在延迟开始前执行
   * @default false
   */
  leading?: boolean
  /**
   * 是否在延迟结束后执行
   * @default true
   */
  trailing?: boolean
  /**
   * 最大等待时间 (毫秒)，超过此时间强制执行
   */
  maxWait?: number
}

/**
 * 任意函数类型
 */
export type AnyFn = (...args: any[]) => any

function useDebounceFn<T extends AnyFn>(fn: T, options: DebounceOptions = {}) {
  const { wait = 1000, leading = false, trailing = true } = options

  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let lastThis: any = null
  let invokedLeading = false

  const clear = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const invoke = () => {
    if (!lastArgs) return
    const args = lastArgs
    const ctx = lastThis
    lastArgs = null
    lastThis = null
    fn.apply(ctx, args)
  }

  const flush = () => {
    if (!timer) return
    clear()
    if (trailing) invoke()
    invokedLeading = false
  }

  const cancel = () => {
    clear()
    lastArgs = null
    lastThis = null
    invokedLeading = false
  }

  const run = function (this: any, ...args: Parameters<T>) {
    lastArgs = args
    lastThis = this

    if (!timer) {
      if (leading && !invokedLeading) {
        fn.apply(lastThis, lastArgs)
        lastArgs = null
        lastThis = null
        invokedLeading = true
      }

      timer = setTimeout(() => {
        timer = null
        if (trailing) invoke()
        invokedLeading = false
      }, wait)

      return
    }

    // 防抖：重置计时器
    clear()
    timer = setTimeout(() => {
      timer = null
      if (trailing) invoke()
      invokedLeading = false
    }, wait)
  } as T

  onScopeDispose(cancel)

  return {
    run,
    cancel,
    flush
  }
}

export default useDebounceFn
