import { describe, expect, test } from 'bun:test'

import {
  emptySkillSelection,
  isSkillSelected,
  resolveSelectedSkills,
  toggleSkill,
  toggleSkillGroup
} from '#react/app/document/ai-review/skills'
import type { SkillCatalogCategory } from '#react/lib/client'

const categories: SkillCatalogCategory[] = [
  {
    kind: 'personal',
    groups: [
      {
        id: 'g1',
        group_key: 'g1',
        name: 'Group',
        skills: [
          {
            id: 's1',
            skill_key: 'one',
            name: 'One',
            content: '',
            group_id: 'g1'
          },
          {
            id: 's2',
            skill_key: 'two',
            name: 'Two',
            content: '',
            group_id: 'g1'
          }
        ]
      },
      {
        id: 'g2',
        group_key: 'g2',
        name: 'Other',
        skills: [
          {
            id: 's3',
            skill_key: 'three',
            name: 'Three',
            content: '',
            group_id: 'g2'
          }
        ]
      }
    ]
  }
]

describe('ai review skill selection', () => {
  test('toggles groups and individual skills', () => {
    let selection = emptySkillSelection()
    selection = toggleSkillGroup(selection, 'g1', true)
    expect(selection.group_ids).toEqual(['g1'])
    selection = toggleSkill(selection, 's1', true)
    expect(selection.skill_ids).toEqual(['s1'])
    selection = toggleSkillGroup(selection, 'g1', false)
    expect(selection.group_ids).toEqual([])
  })

  test('all selected includes every personal skill', () => {
    expect(
      resolveSelectedSkills(categories, { all: true, group_ids: [], skill_ids: [] }).map((s) => s.id)
    ).toEqual(['s1', 's2', 's3'])
    expect(isSkillSelected({ id: 's1', group_id: 'g1' }, { all: true, group_ids: [], skill_ids: [] })).toBe(
      true
    )
  })

  test('unchecking a group from all keeps other groups', () => {
    const next = toggleSkillGroup(
      { all: true, group_ids: [], skill_ids: [] },
      'g1',
      false,
      ['g1', 'g2']
    )
    expect(next.all).toBeUndefined()
    expect(next.group_ids).toEqual(['g2'])
  })

  test('resolves skills when group or skill is selected', () => {
    expect(
      resolveSelectedSkills(categories, { group_ids: ['g1'], skill_ids: [] }).map((s) => s.id)
    ).toEqual(['s1', 's2'])
    expect(
      resolveSelectedSkills(categories, { group_ids: [], skill_ids: ['s2'] }).map((s) => s.id)
    ).toEqual(['s2'])
    expect(
      isSkillSelected({ id: 's1', group_id: 'g1' }, { group_ids: ['g1'], skill_ids: [] })
    ).toBe(true)
  })
})
