import getChildResolvedPath from '../getChildResolvedPath'
import { initialState, rankThoughtsSequential, reducerFlow, pathToContext } from '../../util'
import { Path, SimplePath } from '../../types'
import { toggleContextView, setCursor } from '../../reducers'

it('get child thoughtsResolved', async () => {

  const parentThoughtsResolved = rankThoughtsSequential(['m', 'n', 'o', 'p']) as Path
  const childSimplePath = rankThoughtsSequential(['a', 'b', 'p', 'o', 'q']) as SimplePath

  const thoughtsResolved = getChildResolvedPath(initialState(), parentThoughtsResolved, childSimplePath)

  expect(pathToContext(thoughtsResolved)).toEqual(['m', 'n', 'o', 'p', 'q'])
})

it('get child thoughtsResolved when parent has active context view', async () => {

  const parentThoughtsResolved = rankThoughtsSequential(['i', 'j', 'k']) as Path
  const childSimplePath = rankThoughtsSequential(['r', 's', 't', 'k']) as SimplePath

  const steps = [
    setCursor({ path: parentThoughtsResolved }),
    toggleContextView
  ]

  const newState = reducerFlow(steps)(initialState())

  const thoughtsResolved = getChildResolvedPath(newState, parentThoughtsResolved, childSimplePath)
  expect(pathToContext(thoughtsResolved)).toEqual(['i', 'j', 'k', 't'])
})
