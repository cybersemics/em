import EverhourClient from '../everhour/client.ts'
import { CATEGORY_TO_HOURS, type EstimateCategory, categoryToSeconds } from '../everhour/estimates.ts'
import buildPrompt, { type IssueInput } from './buildPrompt.ts'
import { type MaybeEmbeddedSample, embeddingText } from './embeddingCache.ts'
import { embedText } from './embeddings.ts'
import { evaluateGate, resolveGateThresholds } from './estimateGate.ts'
import inference from './inference.ts'
import type { EstimateSample } from './loadSamples.ts'
import {
  type CategoryCount,
  formatNeighborDistribution,
  neighborDispersion,
  neighborDistribution,
} from './neighborDistribution.ts'
import { selectNeighbors } from './retrieval.ts'
import tallyVotes from './tallyVotes.ts'

// Number of nearest-neighbor samples to inject into the prompt. Overridable via ESTIMATE_NEIGHBORS.
const NEIGHBORS = process.env.ESTIMATE_NEIGHBORS != null ? Number(process.env.ESTIMATE_NEIGHBORS) : 8

/** An issue estimate expressed as a category and its equivalent hours and seconds, plus uncertainty signals. */
export interface Estimate {
  category: EstimateCategory
  hours: number
  seconds: number
  /** Fraction of valid votes that agreed with the chosen category (0–1). */
  agreement: number
  /** Self-reported confidence carried from a winning vote. */
  confidence: 'high' | 'medium' | 'low'
  /** Rationale carried from a winning vote, for the audit trail. */
  rationale: string
  /** Second-choice category from a winning vote, if provided. */
  secondChoice?: EstimateCategory
  /** Distribution of the retrieved neighbors' expected categories; empty when retrieval was unavailable. */
  neighborDistribution: CategoryCount[]
  /** Neighbor category dispersion (0–1); undefined when retrieval was unavailable. */
  dispersion?: number
  /** Whether the confidence gate flagged this estimate for human review. */
  needsReview: boolean
  /** Human-readable reasons the gate tripped; empty when it did not. */
  gateReasons: string[]
}

/**
 * Chooses the prompt samples via kNN retrieval when cached sample embeddings are available, else
 * falls back to using every sample (the pre-retrieval behavior). Embeds only the target issue (one
 * API call); a failure there degrades gracefully to the all-samples path rather than aborting the
 * estimate. Returns the chosen samples plus the neighbor distribution/dispersion derived from them.
 */
const selectPromptSamples = async ({
  issue,
  samples,
  embeddedSamples,
  openaiApiKey,
  issueRef,
}: {
  issue: IssueInput
  samples: EstimateSample[]
  embeddedSamples?: MaybeEmbeddedSample[]
  openaiApiKey: string
  issueRef: string
}): Promise<{ promptSamples: EstimateSample[]; distribution: CategoryCount[]; dispersion?: number }> => {
  const candidates = (embeddedSamples ?? [])
    .filter((entry): entry is MaybeEmbeddedSample & { embedding: number[] } => entry.embedding != null)
    .map(entry => ({ sample: entry.sample, embedding: entry.embedding }))

  // No cached vectors → fall back to stuffing all samples, with no neighbor prior.
  if (candidates.length === 0) {
    if (embeddedSamples && embeddedSamples.length > 0) {
      console.warn(
        `No cached sample embeddings available for ${issueRef}; falling back to all-samples prompt. Run "yarn embed" to enable retrieval.`,
      )
    }
    return { promptSamples: samples, distribution: [], dispersion: undefined }
  }

  try {
    const targetEmbedding = await embedText(openaiApiKey, embeddingText(issue))
    const neighbors = selectNeighbors({ target: targetEmbedding, candidates, k: NEIGHBORS })
    return {
      promptSamples: neighbors,
      distribution: neighborDistribution(neighbors),
      dispersion: neighborDispersion(neighbors),
    }
  } catch (err) {
    // Embedding the target failed (e.g. transient API error). Degrade to all-samples rather than
    // failing the estimate; the votes still produce a usable result.
    console.warn(`Failed to embed ${issueRef} for retrieval; falling back to all-samples prompt:`, err)
    return { promptSamples: samples, distribution: [], dispersion: undefined }
  }
}

/**
 * Runs AI inference on a single issue and writes the resulting estimate to Everhour.
 * Shared by the issue-opened (issue.ts) and backfill (backfill.ts) entry points so the
 * prompt → inference → validation → Everhour write pipeline lives in a single place,
 * including the dry-run guards that independently disable inference and the Everhour write.
 *
 * When cached sample embeddings are supplied, the prompt is built from the k nearest neighbors and
 * their estimate distribution is injected; the confidence gate combines vote agreement, neighbor
 * dispersion, and model self-confidence into a needsReview flag (a pure decision — the GitHub side
 * effect of flagging is the caller's responsibility). The Everhour write is never gated.
 *
 * Returns null when dryRunAI is set (no inference is performed).
 */
const estimateIssue = async ({
  issue,
  issueRef,
  issueUrl = '',
  instructions,
  samples,
  embeddedSamples,
  openaiApiKey,
  everhour,
  taskId,
  dryRunAI = false,
  dryRunEverhour = false,
}: {
  issue: IssueInput
  /** Issue reference label (`#N`, as an OSC 8 terminal hyperlink locally) for log output; see issueLink. */
  issueRef: string
  /** Trailing ` - <url>` suffix appended at the end of log lines in CI; empty locally. See issueUrlSuffix. */
  issueUrl?: string
  instructions: string
  samples: EstimateSample[]
  /** Samples joined with their cached embeddings, for kNN retrieval. Omit to use the all-samples prompt. */
  embeddedSamples?: MaybeEmbeddedSample[]
  /** OpenAI API key passed through to the inference call. */
  openaiApiKey: string
  everhour: EverhourClient
  taskId: string
  dryRunAI?: boolean
  dryRunEverhour?: boolean
}): Promise<Estimate | null> => {
  // Skip AI inference entirely in AI dry-run mode.
  if (dryRunAI) {
    console.info(`[DRY_RUN_AI] Would estimate ${issueRef} "${issue.title}"${issueUrl}`)
    return null
  }

  const { promptSamples, distribution, dispersion } = await selectPromptSamples({
    issue,
    samples,
    embeddedSamples,
    openaiApiKey,
    issueRef,
  })

  const prompt = buildPrompt(promptSamples, issue, {
    neighborDistribution: formatNeighborDistribution(distribution) || undefined,
  })
  const outputs = await inference({ apiKey: openaiApiKey, prompt, instructions })
  const vote = tallyVotes(outputs)

  const gate = evaluateGate(
    { agreement: vote.agreement, dispersion, confidence: vote.confidence },
    resolveGateThresholds(),
  )

  const estimate: Estimate = {
    category: vote.estimate,
    hours: CATEGORY_TO_HOURS[vote.estimate],
    seconds: categoryToSeconds(vote.estimate),
    agreement: vote.agreement,
    confidence: vote.confidence,
    rationale: vote.rationale,
    secondChoice: vote.secondChoice,
    neighborDistribution: distribution,
    dispersion,
    needsReview: gate.needsReview,
    gateReasons: gate.reasons,
  }

  // Write the estimate to Everhour unless the Everhour write is being dry-run.
  if (dryRunEverhour) {
    console.info(
      `[DRY_RUN_EVERHOUR] Would set Everhour estimate for ${issueRef} "${issue.title}": ${estimate.category} / ${estimate.hours}h${issueUrl}`,
    )
  } else {
    await everhour.setEstimate(taskId, estimate.seconds)
  }

  return estimate
}

export default estimateIssue
