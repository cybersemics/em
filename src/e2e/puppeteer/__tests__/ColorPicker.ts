import path from 'path'
import configureSnapshots from '../configureSnapshots'
import clickThought from '../helpers/clickThought'
import clickToolbar from '../helpers/clickToolbar'
import hideVisibility from '../helpers/hideVisibility'
import paste from '../helpers/paste'
import screenshot from '../helpers/screenshot'
import waitUntil from '../helpers/waitUntil'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

it('ColorPicker', async () => {
  await paste('Hello world')

  await clickThought('Hello world')
  await clickToolbar('Text Color')

  await hideVisibility('[aria-label="menu"]')
  await hideVisibility('[aria-label="nav"]')
  await hideVisibility('[data-testid="toolbar-icon"]:not([aria-label="Text Color"])')

  // The Popover fades in via a CSS transition, so the screenshot can otherwise capture a partially faded frame.
  // Wait for every running transition to settle rather than for a fixed duration.
  await waitUntil(() => document.getAnimations().every(animation => animation.playState !== 'running'))

  expect(await screenshot()).toMatchImageSnapshot()
})
