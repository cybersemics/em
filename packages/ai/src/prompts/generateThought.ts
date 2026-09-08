import { z } from 'zod'
import Model from '../@types/Model'
import ReasoningEffort from '../@types/ReasoningEffort'
import Service from '../@types/Service'
import completeChat from '../completeChat'

/** Prompts the LLM to generate a replacement for the target thought of each outline in one request. Returns the replacements in outline order. */
const generateThought = async (
  /** Indented outlines in which [x] marks the target thought and [] marks context thoughts. */
  inputs: string[],
): Promise<string[]> => {
  const systemMessage = `You will be given one or more indented outlines of values (referred to as "thoughts") in a note-taking app. Each line starts with a marker:

* [] identifies a thought in the note-taking app
* [x] identifies the thought that you will generate/replace.

For each outline, generate a complete replacement thought that fits the surrounding context of that outline.

Return the entire final thought, not only a suffix to append.

For example, if the input outline is:

\`\`\`
[] States in Alphabetical Order
  [] Arizona
  [] Arkansas
  [x]
  [] Colorado
\`\`\`

You should respond with: {"thought_0": "California"}

If the input outline is:

\`\`\`
[] Grocery List
  [] Apples
  [x] Carrrots
  [] Onions
\`\`\`

You should respond with: {"thought_0": "Carrots"}

When there are multiple outlines, respond with one field per outline, numbered to match the outline.`

  const userMessage = inputs
    .map(
      (input, index) => `Outline ${index}:
\`\`\`
${input}
\`\`\``,
    )
    .join('\n\n')

  const thoughts = await completeChat({
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    model: Model.GPT_5_6_LUNA,
    reasoningEffort: ReasoningEffort.NONE,
    service: Service.GENERATE_THOUGHT,
    schema: z.object(
      Object.fromEntries(
        inputs.map((_, index) => [
          `thought_${index}`,
          z.string().trim().min(1).describe(`The complete replacement for the [x] thought in outline ${index}`),
        ]),
      ),
    ),
  })

  return inputs.map((_, index) => thoughts[`thought_${index}`].trim())
}

export default generateThought
