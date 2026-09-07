import { z } from 'zod'
import Model from '../@types/Model'
import ReasoningEffort from '../@types/ReasoningEffort'
import Service from '../@types/Service'
import completeChat from '../completeChat'

/** Prompts the LLM to write a concise dictionary entry for each term. */
const defineTerm = async (terms: string[]): Promise<string[]> => {
  const definitions = await completeChat({
    messages: [
      {
        role: 'system',
        content:
          'Write a clear dictionary entry for each term in 10-20 words. Return only the definitions, without repeating the terms within their own definitions.',
      },
      { role: 'user', content: `Terms to define:\n\n${terms.join('\n')}` },
    ],
    model: Model.GPT_5_6_LUNA,
    reasoningEffort: ReasoningEffort.NONE,
    service: Service.DEFINE_TERM,
    schema: z.object(
      Object.fromEntries(
        terms.map((term, index) => [
          `definition_${index}`,
          z.string().trim().describe(`A definition of the term: ${term}`),
        ]),
      ),
    ),
  })

  return terms.map((_, index) => definitions[`definition_${index}`].trim())
}

export default defineTerm
