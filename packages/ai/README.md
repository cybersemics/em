# AI service

An HTTP server that provides AI services to em.

It is an [Express](https://expressjs.com/) app that is deployed to [Vercel](https://vercel.com/) as a single [Vercel Function](https://vercel.com/docs/frameworks/backend/express). `src/index.ts` exports the Express app as its default export, so there is no `app.listen` or process manager. `vercel.json` disables Vercel's Git deployments because production is deployed by GitHub Actions instead.

## Routes

- `GET /` - Health check. Returns `Server is running`.
- `POST /ai/generateThought` - Generates a complete replacement for the target thought marked with `[x]` in the indented input outline; context thoughts are marked with `[]`. The request body is `{ "input": "..." }`; the response is `{ "thought": "..." }` on success or `{ "error": "..." }` on failure. The client appends `/generateThought` to `VITE_AI_URL`.
- `POST /ai/generateEmoji` - Generates ten distinct, ordered emoji for a thought value. The request body is `{ "value": "..." }`; the response is `{ "emojis": ["...", "..."] }` on success or `{ "error": "..." }` on failure. The client appends `/generateEmoji` to `VITE_AI_URL`.

## Local development

### Setup

Install dependencies from the repository root:

```sh
yarn
```

Create `packages/ai/.env.local` with an OpenAI API key for development. This file is ignored by git.

```dotenv
OPENAI_API_KEY=your-development-key
```

### Running and testing the server

Local development runs the Express app directly with `tsx`, loads `.env.local`, watches the source for changes, and listens on port 3111 by default to match the client's `VITE_AI_URL` in `.env.development`. Set `PORT` to override the server port. It does not require a Vercel login or project link.

```sh
cd packages/ai
yarn start
```

Check the health route:

```sh
curl http://localhost:3111/
```

It should return `Server is running`. Then make a real OpenAI request:

```sh
curl --request POST \
  --header 'Content-Type: application/json' \
  --data '{"input":"Films/Watched/Carol/Starring:/"}' \
  http://localhost:3111/ai/generateThought
```

The response should contain `{ "thought": "..." }`. To test Generate Thought in the app, leave the AI server running and start em from the repository root in a second terminal with `yarn start`.

Other scripts:

- `typecheck` - Type-check the source with `tsc` (no emit). Not used by Vercel, which builds the function from source.

Live model evaluations live in `src/evals/` and run together from the repository root with `yarn test:evals`. The Generate Emoji evaluation requires at least two matches among the ten generated results for each semantic category from issue #4400 and retries failures up to twice to accommodate model nondeterminism. Evaluations require `OPENAI_API_KEY` in `.env.local` and are intentionally excluded from the default deterministic test suite.

> **Note:** This package has no `build` script on purpose. A `build` script makes Vercel run a static build and then fail looking for an output directory; omitting it lets Vercel auto-detect the Express app and deploy it as a Function.

## Deploying to Vercel

The package is deployed at [ai.emthought.space](https://ai.emthought.space) by a dedicated Vercel project (`em-ai`) connected to this repository.

In the Vercel project settings (Settings → Build and Deployment):

- **Root Directory** = `packages/ai`. Keep "Include files outside of the Root Directory" enabled so the Yarn workspace install resolves from the repo root.
- **Framework Preset** = `Express`. `vercel.json` pins the preset, and the deployment workflows enable Vercel's unified
  backend builder so the TypeScript module graph is bundled instead of being emitted as unresolved Node ESM imports.
- **Framework Settings** — leave Build Command and Output Directory overrides off. The Install Command may be overridden with `yarn`.
- **Deployment Protection** — Vercel Authentication must be disabled so em clients can reach the service.

Set `OPENAI_API_KEY` in both the `em-ai` Production and Preview environments. Use a dedicated, tightly
budgeted key for Preview: the preview workflow runs pull request code, including approved fork code, so provider
limits are an additional safeguard against accidental or malicious use. The key is a server secret and must never
be added to the repository or exposed through a `VITE_*` variable.

Production is deployed by the `Vercel Production` GitHub Actions workflow on every push to `main`. The workflow selects `em-ai` with `VERCEL_PROJECT_ID_EM_AI`, runs `vercel pull`, `vercel build --prod`, and `vercel deploy --prebuilt --prod`.

Pull requests are deployed by the `Vercel Preview` workflow. It deploys `em-ai` first, checks the health route, and
then builds the matching `em` preview with the generated AI deployment URL as `VITE_AI_URL`. The pull request's
GitHub deployment links to the user-facing `em` preview, while the workflow summary includes the `em-ai` URL for
diagnostics. Vercel Authentication must remain disabled for preview deployments so the browser can call the API.

Vercel's own Git deployment is disabled in `vercel.json` to prevent duplicate deployments. The repository's `.env.production` sets the AI service base URL to `https://ai.emthought.space/ai`.

### Rate limiting

All `/ai` routes share the `ai-api` Vercel Firewall rate limit. Configure it in the `em-ai` Vercel project under Firewall → Configure → New Rule (not New Rate Limit):

1. Set the rule name to `AI API Rate Limit`.
2. Set the condition to `@vercel/firewall` with Rate Limit ID `ai-api`.
3. Use a fixed window of 10 requests per 60 seconds. The key appears as `API controlled`; the SDK defaults it to the incoming client IP.
4. Set the action to `Too Many Requests (429)`, add the rule, review the changes, and publish them.

The server returns `{ "error": "Rate limit reached" }` with status `429` when the limit is exceeded.

The Vercel Firewall is unavailable during local development, so local requests are not limited. If the rate-limit service fails in production, the request is allowed and the failure is logged rather than disabling the AI API.

### Production smoke tests

```sh
curl https://ai.emthought.space/
curl --request POST \
  --header 'Content-Type: application/json' \
  --data '{"input":"Films/Watched/Carol/Starring:/"}' \
  https://ai.emthought.space/ai/generateThought
```

The first request must return `Server is running`; the second must return JSON containing `thought`. Smoke-test Generate Emoji with the same request shape documented under Routes and `/ai/generateEmoji`.

## Metrics

Function metrics (invocations, duration percentiles, error rate, cold starts, memory) are provided automatically by Vercel's built-in [Observability](https://vercel.com/docs/observability) dashboard. There is no `/metrics` endpoint or Prometheus/Graphite setup in this server.

## Environment variables

- `OPENAI_API_KEY` — required by the AI server locally and in the `em-ai` Vercel Production and Preview environments.
- `PORT` — optional local server port. Defaults to `3111`.
- `VITE_AI_URL` — public, build-time client base URL. Development uses `http://localhost:3111/ai`, production uses `https://ai.emthought.space/ai`, and pull request builds receive their matching `em-ai` preview URL from the workflow.
