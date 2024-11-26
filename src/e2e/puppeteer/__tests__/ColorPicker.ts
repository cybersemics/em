import path from 'path'
import sleep from '../../../util/sleep'
import configureSnapshots from '../configureSnapshots'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import screenshot from '../helpers/screenshot'
import { page } from '../setup'

/** Hides all DOM nodes that match the selector from the DOM by setting visibility: hidden. Do nothing if the selector is empty. */
const hideVisibility = async (selector: string) => {
  return page.evaluate((selector: string) => {
    const els = Array.from(document.querySelectorAll(selector)) as HTMLElement[]
    els.forEach(el => {
      el.style.visibility = 'hidden'
    })
  }, selector)
}

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

it('ColorPicker', async () => {
  await paste('Hello world')

  await clickThought('Hello world')
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')

  await hideVisibility('[aria-label="menu"]')
  await hideVisibility('[aria-label="nav"]')
  await hideVisibility('[data-testid="toolbar-icon"]:not([aria-label="Text Color"])')

  // ColorPicker swatches have small pixel differences if we do not wait 50–100ms.
  // Possibly an animation that has not been turned off?
  await sleep(100)

  expect(await screenshot()).toMatchImageSnapshot()
})
