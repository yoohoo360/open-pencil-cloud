export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must contain an even number of characters')
  }

  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    if (Number.isNaN(byte)) throw new Error('Hex string contains invalid characters')
    bytes[i] = byte
  }
  return bytes
}

const HEX_BYTES = Array.from({ length: 256 }, (_, byte) => byte.toString(16).padStart(2, '0'))

export function bytesToHex(bytes: Uint8Array): string {
  const withToHex = bytes as Uint8Array & { toHex?: () => string }
  if (typeof withToHex.toHex === 'function') return withToHex.toHex()

  const chunks = Array.from({ length: bytes.length }, () => '')
  for (let index = 0; index < bytes.length; index++) chunks[index] = HEX_BYTES[bytes[index]]
  return chunks.join('')
}
