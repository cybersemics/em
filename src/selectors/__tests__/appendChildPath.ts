import appendChildPath from '../appendChildPath'
import { initialState, reducerFlow, pathToContext } from '../../util'
import { Path, SimplePath } from '../../types'
import { toggleContextView, setCursor } from '../../reducers'

it('get child resolved path', () => {
  const parentPath: Path = [
    { value: 'm', rank: 0 },
    { value: 'n', rank: 0 },
    { value: 'o', rank: 0 },
    { value: 'p', rank: 0 }
  ]

  const childSimplePath = [
    { value: 'a', rank: 1 },
    { value: 'b', rank: 0 },
    { value: 'p', rank: 0 },
    { value: 'o', rank: 0 },
    { value: 'q', rank: 0 },
  ] as SimplePath

  const path = appendChildPath(initialState(), childSimplePath, parentPath)

  expect(pathToContext(path)).toEqual(['m', 'n', 'o', 'p', 'q'])
})

it('get child resolved path when parent has active context view', () => {

  const parentPath: Path = [
    { value: 'i', rank: 0 },
    { value: 'j', rank: 0 },
    { value: 'k', rank: 0 },
  ]

  const childSimplePath = [
    { value: 'r', rank: 1 },
    { value: 's', rank: 0 },
    { value: 't', rank: 0 },
    { value: 'k', rank: 0 },
  ] as SimplePath

  const steps = [
    setCursor({ path: parentPath }),
    toggleContextView
  ]

  const newState = reducerFlow(steps)(initialState())

  const path = appendChildPath(newState, childSimplePath, parentPath)
  expect(pathToContext(path)).toEqual(['i', 'j', 'k', 't'])
})
