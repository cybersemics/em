import Path from '../../@types/Path'
import { EM_TOKEN, HOME_TOKEN } from '../../constants'
import expandThoughts from '../../selectors/expandThoughts'
import findDescendant from '../../selectors/findDescendant'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import hashPath from '../../util/hashPath'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import newThought from '../newThought'
import settings from '../settings'
import toggleEmContext from '../toggleEmContext'

it('enter the EM context with the cursor on Settings', () => {
  const steps = [newThought('a'), settings({ key: 'Theme', value: 'Dark' }), toggleEmContext]

  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.rootContext).toEqual([EM_TOKEN])
  expectPathToEqual(stateNew, stateNew.cursor, [EM_TOKEN, 'Settings'])
})

it('save the home cursor on enter and restore it on exit', () => {
  const steps = [newThought('a'), settings({ key: 'Theme', value: 'Dark' }), setCursor(['a']), toggleEmContext]

  const stateEm = reducerFlow(steps)(initialState())

  expectPathToEqual(stateEm, stateEm.cursorBeforeEmContext, ['a'])

  const stateHome = toggleEmContext(stateEm)

  expect(stateHome.rootContext).toEqual([HOME_TOKEN])
  expectPathToEqual(stateHome, stateHome.cursor, ['a'])
  expect(stateHome.cursorBeforeEmContext).toEqual(null)
})

it('enter with no Settings thought sets a null cursor', () => {
  const stateNew = toggleEmContext(initialState())

  expect(stateNew.rootContext).toEqual([EM_TOKEN])
  expect(stateNew.cursor).toEqual(null)
})

it('expand the Settings thought on enter', () => {
  const steps = [settings({ key: 'Theme', value: 'Dark' }), toggleEmContext]

  const stateNew = reducerFlow(steps)(initialState())

  // EM cursor paths include the root token explicitly (matching thoughtToPath), unlike contextToPath which strips it
  const settingsId = findDescendant(stateNew, EM_TOKEN, 'Settings')
  expect(settingsId).not.toBeNull()
  const settingsPath = [EM_TOKEN, settingsId!] as Path
  expect(expandThoughts(stateNew, stateNew.cursor)[hashPath(settingsPath)]).toBeTruthy()
})
