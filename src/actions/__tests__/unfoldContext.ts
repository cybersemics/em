import { categorizeActionCreator as categorize } from '../../actions/categorize'
import { cursorBackActionCreator as cursorBack } from '../../actions/cursorBack'
import { cursorForwardActionCreator as cursorForward } from '../../actions/cursorForward'
import { deleteThoughtWithCursorActionCreator as deleteThoughtWithCursor } from '../../actions/deleteThoughtWithCursor'
import { importTextActionCreator as importText } from '../../actions/importText'
import { moveThoughtActionCreator as moveDisplayedThought } from '../../actions/moveThought'
import { moveThoughtDownActionCreator as moveThoughtDown } from '../../actions/moveThoughtDown'
import { moveThoughtUpActionCreator as moveThoughtUp } from '../../actions/moveThoughtUp'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import { undoActionCreator as undo } from '../../actions/undo'
import { unfoldContextActionCreator as unfoldContext } from '../../actions/unfoldContext'
import { HOME_TOKEN } from '../../constants'
import displayedParentOf from '../../selectors/displayedParentOf'
import exportContext from '../../selectors/exportContext'
import linearizeTree from '../../selectors/linearizeTree'
import simplifyPath from '../../selectors/simplifyPath'
import store from '../../stores/app'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import { deleteThoughtAtFirstMatchActionCreator as deleteThought } from '../../test-helpers/deleteThoughtAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { moveThoughtAtFirstMatchActionCreator as moveThought } from '../../test-helpers/moveThoughtAtFirstMatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import appendToPath from '../../util/appendToPath'
import equalPath from '../../util/equalPath'
import head from '../../util/head'
import isDescendantPath from '../../util/isDescendantPath'
import parentOf from '../../util/parentOf'

beforeEach(initStore)

it('selects the tapped ancestor inside the portal without changing the stored hierarchy', () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
    - source detail
- Outside
  - District
    - Park
      - Garden
        - m
          - target detail
        - Daffodils
    - Dog park
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const contextViewPath = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const contextId = head(
    contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Park', 'Garden', 'm'], 'unfoldContext test'),
  )
  const ancestorId = head(contextToPathOrThrow(store.getState(), ['Outside', 'District'], 'unfoldContext test'))

  store.dispatch(unfoldContext({ contextViewPath, contextId, ancestorId }))

  const state = store.getState()
  expectPathToEqual(state, simplifyPath(state, state.cursor!), ['Outside', 'District'])
  expect(displayedParentOf(state, state.cursor!)).toEqual(contextViewPath)
  expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
    - m
      - source detail
  - Outside
    - District
      - Park
        - Garden
          - m
            - target detail
          - Daffodils
      - Dog park`)
})

it('keeps two unfolded entries with the same ancestor as distinct displayed routes', () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
- Outside
  - District
    - Garden
      - m
        - first local detail
    - Library
      - m
        - second local detail
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const contextViewPath = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const ancestorPath = contextToPathOrThrow(store.getState(), ['Outside', 'District'], 'unfoldContext test')
  const firstContextId = head(
    contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Garden', 'm'], 'unfoldContext test'),
  )
  const secondContextId = head(
    contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Library', 'm'], 'unfoldContext test'),
  )

  store.dispatch(unfoldContext({ contextViewPath, contextId: firstContextId, ancestorId: head(ancestorPath) }))
  const firstCursor = store.getState().cursor!
  store.dispatch(unfoldContext({ contextViewPath, contextId: secondContextId, ancestorId: head(ancestorPath) }))
  const secondCursor = store.getState().cursor!

  expect(firstCursor).not.toEqual(secondCursor)
  expect(simplifyPath(store.getState(), firstCursor)).toEqual(ancestorPath)
  expect(simplifyPath(store.getState(), secondCursor)).toEqual(ancestorPath)
  const entries = linearizeTree(store.getState()).filter(
    row => equalPath(row.simplePath, ancestorPath) && isDescendantPath(row.path, contextViewPath),
  )
  expect(entries.map(row => row.path)).toEqual([firstCursor, secondCursor])
})

it('creates a sibling of the first unfolded ancestor with a reachable selected route', async () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
    - source detail
- Outside
  - District
    - Garden
      - m
        - target detail
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const owner = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const ancestorId = head(contextToPathOrThrow(store.getState(), ['Outside', 'District'], 'unfoldContext test'))
  const contextId = head(
    contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Garden', 'm'], 'unfoldContext test'),
  )
  store.dispatch(unfoldContext({ contextViewPath: owner, contextId, ancestorId }))

  store.dispatch(newThought({ value: 'New sibling' }))
  await vi.runAllTimersAsync()

  const state = store.getState()
  const sibling = contextToPathOrThrow(state, ['Outside', 'New sibling'], 'unfoldContext test')
  expect(simplifyPath(state, state.cursor!)).toEqual(sibling)
  expect(
    linearizeTree(state)
      .filter(row => equalPath(row.path, state.cursor))
      .map(row => row.simplePath),
  ).toEqual([sibling])
  expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
    - m
      - source detail
  - Outside
    - District
      - Garden
        - m
          - target detail
    - New sibling`)
})

