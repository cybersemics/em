// import appendChildPath from '../appendChildPath'
// import initialState, reducerFlow, pathToContext, contextToThoughtId from '../../util/initialState, reducerFlow, pathToContext, contextToThoughtId'
// import Path from '../../@types/Path'
// import SimplePath from '../../@types/SimplePath'
// import toggleContextView, setCursor from '../../reducers/toggleContextView, setCursor'

// @MIGRATION_TODO: Depends on context view and it's implementation will probably change later.
it.skip('get child resolved path', () => {
  // const parentPath: Path = [
  //   { id: contextToThoughtId(['m']), value: 'm', rank: 0 },
  //   { id: contextToThoughtId(['m', 'n']), value: 'n', rank: 0 },
  //   { id: contextToThoughtId(['m', 'n', 'o']), value: 'o', rank: 0 },
  //   { id: contextToThoughtId(['m', 'n', 'o', 'p']), value: 'p', rank: 0 },
  // ]
  // const childSimplePath = [
  //   { value: 'a', rank: 1 },
  //   { value: 'b', rank: 0 },
  //   { value: 'p', rank: 0 },
  //   { value: 'o', rank: 0 },
  //   { value: 'q', rank: 0 },
  // ] as SimplePath
  // const path = appendChildPath(initialState(), childSimplePath, parentPath)
  // expect(pathToContext(path)).toEqual(['m', 'n', 'o', 'p', 'q'])
})

it.skip('get child resolved path when parent has active context view', () => {
  // const parentPath: Path = [
  //   { id: contextToThoughtId(['i']), value: 'i', rank: 0 },
  //   { id: contextToThoughtId(['i', 'j']), value: 'j', rank: 0 },
  //   { id: contextToThoughtId(['i', 'j', 'k']), value: 'k', rank: 0 },
  // ]
  // const childSimplePath = [
  //   { value: 'r', rank: 1 },
  //   { value: 's', rank: 0 },
  //   { value: 't', rank: 0 },
  //   { value: 'k', rank: 0 },
  // ] as SimplePath
  // const steps = [setCursor({ path: parentPath }), toggleContextView]
  // const newState = reducerFlow(steps)(initialState())
  // const path = appendChildPath(newState, childSimplePath, parentPath)
  // expect(pathToContext(path)).toEqual(['i', 'j', 'k', 't'])
})

export {}
