import { describe, expect, test } from 'bun:test'
import { SceneGraph } from '@open-pencil/scene-graph'

import { buildMakePreview, resolveMakeNodeIds } from '#react/app/make/build'
import {
  buildMakeSandboxProject,
  makeProjectHasPreview,
  makeSandboxPreviewURL,
  MAKE_SANDBOX_NAME,
  projectFromFiles
} from '#react/app/make/sandbox'
import {
  DEFAULT_MAKE_SKILL_KEY,
  createDefaultMakeSkill,
  resolveMakeSkillKeys,
  resolveMakeSkillsToLoad
} from '#react/app/make/skills/default-make-skill'
import type { PencilSkill } from '#react/lib/client'
import { normalizeMakeSandboxServerURL } from '#react/app/make/settings'
import { parseMakeNodeIdsFromSearch } from '#react/app/make/session'

describe('resolveMakeNodeIds', () => {
  test('prefers frame-like roots from the selection', () => {
    const graph = new SceneGraph()
    const page = graph.createNode('CANVAS', graph.rootId, { name: 'Page' })
    const frame = graph.createNode('FRAME', page.id, { name: 'Home' })
    const text = graph.createNode('TEXT', frame.id, { name: 'Label', text: 'Hi' })

    expect(resolveMakeNodeIds(graph, [text.id, frame.id])).toEqual([frame.id])
  })
})

describe('Make React JSX', () => {
  test('builds selection JSX for skills as reference only', () => {
    const graph = new SceneGraph()
    const page = graph.createNode('CANVAS', graph.rootId, { name: 'Page' })
    const frame = graph.createNode('FRAME', page.id, {
      name: 'Card',
      width: 200,
      height: 100,
      layoutMode: 'VERTICAL',
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
    })
    graph.createNode('TEXT', frame.id, {
      name: 'Title',
      text: 'Hello',
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })

    const built = buildMakePreview(graph, [frame.id])
    expect(built.code).toContain('export default function App')
    expect(built.code).toContain('Hello')
  })

  test('empty Make project has only the lock placeholder until skills write files', () => {
    const project = buildMakeSandboxProject()
    expect(project.files.map((file) => file.filename)).toEqual(['/package-lock.json'])
    expect(makeProjectHasPreview(project)).toBe(false)
  })

  test('preview requires skill-authored entry and package.json', () => {
    const project = projectFromFiles([
      {
        filename: '/package.json',
        code: JSON.stringify({
          name: 'demo',
          version: '1.0.0',
          dependencies: { react: '18.2.0', 'react-dom': '18.2.0' }
        })
      },
      {
        filename: '/src/index.tsx',
        code: 'export default function App() { return null }\n'
      }
    ])
    expect(makeProjectHasPreview(project)).toBe(true)
  })

  test('sandbox preview URL points at embed/preview/', () => {
    const url = makeSandboxPreviewURL('https://sandbox.example.com/', MAKE_SANDBOX_NAME, 'abc')
    expect(url).toBe(
      `https://sandbox.example.com/embed/preview/?name=${MAKE_SANDBOX_NAME}&uuid=abc`
    )
  })

  test('normalizes sandbox server URL', () => {
    expect(normalizeMakeSandboxServerURL('https://host.example/path/')).toBe(
      'https://host.example/path'
    )
    expect(normalizeMakeSandboxServerURL('not a url')).toBe('')
    expect(normalizeMakeSandboxServerURL('')).toBe('')
  })

  test('parses Make node ids from the page query', () => {
    expect(parseMakeNodeIdsFromSearch('nodes=a,b,%20c')).toEqual(['a', 'b', 'c'])
    expect(parseMakeNodeIdsFromSearch('')).toEqual([])
  })

  test('default Make skill ships local SKILL content', () => {
    const skill = createDefaultMakeSkill()
    expect(skill.skill_key).toBe('make-react-tailwind')
    expect(skill.content).toContain('/src/index.tsx')
    expect(skill.content).toContain('export default')
    expect(skill.content).toMatch(/host already mounts/i)
    expect(skill.content).toMatch(/other enabled skill/i)
    expect(skill.content).not.toMatch(/from ['"]react-dom\/client['"]/)
    expect(skill.content).not.toMatch(/createRoot\s*\(/)
    expect(skill.content).toContain('package-lock.json')
  })

  test('default Make skill loads every other enabled skill', () => {
    const extra: PencilSkill = {
      id: 's-brand',
      skill_key: 'brand-kit',
      name: 'Brand Kit',
      content: 'brand',
      group_id: 'g1'
    }
    const enabled = [createDefaultMakeSkill(), extra]
    expect(resolveMakeSkillKeys(enabled, [])).toEqual([
      DEFAULT_MAKE_SKILL_KEY,
      'brand-kit'
    ])
    expect(resolveMakeSkillKeys(enabled, ['brand-kit']).length).toBe(2)
    expect(resolveMakeSkillsToLoad(enabled, []).map((skill) => skill.skill_key)).toEqual([
      DEFAULT_MAKE_SKILL_KEY,
      'brand-kit'
    ])
  })
})