it('backs out of an unfolded cyclic entry without selecting the hidden occurrence anchor', () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
    - source detail
- Garden
  - m
    - target detail
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const contextViewPath = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const ancestorId = head(contextToPathOrThrow(store.getState(), ['Reading'], 'unfoldContext test'))
  store.dispatch(unfoldContext({ contextViewPath, contextId: head(contextViewPath), ancestorId }))

  store.dispatch(cursorForward())
  expectPathToEqual(store.getState(), simplifyPath(store.getState(), store.getState().cursor!), ['Reading', 'm'])
  store.dispatch(cursorForward())
  expectPathToEqual(store.getState(), simplifyPath(store.getState(), store.getState().cursor!), [
    'Reading',
    'm',
    'source detail',
  ])
  store.dispatch([cursorBack(), cursorBack(), cursorBack()])

  expect(store.getState().cursor).toEqual(contextViewPath)
})

it('keeps the unfolded ancestor spine when navigating deeper into the destination', () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
    - source detail
- Outside
  - District
    - Garden
      - m
        - target detail
    - Dog park
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const contextViewPath = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const ancestorPath = contextToPathOrThrow(store.getState(), ['Outside', 'District'], 'unfoldContext test')
  const contextId = head(
    contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Garden', 'm'], 'unfoldContext test'),
  )
  store.dispatch(unfoldContext({ contextViewPath, contextId, ancestorId: head(ancestorPath) }))

  store.dispatch([cursorForward(), cursorForward(), cursorForward()])

  expectPathToEqual(store.getState(), simplifyPath(store.getState(), store.getState().cursor!), [
    'Outside',
    'District',
    'Garden',
    'm',
    'target detail',
  ])
  expect(
    linearizeTree(store.getState())
      .filter(row => equalPath(row.simplePath, ancestorPath) && isDescendantPath(row.path, contextViewPath))
      .map(row => row.simplePath),
  ).toEqual([ancestorPath])
})

it('returns from a nested unfolded entry to its entrance within the outer portal', () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
- Garden
  - m
    - second idea
      - local reading
- Theory
  - second idea
    - theoretical reading
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const contextViewPath = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const contextId = head(contextToPathOrThrow(store.getState(), ['Garden', 'm'], 'unfoldContext test'))
  const ancestorId = head(contextToPathOrThrow(store.getState(), ['Garden'], 'unfoldContext test'))
  store.dispatch(unfoldContext({ contextViewPath, contextId, ancestorId }))
  store.dispatch([cursorForward(), cursorForward(), toggleContextView()])
  const nestedEntrance = store.getState().cursor!
  const nestedContextId = head(contextToPathOrThrow(store.getState(), ['Theory', 'second idea'], 'unfoldContext test'))
  const nestedAncestorId = head(contextToPathOrThrow(store.getState(), ['Theory'], 'unfoldContext test'))

  store.dispatch(
    unfoldContext({ contextViewPath: nestedEntrance, contextId: nestedContextId, ancestorId: nestedAncestorId }),
  )
  store.dispatch(cursorBack())

  expect(store.getState().cursor).toEqual(nestedEntrance)
  expectPathToEqual(store.getState(), simplifyPath(store.getState(), store.getState().cursor!), [
    'Garden',
    'm',
    'second idea',
  ])
})

