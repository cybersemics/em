import { describe, expect, it } from 'vitest'
import parseSelection, { LABELS } from '../parseSelection.ts'

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
      label: null,
      secondChoice: '📐 Layout',
    })
  })

  it('parses each label the repository uses', () => {
    for (const label of LABELS) {
      expect(parseSelection(`{"milestone": null, "confidence": "high", "label": "${label}"}`)?.label).toBe(label)
    }
  })

  it('accepts an explicit null milestone as a real answer', () => {
    expect(parseSelection('{"milestone": null, "confidence": "low"}')).toEqual({
      rationale: '',
      milestone: null,
      confidence: 'low',
      label: null,
    })
  })

  it('reads a missing label as no label', () => {
    expect(parseSelection('{"milestone": "📐 Layout", "confidence": "high"}')?.label).toBeNull()
  })

  it('keeps a vote whose label is not one of the seven, rather than losing its milestone with it', () => {
    // A hallucinated kind says nothing a missing field does not, and discarding the vote would throw
    // away a usable milestone to avoid a label a maintainer can remove in one click.
    expect(parseSelection('{"milestone": "📐 Layout", "confidence": "high", "label": "chore"}')).toMatchObject({
      milestone: '📐 Layout',
      label: null,
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
