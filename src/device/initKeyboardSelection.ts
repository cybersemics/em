import { dismissKeyboardActionCreator as dismissKeyboard } from '../actions/dismissKeyboard'
import { isCapacitor, isIOS } from '../browser'
import store from '../stores/app'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'
import * as selection from './selection'

/** Preserves Android's editor-dismissal behavior independently of keyboard measurement.
 * Collapse the range when closing starts so its native text menu cannot reappear. Back and
 * Down Arrow can hide the keyboard without blurring, so finish exiting edit mode on close.
 * This observer deliberately preserves the existing Android Capacitor behavior only. */
const initKeyboardSelection = () => {
  if (!isCapacitor() || isIOS) return () => {}

  return virtualKeyboardStore.subscribeSelector(
    state => state.phase,
    phase => {
      if (phase === 'closing') selection.collapse()
      else if (phase === 'closed') store.dispatch(dismissKeyboard())
    },
  )
}

export default initKeyboardSelection
