import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleHiddenThoughtsActionCreator as toggleHiddenThoughts } from '../../actions/toggleHiddenThoughts'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import dispatch from '../../test-helpers/dispatch'
import { findThoughtByText } from '../../test-helpers/queries'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('apply =style attribute to a thought', async () => {
  await dispatch([
    importText({
      text: `
        - Razzle
          - =style
            - color
              - rgba(255, 192, 203, 1)
        - Nuzzle
      `,
    }),
  ])

  const thoughtRazzle = (await findThoughtByText('Razzle'))?.closest('[aria-label="child"]')
  expect(thoughtRazzle).toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

  const thoughtNuzzle = await findThoughtByText('Nuzzle')
  expect(thoughtNuzzle).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
})

it('apply =children/=style to all children', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - =children
            - =pin
              - true
            - =style
              - color
                - rgba(255, 192, 203, 1)
          - b
            - c
          - d
      `,
    }),
  ])

  // do not apply to thought itself
  expect(await findThoughtByText('a')).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

  // apply to children (must be pinned open to find elemetns)
  const b = (await findThoughtByText('b'))?.closest('[aria-label="tree-node"]')
  expect(b).toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

  const d = (await findThoughtByText('d'))?.closest('[aria-label="tree-node"]')
  expect(d).toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

  // do not apply to grandchildren
  const c = (await findThoughtByText('c'))?.closest('[aria-label="tree-node"]')
  expect(c).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
})

// TODO: Broke when upgrading jest from 27.5.1 to 29.7.0 and jsdom 16.6.0 (missing) to 24.0.0
it.skip('as an exception, do not apply =children/=style to =children itself', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - =children
            - =style
              - color
                - rgba(255, 192, 203, 1)
          - b
      `,
    }),
    toggleHiddenThoughts(),
  ])

  expect(await findThoughtByText('=children')).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
})

it('apply =grandchildren/=style to all grandchildren', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - =grandchildren
            - =style
              - color
                - rgba(255, 192, 203, 1)
          - b
            - c
              - d
      `,
    }),
  ])

  // do not apply to thought itself
  expect(await findThoughtByText('a')).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

  // do not apply to children
  expect(await findThoughtByText('b')).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

  // apply to grandchildren (must be pinned open to find elemetns)
  const c = (await findThoughtByText('c'))?.closest('[aria-label="tree-node"]')
  expect(c).toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })

  // do not apply to great grandchildren
  expect(await findThoughtByText('d')).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
})

it('as an exception, do not apply =grandchildren/=style to =grandchildren itself', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - =grandchildren
            - =style
              - color
                - rgba(255, 192, 203, 1)
          - b
      `,
    }),
    toggleHiddenThoughts(),
  ])

  expect(await findThoughtByText('=grandchildren')).not.toHaveStyle({ color: 'rgba(255, 192, 203, 1)' })
})
