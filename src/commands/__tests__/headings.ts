import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { heading1, heading2 } from '../headings'

beforeEach(initStore)

it('add a heading attribute to a leaf', () => {
  store.dispatch([
    importText({
      text: `
        - a
      `,
    }),
    setCursor(['a']),
  ])

  executeCommandWithMulticursor(heading1, { store, type: 'keyboard' })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =heading1`)
})

it('preserve existing children when a heading is applied to a thought with children', () => {
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

  executeCommandWithMulticursor(heading1, { store, type: 'keyboard' })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =heading1
    - b
    - c`)
})

it('replace the existing heading level and preserve children when a different heading is applied', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =heading1
          - b
          - c
      `,
    }),
    setCursor(['a']),
  ])

  executeCommandWithMulticursor(heading2, { store, type: 'keyboard' })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =heading2
    - b
    - c`)
})
