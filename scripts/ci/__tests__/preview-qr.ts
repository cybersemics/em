/**
 * Tests for the pull request body handling behind .github/workflows/preview-qr.yml: the managed
 * block's parse/render round trip, the state transitions in the script's header, and the repair
 * after `gh pr edit --attach`. The GitHub and gh calls around them can only be exercised on a real
 * pull request once the workflow is on main; everything that decides *what* to write is here.
 */
import { describe, expect, it } from 'vitest'
import {
  END,
  QR_FILE,
  START,
  decide,
  formatDate,
  parseBody,
  renderBlock,
  repairAfterAttach,
  spliceBody,
} from '../preview-qr.mjs'

const shaA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678'
const shaB = 'd4e5f6a7b8c90112233445566778899aabbccdde'
const imageA = 'https://github.com/user-attachments/assets/0b1a2c3d-4e5f-6071-8293-a4b5c6d7e8f9'
const imageB = 'https://github.com/user-attachments/assets/ffffffff-1111-2222-3333-444444444444'
const stableA = { sha: shaA, createdAt: '2026-09-04T10:00:00Z', url: 'https://em-a.vercel.app', image: imageA }
const pendingB = { sha: shaB, createdAt: '2026-09-04T12:30:00Z' }

/** A pull request body with human text above a managed block in the given state. */
const bodyWith = (state: Parameters<typeof renderBlock>[0]) =>
  spliceBody('## Summary\n\nHuman-written description.', renderBlock(state))

describe('formatDate', () => {
  it('formats the deployment timestamp as a short UTC date', () => {
    expect(formatDate('2026-09-04T23:59:59Z')).toBe('Sep 4, 2026')
    expect(formatDate('2026-12-31T23:59:59Z')).toBe('Dec 31, 2026')
  })
})

