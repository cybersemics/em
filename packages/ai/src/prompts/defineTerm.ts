import { z, ZodError } from 'zod'
import Model from '../@types/Model'
import ReasoningEffort from '../@types/ReasoningEffort'
import Service from '../@types/Service'
import completeChat from '../completeChat'
import UpstreamResponseError from '../UpstreamResponseError'

const INVALID_DEFINITION_MESSAGE = 'The AI could not generate a 10–20 word definition. Please try again.'

/** Prompts the LLM to write a concise dictionary entry for a term. */
const defineTerm = async (term: string): Promise<string> => {
  /** Requests a definition, retrying once when the upstream response violates the output contract. */
  const requestDefinition = async (attemptsRemaining: number): Promise<string> => {
    try {
      const { definition } = await completeChat({
        messages: [
          {
            role: 'system',
            content:
              'Write a clear dictionary entry for the given term in 10-20 words. Return only the definition, without repeating the term.',
          },
          { role: 'user', content: term },
        ],
        model: Model.GPT_5_6_LUNA,
        reasoningEffort: ReasoningEffort.NONE,
        service: Service.DEFINE_TERM,
        schema: z.object({
          definition: z
            .string()
            .trim()
            .min(1)
            .describe('A concise dictionary definition containing between 10 and 20 words'),
        }),
      })

      const words = definition.trim().split(/\s+/)
      if (words.length >= 10 && words.length <= 20) return words.join(' ')
      if (attemptsRemaining > 1) return await requestDefinition(attemptsRemaining - 1)
      throw new UpstreamResponseError(INVALID_DEFINITION_MESSAGE)
    } catch (error) {
      if (!(error instanceof ZodError)) throw error
      if (attemptsRemaining > 1) return requestDefinition(attemptsRemaining - 1)
      throw new UpstreamResponseError(INVALID_DEFINITION_MESSAGE)
    }
  }

  return requestDefinition(2)
}

export default defineTerm
