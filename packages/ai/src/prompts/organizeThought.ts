import { z } from 'zod'
import Model from '../@types/Model'
import ReasoningEffort from '../@types/ReasoningEffort'
import Service from '../@types/Service'
import completeChat from '../completeChat'

/** Prompts the LLM to reorganize an indented outline of thoughts. */
const organizeThought = async (input: string): Promise<string> => {
  const { outline } = await completeChat({
    messages: [
      {
        role: 'system',
        content: `You will be given an indented outline of values (referred to as "thoughts") in a note-taking app.

Your task is to reorganize those thoughts.

The user provides an indented outline:
- [] marks a thought that is context only (the parent, or an unselected sibling). Do not move, rename, split, or nest anything under it. Do not include it in your output.
- [n] marks a thought you may reorganize. n is a unique id. You must include every such id in your output exactly once.

You may:
- Reorder reorganizable thoughts, including alphabetically when a parent is labeled that way
- Nest them under each other
- Move a thought into an existing category when that category already fits
- Create new category thoughts with [new] only when no existing thought is a suitable parent
- Split a long thought: keep the original id on one piece with new text, and add sibling [new] thoughts for the extra pieces. Do not duplicate an item that already exists.

Unless a thought explicitly calls for sorting, preserve the input order among thoughts placed under the same parent. Do not create a category for only one thought.

You must not:
- Omit or invent ids
- Include [] context thoughts in the output
- Delete thoughts
- Create leftover buckets such as "Other", "Misc", or "Uncategorized"

Prefer moving items into existing matching categories over creating new ones. Keep a thought's existing children unless those children themselves belong under a different thought.

Return the final structure as an indented outline in the same format as the input. The roots replace the reorganizable siblings.

Output format:
- Start every existing thought with its original [n] id and its complete final text
- Start every new thought with [new] and its text
- Use exactly two spaces per indentation level
- Begin every root at the start of the line
- Do not include [] context thoughts or Markdown code fences

Example 1 — split a compound thought into siblings. Milk already exists, so do not duplicate it, and do not invent a new category.

Input:

\`\`\`
[] Grocery List
  [1] milk
  [2] apples
  [3] bananas
  [4] Buy milk, eggs, and bread
\`\`\`

Output:

\`\`\`
[1] milk
[4] eggs
[new] bread
[2] apples
[3] bananas
\`\`\`

Example 2 — create category thoughts when the list is mixed and has no existing categories.

Input:

\`\`\`
[] Grocery List
  [1] milk
  [2] apples
  [3] bananas
  [4] watermelon
  [5] sour cream
  [6] cheese
  [7] carrots
  [8] potatoes
\`\`\`

Output:

\`\`\`
[new] Dairy
  [1] milk
  [5] sour cream
  [6] cheese
[new] Fruit
  [2] apples
  [3] bananas
  [4] watermelon
[new] Vegetables
  [7] carrots
  [8] potatoes
\`\`\`

Example 3 — two existing categories are selected. Move misplaced items into the matching category and reorder to match the labels. Do not create a third category.

Input:

\`\`\`
[1] Alphabetized states
  [2] Hawaii
  [3] New york
  [4] lemon
  [5] California
  [6] Wisconsin
[7] Alphabetized fruits
  [8] grape
  [9] watermelon
  [10] Arkansas
  [11] Alaska
  [12] apple
  [13] banana
  [14] orange
  [15] mango
\`\`\`

Output:

\`\`\`
[1] Alphabetized states
  [11] Alaska
  [10] Arkansas
  [5] California
  [2] Hawaii
  [3] New york
  [6] Wisconsin
[7] Alphabetized fruits
  [12] apple
  [13] banana
  [8] grape
  [4] lemon
  [15] mango
  [14] orange
  [9] watermelon
\`\`\``,
      },
      {
        role: 'user',
        content: `User's note-taking app thoughts:
\`\`\`
${input}
\`\`\``,
      },
    ],
    model: Model.GPT_5_6_LUNA,
    reasoningEffort: ReasoningEffort.LOW,
    service: Service.ORGANIZE_THOUGHT,
    schema: z.object({
      outline: z
        .string()
        .trim()
        .min(1)
        .describe('The final indented outline, with [n] for existing thoughts and [new] for new thoughts'),
    }),
  })

  return outline
}

export default organizeThought
