import { findAllByLabelText, findByLabelText, queryByLabelText, screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import { findAllThoughtsByText } from '../../test-helpers/queries/findAllThoughtsByText'
import { findSubthoughts } from '../../test-helpers/queries/findSubthoughts'
import { findThoughtByText } from '../../test-helpers/queries/findThoughtByText'
import { getClosestByLabel } from '../../test-helpers/queries/getClosestByLabel'
import { queryThoughtByText } from '../../test-helpers/queries/queryThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import series from '../../util/series'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

// TODO: Broke after LayoutTree
describe.skip('render', () => {
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
    const thoughtContainerM = getClosestByLabel(thoughtM, 'child')

    const thoughtsA = await findAllThoughtsByText('a', thoughtContainerM)
    expect(thoughtsA).toHaveLength(1)

    const thoughtsB = await findAllThoughtsByText('b', thoughtContainerM)
    expect(thoughtsB).toHaveLength(1)
  })

  it('do not expand contexts when cursor is on the context view', async () => {
    store.dispatch([
      importText({
        text: `
          - a
            - m
              - x
          - b
            - m
              - y
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
    ])

    const thoughtM = await findThoughtByText('m')
    const thoughtContainerM = getClosestByLabel(thoughtM, 'child')

    const thoughtX = await queryThoughtByText('x', thoughtContainerM)
    expect(thoughtX).toBeNull()

    const thoughtsY = await queryThoughtByText('y', thoughtContainerM)
    expect(thoughtsY).toBeNull()
  })

  it('expand cursor on a cyclic context (the context on which the context view is activated)', async () => {
    store.dispatch([
      importText({
        text: `
          - a
            - m
              - x
          - b
            - m
              - y
        `,
      }),
      setCursor(['a']),
      setCursor(['a', 'm']),
      toggleContextView(),
      setCursor(['a', 'm', 'a']),
    ])

    const thoughtM = await findThoughtByText('m')
    const thoughtContainerM = getClosestByLabel(thoughtM, 'child')

    const thoughtX = await findThoughtByText('x', thoughtContainerM)
    expect(thoughtX).toBeTruthy()

    const thoughtsY = await queryThoughtByText('y', thoughtContainerM)
    expect(thoughtsY).toBeNull()
  })

  it('expand cursor on a tangential context (from a different part of the hierarchy)', async () => {
    store.dispatch([
      importText({
        text: `
          - a
            - m
              - x
          - b
            - m
              - y
        `,
      }),
      setCursor(['a']),
      setCursor(['a', 'm']),
      toggleContextView(),
      setCursor(['a', 'm', 'b']),
    ])

    const thoughtM = await findThoughtByText('m')
    const thoughtContainerM = getClosestByLabel(thoughtM, 'child')

    const thoughtX = await queryThoughtByText('x', thoughtContainerM)
    expect(thoughtX).toBeNull()

    const thoughtsY = await queryThoughtByText('y', thoughtContainerM)
    expect(thoughtsY).toBeTruthy()
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
    expect(instructions).toHaveLength(1)
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

  it.skip('show breadcrumbs for each thought context', async () => {
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

    const homeIconA = await findByLabelText(subthoughts[0], 'home')
    expect(homeIconA).toBeTruthy()

    const homeIconB = await findByLabelText(subthoughts[1], 'home')
    expect(homeIconB).toBeTruthy()
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

    // first context should render home icon
    const thoughtB = await findByLabelText(subthoughts[0], 'thought')
    const homeIconB = await findAllByLabelText(thoughtB, 'home')
    expect(homeIconB).toHaveLength(1)

    // second context a/b should not render home icon
    const thoughtA = await findByLabelText(subthoughts[1], 'thought')
    const homeIconA = await queryByLabelText(thoughtA, 'home')
    expect(homeIconA).toBeNull()
  })

  it('render correct superscript on contexts', async () => {
    store.dispatch([
      importText({
        /*

        Superscripts:

        - m: 2
        - a: 3
        - b: 4

        */

        text: `
          - a
            - m
              - x
          - b
            - m
          - c
            - a
            - b
          - d
            - a
            - b
          - e
            - b
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
    ])

    const subthoughtsM = await findSubthoughts('m')

    const superscriptA = subthoughtsM[0].querySelector('sup')
    expect(superscriptA).toHaveTextContent('3')

    const superscriptB = subthoughtsM[1].querySelector('sup')
    expect(superscriptB).toHaveTextContent('4')
  })

  it('sort contexts by ancestors (breadcrumbs)', async () => {
    store.dispatch([
      importText({
        text: `
          - b
            - b1
              - m
          - a
            - a1
              - m
        `,
      }),
      setCursor(['b', 'b1', 'm']),
      toggleContextView(),
    ])

    const subthoughts = await findSubthoughts('m')

    // get the textContent of each context's breadcrumbs in order
    const breadcrumbsText = await series(
      subthoughts.map(subthought => async () => {
        const breadcrumbs = await findByLabelText(subthought, 'context-breadcrumbs')
        return breadcrumbs.textContent
      }),
    )

    expect(breadcrumbsText).toEqual(['a', 'b'])
  })

  it('sort contexts by ancestors with different depths', async () => {
    store.dispatch([
      importText({
        text: `
          - c
            - a1
              - m
          - b
            - x
              - m
          - a
            - d
              - g
                - m
              - e
                - f
                  - m
        `,
      }),
      setCursor(['c', 'a1', 'm']),
      toggleContextView(),
    ])

    const subthoughts = await findSubthoughts('m')

    // get the textContent of each context's breadcrumbs in order
    const breadcrumbsText = await series(
      subthoughts.map(subthought => async () => {
        const breadcrumbs = await findByLabelText(subthought, 'context-breadcrumbs')
        return breadcrumbs.textContent
      }),
    )

    expect(breadcrumbsText).toEqual(['a • d', 'a • d • e', 'b', 'c'])
  })

  it('sort contexts within the same ancestor by value', async () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
              - d
                - m
              - c
                - m
        `,
      }),
      setCursor(['a', 'b', 'd', 'm']),
      toggleContextView(),
    ])

    const subthoughts = await findSubthoughts('m')

    // get the breadcrumbs and textContent of each context in order
    const breadcrumbsText = await series(
      subthoughts.map(subthought => async () => {
        const thought = await findByLabelText(subthought, 'thought')
        return thought.textContent
      }),
    )

    expect(breadcrumbsText).toEqual(['c', 'd'])
  })

  it('Expand grandchildren of contexts', async () => {
    store.dispatch([
      importText({
        text: `
          - a
            - m
              - x
                - x1
          - b
            - m
              - y
                - y1
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
      setCursor(['a', 'm', 'a', 'x']),
    ])

    const contextsM = await findSubthoughts('m')
    const thoughtX1 = await findThoughtByText('x1', contextsM[0])
    expect(thoughtX1).toBeTruthy()
  })
})

// contenteditable is not supported in user-event@v13
// TODO: user-event@v14 has some peer dependency conflicts
describe.skip('editing', () => {
  it('edit a context', async () => {
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
