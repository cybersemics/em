import type { Estimate } from './estimateIssue.ts'
import { NEEDS_REVIEW_LABEL } from './flagForReview.ts'
import { formatNeighborDistribution } from './neighborDistribution.ts'

/**
 * Builds the extra audit-comment lines that surface the retrieval + gate outcome for a recorded
 * estimate: the neighbor estimate distribution (when retrieval ran) and, when the confidence gate
 * tripped, a review line naming the label and the reasons. Kept pure so it is unit-testable and
 * shared verbatim by the issue-opened and backfill entry points. Returns an empty array when there
 * is nothing extra to surface.
 */
const formatEstimateAudit = (estimate: Estimate): string[] => {
  const lines: string[] = []

  if (estimate.neighborDistribution.length > 0) {
    lines.push(`Similar past issues: ${formatNeighborDistribution(estimate.neighborDistribution)}`)
  }

  if (estimate.needsReview) {
    lines.push(`⚠️ Flagged \`${NEEDS_REVIEW_LABEL}\`: ${estimate.gateReasons.join('; ')}`)
  }

  return lines
}

export default formatEstimateAudit
