const IGNORED_REQUESTS = new Set([
  'canvaskit-wasm/full',
  'fs',
  'fs/promises',
  'http',
  'https',
  'path',
  'url'
])

function shouldIgnoreRequest(request: string): boolean {
  return request.startsWith('node:') || IGNORED_REQUESTS.has(request)
}

interface ResolveData {
  request?: string
}

export function openPencilViteIgnorePlugin() {
  return {
    apply(compiler: {
      hooks: {
        normalModuleFactory: {
          tap: (
            name: string,
            fn: (nmf: {
              hooks: {
                beforeResolve: {
                  tap: (name: string, fn: (data: ResolveData) => false | void) => void
                }
              }
            }) => void
          ) => void
        }
      }
    }) {
      compiler.hooks.normalModuleFactory.tap('open-pencil-vite-ignore', (nmf) => {
        nmf.hooks.beforeResolve.tap('open-pencil-vite-ignore', (data) => {
          const request = data.request
          if (request && shouldIgnoreRequest(request)) return false
        })
      })
    }
  }
}
