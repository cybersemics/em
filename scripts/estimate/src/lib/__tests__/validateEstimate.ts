import { describe, expect, it } from 'vitest'
import { ESTIMATE_CATEGORIES } from '../../everhour/estimates.ts'
import validateEstimate, {
  CONFIDENCE_LEVELS,
  EstimateCategorySchema,
  EstimateResponseSchema,
  RESPONSE_FORMAT,
  parseEstimate,
} from '../validateEstimate.ts'

describe('validateEstimate', () => {
  it('parses valid model output and defaults the richer fields', () => {
    const result = validateEstimate(['{"estimate": "M"}'])
    expect(result.estimate).toBe('M')
    expect(result.confidence).toBe('medium')
    expect(result.rationale).toBe('')
  })

  it('handles all valid categories', () => {
    const categories = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
    for (const cat of categories) {
      const result = validateEstimate([`{"estimate": "${cat}"}`])
      expect(result.estimate).toBe(cat)
    }
  })

  it('parses the richer fields when present', () => {
    const result = validateEstimate([
      '{"rationale": "small fix", "estimate": "S", "confidence": "high", "secondChoice": "M"}',
    ])
    expect(result).toEqual({ rationale: 'small fix', estimate: 'S', confidence: 'high', secondChoice: 'M' })
  })

  it('skips invalid output and uses next valid one', () => {
    const result = validateEstimate(['invalid json', '{"estimate": "S"}'])
    expect(result.estimate).toBe('S')
  })

  it('throws after max validation attempts with all invalid', () => {
    expect(() => validateEstimate(['bad', 'worse', 'worst'])).toThrow('Failed to validate estimate after 3 attempts')
  })

  it('rejects invalid category values', () => {
    expect(() => validateEstimate(['{"estimate": "INVALID"}', '{"estimate": "Z"}', '{"estimate": ""}'])).toThrow()
  })

  it('rejects output missing estimate field', () => {
    expect(() => validateEstimate(['{"foo": "bar"}', '{}', '{"other": "M"}'])).toThrow()
  })
})

describe('parseEstimate', () => {
  it('returns the parsed response for valid output', () => {
    expect(parseEstimate('{"estimate": "L"}')?.estimate).toBe('L')
  })

  it('returns null for malformed JSON', () => {
    expect(parseEstimate('not json')).toBeNull()
  })

  it('returns null for a schema mismatch', () => {
    expect(parseEstimate('{"estimate": "NOPE"}')).toBeNull()
    expect(parseEstimate('{}')).toBeNull()
  })

  it('returns null for an invalid confidence value', () => {
    expect(parseEstimate('{"estimate": "M", "confidence": "certain"}')).toBeNull()
  })

  it('accepts an explicit null secondChoice, the strict schema encoding of "no second choice"', () => {
    expect(parseEstimate('{"estimate": "M", "secondChoice": null}')?.estimate).toBe('M')
  })
})

describe('EstimateCategorySchema', () => {
  it('accepts valid categories', () => {
    expect(EstimateCategorySchema.parse('M')).toBe('M')
    expect(EstimateCategorySchema.parse('XXS')).toBe('XXS')
    expect(EstimateCategorySchema.parse('XXL')).toBe('XXL')
  })

  it('rejects invalid categories', () => {
    expect(() => EstimateCategorySchema.parse('invalid')).toThrow()
    expect(() => EstimateCategorySchema.parse('')).toThrow()
  })
})

describe('EstimateResponseSchema', () => {
  it('parses valid response and defaults optional fields', () => {
    const result = EstimateResponseSchema.parse({ estimate: 'L' })
    expect(result).toEqual({ rationale: '', estimate: 'L', confidence: 'medium' })
  })

  it('rejects missing estimate', () => {
    expect(() => EstimateResponseSchema.parse({})).toThrow()
  })
})

describe('RESPONSE_FORMAT', () => {
  it('offers the model exactly the fields the parse schema accepts, in the same order', () => {
    // Property order is part of the contract: a strict schema emits keys in declaration order,
    // which is what keeps `rationale` first so the model reasons before committing to a bucket.
    expect(Object.keys(RESPONSE_FORMAT.json_schema.schema.properties)).toEqual(
      Object.keys(EstimateResponseSchema.shape),
    )
  })

  it('requires every field, so a conforming reply cannot omit one', () => {
    const schema = RESPONSE_FORMAT.json_schema.schema
    expect(schema.required).toEqual(Object.keys(schema.properties))
    expect(schema.additionalProperties).toBe(false)
  })

  it('declares a strict json_schema response format', () => {
    expect(RESPONSE_FORMAT.type).toBe('json_schema')
    expect(RESPONSE_FORMAT.json_schema.strict).toBe(true)
    // The name is sent to the API, which restricts it to 64 characters of [a-zA-Z0-9_-].
    expect(RESPONSE_FORMAT.json_schema.name).toMatch(/^[a-zA-Z0-9_-]{1,64}$/)
  })

  it('constrains estimate to the category scale and confidence to the three levels', () => {
    const { estimate, confidence } = RESPONSE_FORMAT.json_schema.schema.properties
    expect(estimate).toEqual({ type: 'string', enum: [...ESTIMATE_CATEGORIES] })
    expect(confidence).toEqual({ type: 'string', enum: [...CONFIDENCE_LEVELS] })
  })

  it('constrains secondChoice to the category scale plus null', () => {
    expect(RESPONSE_FORMAT.json_schema.schema.properties.secondChoice).toEqual({
      type: ['string', 'null'],
      enum: [...ESTIMATE_CATEGORIES, null],
    })
  })
})
