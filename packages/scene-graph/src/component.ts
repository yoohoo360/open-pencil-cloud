import { ComponentPropertyDefinition } from '#scene-graph/types.ts'

export function generateVariantName(name: string = ''): {
  name: string
  value: string
}[] {
  const hasSlash = name.includes('/')
  const hasKeyValue =
    /(?:^|[,/]\s*)[^=,/]+=[^=,/]+(?:\s*[,/]|$)|^[^=,/]+=[^=,/]+(?:\s*,\s*[^=,/]+=[^=,/]+)*$/.test(
      name
    )
  if (hasSlash && hasKeyValue) return []

  if (hasKeyValue) {
    return name.split(',').map((part) => {
      const [name, value] = part.trim().split('=')
      return {
        name,
        value
      }
    })
  }
  return hasSlash
    ? name.split('/').map((it, idx) => {
        const val = it.trim()
        let type = 'VARIANT'
        if (val === 'true' || val === 'false') {
          type = 'BOOLEAN'
        }
        return {
          name: `Variant${idx + 1}`,
          type: type,
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
