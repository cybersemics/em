import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DropTargetMonitor, useDrop } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import { useDispatch, useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import { css } from '../../../styled-system/css'
import { anchorButton, extendTap, modal } from '../../../styled-system/recipes'
import DragAndDropType from '../../@types/DragAndDropType'
import DragShortcutZone from '../../@types/DragShortcutZone'
import DragToolbarItem from '../../@types/DragToolbarItem'
import Shortcut from '../../@types/Shortcut'
import { alertActionCreator as alert } from '../../actions/alert'
import { closeModalActionCreator as closeModal } from '../../actions/closeModal'
import { dragShortcutZoneActionCreator as dragShortcutZone } from '../../actions/dragShortcutZone'
import { initUserToolbarActionCreator as initUserToolbar } from '../../actions/initUserToolbar'
import { removeToolbarButtonActionCreator as removeToolbarButton } from '../../actions/removeToolbarButton'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { isTouch } from '../../browser'
import { AlertText, AlertType } from '../../constants'
import themeColors from '../../selectors/themeColors'
import { shortcutById } from '../../shortcuts'
import fastClick from '../../util/fastClick'
import ShortcutTableOnly from '../ShortcutTableOnly'
import ShortcutTable from './../ShortcutTable'
import Toolbar from './../Toolbar'
import ModalComponent from './ModalComponent'

/** Collects props from the DropTarget. */
const dropCollect = (monitor: DropTargetMonitor) => {
  const { zone } = (monitor.getItem() || {}) as Partial<DragToolbarItem>
  return {
    isHovering: monitor.isOver({ shallow: true }),
    sourceZone: zone,
  }
}

/** A drag-and-drop wrapper component that will remove the toolbar-button from the toolbar when dropped on. */
const DropToRemoveFromToolbar = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch()
  const [{ isHovering, sourceZone }, dropTarget] = useDrop({
    accept: [DragAndDropType.ToolbarButton, NativeTypes.FILE],
    drop: (item: DragToolbarItem) => {
      dispatch(removeToolbarButton(item.shortcut.id))
    },
    collect: dropCollect,
  })
  const dragShortcut = useSelector(state => state.dragShortcut)

  useEffect(() => {
    // clear toolbar drag-and-drop alert when dragShortcut disappears
    if (!dragShortcut) {
      dispatch((dispatch, getState) => {
        const state = getState()
        const alertType = state.alert?.alertType
        if (
          alertType === AlertType.ToolbarButtonRemoveHint ||
          alertType === AlertType.DragAndDropToolbarAdd ||
          alertType === AlertType.DragAndDropToolbarHint
        ) {
          dispatch(alert(null))
        }
      })
      return
    }

    dispatch(dragShortcutZone(isHovering ? DragShortcutZone.Remove : DragShortcutZone.Toolbar))

    // get the screen-relative y coordinate of the toolbar
    // do not show the alert if the toolbar is within 50px of the top of screen, otherwise it blocks the toolbar
    const toolbarTop = document.querySelector('.toolbar')?.getBoundingClientRect().top || 0

    if (toolbarTop < 50) {
      dispatch(alert(null))
    } else if (sourceZone === DragShortcutZone.Remove) {
      dispatch(
        alert(AlertText.DragAndDropToolbarAdd, {
          alertType: AlertType.ToolbarButtonRemoveHint,
          showCloseLink: false,
        }),
      )
    } else if (sourceZone === DragShortcutZone.Toolbar) {
      if (isHovering) {
        dispatch([
          alert(`Drop to remove ${shortcutById(dragShortcut).label} from toolbar`, {
            alertType: AlertType.ToolbarButtonRemoveHint,
            showCloseLink: false,
          }),
        ])
      }
    }
  }, [dispatch, dragShortcut, isHovering, sourceZone])

  return (
    <div data-drop-to-remove-from-toolbar-hovering={isHovering ? '' : undefined} ref={dropTarget}>
      {children}
    </div>
  )
}

/** Customize Toolbar modal. */
const ModalCustomizeToolbar: FC = () => {
  const [selectedShortcut, setSelectedShortcut] = useState<Shortcut | null>(null)
  /** Toggles a shortcut selected. */
  const toggleSelectedShortcut = useCallback(
    (shortcut: Shortcut) => setSelectedShortcut(oldShortcut => (oldShortcut === shortcut ? null : shortcut)),
    [],
  )

  const dispatch = useDispatch()
  const colors = useSelector(themeColors)
  const shortcutsContainerRef = useRef<HTMLDivElement>(null)
  const shortcuts = useMemo(() => [selectedShortcut], [selectedShortcut])

  const id = 'customizeToolbar'
  const modalClasses = modal({ id })

  return (
    <ModalComponent
      id={id}
      // omit title since we need to make room for the toolbar
      title=''
    >
      <h1 className={modalClasses.title}>Customize Toolbar</h1>
      <p style={{ marginTop: '-1em', marginBottom: '1em' }}>
        &lt;{' '}
        <a {...fastClick(() => dispatch(showModal({ id: 'settings' })))} className={extendTap()}>
          Back to Settings
        </a>
      </p>

      <div
        className={css({
          // mask the selected bar that is rendered outside thn left edge of the ShortcutRow
          backgroundColor: selectedShortcut ? 'bg' : undefined,
          position: 'sticky',
          top: '0px',
          marginBottom: '1em',
          // extend element to mask the selected bar that is rendered outside thn left edge of the ShortcutRow
          marginLeft: '-modalPadding',
          paddingLeft: 'modalPadding',
          // above ShortcutRow, which has position: relative for the selected bar
          zIndex: 1,
        })}
      >
        <Toolbar customize onSelect={toggleSelectedShortcut} selected={selectedShortcut?.id} />

        {/* selected toolbar button details */}
        <CSSTransition
          nodeRef={shortcutsContainerRef}
          in={!!selectedShortcut}
          classNames='fade'
          timeout={200}
          exit={false}
          unmountOnExit
        >
          <div
            ref={shortcutsContainerRef}
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
              <ShortcutTableOnly shortcuts={shortcuts} />
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
        <ShortcutTable customize selectedShortcut={selectedShortcut ?? undefined} onSelect={setSelectedShortcut} />
      </DropToRemoveFromToolbar>

      <p style={{ marginTop: '2em', marginBottom: '2em' }}>
        &lt;{' '}
        <a {...fastClick(() => dispatch(showModal({ id: 'settings' })))} className={extendTap()}>
          Back to Settings
        </a>
      </p>

      <div className='center'>
        <a
          {...fastClick(() => dispatch(closeModal()))}
          className={anchorButton({
            actionButton: true,
          })}
          style={{
            color: colors.bg,
            marginBottom: '1em',
            marginTop: '2em',
          }}
        >
          Close
        </a>

        <div className='text-small' style={{ marginTop: '4em' }}>
          <p style={{ color: colors.gray, marginTop: '0.5em' }}>
            Reset the toolbar to its factory settings. Your current toolbar customization will be permanently deleted.
          </p>
          <a
            {...fastClick(() => {
              if (window.confirm('Reset toolbar to factory settings?')) {
                dispatch([initUserToolbar({ force: true }), alert('Toolbar reset', { clearDelay: 8000 })])
              }
            })}
            className={extendTap()}
            style={{
              color: colors.red,
            }}
          >
            Reset toolbar
          </a>
        </div>
      </div>
    </ModalComponent>
  )
}

export default ModalCustomizeToolbar
