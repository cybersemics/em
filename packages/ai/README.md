An HTTP server that provides AI services to em.

It is an [Express](https://expressjs.com/) app that is deployed to [Vercel](https://vercel.com/) as a single [Vercel Function](https://vercel.com/docs/frameworks/backend/express). `src/index.ts` exports the Express app as its default export, which is all Vercel needs to run it — there is no `app.listen`, no `vercel.json`, and no process manager.

## Routes

- `GET /` - Health check. Returns `Server is running`.
- `POST /ai` - Generates a thought. The request body is the plaintext prompt; the response is `{ content }` on success or `{ err }` on failure. Called by the client via `VITE_AI_URL`.

# Local Development

## Setup

1. `yarn`
1. `yarn typecheck` (optional — type-checks with `tsc`)

## Running the server

Local development uses the [Vercel CLI](https://vercel.com/docs/cli), which runs the function exactly as it runs in production:

```sh
yarn dev
```

This starts the app on a local port and serves `GET /` and `POST /ai`.

Other scripts:

- `typecheck` - Type-check the source with `tsc` (no emit). Not used by Vercel, which builds the function from source.

> **Note:** This package has no `build` script on purpose. A `build` script makes Vercel run a static build and then fail looking for an output directory; omitting it lets Vercel auto-detect the Express app and deploy it as a Function.

# Deploying to Vercel

The package is deployed by a dedicated Vercel project (`em-ai`) connected to this repository.

In the Vercel project settings (Settings → Build and Deployment):

- **Root Directory** = `packages/ai`. Keep "Include files outside of the Root Directory" enabled so the Yarn workspace install resolves from the repo root.
- **Framework Settings** — leave Build Command and Output Directory **overrides off** (use the defaults). If a Build Command or Output Directory override is enabled, Vercel runs a static build and fails with `No Output Directory named "public" found`.

With no `build` script and no overrides, Vercel auto-detects the Express app and deploys it as a Function — no Output Directory or `vercel.json` is needed.

## Metrics

Function metrics (invocations, duration percentiles, error rate, cold starts, memory) are provided automatically by Vercel's built-in [Observability](https://vercel.com/docs/observability) dashboard. There is no `/metrics` endpoint or Prometheus/Graphite setup in this server.

## Environment Variables

You can run the server locally without setting any env variables. When deploying, set the appropriate env variables in the Vercel project's environment settings.

- `process.env.OPENAI_API_KEY` - OpenAI API Key.
