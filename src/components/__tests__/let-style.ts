import importText from '../../action-creators/importText'
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
                - rgba(255, 192, 203, 1)
        - Razzle
          - =dazzle
        - Nuzzle
      `,
    }),
  ])

  const thoughtRazzle = (await findThoughtByText('Razzle'))?.closest('[aria-label="thought-container"]')
  expect(thoughtRazzle).toHaveStyle({ color: 'rgba(255, 192, 203, 0.5)' })

  const thoughtNuzzle = await findThoughtByText('Nuzzle')
  expect(thoughtNuzzle).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
})

it('=let/x/=style is not applied to siblings and sibling descendants', async () => {
  store.dispatch([
    importText({
      text: `
        - =let
          - =dazzle
            - =style
              - color
                - rgba(255, 192, 203, 1)
        - Razzle
          - =dazzle
          - Roo
      `,
    }),
  ])

  const thoughtRazzle = (await findThoughtByText('Razzle'))?.closest('[aria-label="thought-container"]')
  expect(thoughtRazzle).toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

  const thoughtNuzzle = await findThoughtByText('Roo')
  expect(thoughtNuzzle).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
})

it('=let/=test/=style is not applied to =test within the =let definition', async () => {
  store.dispatch([
    importText({
      text: `
        - =let
          - =dazzle
            - =style
              - color
                - rgba(255, 192, 203, 1)
      `,
    }),
  ])

  const thoughtDazzle = await findThoughtByText('=dazzle')
  expect(thoughtDazzle).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
})

it('=let/x/=style is not applied to =let itself', async () => {
  store.dispatch([
    importText({
      text: `
        - =let
          - =dazzle
            - =style
              - color
                - rgba(255, 192, 203, 1)
      `,
    }),
  ])

  const thoughtLet = await findThoughtByText('=let')
  expect(thoughtLet).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
})

it('=let/x/=style is available to all descendants', async () => {
  store.dispatch([
    importText({
      text: `
        - =let
          - =dazzle
            - =style
              - color
                - rgba(255, 192, 203, 1)
        - Shoozle
          - Razzle
            - =dazzle
        - Nuzzle
      `,
    }),
    setCursorFirstMatchActionCreator(['Shoozle']),
  ])

  const thoughtShoozle = await findThoughtByText('Shoozle')
  expect(thoughtShoozle).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

  const thoughtRazzle = (await findThoughtByText('Razzle'))?.closest('[aria-label="thought-container"]')
  expect(thoughtRazzle).toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

  const thoughtNuzzle = await findThoughtByText('Nuzzle')
  expect(thoughtNuzzle).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
})

it('multiple definitions in same =let', async () => {
  store.dispatch([
    importText({
      text: `
        - =let
          - =dazzle
            - =style
              - color
                - rgba(255, 192, 203, 1)
          - =fizzle
            - =style
              - fontStyle
                - italic
        - Razzle
          - =dazzle
          - =fizzle
      `,
    }),
    setCursorFirstMatchActionCreator(['Razzle']),
  ])

  const thoughtRazzleContainer = (await findThoughtByText('Razzle'))?.closest('[aria-label="thought-container"]')
  expect(thoughtRazzleContainer).toHaveStyle({
    color: 'rgba(255, 192, 203, 1)',
  })

  const thoughtRazzle = await findThoughtByText('Razzle')
  expect(thoughtRazzle).toHaveStyle({
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
                - rgba(255, 192, 203, 1)
        - Shoozle
          - =let
            - =dazzle
              - =style
                - color
                  - rgba(100, 100, 100, 1)
          - Razzle
            - =dazzle
      `,
    }),
    setCursorFirstMatchActionCreator(['Shoozle']),
  ])

  const thoughtRazzle = (await findThoughtByText('Razzle'))?.closest('[aria-label="thought-container"]')
  expect(thoughtRazzle).toHaveStyle({ color: 'rgba(100, 100, 100, 1)' })
})
