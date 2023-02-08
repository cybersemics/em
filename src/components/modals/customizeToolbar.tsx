import React, { FC, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import Shortcut from '../../@types/Shortcut'
import showModal from '../../action-creators/showModal'
import { isTouch } from '../../browser'
import themeColors from '../../selectors/themeColors'
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
          <ActionButton key='close' title='Close' onClick={() => close()} />
        </div>
      )}
    >
      <Toolbar customize onSelect={toggleSelectedShortcut} selected={selectedShortcut?.id} />
      <div style={{ marginTop: '2.7em' }}>
        <div style={{ overflow: 'scroll', height: 'calc(100vh - 8em)' }}>
          <p style={{ marginTop: '1em' }}>
            &lt; <a onClick={() => dispatch(showModal({ id: 'settings' }))}>Back to Settings</a>
          </p>
          <h1 className='modal-title'>Customize Toolbar</h1>

          <div style={{ position: selectedShortcut ? 'sticky' : undefined, top: 0, marginBottom: '1em' }}>
            {/* fade-in only */}
            <TransitionGroup>
              {selectedShortcut ? (
                <CSSTransition key='selected' classNames='fade' timeout={200} exit={false}>
                  <div
                    style={{
                      backgroundColor: colors.bg,
                      paddingBottom: '1em',
                      boxShadow: `10px -20px 15px 25px ${colors.bg}`,
                    }}
                  >
                    <div style={{ backgroundColor: colors.gray15, padding: '1em 0 1em 1em' }}>
                      <table className='shortcuts'>
                        <tbody>
                          <ShortcutRow shortcut={selectedShortcut} />
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CSSTransition>
              ) : (
                <CSSTransition key='unselected' classNames='fade' timeout={200} exit={false}>
                  <div className='dim' style={{ marginBottom: '2.645em' }}>
                    <p>Drag-and-drop buttons to and from the toolbar.</p>
                    <p>Drag-and-drop to reorder.</p>
                    <p>{isTouch ? 'Tap' : 'Click'} a toolbar button for more information.</p>
                  </div>
                </CSSTransition>
              )}
            </TransitionGroup>
          </div>

          <ShortcutTable />
        </div>
      </div>
    </ModalComponent>
  )
}

export default ModalCustomizeToolbar
