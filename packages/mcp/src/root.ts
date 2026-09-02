import { homedir, platform } from 'node:os'

export function resolveMCPRoot(value: string | undefined, runtimePlatform = platform()): string {
  return value?.trim() || (runtimePlatform === 'win32' ? homedir() : process.cwd())
}
