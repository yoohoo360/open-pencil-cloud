import { describe, expect, test } from 'bun:test'

import {
  MAKE_APP_FILE,
  MAKE_LOCK_FILE,
  MAKE_PACKAGE_FILE,
  extractMakeProjectPayload,
  parseMakeProjectFiles,
  serializeMakeProjectFiles,
  upsertMakeFiles
} from '#react/app/make/project-files'
import {
  applyMakeLockFile,
  buildMakeSandboxProject,
  mergeMakeProjectUpdates,
  projectFromFiles
} from '#react/app/make/sandbox'

describe('parseMakeProjectFiles', () => {
  test('maps a single fence without a path to App.tsx', () => {
    expect(parseMakeProjectFiles('```tsx\nexport default function App() {}\n```')).toEqual([
      { filename: MAKE_APP_FILE, code: 'export default function App() {}' }
    ])
  })

  test('parses a dynamic multi-file tree and ignores package-lock', () => {
    const text = `
\`\`\`/src/App.tsx
import { Button } from './components/Button'
export default function App() { return <Button /> }
\`\`\`

\`\`\`/src/components/Button.tsx
export function Button() { return <button /> }
\`\`\`

\`\`\`/package.json
{ "name": "demo", "dependencies": { "react": "18.2.0" } }
\`\`\`

\`\`\`/package-lock.json
{ "should": "be ignored" }
\`\`\`
`
    const files = parseMakeProjectFiles(text)
    expect(files.map((file) => file.filename).sort()).toEqual([
      '/package.json',
      '/src/App.tsx',
      '/src/components/Button.tsx'
    ])
  })

  test('streams an open fence into App when no path is set', () => {
    expect(parseMakeProjectFiles('```tsx\nexport default function App() {\n  return (')).toEqual([
      {
        filename: MAKE_APP_FILE,
        code: 'export default function App() {\n  return ('
      }
    ])
  })
})

describe('mergeMakeProjectUpdates', () => {
  test('grows from an empty project without AI writing the lock', () => {
    const base = buildMakeSandboxProject()
    const merged = projectFromFiles(
      mergeMakeProjectUpdates(base.files, [
        { filename: '/src/App.tsx', code: 'export default function App() { return null }' },
        { filename: '/src/index.tsx', code: 'import App from "./App"' },
        { filename: MAKE_PACKAGE_FILE, code: '{ "name": "demo" }' },
        { filename: '/src/hooks/useCount.ts', code: 'export const useCount = () => 0' },
        { filename: MAKE_LOCK_FILE, code: '{ "hacked": true }' }
      ])
    )
    expect(merged.files.some((file) => file.filename === '/src/hooks/useCount.ts')).toBe(true)
    expect(merged.files.find((file) => file.filename === MAKE_LOCK_FILE)?.code).not.toContain(
      'hacked'
    )
    expect(merged.files.some((file) => file.filename === MAKE_PACKAGE_FILE)).toBe(true)
  })

  test('applyMakeLockFile is the only lock writer', () => {
    const base = buildMakeSandboxProject()
    const withLock = projectFromFiles(
      applyMakeLockFile(base.files, JSON.stringify({ lockfileVersion: 3, packages: { a: {} } }))
    )
    expect(withLock.files.find((file) => file.filename === MAKE_LOCK_FILE)?.code).toContain(
      '"lockfileVersion":3'
    )
    expect(upsertMakeFiles(withLock.files, [{ filename: MAKE_LOCK_FILE, code: 'nope' }])).toEqual(
      withLock.files
    )
  })
})

describe('serializeMakeProjectFiles', () => {
  test('omits lock from the chat baseline', () => {
    const project = projectFromFiles([
      { filename: MAKE_APP_FILE, code: 'export default function App() { return null }' }
    ])
    const text = serializeMakeProjectFiles(project.files)
    expect(text).toContain('export default function App')
    expect(text).not.toContain('package-lock')
  })
})

describe('extractMakeProjectPayload', () => {
  test('keeps every fenced path for Make merge', () => {
    const payload = extractMakeProjectPayload(`intro
\`\`\`/src/App.tsx
a
\`\`\`
\`\`\`/src/b.tsx
b
\`\`\``)
    expect(parseMakeProjectFiles(payload).map((file) => file.filename)).toEqual([
      '/src/App.tsx',
      '/src/b.tsx'
    ])
  })
})
