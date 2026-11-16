# Feedback service

Private feedback collection for em, implemented as an Express app deployed to Vercel like `packages/ai`.
Users can submit anonymously, optionally identify themselves, attach files, and explicitly include selected thoughts,
display resolution, or a debug log. There is no triage UI, classification, or notification service.
Submissions are currently open with basic rate limiting; application authentication is deferred.
Production apps submit to the production feedback service; preview apps submit to the matching feedback preview.
Both service deployments use the same database and private Blob store and share one maintainer inbox.

## One-time setup

Complete this before merging the deployment workflow changes. No resources are provisioned by installing this package.

1. Create one Vercel project named **em-feedback**. It can be created before this PR merges with
   `npx vercel@latest project add em-feedback --scope cybersemics`; GitHub import is optional because GitHub Actions
   owns deployment. Set its Root Directory to
   `packages/feedback`, enable **Include files outside of the Root Directory**, and select the **Express** framework.
   Leave Build Command and Output Directory overrides off. Vercel bundles the exported Express app as a Function;
   this package intentionally has no static build script. Disable Deployment Protection for Production and Preview
   so anonymous clients can reach it. `vercel.json` disables Vercel Git deployments because GitHub Actions owns deployment.
2. Provision **Neon Postgres** through Vercel Marketplace. Set the same `DATABASE_URL` in the feedback project's
   **Production and Preview** environments, pointing to the same Neon branch and database. Do not enable automatic
   preview database branching for this connection; remove any branch-specific `DATABASE_URL` overrides that select
   another database. Apply [schema.sql](schema.sql) once through Neon's SQL editor or `psql "$DATABASE_URL" -f schema.sql`.
3. Create one **private** Vercel Blob store for the project. Connect the same store's `BLOB_READ_WRITE_TOKEN` to
   **Production and Preview**. In the store's project connection settings, select both environments.
   Public stores are not supported; the service verifies that finalized attachments reside in a private store.
4. Generate separate random server secrets for `FEEDBACK_READ_SECRET` and `CRON_SECRET`, for example with
   `openssl rand -hex 32`. Set both in the Vercel project's Production environment. Never put these or database/Blob
   credentials in `VITE_*` variables. The first authorizes read-only maintainer access; the second authorizes abandoned-upload cleanup.
5. **Deploy backend previews with shared production storage.** Production and Preview are environments of the same
   `em-feedback` project; no second Vercel project, database, or Blob store is needed. Each web preview uses its
   matching feedback backend preview. Preview submissions and attachments appear alongside production feedback.
   Preview backend code receives the shared storage credentials, so review PR code before approving deployment,
   including fork PRs. Frontends receive only public backend URLs. Keep `FEEDBACK_READ_SECRET` and `CRON_SECRET`
   scoped to Production; maintainer reads use the production API, and preview read/cleanup endpoints remain unavailable.
6. Under the feedback project's **Firewall → Configure → New Rule**, configure two API-controlled rate-limit rules:

   | Rate Limit ID          | Fixed window                              | Action                  |
   | ---------------------- | ----------------------------------------- | ----------------------- |
   | `feedback-submissions` | 5 requests per 600 seconds per client IP  | Too Many Requests (429) |
   | `feedback-uploads`     | 50 requests per 600 seconds per client IP | Too Many Requests (429) |

   Use the `@vercel/firewall` condition and the exact IDs above, as for `ai-api` in the AI project. Review and publish
   the rules. Reservation requests use the first rule; upload-token requests and finalization use the second. Failed
   attempts and retries count toward these limits. Ensure the rules apply to both Production and Preview. Enable
   **Protection Bypass for Automation** and **Automatically expose System Environment Variables** for the Firewall SDK
   to work in Preview. The bypass secret stays server-side; Deployment Protection must still allow browser calls.
   Deployed services reject writes with 503 if the firewall check fails or a rule is missing; local development does
   not call Vercel Firewall. These are abuse controls, not user authentication.

7. Add GitHub Actions secret **`VERCEL_PROJECT_ID_EM_FEEDBACK`** alongside the existing Vercel organization/token
   secrets. Use the project ID from Vercel Settings. The Production workflow deploys all three projects independently
   on pushes to `main`. The Preview workflow uses the same project ID to deploy a feedback preview before building
   the web app with that preview's URL as `VITE_FEEDBACK_URL`. Database, Blob, read, and cleanup credentials stay in
   Vercel rather than separate GitHub secrets.
8. Configure `feedback.emthought.space` as the feedback project's production domain, matching the frontend's
   `.env.production` `VITE_FEEDBACK_URL=https://feedback.emthought.space/feedback`. If another production domain is
   desired, update that value before building. Preview URLs are generated by the workflow; no preview custom domain
   is needed. Make an initial production deployment from this PR's code before testing backend previews. Enable the
   daily Vercel Cron defined in `vercel.json` for production; it cleans abandoned uploads from both service deployments
   in the shared database and store. Preview deployments do not schedule cron jobs.

PRs use the workflow on the base branch (`pull_request_target`), so changes to preview wiring take effect after merge.
A push to a feature branch without a PR triggers neither production nor preview deployment.

