import importText from '../../actions/importText'
import newSubthought from '../../actions/newSubthought'
import newThought from '../../actions/newThought'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import { getChildrenRanked } from '../../selectors/getChildren'
import initialState from '../../util/initialState'
import isAttribute from '../../util/isAttribute'
import reducerFlow from '../../util/reducerFlow'
import getPrevRank from '../getPrevRank'

it('get rank above all children', () => {
  const steps = [newThought('a'), newSubthought('b'), newThought('c')]

  const stateNew = reducerFlow(steps)(initialState())

  const id = contextToThoughtId(stateNew, ['a'])
  const children = getChildrenRanked(stateNew, id!)

  expect(getPrevRank(stateNew, id!)).toBeLessThan(children[0].rank)
})

it('get rank less than visible children but greater than hidden children', () => {
  const text = `
    - a
      - =archive
      - b
      - c
  `
  const stateNew = importText({ text })(initialState())
  const id = contextToThoughtId(stateNew, ['a'])
  const children = getChildrenRanked(stateNew, id!)
  const firstVisibleIndex = children.findIndex(child => !isAttribute(child.value))
  const firstVisible = children[firstVisibleIndex]
  const lastHidden = children[firstVisibleIndex - 1]

  expect(getPrevRank(stateNew, id!)).toBeLessThan(firstVisible.rank)
  expect(getPrevRank(stateNew, id!)).toBeGreaterThan(lastHidden.rank)
})

it('get rank greater than all hidden children', () => {
  const steps = [newThought('a'), newSubthought('=b'), newThought('=c')]

  const stateNew = reducerFlow(steps)(initialState())
  const id = contextToThoughtId(stateNew, ['a'])
  const children = getChildrenRanked(stateNew, id!)

  expect(getPrevRank(stateNew, id!)).toBeGreaterThan(children[children.length - 1].rank)
})

it('get rank less than all children hidden with aboveMeta: true', () => {
  const steps = [newThought('a'), newSubthought('=b'), newThought('=c')]

  const stateNew = reducerFlow(steps)(initialState())
  const id = contextToThoughtId(stateNew, ['a'])
  const children = getChildrenRanked(stateNew, id!)

  expect(getPrevRank(stateNew, id!, { aboveMeta: true })).toBeLessThan(children[0].rank)
})
