#!/usr/bin/env node
/**
 * Collects the final reviewer's comments posted after the first reviewer's first review, on PRs by the given authors.
 *
 * Usage: collect.mjs --first trevinhofmann --authors BayuAri,ethan-james --since 2026-07-01 [--final <login>] > gaps.json
 * --final defaults to the authenticated gh user.
 */
import { execFile } from 'node:child_process'
import { parseArgs } from 'node:util'
import { promisify } from 'node:util'

const run = promisify(execFile)

const QUERY = `query($n:Int!){repository(owner:"cybersemics",name:"em"){pullRequest(number:$n){
  number title url author{login} createdAt state
  reviews(first:100){nodes{author{login} state submittedAt body
    comments(first:100){nodes{path line originalLine body createdAt diffHunk replyTo{id}}}}}
  comments(first:100){nodes{author{login} body createdAt}}}}}`

/** Runs gh and returns stdout. */
const gh = async (...args) => (await run('gh', args, { maxBuffer: 64 * 1024 * 1024 })).stdout

/** Fetches one PR's reviews, inline comments and PR comments. */
const fetchPr = async n =>
  JSON.parse(await gh('api', 'graphql', '-F', `n=${n}`, '-f', `query=${QUERY}`)).data.repository.pullRequest

/** Maps over items with at most `limit` in flight. */
const mapLimit = async (items, limit, fn) => {
  const results = []
  let i = 0
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const index = i++
        results[index] = await fn(items[index])
      }
    }),
  )
  return results
}

/** Returns the login of a node's author, or undefined for a deleted account. */
const login = node => node.author?.login

const { values: args } = parseArgs({
  options: {
    first: { type: 'string' },
    authors: { type: 'string' },
    since: { type: 'string' },
    final: { type: 'string' },
  },
})
if (!args.first || !args.authors || !args.since) {
  console.error('Usage: collect.mjs --first <login> --authors <a,b> --since <YYYY-MM-DD> [--final <login>]')
  process.exit(1)
}
const final = args.final ?? (await gh('api', 'user', '-q', '.login')).trim()

const numbers = new Set()
for (const author of args.authors.split(',')) {
  const out = await gh(
    'pr', 'list', '--state', 'all', '--author', author, '--search', `created:>=${args.since}`,
    '--limit', '500', '--json', 'number', '-q', '.[].number',
  )
  out.split(/\s+/).filter(Boolean).forEach(n => numbers.add(Number(n)))
}

const prs = await mapLimit([...numbers].sort((a, b) => a - b), 8, fetchPr)

const result = []
for (const pr of prs) {
  const reviews = pr.reviews.nodes
  const firstReviews = reviews.filter(r => login(r) === args.first).map(r => r.submittedAt)
  if (firstReviews.length === 0) continue
  const start = firstReviews.sort()[0]

  const comments = []
  for (const r of reviews) {
    if (login(r) !== final || r.submittedAt < start) continue
    if (r.body.trim()) comments.push({ kind: 'review', state: r.state, at: r.submittedAt, body: r.body })
    for (const c of r.comments.nodes) {
      comments.push({
        kind: 'inline',
        at: c.createdAt,
        path: c.path,
        line: c.line ?? c.originalLine,
        reply: !!c.replyTo,
        hunk: c.diffHunk.slice(-600),
        body: c.body,
      })
    }
  }
  for (const c of pr.comments.nodes) {
    if (login(c) === final && c.createdAt >= start) comments.push({ kind: 'comment', at: c.createdAt, body: c.body })
  }

  if (comments.length > 0) {
    result.push({
      number: pr.number,
      title: pr.title,
      url: pr.url,
      author: login(pr),
      created: pr.createdAt.slice(0, 10),
      state: pr.state,
      firstReviewAt: start,
      comments: comments.sort((a, b) => a.at.localeCompare(b.at)),
    })
  }
}

console.log(JSON.stringify({ final, first: args.first, scanned: prs.length, prs: result }, null, 1))
