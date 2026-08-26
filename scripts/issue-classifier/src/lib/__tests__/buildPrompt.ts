import { describe, expect, it } from 'vitest'
import buildPrompt from '../buildPrompt.ts'
import type { Milestone } from '../github.ts'

const MILESTONES: Milestone[] = [
  { number: 20, title: '🧤 Drag & Drop', description: '' },
  { number: 42, title: '📐 Layout', description: 'Positioning thoughts and bullets on the screen.' },
]

const ISSUE = {
  title: 'Drop hover indicator is misplaced',
  body: 'The indicator appears one row too low.',
  labels: ['bug'],
}

describe('buildPrompt', () => {
  it('lists every open milestone on its own line', () => {
    const prompt = buildPrompt(MILESTONES, ISSUE)
    expect(prompt).toContain('- 🧤 Drag & Drop\n')
    expect(prompt).toContain('- 📐 Layout\n')
  })

  it('puts a description on its own indented line, never joined onto the title', () => {
    const prompt = buildPrompt(MILESTONES, ISSUE)
    expect(prompt).toContain('- 📐 Layout\n    Positioning thoughts and bullets on the screen.\n')
    // Joined onto the title line, models copy the whole line back as the title and the vote is lost.
    expect(prompt).not.toContain('📐 Layout —')
  })

  it('adds nothing for a milestone with no description', () => {
    expect(buildPrompt(MILESTONES, ISSUE)).toContain('- 🧤 Drag & Drop\n- 📐 Layout')
  })

  it('includes the issue title, labels, and body', () => {
    const prompt = buildPrompt(MILESTONES, ISSUE)
    expect(prompt).toContain('Title: Drop hover indicator is misplaced')
    expect(prompt).toContain('Labels: bug')
    expect(prompt).toContain('The indicator appears one row too low.')
  })

  it('states the output contract, including the null option', () => {
    const prompt = buildPrompt(MILESTONES, ISSUE)
    expect(prompt).toContain('or null if none of them fits')
    expect(prompt).toContain('"rationale"')
    expect(prompt).toContain('"confidence": "low|medium|high"')
    expect(prompt).toContain('"refactor": true|false')
  })
})