it('moves the selected real subtree and restores its unfolded route on undo', async () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
    - source detail
- Outside
  - District
    - Park
      - m
        - target detail
- Other
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const contextViewPath = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const contextId = head(
    contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Park', 'm'], 'unfoldContext test'),
  )
  const ancestorId = head(contextToPathOrThrow(store.getState(), ['Outside', 'District'], 'unfoldContext test'))
  store.dispatch(unfoldContext({ contextViewPath, contextId, ancestorId }))
  store.dispatch(cursorForward())
  const cursorBeforeMove = store.getState().cursor!

  store.dispatch(moveThought({ from: ['Outside', 'District', 'Park'], to: ['Other', 'Park'], newRank: 0 }))
  await vi.runAllTimersAsync()

  expectPathToEqual(store.getState(), simplifyPath(store.getState(), store.getState().cursor!), ['Other', 'Park'])
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
    - m
      - source detail
  - Outside
    - District
  - Other
    - Park
      - m
        - target detail`)

  store.dispatch(undo())
  await vi.runAllTimersAsync()

  expect(store.getState().cursor).toEqual(cursorBeforeMove)
  expectPathToEqual(store.getState(), simplifyPath(store.getState(), store.getState().cursor!), [
    'Outside',
    'District',
    'Park',
  ])
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
    - m
      - source detail
  - Outside
    - District
      - Park
        - m
          - target detail
  - Other`)
})

it('moves an existing thought into the actual parent named by an unfolded destination route', async () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
    - source detail
- Outside
  - District
    - Garden
      - m
        - target detail
- Depot
  - Item
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const owner = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const contextId = head(
    contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Garden', 'm'], 'unfoldContext test'),
  )
  const ancestorId = head(contextToPathOrThrow(store.getState(), ['Outside', 'District'], 'unfoldContext test'))
  const item = contextToPathOrThrow(store.getState(), ['Depot', 'Item'], 'unfoldContext test')
  store.dispatch(unfoldContext({ contextViewPath: owner, contextId, ancestorId }))
  store.dispatch(cursorForward())
  const destinationRoute = store.getState().cursor!

  store.dispatch(
    moveDisplayedThought({ oldPath: item, newPath: appendToPath(destinationRoute, head(item)), newRank: 1 }),
  )
  await vi.runAllTimersAsync()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
    - m
      - source detail
  - Outside
    - District
      - Garden
        - m
          - target detail
        - Item
  - Depot`)
  expect(linearizeTree(store.getState()).filter(row => equalPath(row.path, store.getState().cursor))).toHaveLength(1)
})

it('moves an existing thought beside the first unfolded ancestor without creating an orphaned display route', async () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
    - source detail
- Outside
  - District
    - Garden
      - m
        - target detail
- Depot
  - Item
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const owner = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const contextId = head(
    contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Garden', 'm'], 'unfoldContext test'),
  )
  const ancestorId = head(contextToPathOrThrow(store.getState(), ['Outside', 'District'], 'unfoldContext test'))
  const item = contextToPathOrThrow(store.getState(), ['Depot', 'Item'], 'unfoldContext test')
  store.dispatch(unfoldContext({ contextViewPath: owner, contextId, ancestorId }))
  const siblingRoute = appendToPath(parentOf(store.getState().cursor!), head(item))

  store.dispatch(moveDisplayedThought({ oldPath: item, newPath: siblingRoute, newRank: 1 }))
  await vi.runAllTimersAsync()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
    - m
      - source detail
  - Outside
    - District
      - Garden
        - m
          - target detail
    - Item
  - Depot`)
  expect(linearizeTree(store.getState()).filter(row => equalPath(row.path, store.getState().cursor))).toHaveLength(1)
})

