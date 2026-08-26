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
      secondChoice: '📐 Layout',
    })
  })

  it('accepts an explicit null milestone as a real answer', () => {
    expect(parseSelection('{"milestone": null, "confidence": "low"}')).toEqual({
      rationale: '',
      milestone: null,
      confidence: 'low',
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
