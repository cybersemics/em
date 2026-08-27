/**
 * Integrity checks on the prompt assets themselves. These need neither network nor model access, so
 * they run in normal CI and catch the two ways the corpus silently rots: a sample labeled with a
 * milestone the prompt never describes, and a sample whose issue is also used as an example in the
 * prompt — which would turn `yarn evaluate` from a measurement into a memory test.
 */
import { describe, expect, it } from 'vitest'
import loadInstructions from '../lib/loadInstructions.ts'
import loadSamples from '../lib/loadSamples.ts'

const instructions = loadInstructions()
const samples = loadSamples()

describe('issue classifier instructions', () => {
  it('loads from the repository', () => {
    expect(instructions).toContain('# Milestone Instructions')
  })

  it('states the output contract the parser enforces', () => {
    expect(instructions).toContain('"confidence"')
    expect(instructions).toContain('`label`')
    expect(instructions).toContain('`null`')
  })
})

describe('issue classifier samples', () => {
  it('loads a labeled corpus', () => {
    expect(samples.length).toBeGreaterThan(0)
  })

  it('gives every sample an issue, a title, and a body', () => {
    for (const sample of samples) {
      expect(sample.source?.issue, JSON.stringify(sample.source)).toBeTypeOf('number')
      expect(sample.input.title.length, `#${sample.source?.issue} title`).toBeGreaterThan(0)
      expect(sample.input.body.length, `#${sample.source?.issue} body`).toBeGreaterThan(0)
      expect(Array.isArray(sample.input.labels), `#${sample.source?.issue} labels`).toBe(true)
    }
  })

  it('labels every sample with a milestone title or an explicit null', () => {
    for (const sample of samples) {
      expect(
        sample.expected === null || (typeof sample.expected === 'string' && sample.expected.length > 0),
        `#${sample.source?.issue} expected`,
      ).toBe(true)
    }
  })

  it('includes at least one sample where asking a human is the correct answer', () => {
    expect(samples.filter(sample => sample.expected === null).length).toBeGreaterThan(0)
  })

  it('assigns every sample to a split', () => {
    for (const sample of samples) {
      expect(['train', 'test'], `#${sample.source?.issue} split`).toContain(sample.split)
    }
  })

  it('keeps both halves populated and spanning the taxonomy', () => {
    const train = samples.filter(sample => sample.split === 'train')
    const test = samples.filter(sample => sample.split === 'test')
    expect(train.length).toBeGreaterThan(0)
    expect(test.length).toBeGreaterThan(0)
    // A held-out half that covered only a few milestones would measure those rather than the prompt.
    expect(new Set(test.map(sample => sample.expected)).size).toBeGreaterThan(10)
  })

  it('does not label two samples with the same issue', () => {
    const issues = samples.map(sample => sample.source?.issue)
    expect(new Set(issues).size).toBe(issues.length)
  })

  it('describes every labeled milestone in the instructions', () => {
    for (const sample of samples) {
      if (sample.expected === null) continue
      expect(instructions, `#${sample.source?.issue} expects "${sample.expected}"`).toContain(sample.expected)
    }
  })

  it('keeps every sample out of the prompt, so the evaluation measures rather than recalls', () => {
    for (const sample of samples) {
      const { title } = sample.input
      const leaked = instructions.includes(title) || (title.length > 40 && instructions.includes(title.slice(0, 40)))
      expect(leaked, `#${sample.source?.issue} "${title}" appears in the instructions`).toBe(false)
    }
  })
})
