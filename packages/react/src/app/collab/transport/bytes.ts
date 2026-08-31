const BASE64_CHUNK = 0x8000

export function bytesToBase64(bytes: Uint8Array): string {
  const source =
    bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
      ? bytes
      : bytes.slice()
  let binary = ''
  for (let offset = 0; offset < source.length; offset += BASE64_CHUNK) {
    const slice = source.subarray(offset, offset + BASE64_CHUNK)
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary)
}

export function bytesFromBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
    return bytes
  } catch {
    return null
  }
}

export function bytesFromData(data: unknown): Uint8Array | null {
  if (typeof data === 'string') return bytesFromBase64(data)
  if (
    Array.isArray(data) &&
    data.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)
  ) {
    return new Uint8Array(data)
  }
  return null
}
