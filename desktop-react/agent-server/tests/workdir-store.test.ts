import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'bun:test'
import { zipSync } from 'fflate'

import { WorkdirStore } from '../src/workdir/store.ts'

const roots: string[] = []
const projects: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
  for (const project of projects.splice(0)) {
    rmSync(project, { recursive: true, force: true })
  }
})

function tempStore(): WorkdirStore {
  const root = mkdtempSync(join(tmpdir(), 'op-workdir-'))
  roots.push(root)
  return new WorkdirStore(root)
}

function tempProject(): string {
  const project = mkdtempSync(join(tmpdir(), 'op-project-'))
  projects.push(project)
  return project
}

function skillZip(body = '# Skill\n\nUse primary buttons.\n'): Uint8Array {
  return zipSync({
    'SKILL.md': new TextEncoder().encode(body)
  })
}

describe('WorkdirStore', () => {
  test('creates workdirs from an absolute project path', () => {
    const store = tempStore()
    const project = tempProject()
    const created = store.create({
      path: project,
      agentEnvironments: ['claude', 'agents', 'github']
    })
    expect(created.path).toBe(project)
    expect(created.agentEnvironments).toEqual(['claude', 'agents', 'github'])
    const { index } = store.list()
    expect(index.activeWorkdirId).toBe(created.id)
    expect(index.workdirs).toHaveLength(1)
  })

  test('pulling a skill writes folders for each selected agent environment', () => {
    const store = tempStore()
    const project = tempProject()
    const workdir = store.create({
      path: project,
      agentEnvironments: ['claude', 'github']
    })
    store.putSkill(workdir.id, 'button', skillZip(), {
      name: 'Button',
      agentEnvironments: ['claude', 'github']
    })
    expect(existsSync(join(project, '.claude/skills/button/SKILL.md'))).toBe(true)
    expect(existsSync(join(project, '.github/skills/button/SKILL.md'))).toBe(true)
    expect(existsSync(join(project, '.claude/skills/button.zip'))).toBe(false)
    expect(readFileSync(join(project, '.claude/skills/button/SKILL.md'), 'utf8')).toContain(
      'primary buttons'
    )
  })

  test('disabling a skill keeps folders on disk', () => {
    const store = tempStore()
    const project = tempProject()
    const workdir = store.create({ path: project, agentEnvironments: ['claude'] })
    store.putSkill(workdir.id, 'button', skillZip(), { name: 'Button' })
    store.setSkillEnabled(workdir.id, 'button', false)
    expect(existsSync(join(project, '.claude/skills/button/SKILL.md'))).toBe(true)
    expect(store.loadEnabledPackages(workdir.id)).toHaveLength(0)
    store.setSkillEnabled(workdir.id, 'button', true)
    const packages = store.loadEnabledPackages(workdir.id)
    expect(packages).toHaveLength(1)
    expect(packages[0]?.body).toContain('primary buttons')
  })

  test('updating agent environments on the workdir is multi-select', () => {
    const store = tempStore()
    const project = tempProject()
    const workdir = store.create({ path: project, agentEnvironments: ['claude'] })
    const updated = store.update(workdir.id, {
      agentEnvironments: ['claude', 'cursor', 'agents']
    })
    expect(updated.agentEnvironments).toEqual(['claude', 'cursor', 'agents'])
  })

  test('migrates legacy copilot id to github', () => {
    const store = tempStore()
    const project = tempProject()
    const workdir = store.create({
      path: project,
      agentEnvironments: ['copilot' as never]
    })
    expect(workdir.agentEnvironments).toEqual(['github'])
  })

  test('rejects non-directory paths', () => {
    const store = tempStore()
    const project = tempProject()
    const filePath = join(project, 'note.txt')
    writeFileSync(filePath, 'x')
    expect(() => store.create({ path: filePath })).toThrow(/existing folder/)
    expect(() => store.create({ path: join(project, 'missing') })).toThrow(/existing folder/)
  })

  test('loadEnabledPackages reads nested skill files without zip', () => {
    const store = tempStore()
    const project = tempProject()
    const workdir = store.create({ path: project, agentEnvironments: ['claude'] })
    const zip = zipSync({
      'SKILL.md': new TextEncoder().encode('# Nested\n'),
      'refs/note.md': new TextEncoder().encode('detail')
    })
    store.putSkill(workdir.id, 'nested', zip, { name: 'Nested' })
    mkdirSync(join(project, '.claude/skills/nested/refs'), { recursive: true })
    const body = store.loadEnabledPackages(workdir.id)[0]?.body ?? ''
    expect(body).toContain('# Nested')
    expect(body).toContain('### File: refs/note.md')
  })
})
