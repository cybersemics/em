import _ from 'lodash'
import { State } from '../@types'

/** Sets the font size. */
const fontSize = (state: State, { value }: { value: number }) => ({
  ...state,
  fontSize: value,
})

export default _.curryRight(fontSize)
