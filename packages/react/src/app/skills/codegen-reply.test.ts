import { describe, expect, test } from 'bun:test'

import {
  extractGeneratedCode,
  extractLookups,
  extractSkillKeys,
  lastNonEmptyLine,
  parseCodegenReply
} from './codegen-reply'

describe('parseCodegenReply', () => {
  test('splits thinking, plan, steps, and fenced code', () => {
    const text = `<thinking>
Notice the button uses fill width.
</thinking>
<plan>
Keep the frame; rewrite the label.
</plan>
<steps>
1. Update text
2. Keep fills
</steps>
\`\`\`tsx
<Frame name="Button" />
\`\`\``
    expect(parseCodegenReply(text)).toEqual({
      thinking: 'Notice the button uses fill width.',
      plan: 'Keep the frame; rewrite the label.',
      steps: '1. Update text\n2. Keep fills',
      code: '<Frame name="Button" />'
    })
  })

  test('keeps streamed provider reasoning ahead of tagged thinking', () => {
    const parsed = parseCodegenReply('<thinking>Tagged</thinking>\n```\nx\n```', 'Streamed chain')
    expect(parsed.thinking).toBe('Streamed chain\n\nTagged')
    expect(parsed.code).toBe('x')
  })

  test('falls back to prose thinking without treating it as code', () => {
    const parsed = parseCodegenReply('Short note\n\n```js\nconst a = 1\n```')
    expect(parsed.thinking).toBe('Short note')
    expect(parsed.code).toBe('const a = 1')
  })

  test('code extractor ignores think/plan tags and unfenced prose', () => {
    expect(extractGeneratedCode('<thinking>nope</thinking>\njust words')).toBe('')
    expect(
      extractGeneratedCode(`<thinking>x</thinking>\n\`\`\`tsx\n<Frame />\n\`\`\``)
    ).toBe('<Frame />')
  })

  test('extracts allowed skill keys from the skills section and names', () => {
    const catalog = [
      { key: 'foo', name: 'Foo Skill' },
      { key: 'bar', name: 'Bar' },
      { key: 'baz', name: 'Baz' }
    ]
    expect(extractSkillKeys('<skills>\nfoo\n`bar`\nunknown\n</skills>', catalog)).toEqual([
      'foo',
      'bar'
    ])
    expect(
      extractSkillKeys('<steps>\n1. Use Foo Skill for layout\n</steps><skills></skills>', catalog)
    ).toEqual(['foo'])
  })

  test('lastNonEmptyLine returns the final non-blank line', () => {
    expect(lastNonEmptyLine('a\n\nb\n  c  \n')).toBe('c')
  })

  test('extracts lookup queries from the plan reply', () => {
    expect(
      extractLookups(`<plan>x</plan>
<lookup>
Title
1:2
</lookup>`)
    ).toEqual(['Title', '1:2'])
  })
})
