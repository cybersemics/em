import DragThoughtItem from '../@types/DragThoughtItem'
import DragThoughtZone from '../@types/DragThoughtZone'
import State from '../@types/State'
import { alertActionCreator as alert } from '../actions/alert'
import { archiveThoughtActionCreator as archiveThought } from '../actions/archiveThought'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import { AlertType } from '../constants'
import getThoughtById from '../selectors/getThoughtById'
import store from '../stores/app'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import QuickDropIcon from './QuickDropIcon'
import DeleteIcon from './icons/DeleteIcon'

/** Delete the thought on drop. */
const drop = (state: State, { simplePath, path, zone }: DragThoughtItem) => {
  const value = getThoughtById(state, head(simplePath))?.value
  if (value === undefined) {
    console.warn(`Missing thought for path ${simplePath}. Aborting deleteDrop.`)
    return
  }

  if (zone === DragThoughtZone.Favorites) {
    store.dispatch([
      toggleAttribute({ path: simplePath, values: ['=favorite', 'true'] }),
      alert(`Removed ${ellipsize(value)} from favorites`, {
        alertType: AlertType.DeleteThoughtComplete,
        clearDelay: 8000,
        showCloseLink: true,
      }),
    ])
  } else if (zone === DragThoughtZone.Thoughts) {
    store.dispatch(archiveThought({ path }))
  } else {
    console.error(`Unsupported DragThoughtZone: ${zone}`)
  }
}

/** Show an alert on hover that notifies the user the thought will be copied if dropped on the icon. */
const hoverMessage = (state: State, zone: DragThoughtZone) => {
  const value = state.draggingThought && getThoughtById(state, head(state.draggingThought))?.value
  return zone === DragThoughtZone.Thoughts
    ? `Drop to delete ${ellipsize(value!)}`
    : `Drop to remove ${ellipsize(value!)} from favorites`
}

/** An icon that a thought can be dropped on to delete. */
const DeleteDrop = () => (
  <QuickDropIcon alertType={AlertType.DeleteDropHint} Icon={DeleteIcon} onDrop={drop} onHoverMessage={hoverMessage} />
)

export default DeleteDrop
