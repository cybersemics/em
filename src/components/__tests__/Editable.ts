import { ReactWrapper } from 'enzyme'
import importText from '../../action-creators/importText'
import bumpThoughtDown from '../../shortcuts/bumpThoughtDown'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import executeShortcut from '../../test-helpers/executeShortcut'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import Editable from '../Editable'

let wrapper: ReactWrapper<unknown, unknown> // eslint-disable-line fp/no-let

beforeEach(async () => {
  wrapper = await createTestApp()
})

afterEach(cleanupTestApp)

it('reset content editable inner html on thought bump', async () => {
  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - b`,
    }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  // update DOM
  wrapper.update()

  /* eslint-disable jsdoc/require-jsdoc */
  const getContentEditableText = () => wrapper.find(Editable).first().find('div.editable').first().text()

  expect(getContentEditableText()).toBe('a')

  executeShortcut(bumpThoughtDown, { store })

  jest.runOnlyPendingTimers()
  wrapper.update()

  expect(getContentEditableText()).toBe('')
})
