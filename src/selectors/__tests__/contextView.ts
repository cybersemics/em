import State from '../../@types/State'
import ThoughtId from '../../@types/ThoughtId'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import getThoughtById from '../../selectors/getThoughtById'
import isContextViewActive from '../../selectors/isContextViewActive'
import parentContextId from '../../selectors/parentContextId'
import parentContextPath from '../../selectors/parentContextPath'
import simplifyPath from '../../selectors/simplifyPath'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import appendToPath, { appendContextStep } from '../../util/appendToPath'
import hashPath from '../../util/hashPath'
import head from '../../util/head'
import { isContextStep, isSimplePath } from '../../util/pathStep'
import pathToContext from '../../util/pathToContext'

beforeEach(initStore)

/** Returns the id of the first child of a thought with the given value. Bypasses contextToPath so that a Path can be built for an ordinary child even while the context view is active on its parent. */
const childIdByValue = (state: State, parentId: ThoughtId, value: string): ThoughtId =>
  Object.values(getThoughtById(state, parentId)!.childrenMap).find(id => getThoughtById(state, id)!.value === value)!

describe('a context step is distinguishable from an ordinary child step', () => {
  // Regression test for the ambiguity that made splitChain's boundary detection unreliable. With the boundary
  // re-derived from state, the ordinary child a/m/b and the context-view row a/m~/b were the same array of ids,
  // because b is both a child of a/m and the parent of another m.
  // https://github.com/cybersemics/em/pull/2613#issuecomment-2509619336
  beforeEach(() => {
    store.dispatch([
      importText({
        text: `
          - a
            - m
              - b
                - m
                  - z
              - y
        `,
      }),
      setCursor(['a', 'm']),
      toggleContextView(),
    ])
  })

  it('the ordinary child and the context-view row are different Paths', () => {
    const state = store.getState()
    const pathAM = contextToPath(state, ['a', 'm'])!
    const pathOrdinaryChild = appendToPath(pathAM, childIdByValue(state, head(pathAM) as ThoughtId, 'b'))
    const pathContextRow = contextToPath(state, ['a', 'm', 'b'])!

    expect(pathOrdinaryChild).not.toEqual(pathContextRow)
    expect(isContextStep(head(pathOrdinaryChild))).toBe(false)
    expect(isContextStep(head(pathContextRow))).toBe(true)
  })

  it('simplifyPath resolves the ordinary child to itself', () => {
    const state = store.getState()
    const pathAM = contextToPath(state, ['a', 'm'])!
    const pathOrdinaryChild = appendToPath(pathAM, childIdByValue(state, head(pathAM) as ThoughtId, 'b'))

    expect(pathToContext(state, simplifyPath(state, pathOrdinaryChild))).toEqual(['a', 'm', 'b'])
  })

  it('simplifyPath resolves the context-view row to its Lexeme context', () => {
    const state = store.getState()
    const pathContextRow = contextToPath(state, ['a', 'm', 'b'])!

    // the row a/m~/b stands for b/m
    expect(pathToContext(state, simplifyPath(state, pathContextRow))).toEqual(['a', 'm', 'b', 'm'])
  })

  it('hashPath does not collide between the two', () => {
    const state = store.getState()
    const pathAM = contextToPath(state, ['a', 'm'])!
    const pathOrdinaryChild = appendToPath(pathAM, childIdByValue(state, head(pathAM) as ThoughtId, 'b'))
    const pathContextRow = contextToPath(state, ['a', 'm', 'b'])!

    expect(hashPath(pathOrdinaryChild)).not.toEqual(hashPath(pathContextRow))
  })

  it('activating the context view on a context-view row does not activate it on the identically-valued SimplePath', () => {
    store.dispatch([setCursor(['a', 'm', 'b']), toggleContextView()])

    const state = store.getState()
    const pathAM = contextToPath(state, ['a', 'm'])!
    const pathOrdinaryChild = appendToPath(pathAM, childIdByValue(state, head(pathAM) as ThoughtId, 'b'))

    expect(isContextViewActive(state, contextToPath(state, ['a', 'm', 'b'])!)).toBe(true)
    expect(isContextViewActive(state, pathOrdinaryChild)).toBe(false)
  })
})

