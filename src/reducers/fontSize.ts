import _ from 'lodash'
import State from '../@types/State'

/** Sets the font size. */
const fontSize = (state: State, { value }: { value: number }) => ({
  ...state,
  fontSize: value,
})

export default _.curryRight(fontSize)
