import { describe } from 'vitest'
import validateJson from '../../inference/validateJson.js'
import buildMilestonePrompt from '../buildMilestonePrompt.js'
import resolveMilestone from '../resolveMilestone.js'
import validateMilestoneSelection from '../validateMilestoneSelection.js'

const mockMilestoneMap = [
  { id: 'v-next', githubTitle: 'Next Release' },
  { id: 'ux-polish', githubTitle: 'UX Polish' },
]

const mockOpenMilestones = [
  { number: 1, title: 'Next Release', state: 'open' },
  { number: 2, title: 'UX Polish', state: 'open' },
]

describe('validateJson', () => {
  it('parses valid JSON object', () => {
    expect(validateJson('{"milestone":"v-next","confidence":"high"}')).toEqual({
      milestone: 'v-next',
      confidence: 'high',
    })
  })

  it('returns null for invalid JSON', () => {
    expect(validateJson('not json')).toBeNull()
  })

  it('returns null for JSON array', () => {
    expect(validateJson('[1,2,3]')).toBeNull()
  })

  it('returns null for JSON primitive', () => {
    expect(validateJson('"string"')).toBeNull()
  })
})

describe('resolveMilestone', () => {
  it('resolves a valid milestone id to a number', () => {
    expect(resolveMilestone('v-next', mockMilestoneMap, mockOpenMilestones)).toBe(1)
  })

  it('resolves another valid milestone id', () => {
    expect(resolveMilestone('ux-polish', mockMilestoneMap, mockOpenMilestones)).toBe(2)
  })

  it('returns null for unknown milestone id', () => {
    expect(resolveMilestone('unknown', mockMilestoneMap, mockOpenMilestones)).toBeNull()
  })

  it('returns null when github milestone is not open', () => {
    const closedMilestones = [{ number: 1, title: 'Next Release', state: 'closed' }]
    expect(resolveMilestone('ux-polish', mockMilestoneMap, closedMilestones)).toBeNull()
  })
})

describe('validateMilestoneSelection', () => {
  it('returns null for valid selection', () => {
    const selection = { milestone: 'v-next', confidence: 'high' }
    expect(validateMilestoneSelection(selection, mockMilestoneMap, mockOpenMilestones)).toBeNull()
  })

  it('rejects missing milestone field', () => {
    const selection = { milestone: '', confidence: 'high' }
    expect(validateMilestoneSelection(selection, mockMilestoneMap, mockOpenMilestones)).toBeTruthy()
  })

  it('rejects invalid confidence value', () => {
    const selection = { milestone: 'v-next', confidence: 'very-high' }
    expect(validateMilestoneSelection(selection, mockMilestoneMap, mockOpenMilestones)).toBeTruthy()
  })

  it('rejects unknown milestone id', () => {
    const selection = { milestone: 'unknown-id', confidence: 'high' }
    expect(validateMilestoneSelection(selection, mockMilestoneMap, mockOpenMilestones)).toContain(
      'Unknown milestone id',
    )
  })

  it('rejects milestone that does not resolve to open GitHub milestone', () => {
    const closedMilestones = [{ number: 1, title: 'Next Release', state: 'open' }]
    const selection = { milestone: 'ux-polish', confidence: 'high' }
    expect(validateMilestoneSelection(selection, mockMilestoneMap, closedMilestones)).toContain('does not resolve')
  })

  it('accepts all valid confidence values', () => {
    for (const confidence of ['low', 'medium', 'high']) {
      const selection = { milestone: 'v-next', confidence }
      expect(validateMilestoneSelection(selection, mockMilestoneMap, mockOpenMilestones)).toBeNull()
    }
  })
})

describe('buildMilestonePrompt', () => {
  it('includes issue title in prompt', () => {
    const prompt = buildMilestonePrompt({
      instructions: 'Test instructions',
      milestoneMap: mockMilestoneMap,
      samples: [],
      issueTitle: 'Test issue title',
      issueBody: 'Test body',
      issueLabels: ['bug'],
    })
    expect(prompt).toContain('Test issue title')
  })

  it('includes milestone ids in prompt', () => {
    const prompt = buildMilestonePrompt({
      instructions: 'Test instructions',
      milestoneMap: mockMilestoneMap,
      samples: [],
      issueTitle: 'Title',
      issueBody: 'Body',
      issueLabels: [],
    })
    expect(prompt).toContain('v-next')
    expect(prompt).toContain('ux-polish')
  })

  it('includes samples in prompt', () => {
    const samples = [
      {
        input: { title: 'Sample title', body: 'Sample body', labels: ['bug'] },
        expected: { milestone: 'ux-polish' },
      },
    ]
    const prompt = buildMilestonePrompt({
      instructions: 'Test instructions',
      milestoneMap: mockMilestoneMap,
      samples,
      issueTitle: 'Title',
      issueBody: 'Body',
      issueLabels: [],
    })
    expect(prompt).toContain('Sample title')
    expect(prompt).toContain('ux-polish')
  })

  it('includes instructions in prompt', () => {
    const prompt = buildMilestonePrompt({
      instructions: 'Custom milestone instructions here',
      milestoneMap: mockMilestoneMap,
      samples: [],
      issueTitle: 'Title',
      issueBody: 'Body',
      issueLabels: [],
    })
    expect(prompt).toContain('Custom milestone instructions here')
  })
})
