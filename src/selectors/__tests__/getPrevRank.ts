import { initialState, isFunction, reducerFlow } from '../../util'
import { HOME_PATH } from '../../constants'
import { getAllChildrenSorted } from '../../selectors'
import { importText, newSubthought, newThought } from '../../reducers'
import getPrevRank from '../getPrevRank'

it('get rank above all children', () => {

  const steps = [
    newThought('a'),
    newSubthought('b'),
    newThought('c'),
  ]

  const stateNew = reducerFlow(steps)(initialState())

  const children = getAllChildrenSorted(stateNew, ['a'])

  expect(getPrevRank(stateNew, ['a'])).toBeLessThan(children[0].rank)

})

it('get rank less than visible children but greater than hidden children', () => {

  const text = `
    - a
      - =archive
      - b
      - c
  `
  const stateNew = importText({ path: HOME_PATH, text })(initialState())
  const children = getAllChildrenSorted(stateNew, ['a'])
  const firstVisibleIndex = children.findIndex(child => !isFunction(child.value))
  const firstVisible = children[firstVisibleIndex]
  const lastHidden = children[firstVisibleIndex - 1]

  expect(getPrevRank(stateNew, ['a'])).toBeLessThan(firstVisible.rank)
  expect(getPrevRank(stateNew, ['a'])).toBeGreaterThan(lastHidden.rank)

})

it('get rank greater than all hidden children', () => {

  const steps = [
    newThought('a'),
    newSubthought('=b'),
    newThought('=c'),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const children = getAllChildrenSorted(stateNew, ['a'])

  expect(getPrevRank(stateNew, ['a'])).toBeGreaterThan(children[children.length - 1].rank)

})

it('get rank less than all children hidden with aboveMeta: true', () => {

  const steps = [
    newThought('a'),
    newSubthought('=b'),
    newThought('=c'),
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const children = getAllChildrenSorted(stateNew, ['a'])

  expect(getPrevRank(stateNew, ['a'], { aboveMeta: true })).toBeLessThan(children[0].rank)

})
