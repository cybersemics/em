import React, { FC, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import Shortcut from '../../@types/Shortcut'
import showModal from '../../action-creators/showModal'
import { isTouch } from '../../browser'
import themeColors from '../../selectors/themeColors'
import fastClick from '../../util/fastClick'
import { ActionButton } from '.././ActionButton'
import ShortcutRow from './../ShortcutRow'
import ShortcutTable from './../ShortcutTable'
import Toolbar from './../Toolbar'
import ModalComponent from './ModalComponent'

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

      <ShortcutTable />
    </ModalComponent>
  )
}

export default ModalCustomizeToolbar
