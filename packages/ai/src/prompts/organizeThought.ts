import { z } from 'zod'
import Model from '../@types/Model'
import ReasoningEffort from '../@types/ReasoningEffort'
import Service from '../@types/Service'
import completeChat from '../completeChat'

/** A node in the reorganized thought outline returned by the LLM. */
interface OutlineNode {
  id: string | null
  text: string | null
  children: OutlineNode[]
}

const outlineNodeSchema: z.ZodType<OutlineNode> = z.lazy(() =>
  z.object({
    id: z
      .string()
      .nullable()
      .describe('The prompt id of an existing thought from the input, or null for a new thought'),
    text: z
      .string()
      .nullable()
      .describe('Replacement or new thought text. Null keeps the existing thought text. Required when id is null.'),
    children: z.array(outlineNodeSchema).describe('Nested thoughts in document order. Empty if the thought has none.'),
  }),
)

/** Collects every existing-thought id from an outline tree, in document order. */
const collectIds = (nodes: OutlineNode[]): string[] =>
  nodes.flatMap(node => [...(node.id ? [node.id] : []), ...collectIds(node.children)])

/** Extracts [n] ids from the numbered input outline. */
const extractInputIds = (input: string): string[] => [...input.matchAll(/\[(\d+)\]/g)].map(match => match[1])

/** Returns true when every outline node is a new thought or an existing thought, never an empty placeholder. */
const isCompleteNode = (node: OutlineNode): boolean =>
  (node.id !== null || !!node.text?.trim()) && node.children.every(isCompleteNode)

/** Prompts the LLM to reorganize an indented outline of thoughts. */
const organizeThought = async (input: string): Promise<OutlineNode[]> => {
  const expectedIds = extractInputIds(input)
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
- Create new category thoughts (nodes with id null and text set) only when no existing thought is a suitable parent
- Split a long thought: keep the original id on one piece with new text, and add sibling nodes with id null for the extra pieces. Do not duplicate an item that already exists.

You must not:
- Omit or invent ids
- Include [] context thoughts in the output
- Delete thoughts
- Create leftover buckets such as "Other", "Misc", or "Uncategorized"

Prefer moving items into existing matching categories over creating new ones. Keep a thought's existing children unless those children themselves belong under a different thought.

Return the new structure as a forest of outline nodes. The roots replace the reorganizable siblings.

Each node:
- id: the [n] of an existing thought, or null if this is a new thought
- text: null to keep the existing text; a string to set or replace text (required when id is null)
- children: nested reorganized thoughts, or an empty array

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

{
  "outline": [
    { "id": "1", "text": null, "children": [] },
    { "id": "4", "text": "eggs", "children": [] },
    { "id": null, "text": "bread", "children": [] },
    { "id": "2", "text": null, "children": [] },
    { "id": "3", "text": null, "children": [] }
  ]
}

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

{
  "outline": [
    {
      "id": null,
      "text": "Dairy",
      "children": [
        { "id": "1", "text": null, "children": [] },
        { "id": "5", "text": null, "children": [] },
        { "id": "6", "text": null, "children": [] }
      ]
    },
    {
      "id": null,
      "text": "Fruit",
      "children": [
        { "id": "2", "text": null, "children": [] },
        { "id": "3", "text": null, "children": [] },
        { "id": "4", "text": null, "children": [] }
      ]
    },
    {
      "id": null,
      "text": "Vegetables",
      "children": [
        { "id": "7", "text": null, "children": [] },
        { "id": "8", "text": null, "children": [] }
      ]
    }
  ]
}

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

{
  "outline": [
    {
      "id": "1",
      "text": null,
      "children": [
        { "id": "11", "text": null, "children": [] },
        { "id": "10", "text": null, "children": [] },
        { "id": "5", "text": null, "children": [] },
        { "id": "2", "text": null, "children": [] },
        { "id": "3", "text": null, "children": [] },
        { "id": "6", "text": null, "children": [] }
      ]
    },
    {
      "id": "7",
      "text": null,
      "children": [
        { "id": "12", "text": null, "children": [] },
        { "id": "13", "text": null, "children": [] },
        { "id": "8", "text": null, "children": [] },
        { "id": "4", "text": null, "children": [] },
        { "id": "15", "text": null, "children": [] },
        { "id": "14", "text": null, "children": [] },
        { "id": "9", "text": null, "children": [] }
      ]
    }
  ]
}`,
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
    reasoningEffort: ReasoningEffort.NONE,
    service: Service.ORGANIZE_THOUGHT,
    schema: z.object({
      outline: z.array(outlineNodeSchema).describe('The reorganized forest that replaces the reorganizable siblings'),
    }),
  })

  const outputIds = collectIds(outline)
  if (
    !outline.every(isCompleteNode) ||
    outputIds.length !== expectedIds.length ||
    expectedIds.some(id => outputIds.filter(outputId => outputId === id).length !== 1)
  ) {
    throw new Error('The LLM did not return a valid reorganization of the input thoughts')
  }

  return outline
}

export default organizeThought
