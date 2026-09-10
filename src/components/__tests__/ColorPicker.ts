import { act } from 'react'
import { homeActionCreator as home } from '../../actions/home'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursorAtFirstMatch } from '../../test-helpers/addMulticursorAtFirstMatch'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

// https://github.com/cybersemics/em/issues/5285
it.skip('Set the text color with a multicursor selection that has no cursor', async () => {
  await dispatch([newThought({ value: 'foo' }), home(), addMulticursorAtFirstMatch(['foo'])])

  expect(store.getState().cursor).toBeNull()

  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="green"]')

  await act(vi.runOnlyPendingTimersAsync)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/html')
  expect(exported).toContain('<font color="#00d688">foo</font>')

  expect(
    document.querySelector('[aria-label="text color swatches"] [aria-label="green"][data-selected="true"]'),
  ).toBeInTheDocument()
})
