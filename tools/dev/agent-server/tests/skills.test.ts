import { describe, expect, test } from 'bun:test'

import { skillsPromptFromConfigurable } from '../src/skills.ts'

describe('skillsPromptFromConfigurable', () => {
  test('returns empty when no skills payload', () => {
    expect(skillsPromptFromConfigurable(undefined)).toBe('')
    expect(skillsPromptFromConfigurable({})).toBe('')
  })

  test('includes catalog and loaded packages', () => {
    const text = skillsPromptFromConfigurable({
      skillsCatalog: '- key: button | name: Button',
      skillPackages: [{ key: 'button', name: 'Button', body: 'Use primary CTA styles.' }]
    })
    expect(text).toContain('Enabled skills')
    expect(text).toContain('key: button')
    expect(text).toContain('Use primary CTA styles.')
  })
})
