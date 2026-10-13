import { describe, expect, test } from 'bun:test'

import {
  formatAgentTasksSteps,
  isAgentTaskUnlocked,
  parseAgentTasksXml,
  resolveAgentTasks,
  runAgentSubtasks,
  toPendingAgentTasks
} from '#react/app/ai/agent/parallel'

describe('runAgentSubtasks', () => {
  test('runs independent tasks in parallel waves', async () => {
    const order: string[] = []
    const results = await runAgentSubtasks([
      {
        id: 'a',
        run: async () => {
          order.push('a-start')
          await Promise.resolve()
          order.push('a-end')
          return 'A'
        }
      },
      {
        id: 'b',
        run: async () => {
          order.push('b-start')
          await Promise.resolve()
          order.push('b-end')
          return 'B'
        }
      },
      {
        id: 'c',
        dependsOn: ['a', 'b'],
        run: async () => {
          order.push('c')
          return 'C'
        }
      }
    ])
    expect(results.map((result) => result.value)).toEqual(['A', 'B', 'C'])
    expect(order.indexOf('c')).toBeGreaterThan(order.indexOf('a-end'))
    expect(order.indexOf('c')).toBeGreaterThan(order.indexOf('b-end'))
  })
})

describe('parseAgentTasksXml', () => {
  test('reads id tier and depends', () => {
    const tasks = parseAgentTasksXml(`
<tasks>
<task id="plan" tier="high">Plan UI</task>
<task id="code" depends="plan" tier="medium">Write App</task>
<task id="pkg" tier="low">package.json</task>
</tasks>`)
    expect(tasks).toEqual([
      { id: 'plan', title: 'Plan UI', tier: 'high', dependsOn: [] },
      { id: 'code', title: 'Write App', tier: 'medium', dependsOn: ['plan'] },
      { id: 'pkg', title: 'package.json', tier: 'low', dependsOn: [] }
    ])
  })
})

describe('resolveAgentTasks', () => {
  test('uses parsed tasks when present', () => {
    expect(
      resolveAgentTasks('<tasks><task id="a" tier="low">A</task></tasks>', {
        plan: 'ignored'
      })
    ).toEqual([{ id: 'a', title: 'A', tier: 'low', dependsOn: [] }])
  })

  test('falls back to a single generate task', () => {
    expect(resolveAgentTasks('no tasks here', { steps: '1. Build UI' })).toEqual([
      { id: 'generate', title: '1. Build UI', tier: 'high', dependsOn: [] }
    ])
  })
})

describe('formatAgentTasksSteps', () => {
  test('marks parallel vs dependent tasks', () => {
    const text = formatAgentTasksSteps([
      { id: 'a', title: 'A', tier: 'low', dependsOn: [] },
      { id: 'b', title: 'B', tier: 'high', dependsOn: ['a'] }
    ])
    expect(text).toContain('parallel-ok')
    expect(text).toContain('after a')
  })
})

describe('isAgentTaskUnlocked', () => {
  test('hides pending dependents until prior tasks finish', () => {
    const tasks = toPendingAgentTasks([
      { id: 'a', title: 'A', tier: 'low', dependsOn: [] },
      { id: 'b', title: 'B', tier: 'high', dependsOn: ['a'] }
    ])
    expect(isAgentTaskUnlocked(tasks[0]!, tasks)).toBe(true)
    expect(isAgentTaskUnlocked(tasks[1]!, tasks)).toBe(false)
    tasks[0] = { ...tasks[0]!, status: 'done' }
    expect(isAgentTaskUnlocked(tasks[1]!, tasks)).toBe(true)
  })
})
