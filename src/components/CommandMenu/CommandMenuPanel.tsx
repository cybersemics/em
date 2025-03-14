import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { closeCommandMenuActionCreator } from '../../actions/closeCommandMenu'

interface CommandMenuPanelProps {
  onClose: () => void
}

/**
 * A panel that displays the command menu.
 */
const CommandMenuPanel: React.FC<CommandMenuPanelProps> = () => {
  const dispatch = useDispatch()
  const isOpen = useSelector(state => state.commandMenuOpen)

  return (
    <>
      {isOpen && (
        <div
          aria-label='command-menu-panel'
          className={css({
            backgroundColor: '{colors.fg}',
            display: 'flex',
            height: '100%',
            width: '100%',
            position: 'sticky',
            bottom: '0',
            zIndex: 'navbar - 1',
          })}
        >
          <button onClick={() => dispatch(closeCommandMenuActionCreator())}>x</button>
        </div>
      )}
    </>
  )
}

export default CommandMenuPanel
