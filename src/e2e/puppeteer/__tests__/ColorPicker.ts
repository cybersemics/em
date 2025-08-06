import path from 'path'
import configureSnapshots from '../configureSnapshots'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import hideVisibility from '../helpers/hideVisibility'
import paste from '../helpers/paste'
import screenshot from '../helpers/screenshot-with-no-antialiasing'

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

  expect(await screenshot()).toMatchImageSnapshot()
})