## Local development

Run `yarn` from the repository root. Create an ignored `packages/feedback/.env.local`:

```dotenv
DATABASE_URL=postgresql://YOUR_DEVELOPMENT_DATABASE
BLOB_READ_WRITE_TOKEN=YOUR_DEVELOPMENT_PRIVATE_STORE_TOKEN
FEEDBACK_READ_SECRET=YOUR_DEVELOPMENT_READ_SECRET
CRON_SECRET=YOUR_DEVELOPMENT_CLEANUP_SECRET
```

Apply the schema to that database, then run `yarn workspace feedback start` and, separately, `yarn start`.
The service defaults to port 3112, matching `.env.development`. `PORT` overrides it. The frontend's
`VITE_FEEDBACK_URL` is the service URL including `/feedback`, without a trailing slash.

Blob uploads go directly from the browser to Vercel. The completion webhook is signature-verified by the SDK, but
the service verifies objects explicitly during finalization, so localhost does not need a public webhook tunnel.

## Submission protocol

All JSON requests are bounded to 3 MB. The service validates all fields independently of the client:
name up to 200 characters, optional valid email, message 1–10,000 characters after trimming, and
optional outline/debug log up to 500,000 characters each. The HTTP body limit also applies to their JSON encoding.
The form refuses oversized text attachments rather than silently truncating them.

1. `POST /feedback` reserves `{ id, token, payload }`. `id` and `token` are independently generated UUIDs.
   `payload` contains `name`, `email`, `message`, `metadata`, `files`, and optionally `thoughts` and `debugLog`.
   File descriptors contain `name`, `size`, and `contentType`. Metadata contains `version`, `commit`, `userAgent`,
   `platform`, and optionally `resolution: { width, height, pixelRatio }` (CSS viewport dimensions).
2. The response contains `{ id, submitted, files: [{ pathname, uploaded }] }`. For each missing file, call the Blob
   client's `upload(pathname, file, { access: 'private', handleUploadUrl: FEEDBACK_URL + '/upload',
contentType, clientPayload: JSON.stringify({ id, token, index }) })`.
3. `POST /feedback/:id/complete` with `{ token }` verifies every file's actual size, MIME type, and private-store
   location, then makes the feedback available to maintainers. Text-only feedback follows the same protocol.

Tokens are scoped to immutable reserved paths, declared types and sizes, and a 15-minute upload session.
Overwrites and multipart uploads are disabled. The limit is five files, 10 MiB each, 25 MiB combined. Supported
extensions are PNG, JPG/JPEG, WebP, GIF, TXT/LOG, JSON, and PDF. MIME declarations do not establish that a file is
safe to execute; downloads use attachment disposition, an opaque content type, and `nosniff`.

An unchanged retry reuses its UUIDs and payload. Already uploaded files are detected and skipped, and completing a
submitted session is idempotent. Changing the draft creates a new session. The database stores a hash of the upload
token, not the token. Incomplete sessions are hidden from maintainer queries and expire for upload authorization
after 15 minutes. A secret-protected daily `GET /internal/cleanup` deletes up to 100 abandoned sessions older than
one day and their reserved Blob objects. Repeat this call to clear a larger backlog. Submitted feedback never expires.

## Read-only maintainer API

Every route below requires `Authorization: Bearer FEEDBACK_READ_SECRET`. Responses use `Cache-Control: no-store`.
The secret is used in an HTTP header, never a query string. There are no public list/read routes or maintainer write routes.

- `GET /feedback?limit=50&cursor=...` returns `{ items, nextCursor }`, newest first. The limit is 1–100. Items contain
  `id`, `submitted_at`, name, email, a 200-character message excerpt, and file count. Pass the opaque `nextCursor`
  to fetch the next page. Large text attachments are only returned by the detail endpoint.
- `GET /feedback/:id` returns the submitted payload, timestamp, and attachment `downloadPath` values. It omits
  internal upload authorization fields. The `thoughts` value is the same indented plain-text format used in em issues.
- `GET /feedback/:id/files/:index` streams the private attachment as a download. Include the same Authorization header.

For example, with operator variables set locally:

```sh
curl --fail --header "Authorization: Bearer $FEEDBACK_READ_SECRET" \
  'https://feedback.emthought.space/feedback?limit=20'
```

After provisioning, smoke-test the health route, an anonymous text-only reservation and completion, a private file
upload and authorized download, an unauthorized read (401), and the published firewall limits (429). Then verify a
frontend submission and attachment through a matching backend preview, and confirm both can be read through the
production maintainer API. `GET /` is a process health check and does not establish database/Blob readiness.

## Tests

`yarn test` collects service tests along with app tests. `yarn workspace feedback typecheck` checks this package;
root `yarn lint:tsc` also includes it. API tests substitute the external database, Blob, and firewall boundaries.
They cover input limits, session authorization, upload restrictions, completion, retries, private reads, and cleanup
authorization. Form tests cover privacy defaults, export previews, identity persistence, cancelled drafts, errors,
and upload orchestration. The mobile Puppeteer case covers the `rdldr` gesture and return to the thoughtspace.
