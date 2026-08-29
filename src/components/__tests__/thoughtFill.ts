import { screen } from '@testing-library/dom'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import contextToPath from '../../selectors/contextToPath'
import { getChildrenRanked } from '../../selectors/getChildren'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
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
