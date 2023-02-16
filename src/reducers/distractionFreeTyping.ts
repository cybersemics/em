import _ from 'lodash'
import State from '../@types/State'

/** Hides the toolbar and nav bar to allow for distraction-free typing on desktop. */
const distractionFreeTyping = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  distractionFreeTyping: value,
})

export default _.curryRight(distractionFreeTyping)
