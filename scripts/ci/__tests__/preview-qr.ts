/**
 * Tests for the comment handling behind .github/workflows/preview-qr.yml: the managed block's
 * parse/render round trip, the state transitions in the script's header, and cutting out a block
 * left in a description from before the QR moved to a comment. The GitHub calls around them can
 * only be exercised on a real pull request once the workflow is on main; everything that decides
 * *what* to write is here.
 */
import { describe, expect, it } from 'vitest'
import { END, START, decide, formatTimestamp, parseBody, renderBlock, selectPullRequest } from '../preview-qr.mjs'

const shaA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678'
const shaB = 'd4e5f6a7b8c90112233445566778899aabbccdde'
const imageA = 'https://raw.githubusercontent.com/cybersemics/em/0b1a2c3d4e5f60718293a4b5c6d7e8f901234567/pr-1.png'
const imageB = 'https://raw.githubusercontent.com/cybersemics/em/ffffffff11112222333344444444444455556666/pr-1.png'
const stableA = { sha: shaA, createdAt: '2026-09-04T10:00:00Z', url: 'https://em-a.vercel.app', image: imageA }
const pendingB = { sha: shaB, createdAt: '2026-09-04T12:30:00Z' }

describe('formatTimestamp', () => {
  it('formats the deployment timestamp as a short UTC date and time', () => {
    expect(formatTimestamp('2026-09-04T23:59:59Z')).toBe('Sep 4, 2026, 11:59 PM UTC')
    expect(formatTimestamp('2026-12-31T09:05:00Z')).toBe('Dec 31, 2026, 9:05 AM UTC')
  })
})

describe('renderBlock', () => {
  it('renders the stable state collapsed, with the timestamp and short sha in the summary', () => {
    const block = renderBlock({ stable: stableA, pending: null })!
    expect(block.startsWith(START)).toBe(true)
    expect(block.endsWith(END)).toBe(true)
    expect(block).toContain(
      '<details>\n<summary>Preview Deployment · Sep 4, 2026, 10:00 AM UTC · a1b2c3d</summary>\n\n',
    )
    expect(block).not.toContain('<details open')
    expect(block).toContain(
      `<a href="${stableA.url}" target="_blank" rel="noopener noreferrer">![Preview deployment](${imageA})</a>`,
    )
    expect(block).not.toContain('Generating')
  })

  it('renders the generating state over the previous QR with the incoming metadata in the summary', () => {
    const block = renderBlock({ stable: stableA, pending: pendingB })!
    expect(block).toContain(
      '<summary>Preview Deployment · Generating new QR code… · Sep 4, 2026, 12:30 PM UTC · d4e5f6a</summary>',
    )
    expect(block).toContain(
      `<a href="${stableA.url}" target="_blank" rel="noopener noreferrer">![Preview deployment](${imageA})</a>`,
    )
  })

  it('renders the first generating state without any QR', () => {
    const block = renderBlock({ stable: null, pending: pendingB })!
    expect(block).toContain('Generating new QR code… · Sep 4, 2026, 12:30 PM UTC · d4e5f6a')
    expect(block).toContain('Preview deployment is being generated.')
    expect(block).not.toContain('![')
  })

  it('renders nothing when there is neither a preview nor a build', () => {
    expect(renderBlock({ stable: null, pending: null })).toBeNull()
  })

  it('keeps the QR image URL in the state comment', () => {
    const block = renderBlock({ stable: stableA, pending: null })!
    expect(JSON.parse(block.match(/<!-- preview-qr:state (.*) -->/)![1])).toEqual({ stable: stableA, pending: null })
  })

  it('separates the image from the HTML tags with blank lines so GitHub renders it', () => {
    const block = renderBlock({ stable: stableA, pending: null })!
    expect(block).toMatch(/<\/summary>\n\n<a href="[^"]+" target="_blank" rel="noopener noreferrer">!\[/)
    expect(block).toMatch(/\n\n<\/details>\n/)
  })
})

describe('parseBody', () => {
  it('round-trips the state through a rendered block', () => {
    expect(parseBody(renderBlock({ stable: stableA, pending: pendingB }))).toEqual({
      outside: '',
      state: { stable: stableA, pending: pendingB },
    })
  })

  it('treats a body without a block as having no state', () => {
    expect(parseBody('Just a description.\n')).toEqual({ outside: 'Just a description.', state: null })
    expect(parseBody(null)).toEqual({ outside: '', state: null })
  })

  it('cuts a block out of a description, preserving the text around it', () => {
    const block = renderBlock({ stable: stableA, pending: null })
    expect(parseBody(`## Summary\n\nHuman-written description.\n\n${block}`).outside).toBe(
      '## Summary\n\nHuman-written description.',
    )
    expect(parseBody(`Intro\n\n${block}\n\nA paragraph a human added below the block.\n`).outside).toBe(
      'Intro\n\n\n\nA paragraph a human added below the block.',
    )
  })

  it('reports no image for a block written before the image URL was part of the state', () => {
    const { sha, createdAt, url } = stableA
    const state = JSON.stringify({ stable: { sha, createdAt, url }, pending: null })
    expect(parseBody(`${START}\n<!-- preview-qr:state ${state} -->\n${END}`).state).toEqual({
      stable: { ...stableA, image: null },
      pending: null,
    })
  })

  it('ignores a state comment that is not valid JSON', () => {
    const body = `${START}\n<!-- preview-qr:state {not json} -->\n<details></details>\n${END}`
    expect(parseBody(body)).toEqual({ outside: '', state: null })
  })
})

