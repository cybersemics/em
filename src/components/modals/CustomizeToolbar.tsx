import React, { FC, useEffect, useState } from 'react'
import { DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd'
import { useDispatch, useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import Shortcut from '../../@types/Shortcut'
import State from '../../@types/State'
import alert from '../../action-creators/alert'
import deleteThought from '../../action-creators/deleteThought'
import showModal from '../../action-creators/showModal'
import { isTouch } from '../../browser'
import { AlertText, AlertType, EM_TOKEN, TOOLBAR_DEFAULT_SHORTCUTS } from '../../constants'
import { importText } from '../../reducers'
import contextToPath from '../../selectors/contextToPath'
import findDescendant from '../../selectors/findDescendant'
import { getChildrenRanked } from '../../selectors/getChildren'
import themeColors from '../../selectors/themeColors'
import { shortcutById } from '../../shortcuts'
import store from '../../stores/app'
import fastClick from '../../util/fastClick'
import { ActionButton } from '.././ActionButton'
import ShortcutRow from './../ShortcutRow'
import ShortcutTable from './../ShortcutTable'
import Toolbar from './../Toolbar'
import ModalComponent from './ModalComponent'

/** Handles dropping a toolbar button on a DropTarget. */
const drop = (props: any, monitor: DropTargetMonitor) => {
  const state = store.getState()
  const { shortcut } = monitor.getItem()
  const from = shortcut

  // initialize EM/Settings/Toolbar/Visible with default shortcuts
  const userToolbarThoughtId = findDescendant(state, EM_TOKEN, ['Settings', 'Toolbar'])
  if (!userToolbarThoughtId) {
    store.dispatch(
      importText({
        path: [EM_TOKEN],
        text: `
          - Settings
            - Toolbar
${TOOLBAR_DEFAULT_SHORTCUTS.map(shortcutId => '              - ' + shortcutId).join('\n')}
        `,
        preventSetCursor: true,
      }),
    )
  }
  const userShortcutChildren = getChildrenRanked(store.getState(), userToolbarThoughtId)
  const userShortcutIds = userShortcutChildren.map(subthought => subthought.value)

  // user shortcuts must exist since it was created above
  const userShortcutsPath = contextToPath(store.getState(), [EM_TOKEN, 'Settings', 'Toolbar'])!
  const fromThoughtId = userShortcutChildren[userShortcutIds.indexOf(from.id)].id

  store.dispatch([
    alert(`Removed ${shortcut.label} from toolbar`, { alertType: AlertType.ToolbarButtonRemoved, clearDelay: 5000 }),
    deleteThought({
      thoughtId: fromThoughtId,
      pathParent: userShortcutsPath,
    }),
  ])
}

/** Collects props from the DropTarget. */
const dropCollect = (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  dropTarget: connect.dropTarget(),
  isHovering: monitor.isOver({ shallow: true }),
})

/** A drag-and-drop wrapper component that will remove the toolbar-button from the toolbar when dropped on. */
const DropToRemoveFromToolbar = ((component: FC<{ isHovering?: boolean } & ReturnType<typeof dropCollect>>) =>
  DropTarget('toolbar-button', { drop }, dropCollect)(component))(({ dropTarget, isHovering, children }) => {
  const dispatch = useDispatch()
  const dragShortcut = useSelector((state: State) => state.dragShortcut)
  useEffect(() => {
    if (!dragShortcut) return

    // get the screen-relative y coordinate of the toolbar
    const toolbarTop = document.querySelector('.toolbar')?.getBoundingClientRect().top || 0

    if (isHovering) {
      dispatch(
        alert(`Drop to remove ${shortcutById(dragShortcut).label} from toolbar`, {
          alertType: AlertType.ToolbarButtonRemoveHint,
          showCloseLink: false,
        }),
      )
    }
    // do not show the alert if the toolbar is within 50px of the top of screen, otherwise it blocks the toolbar
    else {
      dispatch(
        alert(toolbarTop > 50 ? AlertText.DragAndDropToolbar : null, {
          alertType: AlertType.DragAndDropToolbarHint,
          showCloseLink: false,
        }),
      )
    }
  }, [dragShortcut, isHovering])
  return dropTarget(<div>{children}</div>)
})

/** Customize Toolbar modal. */
const ModalCustomizeToolbar: FC = () => {
  const [selectedShortcut, setSelectedShortcut] = useState<Shortcut | null>(null)
  /** Toggles a shortcut selected. */
  const toggleSelectedShortcut = (shortcut: Shortcut) =>
    setSelectedShortcut(oldShortcut => (oldShortcut === shortcut ? null : shortcut))

  const dispatch = useDispatch()
  const colors = useSelector(themeColors)

  return (
    <ModalComponent
      id='customizeToolbar'
      // omit title since we need to make room for the toolbar
      title=''
      className='popup'
      actions={({ close }) => (
        <div style={{ textAlign: 'center' }}>
          <ActionButton key='close' title='Close' {...fastClick(() => close())} />
        </div>
      )}
    >
      <h1 className='modal-title'>Customize Toolbar</h1>
      <p style={{ marginTop: '-1em', marginBottom: '1em' }}>
        &lt; <a {...fastClick(() => dispatch(showModal({ id: 'settings' })))}>Back to Settings</a>
      </p>

      <div style={{ position: 'sticky', top: 0, marginBottom: '1em' }}>
        <Toolbar customize onSelect={toggleSelectedShortcut} selected={selectedShortcut?.id} />

        {/* fade-in only */}
        <CSSTransition in={!!selectedShortcut} classNames='fade' timeout={200} exit={false} unmountOnExit>
          <div
            style={{
              backgroundColor: colors.bg,
              // add bottom drop-shadow
              // mask gap between this and the toolbar
              // do not overlap modal close x
              boxShadow: `0 -8px 20px 15px ${colors.bg}`,
            }}
          >
            <div
              style={{
                backgroundColor: colors.gray15,
                marginTop: '0.5em',
                padding: '1em 0 1em 1em',
                position: 'relative',
              }}
            >
              <table className='shortcuts'>
                <tbody>
                  <ShortcutRow shortcut={selectedShortcut} />
                </tbody>
              </table>
            </div>
          </div>
        </CSSTransition>
      </div>

      <CSSTransition in={!selectedShortcut} classNames='fade' timeout={200} exit={false} unmountOnExit>
        <div className='dim' style={{ marginTop: '2em', marginBottom: '2.645em' }}>
          <p>Drag-and-drop to rearrange toolbar.</p>
          <p>{isTouch ? 'Tap' : 'Click'} a command for details.</p>
        </div>
      </CSSTransition>

      <DropToRemoveFromToolbar>
        <ShortcutTable />
      </DropToRemoveFromToolbar>
    </ModalComponent>
  )
}

export default ModalCustomizeToolbar
