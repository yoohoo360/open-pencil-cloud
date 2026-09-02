import type { ComponentPropertyDefinition, ComponentPropertyType } from './types'

export function parseVariantName(name: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const part of name.split(',').map((s) => s.trim())) {
    const eqIdx = part.indexOf('=')
    if (eqIdx === -1) continue
    values[part.slice(0, eqIdx).trim()] = part.slice(eqIdx + 1).trim()
  }
  return values
}

export function buildVariantName(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
}

export function generateVariantName(name: string = ''): {
  name: string
  value: string
  type?: ComponentPropertyType
}[] {
  const hasSlash = name.includes('/')
  const hasKeyValue =
    /(?:^|[,/]\s*)[^=,/]+=[^=,/]+(?:\s*[,/]|$)|^[^=,/]+=[^=,/]+(?:\s*,\s*[^=,/]+=[^=,/]+)*$/.test(
      name
    )
  if (hasSlash && hasKeyValue) return []

  if (hasKeyValue) {
    return name.split(',').map((part) => {
      const [propName, value] = part.trim().split('=')
      return {
        name: propName,
        value
      }
    })
  }
  return hasSlash
    ? name.split('/').map((it, idx) => {
        const val = it.trim()
        let type: ComponentPropertyType = 'VARIANT'
        if (val === 'true' || val === 'false') {
          type = 'BOOLEAN'
        }
        return {
          name: `Variant${idx + 1}`,
          type,
          value: val
        }
      })
    : []
}

export function generatePropertyValues(name: string, defs: ComponentPropertyDefinition[]) {
  const nameList = generateVariantName(name)
  const result: Record<string, string> = {}
  defs.forEach((def) => {
    const match = nameList.find((n) => n.name === def.name)
    if (match) {
      result[def.name] = match.value
    }
  })
  return result
}
