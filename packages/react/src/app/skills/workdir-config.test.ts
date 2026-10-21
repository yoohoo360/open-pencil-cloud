import { describe, expect, test } from 'bun:test'

import {
  normalizeWorkdirSkillConfig,
  parseWorkdirSkillConfigText,
  serializeWorkdirSkillConfig
} from '#react/app/skills/workdir-config'

describe('workdir skill config', () => {
  test('normalizes pull and unique group ids', () => {
    expect(
      normalizeWorkdirSkillConfig({
        pull: 'auto',
        skillGroups: [' aaa ', 'aaa', 'bbb', '']
      })
    ).toEqual({
      pull: 'auto',
      skillGroups: ['aaa', 'bbb']
    })
  })

  test('parses JSON text and serializes round-trip', () => {
    const text = serializeWorkdirSkillConfig({
      pull: 'auto',
      skillGroups: ['a', 'b']
    })
    expect(text).toContain('"pull": "auto"')
    expect(parseWorkdirSkillConfigText(text)).toEqual({
      pull: 'auto',
      skillGroups: ['a', 'b']
    })
  })

  test('invalid JSON falls back to manual empty groups', () => {
    expect(parseWorkdirSkillConfigText('not-json')).toEqual({
      pull: 'manual',
      skillGroups: []
    })
  })
})