it('categorizes the first unfolded ancestor under its actual parent with a reachable selected category', async () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
- Outside
  - District
    - Park
      - m
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const contextViewPath = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const contextId = head(
    contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Park', 'm'], 'unfoldContext test'),
  )
  const ancestorId = head(contextToPathOrThrow(store.getState(), ['Outside', 'District'], 'unfoldContext test'))
  store.dispatch(unfoldContext({ contextViewPath, contextId, ancestorId }))

  store.dispatch(categorize({ value: 'Places' }))
  await vi.runAllTimersAsync()

  const state = store.getState()
  const category = contextToPathOrThrow(state, ['Outside', 'Places'], 'unfoldContext test')
  expect(state.cursor).toEqual(category)
  expect(linearizeTree(state).filter(row => equalPath(row.path, state.cursor))).toHaveLength(1)
  expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
    - m
  - Outside
    - Places
      - District
        - Park
          - m`)
})

it.each([
  { direction: 'up', action: moveThoughtUp, siblings: ['District', 'Before', 'After'] },
  { direction: 'down', action: moveThoughtDown, siblings: ['Before', 'After', 'District'] },
])('moves the first unfolded ancestor $direction among its actual siblings', async ({ action, siblings }) => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
- Outside
  - Before
  - District
    - Park
      - m
  - After
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const contextViewPath = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const contextId = head(
    contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Park', 'm'], 'unfoldContext test'),
  )
  const ancestor = contextToPathOrThrow(store.getState(), ['Outside', 'District'], 'unfoldContext test')
  store.dispatch(unfoldContext({ contextViewPath, contextId, ancestorId: head(ancestor) }))

  store.dispatch(action())
  await vi.runAllTimersAsync()

  const state = store.getState()
  expect(simplifyPath(state, state.cursor!)).toEqual(ancestor)
  expect(linearizeTree(state).filter(row => equalPath(row.path, state.cursor))).toHaveLength(1)
  expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
    - m
  - Outside
${siblings.map(value => `    - ${value}${value === 'District' ? '\n      - Park\n        - m' : ''}`).join('\n')}`)
})

it('selects a reachable physical next sibling when deleting the first unfolded ancestor', async () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
- Outside
  - District
    - Park
      - m
  - Other
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const contextViewPath = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const contextId = head(
    contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Park', 'm'], 'unfoldContext test'),
  )
  const ancestorId = head(contextToPathOrThrow(store.getState(), ['Outside', 'District'], 'unfoldContext test'))
  store.dispatch(unfoldContext({ contextViewPath, contextId, ancestorId }))

  store.dispatch(deleteThoughtWithCursor())
  await vi.runAllTimersAsync()

  const state = store.getState()
  const nextSibling = contextToPathOrThrow(state, ['Outside', 'Other'], 'unfoldContext test')
  expect(state.cursor).toEqual(nextSibling)
  expect(
    linearizeTree(state)
      .filter(row => equalPath(row.path, state.cursor))
      .map(row => row.simplePath),
  ).toEqual([nextSibling])
  expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
    - m
  - Outside
    - Other`)
})

it('deletes a destination child and restores the same local occurrence on undo', async () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
    - source detail
- Garden
  - m
    - target detail
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const contextViewPath = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const contextId = head(contextToPathOrThrow(store.getState(), ['Garden', 'm'], 'unfoldContext test'))
  const ancestorId = head(contextToPathOrThrow(store.getState(), ['Garden'], 'unfoldContext test'))
  store.dispatch(unfoldContext({ contextViewPath, contextId, ancestorId }))
  store.dispatch([cursorForward(), cursorForward()])
  const cursorBeforeDelete = store.getState().cursor!

  store.dispatch(deleteThoughtWithCursor())
  await vi.runAllTimersAsync()

  expectPathToEqual(store.getState(), simplifyPath(store.getState(), store.getState().cursor!), ['Garden', 'm'])
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
    - m
      - source detail
  - Garden
    - m`)

  store.dispatch(undo())
  await vi.runAllTimersAsync()

  expect(store.getState().cursor).toEqual(cursorBeforeDelete)
  expectPathToEqual(store.getState(), simplifyPath(store.getState(), store.getState().cursor!), [
    'Garden',
    'm',
    'target detail',
  ])
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
    - m
      - source detail
  - Garden
    - m
      - target detail`)
})

it('rebases an unfolded route when its owner thought moves and restores that route on undo', async () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
    - source detail
- Outside
  - District
    - Park
      - m
        - target detail
- Books
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const owner = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const ancestor = contextToPathOrThrow(store.getState(), ['Outside', 'District'], 'unfoldContext test')
  const contextId = head(
    contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Park', 'm'], 'unfoldContext test'),
  )
  store.dispatch(unfoldContext({ contextViewPath: owner, contextId, ancestorId: head(ancestor) }))
  store.dispatch(cursorForward())
  const cursorBeforeMove = store.getState().cursor!

  store.dispatch(moveThought({ from: ['Reading', 'm'], to: ['Books', 'm'], newRank: 0 }))
  await vi.runAllTimersAsync()

  const stateMoved = store.getState()
  const movedOwner = contextToPathOrThrow(stateMoved, ['Books', 'm'], 'unfoldContext test')
  expect(isDescendantPath(stateMoved.cursor, movedOwner)).toBe(true)
  expect(isDescendantPath(stateMoved.cursor, owner)).toBe(false)
  expectPathToEqual(stateMoved, simplifyPath(stateMoved, stateMoved.cursor!), ['Outside', 'District', 'Park'])
  expect(
    linearizeTree(stateMoved)
      .filter(row => equalPath(row.simplePath, ancestor) && isDescendantPath(row.path, movedOwner))
      .map(row => row.simplePath),
  ).toEqual([ancestor])
  expect(exportContext(stateMoved, [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
  - Outside
    - District
      - Park
        - m
          - target detail
  - Books
    - m
      - source detail`)

  store.dispatch(undo())
  await vi.runAllTimersAsync()

  expect(store.getState().cursor).toEqual(cursorBeforeMove)
  expectPathToEqual(store.getState(), simplifyPath(store.getState(), store.getState().cursor!), [
    'Outside',
    'District',
    'Park',
  ])
})

