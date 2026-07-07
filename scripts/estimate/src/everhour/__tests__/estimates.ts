import { describe, expect, it } from 'vitest'
import {
  CATEGORY_TO_HOURS,
  ESTIMATE_CATEGORIES,
  HOURS_TO_CATEGORY,
  VALID_HOURS,
  categoryToSeconds,
} from '../estimates.ts'

describe('estimates', () => {
  it('maps all categories to hours', () => {
    expect(CATEGORY_TO_HOURS.XXS).toBe(1)
    expect(CATEGORY_TO_HOURS.XS).toBe(2)
    expect(CATEGORY_TO_HOURS.S).toBe(4)
    expect(CATEGORY_TO_HOURS.M).toBe(8)
    expect(CATEGORY_TO_HOURS.L).toBe(16)
    expect(CATEGORY_TO_HOURS.XL).toBe(24)
    expect(CATEGORY_TO_HOURS.XXL).toBe(48)
  })

  it('maps all hours to categories', () => {
    expect(HOURS_TO_CATEGORY[1]).toBe('XXS')
    expect(HOURS_TO_CATEGORY[2]).toBe('XS')
    expect(HOURS_TO_CATEGORY[4]).toBe('S')
    expect(HOURS_TO_CATEGORY[8]).toBe('M')
    expect(HOURS_TO_CATEGORY[16]).toBe('L')
    expect(HOURS_TO_CATEGORY[24]).toBe('XL')
    expect(HOURS_TO_CATEGORY[48]).toBe('XXL')
  })

  it('has consistent bidirectional mapping', () => {
    for (const category of ESTIMATE_CATEGORIES) {
      const hours = CATEGORY_TO_HOURS[category]
      expect(HOURS_TO_CATEGORY[hours]).toBe(category)
    }
  })

  it('categoryToSeconds converts correctly', () => {
    expect(categoryToSeconds('XXS')).toBe(3600)
    expect(categoryToSeconds('M')).toBe(28800)
    expect(categoryToSeconds('XXL')).toBe(172800)
  })

  it('VALID_HOURS contains all supported values', () => {
    expect(VALID_HOURS).toEqual([1, 2, 4, 8, 16, 24, 48])
  })

  it('ESTIMATE_CATEGORIES has correct values', () => {
    expect(ESTIMATE_CATEGORIES).toEqual(['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'])
  })
})
