import { ESTIMATE_CATEGORIES, type EstimateCategory } from '../everhour/estimates.ts'
import type { EstimateSample } from './loadSamples.ts'

/** A category and how many of the retrieved neighbors carry it. */
export interface CategoryCount {
  category: EstimateCategory
  count: number
}

/** Ordinal index of a category on the XXS<XS<S<M<L<XL<XXL scale. */
const categoryIndex = (category: EstimateCategory): number => ESTIMATE_CATEGORIES.indexOf(category)

/**
 * Tallies the `expected` categories of the retrieved neighbors into counts, ordered from most to
 * least frequent (ties broken toward the larger/more conservative bucket, mirroring tallyVotes). A
 * neighbor whose `expected` is not a recognized category is ignored, so a malformed sample cannot
 * corrupt the distribution.
 */
export const neighborDistribution = (neighbors: EstimateSample[]): CategoryCount[] => {
  const counts = new Map<EstimateCategory, number>()
  for (const neighbor of neighbors) {
    const category = neighbor.expected as EstimateCategory
    if (!ESTIMATE_CATEGORIES.includes(category)) continue
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || categoryIndex(b.category) - categoryIndex(a.category))
}

/** Renders a distribution as a compact line, e.g. `M×4, S×3, L×1`. Empty string when there are none. */
export const formatNeighborDistribution = (distribution: CategoryCount[]): string =>
  distribution.map(({ category, count }) => `${category}×${count}`).join(', ')

/**
 * Dispersion of the neighbor categories on the ordinal scale, normalized to [0, 1]. 0 means every
 * neighbor shares one bucket (a confident, concentrated prior); values approaching 1 mean the
 * neighbors are scattered across the scale (a weak, ambiguous prior). Computed as the population
 * standard deviation of the neighbors' ordinal indices divided by the maximum possible standard
 * deviation for the scale (half the neighbors at each extreme → std = span/2), which makes it an
 * uncertainty signal independent of vote agreement and self-reported confidence.
 *
 * Returns 0 for an empty or single neighbor set (no spread is measurable).
 */
export const neighborDispersion = (neighbors: EstimateSample[]): number => {
  const indices = neighbors
    .map(neighbor => neighbor.expected as EstimateCategory)
    .filter(category => ESTIMATE_CATEGORIES.includes(category))
    .map(categoryIndex)

  if (indices.length < 2) return 0

  const mean = indices.reduce((sum, index) => sum + index, 0) / indices.length
  const variance = indices.reduce((sum, index) => sum + (index - mean) ** 2, 0) / indices.length
  const std = Math.sqrt(variance)

  // Maximum std occurs with half the mass at each end of the scale (indices 0 and CATEGORIES-1).
  const maxStd = (ESTIMATE_CATEGORIES.length - 1) / 2
  return maxStd === 0 ? 0 : Math.min(1, std / maxStd)
}
