import DragThoughtItem from '../@types/DragThoughtItem'
import State from '../@types/State'
import { alertActionCreator as alert } from '../actions/alert'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { showModalActionCreator as showModal } from '../actions/showModal'
import { AlertType } from '../constants'
import copy from '../device/copy'
import getThoughtById from '../selectors/getThoughtById'
import store from '../stores/app'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import QuickDropIcon from './QuickDropIcon'
import ShareIcon from './icons/ShareIcon'

/** Export the thought on drop. */
const drop = (state: State, { simplePath }: DragThoughtItem) => {
  const value = getThoughtById(state, head(simplePath))?.value
  copy(value)
  store.dispatch([alert(null), setCursor({ path: simplePath }), showModal({ id: 'export' })])
}

/** Show an alert on hover that notifies the user the thought will be copied if dropped on the icon. */
const hoverMessage = (state: State) => {
  const value = state.draggingThought && getThoughtById(state, head(state.draggingThought))?.value
  return `Drop to export ${ellipsize(value!)}`
}

/** An icon that a thought can be dropped on to export. */
const ExportDrop = () => (
  <QuickDropIcon alertType={AlertType.ExportDropHint} Icon={ShareIcon} onDrop={drop} onHoverMessage={hoverMessage} />
)

export default ExportDrop
