import importText from '../../action-creators/importText'
import toggleHiddenThoughts from '../../action-creators/toggleHiddenThoughts'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import { findThoughtByText } from '../../test-helpers/queries'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('apply =style attribute to a thought', async () => {
  store.dispatch([
    importText({
      text: `
        - Razzle
          - =style
            - color
              - pink
        - Nuzzle
      `,
    }),
  ])

  const thoughtRazzle = await findThoughtByText('Razzle')
  expect(thoughtRazzle).toHaveStyle({ color: 'pink' })

  const thoughtNuzzle = await findThoughtByText('Nuzzle')
  expect(thoughtNuzzle).not.toHaveStyle({ color: 'pink' })
})

it('apply =children/=style to all children', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =children
            - =pin
              - true
            - =style
              - color
                - pink
          - b
            - c
          - d
      `,
    }),
  ])

  // do not apply to thought itself
  expect(await findThoughtByText('a')).not.toHaveStyle({ color: 'pink' })

  // apply to children (must be pinned open to find elemetns)
  expect(await findThoughtByText('b')).toHaveStyle({ color: 'pink' })
  expect(await findThoughtByText('d')).toHaveStyle({ color: 'pink' })

  // do not apply to grandchildren
  expect(await findThoughtByText('c')).not.toHaveStyle({ color: 'pink' })
})

it('do not apply =children/=style to =children itself', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =children
            - =style
              - color
                - pink
          - b
      `,
    }),
    toggleHiddenThoughts(),
  ])

  expect(await findThoughtByText('=children')).not.toHaveStyle({ color: 'pink' })
})

it('apply =grandchildren/=style to all grandchildren', async () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =grandchildren
            - =style
              - color
                - pink
          - b
            - c
              - d
      `,
    }),
  ])

  // do not apply to thought itself
  expect(await findThoughtByText('a')).not.toHaveStyle({ color: 'pink' })

  // do not apply to children
  expect(await findThoughtByText('b')).not.toHaveStyle({ color: 'pink' })

  // apply to grandchildren (must be pinned open to find elemetns)
  expect(await findThoughtByText('c')).toHaveStyle({ color: 'pink' })

  // do not apply to great grandchildren
  expect(await findThoughtByText('d')).not.toHaveStyle({ color: 'pink' })
})
