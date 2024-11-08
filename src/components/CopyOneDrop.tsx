import DragThoughtItem from '../@types/DragThoughtItem'
import State from '../@types/State'
import { alertActionCreator as alert } from '../actions/alert'
import { AlertType } from '../constants'
import copy from '../device/copy'
import getThoughtById from '../selectors/getThoughtById'
import store from '../stores/app'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import QuickDropIcon from './QuickDropIcon'
import CopyClipboard from './icons/CopyClipboard'

/** Copy the thought on drop. */
const drop = (state: State, { simplePath }: DragThoughtItem) => {
  const value = getThoughtById(state, head(simplePath))?.value
  copy(value)
  store.dispatch([
    alert(`Copied ${ellipsize(value)} to the clipboard`, {
      alertType: AlertType.Clipboard,
      clearDelay: 8000,
      showCloseLink: true,
    }),
  ])
}

/** Show an alert on hover that notifies the user the thought will be copied if dropped on the icon. */
const hoverMessage = (state: State) => {
  const value = state.draggingThought && getThoughtById(state, head(state.draggingThought))?.value
  return `Drop to copy ${ellipsize(value!)}`
}

/** An icon that a thought can be dropped on to copy. */
const CopyOneDrop = () => (
  <QuickDropIcon
    alertType={AlertType.CopyOneDropHint}
    Icon={CopyClipboard}
    onDrop={drop}
    onHoverMessage={hoverMessage}
  />
)

export default CopyOneDrop
