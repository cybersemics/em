import { importText } from '../../action-creators'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import { findThoughtByText } from '../../test-helpers/queries'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('define =style in a =let expressions and apply it to a child of the parent context', async () => {

  store.dispatch([
    importText({
      text: `
        - =let
          - =dazzle
            - =style
              - color
                - pink
        - Razzle
          - =dazzle
        - Nuzzle
      `
    }),
  ])

  const thoughtRazzle = await findThoughtByText('Razzle')
  expect(thoughtRazzle).toHaveStyle({ color: 'pink' })

  const thoughtNuzzle = await findThoughtByText('Nuzzle')
  expect(thoughtNuzzle).not.toHaveStyle({ color: 'pink' })

})

it('=let/=style is not applied to descendants of the context it is applied to', async () => {

  store.dispatch([
    importText({
      text: `
        - =let
          - =dazzle
            - =style
              - color
                - pink
        - Razzle
          - =dazzle
          - Roo
      `
    }),
  ])

  const thoughtRazzle = await findThoughtByText('Razzle')
  expect(thoughtRazzle).toHaveStyle({ color: 'pink' })

  const thoughtNuzzle = await findThoughtByText('Roo')
  expect(thoughtNuzzle).not.toHaveStyle({ color: 'pink' })

})

it('=let/=style is available to all descendants', async () => {

  store.dispatch([
    importText({
      text: `
        - =let
          - =dazzle
            - =style
              - color
                - pink
        - Shoozle
          - Razzle
            - =dazzle
        - Nuzzle
      `
    }),
    setCursorFirstMatchActionCreator(['Shoozle']),
  ])

  const thoughtShoozle = await findThoughtByText('Shoozle')
  expect(thoughtShoozle).not.toHaveStyle({ color: 'pink' })

  const thoughtRazzle = await findThoughtByText('Razzle')
  expect(thoughtRazzle).toHaveStyle({ color: 'pink' })

  const thoughtNuzzle = await findThoughtByText('Nuzzle')
  expect(thoughtNuzzle).not.toHaveStyle({ color: 'pink' })

})

it('multiple definitions in same =let', async () => {

  store.dispatch([
    importText({
      text: `
        - =let
          - =dazzle
            - =style
              - color
                - pink
          - =fizzle
            - =style
              - fontStyle
                - italic
        - Razzle
          - =dazzle
          - =fizzle
      `
    }),
    setCursorFirstMatchActionCreator(['Shoozle']),
  ])

  const thoughtRazzle = await findThoughtByText('Razzle')
  expect(thoughtRazzle).toHaveStyle({
    color: 'pink',
    fontStyle: 'italic',
  })

})

it('deep let > shallow let', async () => {

  store.dispatch([
    importText({
      text: `
        - =let
          - =dazzle
            - =style
              - color
                - pink
        - Shoozle
          - =let
            - =dazzle
              - =style
                - color
                  - champagne
          - Razzle
            - =dazzle
      `
    }),
    setCursorFirstMatchActionCreator(['Shoozle']),
  ])

  const thoughtRazzle = await findThoughtByText('Razzle')
  expect(thoughtRazzle).toHaveStyle({ color: 'champagne' })

})
