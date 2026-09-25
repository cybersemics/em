import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import disableHelpGenie from '../disableHelpGenie'
import moveHelpGenie from '../moveHelpGenie'
import toggleHelpGenie from '../toggleHelpGenie'

it('lets the genie out and puts it back', () => {
  const out = reducerFlow([toggleHelpGenie({})])(initialState())
  expect(out.helpGenie.visible).toBe(true)

  const back = reducerFlow([toggleHelpGenie({})])(out)
  expect(back.helpGenie.visible).toBe(false)
})

it('sets the genie out or in explicitly', () => {
  const stateNew = reducerFlow([toggleHelpGenie({ value: true }), toggleHelpGenie({ value: true })])(initialState())
  expect(stateNew.helpGenie.visible).toBe(true)
})

it('sends the genie to a point without letting it out', () => {
  const stateNew = reducerFlow([moveHelpGenie({ x: 120, y: 340 })])(initialState())
  expect(stateNew.helpGenie).toEqual({ visible: false, target: { x: 120, y: 340 }, unavailable: false })
})

it('puts away a genie that cannot start and keeps it in', () => {
  const stateNew = reducerFlow([toggleHelpGenie({}), disableHelpGenie, toggleHelpGenie({})])(initialState())
  expect(stateNew.helpGenie).toEqual({ visible: false, target: null, unavailable: true })
})
