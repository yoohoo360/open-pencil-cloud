/** Canvas Markdown content width (host minus padding) — panel editor matches this 1:1. */
export function markdownContentWidth(host: {
  width: number
  paddingLeft: number
  paddingRight: number
}): number {
  return Math.max(1, host.width - host.paddingLeft - host.paddingRight)
}

/** Clamp document image size the same way canvas projection does. */
export function clampMarkdownImageSize(
  size: { width: number; height: number },
  contentWidth: number
): { width: number; height: number } {
  const maxWidth = Math.max(1, contentWidth)
  let width = size.width > 0 ? size.width : maxWidth
  let height = size.height > 0 ? size.height : Math.max(80, Math.round(maxWidth * 0.6))
  if (width > maxWidth) {
    height = Math.max(1, Math.round((height * maxWidth) / width))
    width = maxWidth
  }
  return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) }
}
