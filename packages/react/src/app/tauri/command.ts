/**
 * Resolve a CLI for Tauri plugin-shell (Windows `.cmd` shims need `cmd-<name>`).
 * Mirrors `src/app/tauri/command.ts` for the React desktop shell.
 */
function detectUserAgent(): string {
  const ua = typeof navigator === 'undefined' ? undefined : navigator.userAgent
  return typeof ua === 'string' ? ua : ''
}

export function resolvePlatformCommand(
  command: string,
  args: string[] = [],
  userAgent: string = detectUserAgent()
): { command: string; args: string[] } {
  if (userAgent.includes('Windows')) {
    return { command: `cmd-${command}`, args: ['/c', command, ...args] }
  }
  return { command, args }
}
