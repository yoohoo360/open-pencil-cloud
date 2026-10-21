import { describe, expect, test } from 'bun:test'

import {
  assertSkillName,
  sanitizeSkillName,
  skillFolderName,
  validateSkillName
} from '#react/app/skills/skill-name'

describe('validateSkillName', () => {
  test('accepts English, Chinese, digits, and hyphens', () => {
    expect(validateSkillName('My-Design技能1')).toEqual({ ok: true, name: 'My-Design技能1' })
    expect(validateSkillName('  设计技能  ')).toEqual({ ok: true, name: '设计技能' })
  })

  test('rejects spaces and other symbols', () => {
    expect(validateSkillName('UI 组件')).toEqual({ ok: false, issue: 'invalid' })
    expect(validateSkillName('foo_bar')).toEqual({ ok: false, issue: 'invalid' })
  })

  test('rejects empty and too long', () => {
    expect(validateSkillName('')).toEqual({ ok: false, issue: 'empty' })
    expect(validateSkillName('a'.repeat(65))).toEqual({ ok: false, issue: 'too_long' })
  })

  test('assertSkillName throws on invalid', () => {
    expect(() => assertSkillName('bad name')).toThrow(/invalid/)
  })
})

describe('sanitizeSkillName / skillFolderName', () => {
  test('soft-cleans for folders', () => {
    expect(sanitizeSkillName('UI 组件 2')).toBe('UI-组件-2')
    expect(skillFolderName({ name: '设计技能', key: '1' })).toBe('设计技能')
  })
})
