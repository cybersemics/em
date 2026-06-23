import bodyParser from 'body-parser'
import cors from 'cors'
import express, { Request, Response } from 'express'
import prompt from './prompt'

// express
const app = express()
app.use(bodyParser.text())

/***********************
 * Routes
 ***********************/

app.get('/', async (req, res) => {
  res.type('text').send('Server is running')
})

app.post(
  '/ai',
  cors({
    // TODO
    // origin: /http:\/\/localhost:\d+/,
  }),
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (req: Request<any, any, string, any>, res: Response<any>) => {
    if (!req.body) {
      return res.status(400).send('Missing req.body')
    }

    const result = await prompt(req.body)

    res
      .type('json')
      .status(result.err ? result.err.status : 200)
      .send(result)
  },
)

// Export the Express app as the default export so it runs as a single Vercel Function.
// https://vercel.com/docs/frameworks/backend/express
export default app
