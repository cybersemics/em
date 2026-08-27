import { z } from 'zod'
import Model from '../@types/Model'
import ReasoningEffort from '../@types/ReasoningEffort'
import completeChat from '../completeChat'

/** Prompts the LLM to generate a thought. */
const generateThought = async (
  /** Indented outline in which [x] marks the target thought and [] marks context thoughts. */
  input: string,
): Promise<string> => {
  const systemMessage = `You will be given an indented outline of notes. Each line starts with a marker:

* [] identifies a note
* [x] identifies the note that you will generate/replace.

Generate a complete replacement note that fits the surrounding context.

Return the entire final note, not only a suffix to append.

For example, if the input is:

\`\`\`
[] States in Alphabetical Order
  [] Arizona
  [] Arkansas
  [x]
  [] Colorado
\`\`\`

You should respond with: {"generatedNote": "California"}

If the input is:

\`\`\`
[] Grocery List
  [] Apples
  [x] Carrrots
  [] Onions
\`\`\`

You should respond with: {"generatedNote": "Carrots"}`

  const userMessage = `User's notes:
\`\`\`
${input}
\`\`\``
  const { generatedNote } = await completeChat({
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    model: Model.GPT_5_6_LUNA,
    reasoningEffort: ReasoningEffort.NONE,
    schema: z.object({
      generatedNote: z.string().trim().min(1).describe('The complete replacement for the target note'),
    }),
  })

  return generatedNote
}

export default generateThought
