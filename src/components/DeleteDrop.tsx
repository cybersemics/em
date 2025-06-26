import DragThoughtItem from '../@types/DragThoughtItem'
import DragThoughtZone from '../@types/DragThoughtZone'
import State from '../@types/State'
import { alertActionCreator as alert } from '../actions/alert'
import { archiveThoughtActionCreator as archiveThought } from '../actions/archiveThought'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import { AlertType, DELETE_VIBRATE_DURATION } from '../constants'
import getThoughtById from '../selectors/getThoughtById'
import store from '../stores/app'
import ellipsize from '../util/ellipsize'
import haptics from '../util/haptics'
import head from '../util/head'
import QuickDropIcon from './QuickDropIcon'
import DeleteIcon from './icons/DeleteIcon'

/** Delete the thought on drop. */
const drop = (state: State, items: DragThoughtItem[]) => {
  const { simplePath, path, zone } = items[0]

  const value = getThoughtById(state, head(simplePath))?.value
  if (value === undefined) {
    console.warn(`Missing thought for path ${simplePath}. Aborting deleteDrop.`)
    return
  }

  if (zone === DragThoughtZone.Favorites) {
    haptics.light()
    store.dispatch([
      toggleAttribute({ path: simplePath, values: ['=favorite', 'true'] }),
      alert(`Removed ${ellipsize(value)} from favorites`, {
        clearDelay: 8000,
        showCloseLink: true,
      }),
    ])
  } else if (zone === DragThoughtZone.Thoughts) {
    haptics.vibrate(DELETE_VIBRATE_DURATION)
    store.dispatch(archiveThought({ path }))
  } else {
    console.error(`Unsupported DragThoughtZone: ${zone}`)
  }
}

/** Show an alert on hover that notifies the user the thought will be copied if dropped on the icon. */
const hoverMessage = (state: State, zone: DragThoughtZone) => {
  if (!state.draggingThoughts.length) {
    return zone === DragThoughtZone.Thoughts ? 'Drop to delete' : 'Drop to remove from favorites'
  }

  const alertFrom =
    state.draggingThoughts.length === 1
      ? ellipsize(getThoughtById(state, head(state.draggingThoughts[0]))?.value || '')
      : `${state.draggingThoughts.length} thoughts`

  return zone === DragThoughtZone.Thoughts
    ? `Drop to delete ${alertFrom}`
    : `Drop to remove ${alertFrom} from favorites`
}

/** An icon that a thought can be dropped on to delete. */
const DeleteDrop = () => (
  <QuickDropIcon alertType={AlertType.DeleteDropHint} Icon={DeleteIcon} onDrop={drop} onHoverMessage={hoverMessage} />
)

export default DeleteDrop
