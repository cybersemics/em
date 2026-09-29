import { describe, expect, it } from 'vitest'
import parseSelection, {
  CONFIDENCE_LEVELS,
  LABELS,
  SelectionResponseSchema,
  buildResponseFormat,
} from '../parseSelection.ts'

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

describe('buildResponseFormat', () => {
  const TITLES = ['🧤 Drag & Drop', '📐 Layout']

  it('offers the model exactly the fields the parse schema accepts, in the same order', () => {
    // Property order is part of the contract: a strict schema emits keys in declaration order,
    // which is what keeps `rationale` first so the model reasons before committing.
    expect(Object.keys(buildResponseFormat(TITLES).json_schema.schema.properties)).toEqual(
      Object.keys(SelectionResponseSchema.shape),
    )
  })

  it('requires every field, so a conforming reply cannot omit one', () => {
    const schema = buildResponseFormat(TITLES).json_schema.schema
    expect(schema.required).toEqual(Object.keys(schema.properties))
    expect(schema.additionalProperties).toBe(false)
  })

  it('declares a strict json_schema response format', () => {
    const format = buildResponseFormat(TITLES)
    expect(format.type).toBe('json_schema')
    expect(format.json_schema.strict).toBe(true)
    // The name is sent to the API, which restricts it to 64 characters of [a-zA-Z0-9_-].
    expect(format.json_schema.name).toMatch(/^[a-zA-Z0-9_-]{1,64}$/)
  })

  it('constrains milestone and secondChoice to the open titles plus null', () => {
    const { milestone, secondChoice } = buildResponseFormat(TITLES).json_schema.schema.properties
    expect(milestone).toEqual({ type: ['string', 'null'], enum: [...TITLES, null] })
    expect(secondChoice).toEqual({ type: ['string', 'null'], enum: [...TITLES, null] })
  })

  it('constrains label to the seven kinds plus null and confidence to the three levels', () => {
    const { label, confidence } = buildResponseFormat(TITLES).json_schema.schema.properties
    expect(label).toEqual({ type: ['string', 'null'], enum: [...LABELS, null] })
    expect(confidence).toEqual({ type: 'string', enum: [...CONFIDENCE_LEVELS] })
  })
})
