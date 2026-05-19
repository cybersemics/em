import { describe } from 'vitest'
import { HOME_TOKEN } from '../../../constants'
import type { WindowEm } from '../../../initialize'
import waitForBrowserSettled from '../helpers/waitForBrowserSettled'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

const thoughtCount = 30

/** Counts the number of rendered nodes. */
const countNodes = () =>
  page.evaluate(async () => {
    return document.querySelectorAll('[aria-label="tree-node"]').length
  })

/** Imports directly into Redux and waits for render; persistence can finish in teardown. */
const importThoughtsForRender = async (text: string): Promise<void> => {
  await page.evaluate(
    (homeToken, text) => {
      const testHelpers = (window.em as WindowEm).testHelpers
      testHelpers.importToContext([homeToken], text)
    },
    HOME_TOKEN,
    text,
  )
  await waitForEditable('a1')
  await waitForBrowserSettled()
}

/** Waits until the rendered node count proves that some offscreen thoughts are virtualized. */
const waitForVirtualizedNodes = () =>
  page.waitForFunction(
    thoughtCount => {
      const count = document.querySelectorAll('[aria-label="tree-node"]').length
      return count > 0 && count < thoughtCount
    },
    {
      timeout: 6000,
    },
    thoughtCount,
  )

/** Clicks a rendered thought without waiting for persistence work that cannot affect virtualization. */
const clickRenderedThought = async (value: string): Promise<void> => {
  const editableNode = await waitForEditable(value)
  // @ts-expect-error - https://github.com/puppeteer/puppeteer/issues/8852
  await editableNode.asElement()?.click()
  await waitForBrowserSettled()
}

describe('virtualizaton', () => {
  it('virtualize thoughts that are not in the viewport', async () => {
    const text = Array.from({ length: thoughtCount }, (_, i) => {
      const value = i === 0 ? 'a1' : `a${i + 1} virtualization filler text`
      return `- ${value}`
    }).join('\n')

    // TODO: Why doesn't setViewport work?
    // Possibly need to pass to browserless?
    // See: https://github.com/browserless/browserless/discussions/3910
    // Note: If you console.log from a component, thn puppeteer viewport will render at the full size of the document and thus cause a false positive.
    // await page.setViewport({
    //   width: 400,
    //   height: 600,
    // })

    await importThoughtsForRender(text)
    await clickRenderedThought('a1')

    // 1. Thoughts below the bottom of the screen should be virtualizated when the cursor is null.
    await page.keyboard.press('Escape')
    await waitForBrowserSettled()
    await waitForVirtualizedNodes()

    const numNodesBefore = await countNodes()
    expect(numNodesBefore).toBeGreaterThan(0)
    expect(numNodesBefore).toBeLessThan(thoughtCount)

    // 2. Thoughts below the bottom of the screen should be virtualized when the cursor is on a root thought.
    await clickRenderedThought('a1')
    await waitForVirtualizedNodes()

    const numNodesAfter = await countNodes()
    expect(numNodesAfter).toBeGreaterThan(0)
    expect(numNodesAfter).toBeLessThan(thoughtCount)

    // NOT IMPLEMENTED

    // 3. Thoughts above the top of the screen should be virtualized when the cursor is on the last thought in a long list.
    // scroll to the bottom of the document and click the last thought
    // await page.evaluate(() => window.scrollTo(0, 999999))
    // await clickThought('a50')
    // nodes = await countNodes()
    // expect(nodes).toBeGreaterThan(0)
    // expect(nodes).toBeLessThan(50)
  })
})
