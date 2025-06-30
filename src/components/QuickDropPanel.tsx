import { useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
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
const drop = (state: State, { simplePath, path, zone }: DragThoughtItem) => {
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
  const value = state.draggingThought && getThoughtById(state, head(state.draggingThought))?.value
  return zone === DragThoughtZone.Thoughts
    ? `Drop to delete ${ellipsize(value!)}`
    : `Drop to remove ${ellipsize(value!)} from favorites`
}

/** An invisible panel at the right edge of the screen during drag-and-drop that allows for quick delete. */
const QuickDropPanel = () => {
  const isDragging = useSelector(state => state.dragHold || state.dragInProgress)
  const quickDropPanelRef = useRef<HTMLDivElement>(null)

  return (
    <>
      {isDragging && (
        <div
          ref={quickDropPanelRef}
          className={css({ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 'popup' })}
          data-testid='quick-drop-panel'
        >
          <QuickDropIcon
            alertType={AlertType.DeleteDropHint}
            Icon={DeleteIcon}
            onDrop={drop}
            onHoverMessage={hoverMessage}
          />
        </div>
      )}
    </>
  )
}

export default QuickDropPanel
