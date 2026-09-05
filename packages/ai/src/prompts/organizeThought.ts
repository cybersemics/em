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
        content: `You reorganize thoughts in a note-taking app.

The user provides an indented outline:
- [] marks a sibling that is context only. Do not move, rename, split, or nest anything under it. Do not include it in your output.
- [n] marks a thought you may reorganize. n is a unique id. You must include every such id in your output exactly once.

You may:
- Reorder reorganizable thoughts
- Nest them under each other
- Create new category thoughts (nodes with id null and text set)
- Split a long thought: keep the original id on one piece with new text, and add sibling nodes with id null for the extra pieces

You must not:
- Omit or invent ids
- Include [] context thoughts in the output
- Delete thoughts

Return the new structure as a forest of outline nodes. The roots replace the reorganizable siblings.

Each node:
- id: the [n] of an existing thought, or null if this is a new thought
- text: null to keep the existing text; a string to set or replace text (required when id is null)
- children: nested reorganized thoughts, or an empty array

Example input:

\`\`\`
[] milk
[1] apples
  [2] granny smith
[3] bananas
[4] Buy milk, eggs, and bread
\`\`\`

Example output that categorizes fruit, preserves the nested apple variety, and splits the long thought:

{
  "outline": [
    {
      "id": null,
      "text": "Fruit",
      "children": [
        { "id": "1", "text": null, "children": [{ "id": "2", "text": null, "children": [] }] },
        { "id": "3", "text": null, "children": [] }
      ]
    },
    { "id": "4", "text": "Buy milk", "children": [] },
    { "id": null, "text": "Buy eggs", "children": [] },
    { "id": null, "text": "Buy bread", "children": [] }
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