it('keeps the selected ancestor at its real location when the matching destination is deleted', async () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
    - source detail
- Outside
  - District
    - Park
      - m
        - target detail
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const owner = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const ancestor = contextToPathOrThrow(store.getState(), ['Outside', 'District'], 'unfoldContext test')
  const contextId = head(
    contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Park', 'm'], 'unfoldContext test'),
  )
  store.dispatch(unfoldContext({ contextViewPath: owner, contextId, ancestorId: head(ancestor) }))
  store.dispatch(cursorForward())
  const cursorBeforeDelete = store.getState().cursor!

  store.dispatch(deleteThought(['Outside', 'District', 'Park', 'm']))
  await vi.runAllTimersAsync()

  const actualPark = contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Park'], 'unfoldContext test')
  expect(store.getState().cursor).toEqual(actualPark)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
    - m
      - source detail
  - Outside
    - District
      - Park`)

  store.dispatch(undo())
  await vi.runAllTimersAsync()

  expect(store.getState().cursor).toEqual(cursorBeforeDelete)
  expectPathToEqual(store.getState(), simplifyPath(store.getState(), store.getState().cursor!), [
    'Outside',
    'District',
    'Park',
  ])
})

it('keeps the selected destination at its real location when the portal owner is deleted', async () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
    - source detail
- Outside
  - District
    - Park
      - m
        - target detail
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const owner = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'unfoldContext test')
  const ancestor = contextToPathOrThrow(store.getState(), ['Outside', 'District'], 'unfoldContext test')
  const contextId = head(
    contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Park', 'm'], 'unfoldContext test'),
  )
  store.dispatch(unfoldContext({ contextViewPath: owner, contextId, ancestorId: head(ancestor) }))
  store.dispatch(cursorForward())
  const cursorBeforeDelete = store.getState().cursor!

  store.dispatch(deleteThought(['Reading', 'm']))
  await vi.runAllTimersAsync()

  const actualPark = contextToPathOrThrow(store.getState(), ['Outside', 'District', 'Park'], 'unfoldContext test')
  expect(store.getState().cursor).toEqual(actualPark)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
  - Outside
    - District
      - Park
        - m
          - target detail`)

  store.dispatch(undo())
  await vi.runAllTimersAsync()

  expect(store.getState().cursor).toEqual(cursorBeforeDelete)
  expectPathToEqual(store.getState(), simplifyPath(store.getState(), store.getState().cursor!), [
    'Outside',
    'District',
    'Park',
  ])
})
