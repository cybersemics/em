import { describe, expect, it } from 'vitest'
import parseSelection from '../parseSelection.ts'

describe('parseSelection', () => {
  it('parses a complete response', () => {
    expect(
      parseSelection(
        '{"rationale": "Drop indicator is misplaced.", "milestone": "🧤 Drag & Drop", "confidence": "high", "secondChoice": "📐 Layout"}',
      ),
    ).toEqual({
      rationale: 'Drop indicator is misplaced.',
      milestone: '🧤 Drag & Drop',
      confidence: 'high',
      refactor: false,
      secondChoice: '📐 Layout',
    })
  })

  it('parses the refactor verdict', () => {
    expect(
      parseSelection('{"rationale": "Renames a hook.", "milestone": null, "confidence": "high", "refactor": true}')
        ?.refactor,
    ).toBe(true)
  })

  it('accepts an explicit null milestone as a real answer', () => {
    expect(parseSelection('{"milestone": null, "confidence": "low"}')).toEqual({
      rationale: '',
      milestone: null,
      confidence: 'low',
      refactor: false,
    })
  })

  it('reads a missing refactor flag as not a refactor, since most issues are not', () => {
    expect(parseSelection('{"milestone": "📐 Layout", "confidence": "high"}')?.refactor).toBe(false)
  })

  it('keeps a vote whose refactor flag is malformed, rather than losing its milestone with it', () => {
    // A stray string says nothing a missing field does not, and discarding the vote would throw away
    // a usable milestone to avoid a label a maintainer can remove in one click.
    expect(parseSelection('{"milestone": "📐 Layout", "confidence": "high", "refactor": "true"}')).toMatchObject({
      milestone: '📐 Layout',
      refactor: false,
    })
  })

  it('defaults a missing rationale, which does not drive the decision', () => {
    expect(parseSelection('{"milestone": "📐 Layout", "confidence": "medium"}')?.rationale).toBe('')
  })

  it('rejects a response missing the milestone field', () => {
    expect(parseSelection('{"confidence": "high"}')).toBeNull()
  })

  it('rejects a response missing the confidence field', () => {
    expect(parseSelection('{"milestone": "📐 Layout"}')).toBeNull()
  })

  it('rejects an unknown confidence value', () => {
    expect(parseSelection('{"milestone": "📐 Layout", "confidence": "certain"}')).toBeNull()
  })

  it('rejects output that is not JSON', () => {
    expect(parseSelection('I think this belongs in Layout.')).toBeNull()
  })
})
