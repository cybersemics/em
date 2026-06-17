An HTTP server that provides AI services to em.

It is an [Express](https://expressjs.com/) app that is deployed to [Vercel](https://vercel.com/) as a single [Vercel Function](https://vercel.com/docs/frameworks/backend/express). `src/index.ts` exports the Express app as its default export, which is all Vercel needs to run it — there is no `app.listen`, no `vercel.json`, and no process manager.

## Routes

- `GET /` - Health check. Returns `Server is running`.
- `POST /ai` - Generates a thought. The request body is the plaintext prompt; the response is `{ content }` on success or `{ err }` on failure. Called by the client via `VITE_AI_URL`.

# Local Development

## Setup

1. `yarn`
1. `yarn build` (optional — typechecks and compiles to `build/`)

## Running the server

Local development uses the [Vercel CLI](https://vercel.com/docs/cli), which runs the function exactly as it runs in production:

```sh
yarn dev
```

This starts the app on a local port and serves `GET /` and `POST /ai`.

Other scripts:

- `build` - Typecheck and compile with `tsc` (output in `build/`). Not required by Vercel, which builds the function from source.

# Deploying to Vercel

The package is deployed by a dedicated Vercel project (`em-ai`) connected to this repository.

In the Vercel project settings, set:

- **Root Directory** = `packages/ai` (under Settings → Build and Deployment). Keep "Include files outside of the Root Directory" enabled so the Yarn workspace install resolves from the repo root.

Vercel auto-detects the Express app and deploys it as a Function — no Output Directory, build command, or `vercel.json` is needed.

## Metrics

Function metrics (invocations, duration percentiles, error rate, cold starts, memory) are provided automatically by Vercel's built-in [Observability](https://vercel.com/docs/observability) dashboard. There is no `/metrics` endpoint or Prometheus/Graphite setup in this server.

## Environment Variables

You can run the server locally without setting any env variables. When deploying, set the appropriate env variables in the Vercel project's environment settings.

- `process.env.OPENAI_API_KEY` - OpenAI API Key.
