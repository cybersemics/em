import { describe, expect, it } from 'vitest'
import validateEstimate, { EstimateCategorySchema, EstimateResponseSchema, parseEstimate } from '../validateEstimate.ts'

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
