import { screen } from '@testing-library/dom'
import { act } from 'react'
import { formatSelectionActionCreator as formatSelection } from '../../actions/formatSelection'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import contextToPath from '../../selectors/contextToPath'
import { getChildrenRanked } from '../../selectors/getChildren'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import appendToPath from '../../util/appendToPath'
import hashPath from '../../util/hashPath'
import head from '../../util/head'
import rgbToHex from '../../util/rgbToHex'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('colors bullet and superscript when the entire thought is split across adjacent same-color tags', async () => {
  const formatted = '<font color="#ff573d">b</font><font color="#ff573d">a</font>'

  await dispatch([
    importText({
      text: `
        - a
          - ${formatted}
        - b
          - ${formatted}
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()
  const parentPath = contextToPath(state, ['b'])
  if (!parentPath) throw new Error('Failed to set up formatted thought fixture.')

  const child = getChildrenRanked(state, head(parentPath))[0]
  const path = appendToPath(parentPath, child.id)

  const bullet = screen.getByTestId(`bullet-${hashPath(path)}`)
  const bulletGlyph = bullet.querySelector('[aria-label="bullet-glyph"]') as SVGElement | null
  const superscript = screen.getAllByRole('superscript')[0] as HTMLElement

  expect(bulletGlyph?.style.fill).toBeTruthy()
  expect(rgbToHex(bulletGlyph!.style.fill).toLowerCase()).toBe('#ff573d')
  expect(superscript.style.color).toBeTruthy()
  expect(rgbToHex(superscript.style.color).toLowerCase()).toBe('#ff573d')
})

// #3910: a color applied to an empty thought is held in pendingFormatStore until the thought is typed into, and the
// bullet previews it from there. The pending format is keyed by thought id and outlives the cursor, so the bullet
// must keep the color once the thought is no longer the cursor thought.
it('colors the bullet of an empty thought with a pending format after the cursor moves away', async () => {
  await dispatch([newThought({ value: 'a' }), newThought({ value: '' })])
  const emptyPath = store.getState().cursor!

  await dispatch(formatSelection('foreColor', 'green'))
  await dispatch(setCursor(['a']))
  await act(vi.runOnlyPendingTimersAsync)

  const bullet = screen.getByTestId(`bullet-${hashPath(emptyPath)}`)
  const bulletGlyph = bullet.querySelector('[aria-label="bullet-glyph"]') as SVGElement | null

  expect(bulletGlyph?.style.fill).toBeTruthy()
  expect(rgbToHex(bulletGlyph!.style.fill).toLowerCase()).toBe('#00d688')
})
