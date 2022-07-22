import { findAllByLabelText, findByLabelText, queryByLabelText, screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import importText from '../../action-creators/importText'
import toggleContextView from '../../action-creators/toggleContextView'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import { findAllThoughtsByText } from '../../test-helpers/queries/findAllThoughtsByText'
import { findSubthoughts } from '../../test-helpers/queries/findSubthoughts'
import { findThoughtByText } from '../../test-helpers/queries/findThoughtByText'
import { getClosestByLabel } from '../../test-helpers/queries/getClosestByLabel'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

describe('render', () => {
  it('activate toggleContextView', async () => {
    store.dispatch([
      importText({
        text: `
        - a
          - m
        - b
          - m
      `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
    ])
  })

  it('show all the contexts in which a thought exists', async () => {
    store.dispatch([
      importText({
        text: `
        - a
          - m
        - b
          - m
      `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
    ])

    const thoughtM = await findThoughtByText('m')
    const thoughtContainerM = getClosestByLabel(thoughtM, 'thought-container')

    const thoughtsA = await findAllThoughtsByText('a', thoughtContainerM)
    expect(thoughtsA.length).toBe(1)

    const thoughtsB = await findAllThoughtsByText('b', thoughtContainerM)
    expect(thoughtsB.length).toBe(1)
  })

  it('show instructions when thought exists in not found in any other contexts', async () => {
    store.dispatch([
      importText({
        text: `
        - a
      `,
      }),
      setCursor(['a']),
      toggleContextView(),
    ])

    // only search for first part of text since the whole text consists of several text nodes
    const instructions = await screen.findAllByText('This thought is not found in any other contexts', { exact: false })
    expect(instructions.length).toBe(1)
  })

  it('change bullet to no fill', async () => {
    store.dispatch([
      importText({
        text: `
        - a
      `,
      }),
      setCursor(['a']),
      toggleContextView(),
    ])

    const bulletGlyph = await screen.findByLabelText('bullet-glyph')
    expect(bulletGlyph).toHaveAttribute('fill', 'none')
  })

  it('show breadcrumbs for each thought context', async () => {
    store.dispatch([
      importText({
        text: `
        - a
          - b
            - m
              - x
        - c
          - d
            - e
              - m
                - y
      `,
      }),
      setCursor(['a', 'b', 'm']),
      toggleContextView(),
    ])

    const subthoughts = await findSubthoughts('m')

    const breadcrumbsAB = await findAllByLabelText(subthoughts[0], 'context-breadcrumbs')
    expect(breadcrumbsAB[0]).toHaveTextContent('a')

    const breadcrumbsCDE = await findAllByLabelText(subthoughts[1], 'context-breadcrumbs')
    expect(breadcrumbsCDE[0]).toHaveTextContent('c • d')
  })

  it('render home icon as breadcrumbs for each thought whose parent is the home context', async () => {
    store.dispatch([
      importText({
        text: `
        - a
          - m
        - b
          - m
      `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
    ])

    const subthoughts = await findSubthoughts('m')

    const thoughtA = await findByLabelText(subthoughts[0], 'thought')
    const homeIconA = await findAllByLabelText(thoughtA, 'home')
    expect(homeIconA).toHaveLength(1)

    const thoughtB = await findByLabelText(subthoughts[1], 'thought')
    const homeIconB = await findAllByLabelText(thoughtB, 'home')
    expect(homeIconB).toHaveLength(1)
  })

  it('render home icon as thought for each thought in the home context', async () => {
    store.dispatch([
      importText({
        text: `
        - a
          - b
            - m
        - m
      `,
      }),
      setCursor(['a', 'b', 'm']),
      toggleContextView(),
    ])

    const subthoughts = await findSubthoughts('m')

    // first context a/b should not render home icon
    const thoughtA = await findByLabelText(subthoughts[0], 'thought')
    const homeIconA = await queryByLabelText(thoughtA, 'home')
    expect(homeIconA).toBeNull()

    // second context should render home icon
    const thoughtB = await findByLabelText(subthoughts[1], 'thought')
    const homeIconB = await findAllByLabelText(thoughtB, 'home')
    expect(homeIconB).toHaveLength(1)
  })
})

describe('editing', () => {
  // contenteditable is not supported in user-event@v13
  // TODO: user-event@v14 has some peer dependency conflicts
  it.skip('edit a context', async () => {
    store.dispatch([
      importText({
        text: `
        - a
          - m
        - b
          - m
      `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
    ])

    const subthoughts = await findSubthoughts('m')

    const thoughtA = await findByLabelText(subthoughts[0], 'thought')
    userEvent.click(thoughtA)

    userEvent.type(thoughtA, 'z')

    userEvent.type(thoughtA, '{esc}')
    store.dispatch(toggleContextView())

    const thoughtA2 = await findAllThoughtsByText('a')
    expect(thoughtA2).toHaveLength(0)

    const thoughtAZ = await findAllThoughtsByText('az')
    expect(thoughtAZ).toHaveLength(1)

    const thoughtB = await findAllThoughtsByText('b')
    expect(thoughtB).toHaveLength(1)
  })
})
