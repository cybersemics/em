import { State } from '../@types'
import _ from 'lodash'

/** Sets the useNativeCaretSelection value as true or false to track the correct way of tracking caret position. */
const setNativeCaretSelection = (state: State, { value }: { value: boolean }) => {
  return {
    ...state,
    useNativeCaretSelection: value,
  }
}

export default _.curryRight(setNativeCaretSelection)
