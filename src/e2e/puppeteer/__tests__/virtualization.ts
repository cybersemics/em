import { describe } from 'vitest'
import sleep from '../../../util/sleep'
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import scroll from '../helpers/scroll'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Counts the number of rendered nodes. */
const countNodes = () =>
  page.evaluate(async () => {
    return document.querySelectorAll('[aria-label="tree-node"]').length
  })

/** Returns true if the global error boundary fallback is rendered (e.g. after a "Maximum update depth exceeded" crash). */
const isErrorBoundaryShown = () =>
  page.evaluate(() => document.body.textContent?.includes('Oops, there was an error.') ?? false)

describe('virtualizaton', { retry: 3 }, () => {
  it('virtualize thoughts that are not in the viewport', async () => {
    const text = `
- a1
- a2
- a3
- a4
- a5
- a6
- a7
- a8
- a9
- a10
- a11
- a12
- a13
- a14
- a15
- a16
- a17
- a18
- a19
- a20
- a21
- a22
- a23
- a24
- a25
- a26
- a27
- a28
- a29
- a30
- a31
- a32
- a33
- a34
- a35
- a36
- a37
- a38
- a39
- a40
- a41
- a42
- a43
- a44
- a45
- a46
- a47
- a48
- a49
- a50`

    // TODO: Why doesn't setViewport work?
    // Possibly need to pass to browserless?
    // See: https://github.com/browserless/browserless/discussions/3910
    // Note: If you console.log from a component, thn puppeteer viewport will render at the full size of the document and thus cause a false positive.
    // await page.setViewport({
    //   width: 400,
    //   height: 600,
    // })

    await paste(text)
    await clickThought('a1')

    // 1. Thoughts below the bottom of the screen should be virtualizated when the cursor is null.
    await press('Escape')

    // TODO: Identify and wait for specific condition instead of fixed time.
    // Fails intermittently up to at least 100ms.
    await sleep(200)

    const numNodesBefore = await countNodes()
    expect(numNodesBefore).toBeGreaterThan(0)
    expect(numNodesBefore).toBeLessThan(50)

    // 2. Thoughts below the bottom of the screen should be virtualized when the cursor is on a root thought.
    await clickThought('a1')

    // TODO: Identify and wait for specific condition instead of fixed time.
    // Fails intermittently up to at least 100ms.
    await sleep(200)

    const numNodesAfter = await countNodes()
    expect(numNodesAfter).toBeGreaterThan(0)
    expect(numNodesAfter).toBeLessThan(50)

    // NOT IMPLEMENTED

    // 3. Thoughts above the top of the screen should be virtualized when the cursor is on the last thought in a long list.
    // scroll to the bottom of the document and click the last thought
    // await page.evaluate(() => window.scrollTo(0, 999999))
    // await clickThought('a50')
    // nodes = await countNodes()
    // expect(nodes).toBeGreaterThan(0)
    // expect(nodes).toBeLessThan(50)
  })

  // Regression test for https://github.com/cybersemics/em/issues/4270.
  // A thought near the list-virtualization boundary used to be culled based on its measured height. Mounting it
  // measured a (smaller) height that flipped the cutoff and unmounted it, which removed its measured size and
  // restored the larger estimate, re-mounting it — an infinite mount/unmount loop run entirely within passive
  // effects, which React aborts with "Maximum update depth exceeded" (minified error #185). The cutoff now uses the
  // stable estimated height, so the visibility decision no longer depends on whether the thought is mounted.
  it('does not crash with "Maximum update depth exceeded" when scrolling a long list containing a tall multiline thought', async () => {
    const paragraph =
      'Sed et fringilla lacus. Cras efficitur, orci in maximus luctus, elit dui blandit enim, nec volutpat nulla felis non turpis. Suspendisse potenti. Donec convallis metus sed ipsum maximus, id condimentum mauris mollis. Quisque vitae lacus felis. Quisque ultrices dui id diam elementum, ac sodales mi eleifend. Integer felis ipsum, mattis id ipsum sed, iaculis vulputate sem. Nulla congue, enim eget finibus lacinia, tortor erat accumsan purus, eget gravida quam est eu lectus.'

    // A short, clickable first thought so the cursor can be placed at the top of the list, leaving the tall
    // paragraph and all single-line thoughts below the cursor where list virtualization applies.
    const singleLineThoughts = Array.from({ length: 40 }, (_, i) => `- item${i + 1}`).join('\n')
    const text = `
- start
- ${paragraph}
${singleLineThoughts}`

    await paste(text)
    await clickThought('start')

    // Scroll to the bottom so the virtualization boundary sweeps across the list.
    await scroll(0, 999999)

    // Wait for renders to settle. If the mount/unmount loop is present, renders never settle and the error
    // boundary is rendered instead of the thoughts.
    await sleep(1000)

    expect(await isErrorBoundaryShown()).toBe(false)

    // Thoughts should still be rendered and virtualized, confirming the app neither crashed nor rendered everything.
    const numNodes = await countNodes()
    expect(numNodes).toBeGreaterThan(0)
    expect(numNodes).toBeLessThan(50)
  })
})
