import { describe, expect, test } from 'bun:test'

import {
  normalizeChatProviderSettings,
  resolveChatModel,
  type ChatProviderSettings
} from '#react/app/ai/chat/settings'

describe('normalizeChatProviderSettings', () => {
  test('migrates legacy single model string', () => {
    const settings = normalizeChatProviderSettings({
      apiKey: 'k',
      baseURL: 'https://api.example.com/v1',
      model: 'legacy-model'
    })
    expect(settings.activeModelId).toBe('auto')
    expect(settings.models).toHaveLength(1)
    expect(settings.models[0]?.modelId).toBe('legacy-model')
    expect(settings.models[0]?.tier).toBe('medium')
  })

  test('keeps multi-model config', () => {
    const settings = normalizeChatProviderSettings({
      apiKey: 'k',
      baseURL: 'https://api.example.com/v1',
      activeModelId: 'm2',
      models: [
        { id: 'm1', name: 'Fast', modelId: 'fast', tier: 'low', enabled: true },
        { id: 'm2', name: 'Strong', modelId: 'strong', tier: 'high', enabled: true }
      ]
    })
    expect(settings.activeModelId).toBe('m2')
    expect(settings.models.map((model) => model.tier)).toEqual(['low', 'high'])
  })

  test('migrates retired LangGraph :2024 companion url onto MCP :7600', () => {
    const settings = normalizeChatProviderSettings({
      apiKey: 'k',
      baseURL: 'https://api.example.com/v1',
      agentServerUrl: 'http://127.0.0.1:2024'
    })
    expect(settings.agentServerUrl).toBe('http://127.0.0.1:7600')
  })
})

describe('resolveChatModel', () => {
  const base: ChatProviderSettings = {
    apiKey: 'k',
    baseURL: 'https://api.example.com/v1',
    activeModelId: 'auto',
    models: [
      { id: 'low', name: 'L', modelId: 'low-m', tier: 'low', enabled: true },
      { id: 'mid', name: 'M', modelId: 'mid-m', tier: 'medium', enabled: true },
      { id: 'high', name: 'H', modelId: 'high-m', tier: 'high', enabled: false }
    ],
    agentServerUrl: 'http://127.0.0.1:7600'
  }

  test('Auto picks exact tier when available', () => {
    expect(resolveChatModel(base, 'medium')?.model).toBe('mid-m')
    expect(resolveChatModel(base, 'low')?.model).toBe('low-m')
  })

  test('Auto falls back when preferred tier is disabled', () => {
    expect(resolveChatModel(base, 'high')?.model).toBe('mid-m')
  })

  test('manual selection wins', () => {
    expect(
      resolveChatModel({ ...base, activeModelId: 'low' }, 'high')?.model
    ).toBe('low-m')
  })
})
