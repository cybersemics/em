import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import lastCommandStore from '../../stores/lastCommand'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import moveThoughtDownCommand from '../moveThoughtDown'
import repeatCommand from '../repeat'

beforeEach(() => {
  initStore()
  // lastCommandStore is a module-level store that is not reset by initStore
  lastCommandStore.update({ command: null })
})

it('execute the last command again', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
        - c
    `,
    }),
    setCursor(['a']),
  ])

  executeCommandWithMulticursor(moveThoughtDownCommand, { store })
  executeCommandWithMulticursor(repeatCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - b
  - c
  - a`)
})

it('repeat does not repeat itself', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
        - c
        - d
    `,
    }),
    setCursor(['a']),
  ])

  executeCommandWithMulticursor(moveThoughtDownCommand, { store })
  executeCommandWithMulticursor(repeatCommand, { store })
  executeCommandWithMulticursor(repeatCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - b
  - c
  - d
  - a`)
})

it('do nothing when no command has been executed', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
    `,
    }),
    setCursor(['a']),
  ])

  executeCommandWithMulticursor(repeatCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
  - b`)
})