describe('a context-view row resolves to two different thoughts', () => {
  beforeEach(() => {
    store.dispatch([
      importText({ text: `- a\n  - m\n    - x\n- b\n  - m\n    - y` }),
      setCursor(['a', 'm']),
      toggleContextView(),
    ])
  })

  it('simplifyPath gives the Lexeme context, which delete and move operate on', () => {
    const state = store.getState()
    const path = contextToPath(state, ['a', 'm', 'b'])!

    expect(pathToContext(state, simplifyPath(state, path))).toEqual(['b', 'm'])
  })

  it('parentContextPath gives the context, which is displayed and edited', () => {
    const state = store.getState()
    const path = contextToPath(state, ['a', 'm', 'b'])!

    expect(pathToContext(state, parentContextPath(state, path))).toEqual(['b'])
    expect(getThoughtById(state, parentContextId(state, path))!.value).toBe('b')
  })

  it('the cyclic context a/m~/a resolves to a/m and to a', () => {
    const state = store.getState()
    const path = contextToPath(state, ['a', 'm', 'a'])!

    // the Lexeme context is a/m — deleting a/m~/a removes m from the parent context a
    expect(pathToContext(state, simplifyPath(state, path))).toEqual(['a', 'm'])
    // the displayed thought is a — formatting a/m~/a formats a
    expect(pathToContext(state, parentContextPath(state, path))).toEqual(['a'])
  })

  it('pathToContext reports the values the user sees', () => {
    const state = store.getState()

    expect(pathToContext(state, contextToPath(state, ['a', 'm', 'b'])!)).toEqual(['a', 'm', 'b'])
  })

  it('descending past the boundary resolves against the Lexeme context', () => {
    const state = store.getState()
    const path = contextToPath(state, ['a', 'm', 'b', 'y'])!

    expect(pathToContext(state, simplifyPath(state, path))).toEqual(['b', 'm', 'y'])
  })
})

describe('two thoughts of the same Lexeme in one context are addressable separately', () => {
  // The context view lists cat and Cats separately, since they are separate Lexeme contexts, but both are displayed
  // under the same context b. Storing the context in the Path made the two rows indistinguishable; storing the
  // Lexeme context makes each row uniquely addressable.
  it('produces a distinct Path for each row', () => {
    store.dispatch([
      importText({ text: `- a\n  - cat\n- b\n  - cat\n  - Cats` }),
      setCursor(['a', 'cat']),
      toggleContextView(),
    ])

    const state = store.getState()
    const pathACat = contextToPath(state, ['a', 'cat'])!
    const b = getThoughtById(state, childIdByValue(state, HOME_TOKEN, 'b'))

    // build both rows directly from the two instances under b
    const instanceCat = childIdByValue(state, b!.id, 'cat')
    const instanceCats = childIdByValue(state, b!.id, 'Cats')
    const rowCat = appendContextStep(pathACat, instanceCat)
    const rowCats = appendContextStep(pathACat, instanceCats)

    expect(rowCat).not.toEqual(rowCats)
    expect(hashPath(rowCat)).not.toEqual(hashPath(rowCats))
    // both display the context b, but resolve to different instances
    expect(getThoughtById(state, parentContextId(state, rowCat))!.value).toBe('b')
    expect(getThoughtById(state, parentContextId(state, rowCats))!.value).toBe('b')
    expect(pathToContext(state, simplifyPath(state, rowCat))).toEqual(['b', 'cat'])
    expect(pathToContext(state, simplifyPath(state, rowCats))).toEqual(['b', 'Cats'])
  })
})

describe('isSimplePath', () => {
  it('is true for a Path that crosses no context view', () => {
    store.dispatch(importText({ text: `- a\n  - m\n    - x` }))
    const state = store.getState()

    expect(isSimplePath(contextToPath(state, ['a', 'm', 'x'])!)).toBe(true)
  })

  it('is false for a Path that crosses a context view', () => {
    store.dispatch([
      importText({ text: `- a\n  - m\n    - x\n- b\n  - m\n    - y` }),
      setCursor(['a', 'm']),
      toggleContextView(),
    ])
    const state = store.getState()

    expect(isSimplePath(contextToPath(state, ['a', 'm', 'b'])!)).toBe(false)
  })
})
