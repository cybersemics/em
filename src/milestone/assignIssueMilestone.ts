import callGitHubModel from '../inference/callGitHubModel.js'
import validateJson from '../inference/validateJson.js'
import buildMilestonePrompt from './buildMilestonePrompt.js'
import listOpenMilestones from './listOpenMilestones.js'
import loadMilestoneInstructions from './loadMilestoneInstructions.js'
import loadMilestoneMap from './loadMilestoneMap.js'
import loadMilestoneSamples from './loadMilestoneSamples.js'
import resolveMilestone from './resolveMilestone.js'
import validateMilestoneSelection from './validateMilestoneSelection.js'

interface AssignIssueMilestoneOptions {
  issueNumber: number
  issueTitle: string
  issueBody: string
  issueLabels: string[]
  issueMilestone: string
  token: string
  owner: string
  repo: string
}

const MAX_RETRIES = 3

/** Error thrown when the model does not return a high-confidence milestone selection. */
class LowConfidenceError extends Error {}

/** Posts a comment on the issue. */
const commentOnIssue = async (owner: string, repo: string, issueNumber: number, token: string, body: string) => {
  await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({ body }),
  })
}

/** Sets the milestone on an issue. */
const setIssueMilestone = async (
  owner: string,
  repo: string,
  issueNumber: number,
  token: string,
  milestoneNumber: number,
) => {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({ milestone: milestoneNumber }),
  })

  if (!response.ok) {
    throw new Error(`Failed to set milestone: ${response.status} ${response.statusText}`)
  }
}

/** Assigns a milestone to a GitHub issue using AI inference. */
const assignIssueMilestone = async (options: AssignIssueMilestoneOptions): Promise<void> => {
  const { issueNumber, issueTitle, issueBody, issueLabels, issueMilestone, token, owner, repo } = options

  if (issueMilestone) {
    console.info('Issue already has a milestone. Skipping.')
    return
  }

  const milestoneMap = loadMilestoneMap()
  const instructions = loadMilestoneInstructions()
  const samples = loadMilestoneSamples()
  const openMilestones = await listOpenMilestones(owner, repo, token)

  if (openMilestones.length === 0) {
    await commentOnIssue(
      owner,
      repo,
      issueNumber,
      token,
      'Milestone inference failed.\n\nReason: No open milestones exist.\n\nNo milestone was assigned.',
    )
    throw new Error('No open milestones exist')
  }

  const prompt = buildMilestonePrompt({
    instructions,
    milestoneMap,
    samples,
    issueTitle,
    issueBody,
    issueLabels,
  })

  let errorMessage = ''

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const rawOutput = await callGitHubModel(prompt, token)
      const parsed = validateJson(rawOutput)

      if (!parsed) {
        errorMessage = `Attempt ${attempt}: Invalid JSON output from model`
        continue
      }

      const selection = parsed as { milestone: string; confidence: string }
      const validationError = validateMilestoneSelection(selection, milestoneMap, openMilestones)

      if (validationError) {
        errorMessage = `Attempt ${attempt}: ${validationError}`
        continue
      }

      if (selection.confidence !== 'high') {
        await commentOnIssue(
          owner,
          repo,
          issueNumber,
          token,
          `Milestone inference failed.\n\nReason: ${selection.confidence} confidence selecting an existing open milestone.\n\nNo milestone was assigned.`,
        )
        throw new LowConfidenceError(`Confidence too low: ${selection.confidence}`)
      }

      const milestoneNumber = resolveMilestone(selection.milestone, milestoneMap, openMilestones)
      if (!milestoneNumber) {
        errorMessage = `Attempt ${attempt}: Could not resolve milestone "${selection.milestone}" to an open GitHub milestone`
        continue
      }

      await setIssueMilestone(owner, repo, issueNumber, token, milestoneNumber)
      console.info(`Milestone assigned successfully: ${selection.milestone}`)
      return
    } catch (error) {
      if (error instanceof LowConfidenceError) throw error
      errorMessage = `Attempt ${attempt}: ${(error as Error).message}`
    }
  }

  await commentOnIssue(
    owner,
    repo,
    issueNumber,
    token,
    `Milestone inference failed.\n\nReason: ${errorMessage}\n\nNo milestone was assigned.`,
  )
  throw new Error(`Milestone assignment failed after ${MAX_RETRIES} attempts: ${errorMessage}`)
}

export default assignIssueMilestone
