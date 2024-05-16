import deleteEmptyThought from '../../actions/deleteEmptyThought'
import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import getLexeme from '../../selectors/getLexeme'
import getThoughtById from '../../selectors/getThoughtById'
import deleteThoughtAtFirstMatch from '../../test-helpers/deleteThoughtAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import getAllChildrenByContext from '../../test-helpers/getAllChildrenByContext'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

it('delete', () => {
  const state = reducerFlow([newThought('a'), newThought('b')])(initialState())
  const rootChildrenBefore = getAllChildrenByContext(state, [HOME_TOKEN])
  const [thoughtA] = childIdsToThoughts(state, rootChildrenBefore)

  const stateNew = deleteThoughtAtFirstMatch(['b'])(state)

  const rootChildrenAfter = getAllChildrenByContext(stateNew, [HOME_TOKEN])
  expect(rootChildrenAfter).toEqual([thoughtA.id])

  // lexemeIndex
  expect(getLexeme(stateNew, 'b')).toBeUndefined()
})

it('delete descendants', () => {
  const steps = [newThought('a'), newSubthought('b'), newSubthought('c'), deleteThoughtAtFirstMatch(['a'])]

  const stateNew = reducerFlow(steps)(initialState())

  // thoughtIndex
  expect(getThoughtById(stateNew, HOME_TOKEN)).toBeTruthy()
  expect(getThoughtById(stateNew, contextToThoughtId(stateNew, ['a'])!)).toBeUndefined()
  expect(getThoughtById(stateNew, contextToThoughtId(stateNew, ['a', 'b'])!)).toBeUndefined()
  expect(getThoughtById(stateNew, contextToThoughtId(stateNew, ['a', 'b', 'c'])!)).toBeUndefined()

  expect(stateNew.thoughts.thoughtIndex[HOME_TOKEN].childrenMap).toBeEmpty()

  // lexemeIndex
  expect(getLexeme(stateNew, 'a')).toBeUndefined()
  expect(getLexeme(stateNew, 'b')).toBeUndefined()
  expect(getLexeme(stateNew, 'c')).toBeUndefined()
})

it('delete thought with duplicate child', () => {
  const steps = [newThought('a'), newSubthought('a'), deleteThoughtAtFirstMatch(['a'])]

  const stateNew = reducerFlow(steps)(initialState())

  // thoughtIndex
  expect(getThoughtById(stateNew, HOME_TOKEN)).toBeTruthy()
  expect(getThoughtById(stateNew, contextToThoughtId(stateNew, ['a'])!)).toBeUndefined()

  expect(stateNew.thoughts.thoughtIndex[HOME_TOKEN].childrenMap).toBeEmpty()

  // lexemeIndex
  expect(getLexeme(stateNew, 'a')).toBeUndefined()
})

it('update cursor after thought deletion', () => {
  const steps = [newThought('a'), newSubthought('b')]

  const state = initialState()
  const stateNew = reducerFlow(steps)(state)

  expectPathToEqual(stateNew, stateNew.cursor, [
    {
      value: 'a',
    },
    {
      value: 'b',
    },
  ])

  const stateAfterDeletion = reducerFlow([deleteThoughtAtFirstMatch(['a', 'b'])])(stateNew)

  expectPathToEqual(stateAfterDeletion, stateAfterDeletion.cursor!, [
    {
      value: 'a',
    },
  ])
})

it('delete the intended empty thought when there are multiple', () => {
  const steps = [newThought(''), newThought('')]

  const state = initialState()
  const stateNew = reducerFlow(steps)(state)
  const rootChildren = getAllChildrenByContext(stateNew, [HOME_TOKEN])
  const thoughtIdToBeDeleted = rootChildren[rootChildren.length - 1]

  const thoughtToBeDeleted = getThoughtById(stateNew, thoughtIdToBeDeleted)

  expect(thoughtToBeDeleted).toBeDefined()

  const stateAfterDeletion = reducerFlow([deleteEmptyThought])(stateNew)

  const thoughtAfterDeletion = getThoughtById(stateAfterDeletion, thoughtIdToBeDeleted)

  expect(thoughtAfterDeletion).toBeUndefined()
})
