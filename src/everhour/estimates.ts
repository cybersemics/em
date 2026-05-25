/** Estimate category definitions. */
export const ESTIMATE_CATEGORIES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

export type EstimateCategory = (typeof ESTIMATE_CATEGORIES)[number]

/** Maps estimate categories to hours. */
export const CATEGORY_TO_HOURS: Record<EstimateCategory, number> = {
  XXS: 1,
  XS: 2,
  S: 4,
  M: 8,
  L: 16,
  XL: 24,
  XXL: 48,
}

/** Maps hours to estimate categories. */
export const HOURS_TO_CATEGORY: Record<number, EstimateCategory> = {
  1: 'XXS',
  2: 'XS',
  4: 'S',
  8: 'M',
  16: 'L',
  24: 'XL',
  48: 'XXL',
}

/** Valid hour values for manual corrections. */
export const VALID_HOURS = [1, 2, 4, 8, 16, 24, 48] as const

/** Converts hours to seconds. */
const hoursToSeconds = (hours: number): number => hours * 3600

/** Gets the estimate in seconds for a category. */
export const categoryToSeconds = (category: EstimateCategory): number => hoursToSeconds(CATEGORY_TO_HOURS[category])

export default { ESTIMATE_CATEGORIES, CATEGORY_TO_HOURS, HOURS_TO_CATEGORY, VALID_HOURS, categoryToSeconds }
