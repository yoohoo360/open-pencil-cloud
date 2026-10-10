import { describe, expect, test } from 'bun:test'

import {
  emptySkillSelection,
  isSkillSelected,
  resolveSelectedSkills,
  toggleSkill,
  toggleSkillGroup
} from '#react/app/document/ai-review/skills'
import type { SkillCatalogCategory } from '#react/lib/client'

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

  test('resolves skills when group or skill is selected', () => {
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
          }
        ]
      }
    ]
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
