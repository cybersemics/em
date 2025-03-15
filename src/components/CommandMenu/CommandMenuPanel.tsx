import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { closeCommandMenuActionCreator } from '../../actions/closeCommandMenu'
import isTutorial from '../../selectors/isTutorial'

interface CommandMenuPanelProps {
  onClose: () => void
}

/**
 * A panel that displays the command menu.
 */
const CommandMenuPanel: React.FC<CommandMenuPanelProps> = () => {
  const dispatch = useDispatch()
  const isOpen = useSelector(state => state.commandMenuOpen)
  const isTutorialOn = useSelector(isTutorial)

  return (
    <>
      {!isTutorialOn && (
        <div
          aria-label='command-menu-panel'
          className={css({
            backgroundColor: '{colors.darkgray}',
            display: 'flex',
            width: '100%',
            position: 'sticky',
            bottom: '0',
            zIndex: 'navbar',
            overflow: 'hidden',
            transition: 'transform 0.5s ease',
            transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          })}
        >
          <button onClick={() => dispatch(closeCommandMenuActionCreator())}>x</button>
        </div>
      )}
    </>
  )
}

export default CommandMenuPanel
