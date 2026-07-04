import { describe, expect, it } from 'vitest'
import validateEstimate from '../validateEstimate.js'
import { EstimateCategorySchema, EstimateResponseSchema } from '../validateEstimate.js'

describe('validateEstimate', () => {
  it('parses valid model output', () => {
    const result = validateEstimate(['{"estimate": "M"}'])
    expect(result).toEqual({ estimate: 'M' })
  })

  it('handles all valid categories', () => {
    const categories = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
    for (const cat of categories) {
      const result = validateEstimate([`{"estimate": "${cat}"}`])
      expect(result.estimate).toBe(cat)
    }
  })

  it('skips invalid output and uses next valid one', () => {
    const result = validateEstimate(['invalid json', '{"estimate": "S"}'])
    expect(result).toEqual({ estimate: 'S' })
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
  it('parses valid response', () => {
    const result = EstimateResponseSchema.parse({ estimate: 'L' })
    expect(result).toEqual({ estimate: 'L' })
  })

  it('rejects missing estimate', () => {
    expect(() => EstimateResponseSchema.parse({})).toThrow()
  })
})
