import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { RateLimitError } from 'openai'
import { checkRateLimit } from '@vercel/firewall'
import { z, ZodError, ZodType } from 'zod'
import generateEmoji from './prompts/generateEmoji'
import generateThought from './prompts/generateThought'

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

/** Generates emoji for a thought. */
createPostRoute({
  path: '/ai/generateEmoji',
  requestSchema: z.object({
    value: z.string().describe('The thought value to generate emoji for'),
  }),
  handler: async (request) => {
    const emojis = await generateEmoji(request.value)
    return { emojis }
  },
})

/** Generates a thought. */
createPostRoute({
  path: '/ai/generateThought',
  requestSchema: z.object({
    input: z.string().describe('The input to generate a thought for'),
  }),
  handler: async (request) => {
    const thought = await generateThought(request.input)
    return { thought }
  },
})

// Export the Express app as the default export so it runs as a single Vercel Function.
// https://vercel.com/docs/frameworks/backend/express
export default app
