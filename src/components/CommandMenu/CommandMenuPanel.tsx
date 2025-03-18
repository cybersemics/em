import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { closeCommandMenuActionCreator } from '../../actions/closeCommandMenu'
import isTutorial from '../../selectors/isTutorial'
import PanelCommandGrid from './PanelCommandGrid'

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
            flexDirection: 'column',
            width: '100%',
            position: 'fixed',
            bottom: '0',
            left: '0',
            right: '0',
            zIndex: 'navbar',
            overflow: 'hidden',
            transition: 'transform 0.5s ease',
            transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          })}
        >
          <PanelCommandGrid />
          <div
            className={css({
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '10px',
            })}
          >
            <button onClick={() => dispatch(closeCommandMenuActionCreator())}>x</button>
          </div>
        </div>
      )}
    </>
  )
}

export default CommandMenuPanel
