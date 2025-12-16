import React, { FC, ReactElement, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { gestureString } from '../commands'
import openGestureCheatsheetCommand from '../commands/openGestureCheatsheet'
import useFilteredCommands from '../hooks/useFilteredCommands'
import gestureStore from '../stores/gesture'
import storageModel from '../stores/storageModel'
import CommandItem from './CommandItem'
import FadeTransition from './FadeTransition'
import PopupBase from './PopupBase'

/**********************************************************************
 * Components
 **********************************************************************/

/** Render a gesture menu with gesture autocomplete. */
const GestureMenu: FC = () => {
  // Commands need to be calculated even if the gesture menu is not shown because useFilteredCommands is responsible for updating gestureStore's possibleCommands which is needed to prevent haptics when there are no more possible commands. Otherwise, either haptics would continue to fire when there are no more possible commands, or would falsely fire when the current sequence is not a valid gesture but there are possible commands with additional swipes.
  const [recentCommands] = useState(storageModel.get('recentCommands'))
  const commands = useFilteredCommands('', {
    recentCommands,
    sortActiveCommandsFirst: true,
  })
  const gestureInProgress = gestureStore.useSelector(state => state.gesture)
  const fontSize = useSelector(state => state.fontSize)

  /* Select the last command in the list. */

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        maxWidth: '100%',
      })}
    >
      <div
        className={css({
          marginBottom: 0,
          textAlign: 'left',
          border: '1px solid {colors.gray15}',
          backgroundColor: 'gray09',
          maxWidth: '100%',
          maxHeight: '100%',
          width: 826,
          cursor: 'default',
          display: 'flex',
          flexDirection: 'column',
        })}
        style={{ fontSize }}
      >
        {gestureInProgress && commands.length > 0 ? (
          <>
            <div
              className={css({
                padding: '0.85em 0.66em',
              })}
            >
              {commands.length > 0 ? (
                <>
                  {(() => {
                    const hasMatchingCommand = commands.some(
                      cmd => (gestureInProgress as string) === gestureString(cmd),
                    )

                    return commands.map((command, index) => {
                      // Check if the current gesture sequence ends with help gesture
                      const cheatsheetInProgress = gestureInProgress
                        ?.toString()
                        .endsWith(gestureString(openGestureCheatsheetCommand))
                      const isCheatsheetMatch = command.id === 'openGestureCheatsheet' && cheatsheetInProgress
                      const isCancelMatch = command.id === 'cancel' && !hasMatchingCommand && !cheatsheetInProgress

                      return (
                        <CommandItem
                          gestureInProgress={gestureInProgress as string}
                          key={command.id}
                          selected={isCheatsheetMatch || gestureInProgress === gestureString(command) || isCancelMatch}
                          command={command}
                          isFirstCommand={index === 0}
                          isLastCommand={index === commands.length - 1}
                        />
                      )
                    })
                  })()}
                </>
              ) : (
                <span className={css({ marginLeft: '1em' })}>No matching commands</span>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

/** A GestureMenu component that fades in and out based on state.showGestureMenu. */
const GestureMenuWithTransition: FC = () => {
  const [isDismissed, setDismiss] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  const showGestureMenu = useSelector(state => state.showGestureMenu)

  // if dismissed, set timeout to 0 to remove alert component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <TransitionGroup
      childFactory={(child: ReactElement<{ timeout: number }>) =>
        !isDismissed ? child : React.cloneElement(child, { timeout: 0 })
      }
    >
      {showGestureMenu ? (
        <FadeTransition
          type='fast'
          // for some reason doesn't fade in correctly when default nodeRef is used
          nodeRef={popupRef}
          onEntering={() => setDismiss(false)}
        >
          <PopupBase background={token('colors.bgOverlay50')} ref={popupRef} fullScreen>
            <div
              data-testid='popup-value'
              className={css({
                height: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'start',
                alignItems: 'center',
              })}
            >
              <GestureMenu />
            </div>
          </PopupBase>
        </FadeTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default GestureMenuWithTransition
