import { z } from 'zod'
import Model from '../@types/Model'
import ReasoningEffort from '../@types/ReasoningEffort'
import Service from '../@types/Service'
import completeChat from '../completeChat'

/** Prompts the LLM to write a concise dictionary entry for a term. */
const defineTerm = async (term: string): Promise<string> => {
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
        .describe('A concise dictionary definition containing between 10 and 20 words'),
    }),
  })

  const wordCount = definition.split(/\s+/).length

  if (wordCount < 10) {
    throw new Error('The definition must contain at least 10 words')
  }

  if (wordCount > 20) {
    throw new Error('The definition must contain at most 20 words')
  }

  return definition
}

export default defineTerm
