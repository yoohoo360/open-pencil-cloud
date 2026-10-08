import type { HostedComponentDef } from '#react/hosted-components/types'

const defs = new Map<string, HostedComponentDef>()

export function registerHostedComponent(def: HostedComponentDef): void {
  if (defs.has(def.id)) {
    throw new Error(`Hosted component already registered: ${def.id}`)
  }
  defs.set(def.id, def)
}

export function unregisterHostedComponent(id: string): void {
  defs.delete(id)
}

export function getHostedComponent(id: string): HostedComponentDef | undefined {
  return defs.get(id)
}

export function listHostedComponents(): HostedComponentDef[] {
  return [...defs.values()]
}

export function clearHostedComponents(): void {
  defs.clear()
}
