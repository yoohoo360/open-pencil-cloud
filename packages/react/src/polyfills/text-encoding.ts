/**
 * Ensure TextEncoder/TextDecoder exist before any vendor module constructs them
 * at import time. Some embedded WebViews used for non-local previews omit them.
 */
export function ensureTextEncoding(): void {
  const root = globalThis as typeof globalThis & {
    TextEncoder?: typeof TextEncoder
    TextDecoder?: typeof TextDecoder
  }

  if (typeof root.TextEncoder === 'undefined') {
    root.TextEncoder = class TextEncoderPolyfill {
      encoding = 'utf-8'
      encode(value = ''): Uint8Array {
        const encoded = unescape(encodeURIComponent(value))
        const bytes = new Uint8Array(encoded.length)
        for (let i = 0; i < encoded.length; i++) bytes[i] = encoded.charCodeAt(i)
        return bytes
      }
      encodeInto(
        source: string,
        destination: Uint8Array
      ): { read: number; written: number } {
        const bytes = this.encode(source)
        const written = Math.min(bytes.length, destination.length)
        destination.set(bytes.subarray(0, written))
        return { read: source.length, written }
      }
    } as unknown as typeof TextEncoder
  }

  if (typeof root.TextDecoder === 'undefined') {
    root.TextDecoder = class TextDecoderPolyfill {
      encoding = 'utf-8'
      fatal = false
      ignoreBOM = false
      decode(input?: BufferSource): string {
        const bytes =
          input instanceof ArrayBuffer
            ? new Uint8Array(input)
            : input
              ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
              : new Uint8Array()
        let binary = ''
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ?? 0)
        return decodeURIComponent(escape(binary))
      }
    } as unknown as typeof TextDecoder
  }
}

ensureTextEncoding()
