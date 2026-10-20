const MAX_WEB_FONT_RESPONSE_BYTES = 8 * 1024 * 1024
const ALLOWED_WEB_FONT_HOSTS = new Set([
  'api.fontsource.org',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.google.com',
  'fonts.gstatic.com'
])

/** Bounded HTTPS fetch for Google / Fontsource glyph subsets. */
export async function browserWebFontFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const request = new Request(input, init)
  const url = new URL(request.url)
  const origin = typeof location === 'undefined' ? '' : location.origin
  if (origin && url.origin === origin) return fetch(request)
  if (url.protocol !== 'https:' || !ALLOWED_WEB_FONT_HOSTS.has(url.hostname)) {
    throw new Error(`Unsupported web font host: ${url.hostname}`)
  }

  const response = await fetch(request)
  const contentLength = Number(response.headers.get('content-length') ?? 0)
  if (contentLength > MAX_WEB_FONT_RESPONSE_BYTES) {
    throw new Error('Web font response exceeds the size limit')
  }
  const bytes = await response.arrayBuffer()
  if (bytes.byteLength > MAX_WEB_FONT_RESPONSE_BYTES) {
    throw new Error('Web font response exceeds the size limit')
  }
  const bounded = new Response(bytes, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  })
  Object.defineProperty(bounded, 'url', { value: response.url })
  return bounded
}
