import _ from 'lodash'
import State from '../@types/State'

/** Sets scrollPrioritized. */
const prioritizeScroll = _.curry((state: State, { val }: { val?: boolean }) => ({
  ...state,
  scrollPrioritized: val,
}))

export default prioritizeScroll
