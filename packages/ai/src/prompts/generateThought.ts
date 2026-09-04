import { z } from 'zod'
import Model from '../@types/Model'
import ReasoningEffort from '../@types/ReasoningEffort'
import Service from '../@types/Service'
import completeChat from '../completeChat'

/** Prompts the LLM to generate a thought. */
const generateThought = async (
  /** Indented outline in which [x] marks the target thought and [] marks context thoughts. */
  input: string,
): Promise<string> => {
  const systemMessage = `You will be given an indented outline of values (referred to as "thoughts") in a note-taking app. Each line starts with a marker:

* [] identifies a thought in the note-taking app
* [x] identifies the thought that you will generate/replace.

Generate a complete replacement thought that fits the surrounding context.

Return the entire final thought, not only a suffix to append.

For example, if the input thoughts are:

\`\`\`
[] States in Alphabetical Order
  [] Arizona
  [] Arkansas
  [x]
  [] Colorado
\`\`\`

You should respond with: {"thought": "California"}

If the input thoughts are:

\`\`\`
[] Grocery List
  [] Apples
  [x] Carrrots
  [] Onions
\`\`\`

You should respond with: {"thought": "Carrots"}`

  const userMessage = `User's note-taking app thoughts:
\`\`\`
${input}
\`\`\``
  const { thought } = await completeChat({
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    model: Model.GPT_5_6_LUNA,
    reasoningEffort: ReasoningEffort.NONE,
    service: Service.GENERATE_THOUGHT,
    schema: z.object({
      thought: z.string().trim().min(1).describe('The complete replacement for the target thought'),
    }),
  })

  return thought
}

export default generateThought
