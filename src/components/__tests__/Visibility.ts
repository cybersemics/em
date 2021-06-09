import { ReactWrapper } from 'enzyme'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { HOME_PATH } from '../../constants'
import { equalArrays, pathToContext } from '../../util'
import { importText, setCursor } from '../../action-creators'
import Subthoughts from '../Subthoughts'
import { Context, Path, SimplePath } from '../../types'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

// type for Thoughts or Subthoughts component that has a simplePath prop
interface ThoughtOrSubthoughtsComponent {
  props: () => {
    path?: Path,
    simplePath: SimplePath,
    showContexts?: boolean,
  },
}

/** A filterWhere predicate that returns true for Thought or Subthought nodes that match the given thoughts path. */
const wherePath = (context: Context) => (node: ThoughtOrSubthoughtsComponent) => {

  const path = node.props().path ?? node.props().simplePath
  return !!path && equalArrays(pathToContext(path), context)
}

/** Returns the children component inside the Subthoughts for the given context. */
const getChildrenComponent = (context: Context) => {
  const subthoughtsWrapper = wrapper
    .find(Subthoughts)
    .filterWhere(wherePath(context))
    .first()

  return subthoughtsWrapper.find('.children').at(0)
}

let wrapper: ReactWrapper<unknown, unknown> // eslint-disable-line fp/no-let

beforeEach(async () => {
  wrapper = await createTestApp()
})

afterEach(cleanupTestApp)

/*
  The following properties is assumed to be applied to the immediate childrens of the context with given class.

  distance-from-cursor-0 fully visible
  distance-from-cursor-1 dimmed
  distance-from-cursor-2 shifted left and hidden
  distance-from-cursor-3 shiifted left and hidden

  Note: This doesn't fully account for the visibility. There are other factors that can affect opacity. For example cursor and its expanded descendants are always visible with full opacity.
*/

it('ancestors should be visible only up to allowed distance from cursor', () => {

  const text = `
  - a
    - b
      - c
        - d
          - e
            - f`

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
      text,
    }),
    setCursorFirstMatchActionCreator(['a', 'b', 'c', 'd'])
  ])

  // update DOM
  wrapper.update()

  const childrenC = getChildrenComponent(['a', 'b', 'c'])
  const childrenB = getChildrenComponent(['a', 'b'])
  const childrenA = getChildrenComponent(['a'])

  expect(childrenC.hasClass('distance-from-cursor-1')).toBe(true)
  expect(childrenB.hasClass('distance-from-cursor-2')).toBe(true)
  expect(childrenA.hasClass('distance-from-cursor-3')).toBe(true)
})

it('descendants of hidden ancestor must be hidden too', () => {

  const text = `
  - a
    - =pinChildren
      - true
    - b
      - c
        - d
    - e
      - f
        - g`

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
      text,
    }),
    setCursorFirstMatchActionCreator(['a', 'b', 'c'])
  ])

  // update DOM
  wrapper.update()

  const childrenC = getChildrenComponent(['a', 'b'])
  const childrenE = getChildrenComponent(['a', 'e'])
  const childrenF = getChildrenComponent(['a', 'e', 'f'])

  expect(childrenC.hasClass('distance-from-cursor-1')).toBe(true)
  expect(childrenE.hasClass('distance-from-cursor-2')).toBe(true)
  expect(childrenF.hasClass('distance-from-cursor-2')).toBe(true)
})

it('when the cursor is on a table grandchild leaf (column 2), other grandchildren of the table should be visible and dimmed', () => {

  const text = `
  - a
    - =view
      - Table
    - b
      - c
    - k
      - m
    - e
      - f`

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
      text,
    }),
    setCursorFirstMatchActionCreator(['a', 'e', 'f'])
  ])

  // update DOM
  wrapper.update()

  const childrenB = getChildrenComponent(['a', 'b'])
  const childrenK = getChildrenComponent(['a', 'k'])

  expect(childrenB.hasClass('distance-from-cursor-1')).toBe(true)
  expect(childrenK.hasClass('distance-from-cursor-1')).toBe(true)
})

it('when the cursor is null, all thoughts should be visible and not dimmed', () => {

  const text = `
  - a
    - b
      - c
        - d
          - e
            - f`

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
      text,
    }),
    setCursor({ path: null }),
  ])

  // update DOM
  wrapper.update()

  const childrenC = getChildrenComponent(['a', 'b', 'c'])
  const childrenB = getChildrenComponent(['a', 'b'])
  const childrenA = getChildrenComponent(['a'])

  expect(childrenC.hasClass('distance-from-cursor-0')).toBe(true)
  expect(childrenB.hasClass('distance-from-cursor-0')).toBe(true)
  expect(childrenA.hasClass('distance-from-cursor-0')).toBe(true)
})
