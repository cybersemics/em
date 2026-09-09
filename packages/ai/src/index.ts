import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { RateLimitError } from 'openai'
import { checkRateLimit } from '@vercel/firewall'
import { z, ZodError, ZodType } from 'zod'
import defineTerm from './prompts/defineTerm'
import generateEmoji from './prompts/generateEmoji'
import generateThought from './prompts/generateThought'
import organizeThought from './prompts/organizeThought'

/** A node in the reorganized thought outline returned to the client. */
interface OutlineNode {
  id: string | null
  text: string | null
  children: OutlineNode[]
}

// express
const app = express()
app.use('/ai', cors())
app.use('/ai', async (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    next()
    return
  }

  try {
    const { rateLimited } = await checkRateLimit('ai-api', {
      headers: req.headers as Record<string, string | string[]>,
    })
    if (rateLimited) {
      res.status(429).send({ error: 'Rate limit reached' })
      return
    }
  } catch (error) {
    // Allow requests if the rate-limit service is unavailable so an infrastructure failure does not disable the AI API.
    console.error('Failed to check AI API rate limit', error)
  }
  next()
})
app.use(bodyParser.json())

/** Parses and validates the LLM's textual final outline. */
const parseOrganizedOutline = (outline: string, expectedIds: Set<string>): OutlineNode[] | null => {
  const parsedLines = outline.split('\n').map(line => {
    const match = line.match(/^( *)\[(\d+|new)\](?: (.*))?$/)
    if (!match || match[1].length % 2 !== 0) return null
    const text = match[3]?.trim() || null
    return match[2] === 'new' && !text
      ? null
      : {
          id: match[2] === 'new' ? null : match[2],
          indent: match[1].length / 2,
          text,
        }
  })
  if (parsedLines.length === 0 || parsedLines.some(line => line === null) || parsedLines[0]!.indent !== 0) return null
  const lines = parsedLines as { id: string | null; indent: number; text: string | null }[]

  /** Parses sibling lines at one indentation level and their descendants. */
  const parseForest = (index: number, indent: number): { nextIndex: number; nodes: OutlineNode[] } | null => {
    if (index >= lines.length || lines[index].indent < indent) return { nextIndex: index, nodes: [] }
    if (lines[index].indent > indent) return null

    const line = lines[index]
    const children = parseForest(index + 1, indent + 1)
    if (!children) return null
    const siblings = parseForest(children.nextIndex, indent)
    return siblings
      ? {
          nextIndex: siblings.nextIndex,
          nodes: [{ children: children.nodes, id: line.id, text: line.text }, ...siblings.nodes],
        }
      : null
  }

  const parsed = parseForest(0, 0)
  if (!parsed || parsed.nextIndex !== lines.length) return null
  const outputIds = (function collectIds(nodes: OutlineNode[]): string[] {
    return nodes.flatMap(node => [...(node.id ? [node.id] : []), ...collectIds(node.children)])
  })(parsed.nodes)

  return (
    parsed.nodes.length > 0 &&
    outputIds.length === expectedIds.size &&
    outputIds.every(id => expectedIds.has(id)) &&
    outputIds.length === new Set(outputIds).size
  )
    ? parsed.nodes
    : null
}

/** Creates a POST route at the given path, with the provided request schema validation and handler. */
const createPostRoute = <T>({
  path,
  requestSchema,
  handler,
}: {
  path: string
  requestSchema: ZodType<T>
  handler: (request: T) => Promise<unknown>
}) => {
  app.post(path, async (req, res) => {
    try {
      const body: unknown = req.body
      const request = requestSchema.parse(body)
      const response = await handler(request)
      res.type('json').send(response)
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).send({ error: error.message })
      } else if (error instanceof RateLimitError) {
        res.status(429).send({ error: 'Rate limit reached' })
      } else {
        console.error(`Failed to handle request at ${path}`, error)
        res.status(500).send({ error: 'Internal server error' })
      }
    }
  })
}

/***********************
 * Routes
 ***********************/

app.get('/', async (req, res) => {
  res.type('text').send('Server is running')
})

/** Defines one or more terms. */
createPostRoute({
  path: '/ai/defineTerm',
  requestSchema: z.object({
    terms: z.array(z.string().trim().min(1)).min(1).describe('The terms to define'),
  }),
  handler: async request => {
    const definitions = await defineTerm(request.terms)
    return { definitions }
  },
})

/** Generates emoji for one or more thoughts. */
createPostRoute({
  path: '/ai/generateEmoji',
  requestSchema: z.object({
    values: z.array(z.string()).min(1).describe('The thought values to generate emoji for'),
  }),
  handler: async request => {
    const emojis = await generateEmoji(request.values)
    return { emojis }
  },
})

/** Generates one or more thoughts. */
createPostRoute({
  path: '/ai/generateThought',
  requestSchema: z.object({
    inputs: z.array(z.string()).min(1).describe('The outlines to generate a thought for'),
  }),
  handler: async request => {
    const thoughts = await generateThought(request.inputs)
    return { thoughts }
  },
})

/** Reorganizes selected thoughts. */
createPostRoute({
  path: '/ai/organizeThought',
  requestSchema: z.object({
    outline: z.string().trim().min(1).describe('The numbered indented outline of thoughts to reorganize'),
  }),
  handler: async request => {
    const finalOutline = await organizeThought(request.outline)
    const expectedIds = new Set([...request.outline.matchAll(/\[(\d+)\]/g)].map(match => match[1]))
    const outline = parseOrganizedOutline(finalOutline, expectedIds)
    if (!outline) {
      throw new Error('The LLM did not return a valid reorganization of the input thoughts')
    }
    return { outline }
  },
})

// Export the Express app as the default export so it runs as a single Vercel Function.
// https://vercel.com/docs/frameworks/backend/express
export default app
