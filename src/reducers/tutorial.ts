import _ from 'lodash'
import State from '../@types/State'
import settings from './settings'

/** Sets the Tutorial setting value. */
const tutorial = (state: State, { value }: { value?: boolean }) => ({
  ...settings(state, {
    key: 'Tutorial',
    value: value ? 'On' : 'Off',
  }),
  // disable isLoading when dismissing the tutorial, since we can assume this is a new thoughtspace or the thoughtspace has already been loaded
  isLoading: state.isLoading && value,
})

export default _.curryRight(tutorial)
