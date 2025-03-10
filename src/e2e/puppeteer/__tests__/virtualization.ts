import sleep from '../../../util/sleep'
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Counts the number of rendered nodes. */
const countNodes = () =>
  page.evaluate(async () => {
    return document.querySelectorAll('[aria-label="tree-node"]').length
  })

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

  // 1. Thoughts below the bottom of the screen should be virtualizated when the cursor is null.
  await press('Escape')
  const numNodesBefore = await countNodes()
  expect(numNodesBefore).toBeGreaterThan(0)
  expect(numNodesBefore).toBeLessThan(50)

  // 2. Thoughts below the bottom of the screen should be virtualized when the cursor is on a root thought.
  await clickThought('a1')

  // TODO: Test intermittently fails. Identify and wait for specific condition instead of fixed time.
  sleep(100)

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
