/**
 * UTF-8 helpers that do not assume a global TextEncoder/TextDecoder.
 * Some embedded WebViews used for non-local previews omit those constructors.
 */

function encodeUtf8Fallback(value: string): Uint8Array {
  const encoded = unescape(encodeURIComponent(value))
  const bytes = new Uint8Array(encoded.length)
  for (let i = 0; i < encoded.length; i++) bytes[i] = encoded.charCodeAt(i)
  return bytes
}

function decodeUtf8Fallback(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ?? 0)
  return decodeURIComponent(escape(binary))
}

/** Encode a Unicode string as UTF-8 bytes. */
export function encodeUtf8(value: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value)
  return encodeUtf8Fallback(value)
}

/** Decode UTF-8 bytes into a Unicode string. */
export function decodeUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes)
  return decodeUtf8Fallback(bytes)
}

/** Byte length of a Unicode string when encoded as UTF-8. */
export function utf8ByteLength(value: string): number {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).byteLength
  let bytes = 0
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4
      i += 1
    } else bytes += 3
  }
  return bytes
}