describe('renderBlock', () => {
  it('renders the stable state collapsed, with the date and short sha in the summary', () => {
    const block = renderBlock({ stable: stableA, pending: null })!
    expect(block.startsWith(START)).toBe(true)
    expect(block.endsWith(END)).toBe(true)
    expect(block).toContain('<details>\n<summary>Preview · Sep 4, 2026 · <code>a1b2c3d</code></summary>\n\n')
    expect(block).not.toContain('<details open')
    expect(block).toContain(`[![Preview deployment](${imageA})](${stableA.url})`)
    expect(block).toContain(`[Open preview](${stableA.url})`)
    expect(block).not.toContain('Generating')
  })

  it('renders the generating state over the previous QR with the incoming metadata in the summary', () => {
    const block = renderBlock({ stable: stableA, pending: pendingB })!
    expect(block).toContain('<summary>Preview · Generating new QR code… · Sep 4, 2026 · <code>d4e5f6a</code></summary>')
    expect(block).toContain(`[![Preview deployment](${imageA})](${stableA.url})`)
    expect(block).toContain(`[Open current preview](${stableA.url})`)
  })

  it('renders the first generating state without any QR', () => {
    const block = renderBlock({ stable: null, pending: pendingB })!
    expect(block).toContain('Generating new QR code… · Sep 4, 2026 · <code>d4e5f6a</code>')
    expect(block).toContain('Preview deployment is being generated.')
    expect(block).not.toContain('![')
  })

  it('renders nothing when there is neither a preview nor a build', () => {
    expect(renderBlock({ stable: null, pending: null })).toBeNull()
  })

  it('keeps the image URL out of the state comment, where gh cannot rewrite it', () => {
    const block = renderBlock({ stable: { ...stableA, image: `./${QR_FILE}` }, pending: null })!
    const comment = block.match(/<!-- preview-qr:state (.*) -->/)![1]
    expect(comment).not.toContain(QR_FILE)
    expect(JSON.parse(comment)).toEqual({
      stable: { sha: shaA, createdAt: stableA.createdAt, url: stableA.url },
      pending: null,
    })
  })

  it('separates the image from the HTML tags with blank lines so GitHub renders it', () => {
    const block = renderBlock({ stable: stableA, pending: null })!
    expect(block).toMatch(/<\/summary>\n\n\[!\[/)
    expect(block).toMatch(/\n\n<\/details>\n/)
  })
})

describe('parseBody', () => {
  it('round-trips the state through a rendered block', () => {
    const { outside, state } = parseBody(bodyWith({ stable: stableA, pending: pendingB }))
    expect(outside).toBe('## Summary\n\nHuman-written description.')
    expect(state).toEqual({ stable: stableA, pending: pendingB })
  })

  it('treats a body without a block as human text with no state', () => {
    expect(parseBody('Just a description.\n')).toEqual({ outside: 'Just a description.', state: null })
    expect(parseBody(null)).toEqual({ outside: '', state: null })
  })

  it('lifts a block out of the middle of the description, preserving the text around it', () => {
    const block = renderBlock({ stable: stableA, pending: null })
    const { outside, state } = parseBody(`Intro\n\n${block}\n\nA paragraph a human added below the block.\n`)
    expect(outside).toBe('Intro\n\n\n\nA paragraph a human added below the block.')
    expect(state).toEqual({ stable: stableA, pending: null })
    expect(spliceBody(outside, block)).toBe(`Intro\n\n\n\nA paragraph a human added below the block.\n\n${block}`)
  })

  it('reports no image when the block still holds the local path, so the QR is uploaded again', () => {
    const { state } = parseBody(bodyWith({ stable: { ...stableA, image: `./${QR_FILE}` }, pending: null }))
    expect(state!.stable!.image).toBeNull()
  })

  it('ignores a state comment that is not valid JSON', () => {
    const body = `${START}\n<!-- preview-qr:state {not json} -->\n<details></details>\n${END}`
    expect(parseBody(body)).toEqual({ outside: '', state: null })
  })
})

describe('spliceBody', () => {
  it('appends the block after a blank line and drops it when there is none', () => {
    expect(spliceBody('text', 'block')).toBe('text\n\nblock')
    expect(spliceBody('', 'block')).toBe('block')
    expect(spliceBody('text', null)).toBe('text')
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

  it('replaces the preview when the run succeeds, marking the QR as still to be uploaded', () => {
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

  it('removes the block when the first build fails', () => {
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

  it('A stable → B generating → B stable leaves exactly one block and one QR', () => {
    const generating = bodyWith({ stable: stableA, pending: pendingB })
    expect(generating).toContain(imageA)
    expect(generating).toContain('d4e5f6a')
    const stable = spliceBody(parseBody(generating).outside, renderBlock({ stable: stableB, pending: null }))
    expect(stable).not.toContain(imageA)
    expect(stable).not.toContain('a1b2c3d')
    expect(stable).not.toContain('Generating')
    expect(stable.split(START)).toHaveLength(2)
    expect(stable.split('![Preview deployment]')).toHaveLength(2)
    expect(stable.startsWith('## Summary')).toBe(true)
  })

  it('A stable → B generating → B failed returns to A exactly', () => {
    const before = bodyWith({ stable: stableA, pending: null })
    const generating = spliceBody(parseBody(before).outside, renderBlock({ stable: stableA, pending: pendingB }))
    const after = spliceBody(parseBody(generating).outside, renderBlock({ stable: stableA, pending: null }))
    expect(after).toBe(before)
    expect(after).not.toContain('d4e5f6a')
  })

  it('is idempotent for a repeated event', () => {
    const body = bodyWith({ stable: stableA, pending: pendingB })
    const { outside, state } = parseBody(body)
    expect(spliceBody(outside, renderBlock(state!))).toBe(body)
  })
})

describe('repairAfterAttach', () => {
  const target = {
    stable: { sha: shaB, createdAt: pendingB.createdAt, url: 'https://em-b.vercel.app', image: null },
    pending: null,
  }
  const sent = bodyWith({ ...target, stable: { ...target.stable, image: `./${QR_FILE}` } })

  it('does nothing when gh rewrote the reference', () => {
    expect(repairAfterAttach({ before: sent, after: sent.replace(`./${QR_FILE}`, imageB), state: target })).toBeNull()
  })

  it('moves an appended attachment into the block and removes the local path', () => {
    const repaired = repairAfterAttach({ before: sent, after: `${sent}\n\n![${QR_FILE}](${imageB})`, state: target })!
    expect(repaired).not.toContain(QR_FILE)
    expect(repaired).toContain(`[![Preview deployment](${imageB})](https://em-b.vercel.app)`)
    expect(repaired.endsWith(END)).toBe(true)
    expect(repaired.split('![Preview deployment]')).toHaveLength(2)
    expect(repaired.split(imageB)).toHaveLength(2)
  })

  it('does not mistake an attachment the author embedded for the uploaded QR', () => {
    const authored = `Screenshot: ![before](${imageA})`
    const before = spliceBody(authored, renderBlock({ ...target, stable: { ...target.stable, image: `./${QR_FILE}` } }))
    expect(repairAfterAttach({ before, after: before, state: target })).toBeNull()
    const repaired = repairAfterAttach({ before, after: `${before}\n\n![${QR_FILE}](${imageB})`, state: target })!
    expect(repaired).toContain(authored)
    expect(repaired).toContain(`[![Preview deployment](${imageB})]`)
  })
})
