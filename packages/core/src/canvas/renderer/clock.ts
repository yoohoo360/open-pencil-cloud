export function rendererNow(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now()
}