describe('decide', () => {
  const inProgress = {
    id: 2,
    status: 'in_progress',
    conclusion: null,
    headSha: shaB,
    startedAt: '2026-09-04T12:29:00Z',
  }
  const succeeded = { ...inProgress, status: 'completed', conclusion: 'success' }
  const failed = { ...inProgress, status: 'completed', conclusion: 'failure' }
  const cancelled = { ...inProgress, status: 'completed', conclusion: 'cancelled' }
  const deploymentB = { createdAt: pendingB.createdAt, url: 'https://em-b.vercel.app' }

  it('shows the incoming build over the existing QR when a run starts', () => {
    expect(
      decide({
        run: inProgress,
        deployment: { createdAt: pendingB.createdAt, url: null },
        current: { stable: stableA, pending: null },
      }),
    ).toEqual({
      stable: stableA,
      pending: pendingB,
    })
  })

  it('falls back to the run start time until the deployment record exists', () => {
    expect(decide({ run: inProgress, deployment: null, current: null })).toEqual({
      stable: null,
      pending: { sha: shaB, createdAt: inProgress.startedAt },
    })
  })

  it('leaves the body alone for a run that has not started', () => {
    expect(
      decide({
        run: { ...inProgress, status: 'queued' },
        deployment: null,
        current: { stable: stableA, pending: null },
      }),
    ).toBeNull()
  })

  it('replaces the preview when the run succeeds, marking the QR as still to be committed', () => {
    expect(
      decide({ run: succeeded, deployment: deploymentB, current: { stable: stableA, pending: pendingB } }),
    ).toEqual({
      stable: { sha: shaB, createdAt: deploymentB.createdAt, url: deploymentB.url, image: null },
      pending: null,
    })
  })

  it('keeps the installed QR when the same success is delivered twice', () => {
    const stableB = { sha: shaB, createdAt: deploymentB.createdAt, url: deploymentB.url, image: imageB }
    expect(decide({ run: succeeded, deployment: deploymentB, current: { stable: stableB, pending: null } })).toEqual({
      stable: stableB,
      pending: null,
    })
  })

  it('restores the previous preview when the run fails or is cancelled', () => {
    expect(
      decide({
        run: failed,
        deployment: { createdAt: pendingB.createdAt, url: null },
        current: { stable: stableA, pending: pendingB },
      }),
    ).toEqual({
      stable: stableA,
      pending: null,
    })
    expect(decide({ run: cancelled, deployment: null, current: { stable: stableA, pending: pendingB } })).toEqual({
      stable: stableA,
      pending: null,
    })
  })

  it('removes the comment when the first build fails', () => {
    expect(decide({ run: failed, deployment: null, current: { stable: null, pending: pendingB } })).toEqual({
      stable: null,
      pending: null,
    })
    expect(renderBlock({ stable: null, pending: null })).toBeNull()
  })

  it('treats a success that recorded no URL as a failure', () => {
    expect(
      decide({
        run: succeeded,
        deployment: { createdAt: pendingB.createdAt, url: null },
        current: { stable: stableA, pending: pendingB },
      }),
    ).toEqual({
      stable: stableA,
      pending: null,
    })
  })
})

describe('state transitions end to end', () => {
  const stableB = { sha: shaB, createdAt: pendingB.createdAt, url: 'https://em-b.vercel.app', image: imageB }

  it('A stable → B generating → B stable leaves exactly one QR', () => {
    const generating = renderBlock({ stable: stableA, pending: pendingB })!
    expect(generating).toContain(imageA)
    expect(generating).toContain('d4e5f6a')
    const stable = renderBlock({ stable: stableB, pending: null })!
    expect(stable).not.toContain(imageA)
    expect(stable).not.toContain('a1b2c3d')
    expect(stable).not.toContain('Generating')
    expect(stable.split('![Preview deployment]')).toHaveLength(2)
  })

  it('A stable → B generating → B failed returns to A exactly', () => {
    const before = renderBlock({ stable: stableA, pending: null })
    const generating = renderBlock({ stable: stableA, pending: pendingB })
    expect(renderBlock({ stable: parseBody(generating).state!.stable, pending: null })).toBe(before)
  })

  it('is idempotent for a repeated event', () => {
    const comment = renderBlock({ stable: stableA, pending: pendingB })
    expect(renderBlock(parseBody(comment).state!)).toBe(comment)
  })
})

describe('selectPullRequest', () => {
  const base = { number: 1, head: { sha: shaA } }
  /** A pull request stacked on `base`'s branch, which therefore also contains every commit of it. */
  const stacked = { number: 2, head: { sha: shaB } }

  it('picks the pull request whose head is the commit over a stacked one that merely contains it', () => {
    expect(selectPullRequest([base, stacked], shaA)).toBe(base)
    expect(selectPullRequest([base, stacked], shaB)).toBe(stacked)
  })

  it('returns null when every candidate has moved past the commit', () => {
    expect(selectPullRequest([stacked], shaA)).toBeNull()
    expect(selectPullRequest([], shaA)).toBeNull()
  })

  it('refuses to pick between two pull requests that share the commit as their head', () => {
    expect(() => selectPullRequest([base, { number: 3, head: { sha: shaA } }], shaA)).toThrow(/2 open pull requests/)
  })
})
