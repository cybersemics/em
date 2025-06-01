import React, { FC, ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import CommandId from '../@types/CommandId'
import Key from '../@types/Key'
import State from '../@types/State'
import { commandPaletteActionCreator as commandPalette } from '../actions/commandPalette'
import { isTouch } from '../browser'
import { gestureString, hashCommand, hashKeyDown } from '../commands'
import commandPaletteCommand from '../commands/commandPalette'
import openGestureCheatsheetCommand from '../commands/openGestureCheatsheet'
import allowScroll from '../device/allowScroll'
import * as selection from '../device/selection'
import useFilteredCommands from '../hooks/useFilteredCommands'
import gestureStore from '../stores/gesture'
import storageModel from '../stores/storageModel'
import { executeCommandWithMulticursor } from '../util/executeCommand'
import CommandItem from './CommandItem'
import FadeTransition from './FadeTransition'
import PopupBase from './PopupBase'

/**********************************************************************
 * Constants
 **********************************************************************/

/** The maximum number of recent commands to store for the command palette. */
const MAX_RECENT_COMMANDS = 5

/**********************************************************************
 * Helper Functions
 **********************************************************************/

/** Returns true if the command can be executed. */
const isExecutable = (state: State, command: Command) =>
  (!command.canExecute || command.canExecute(state)) &&
  (command.allowExecuteFromModal || !state.showModal || !state.showGestureCheatsheet)

/**********************************************************************
 * Components
 **********************************************************************/

/** Search input for the Command Palette. */
const CommandSearch: FC<{
  onExecute?: (e: KeyboardEvent, value: string) => void
  onInput?: (value: string) => void
  onSelectDown?: (e: KeyboardEvent) => void
  onSelectUp?: (e: KeyboardEvent) => void
  onSelectTop?: (e: KeyboardEvent) => void
  onSelectBottom?: (e: KeyboardEvent) => void
}> = ({ onExecute, onInput, onSelectDown, onSelectUp, onSelectTop, onSelectBottom }) => {
  const dispatch = useDispatch()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const marginBlock = useSelector(state => state.fontSize * (2 / 3))
  /** Handle command palette commands. */
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' ||
        // manually check if the commandPalette command is entered since global commands are disabled while the command palette is open
        hashCommand(commandPaletteCommand.keyboard as Key) === hashKeyDown(e)
      ) {
        e.preventDefault()
        e.stopPropagation()
        dispatch(commandPalette())

        // remove keydown listener now since unmount is not triggered until the animation ends
        window.removeEventListener('keydown', onKeyDown)
      } else if (e.key === 'Enter') {
        onExecute?.(e, inputRef.current?.value || '')
      } else if (e.key === 'ArrowDown') {
        if (e.metaKey || e.altKey) {
          onSelectBottom?.(e)
        } else {
          onSelectDown?.(e)
        }
      } else if (e.key === 'ArrowUp') {
        if (e.metaKey || e.altKey) {
          onSelectTop?.(e)
        } else {
          onSelectUp?.(e)
        }
      }
    },
    [dispatch, onExecute, onSelectDown, onSelectUp, onSelectTop, onSelectBottom],
  )

  useEffect(() => {
    const sel = selection.save()
    inputRef.current?.focus()
    return () => {
      selection.restore(sel)
    }
  }, [])

  // save selection and add event listeners on desktop
  // cleanup when command palette is hidden
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onKeyDown])

  return (
    <div>
      <input
        type='text'
        placeholder='Search for a command'
        ref={inputRef}
        onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
          onInput?.(e.target.value)
        }}
        className={css({ padding: 0, border: 'none', background: 'transparent' })}
        style={{ marginBlock, marginInline: marginBlock * 2 }}
      />
    </div>
  )
}

/** Renders a GestureDiagram and its label as a hint during a MultiGesture. */
const CommandRow: FC<{
  gestureInProgress: string
  search: string
  onClick: (e: React.MouseEvent, command: Command) => void
  onHover: (e: MouseEvent, command: Command) => void
  selected?: boolean
  command: Command
}> = ({ gestureInProgress, search, onClick, onHover, selected, command }) => {
  const store = useStore()

  const isActive = command.isActive?.(store.getState())
  const disabled = useSelector(state => !isExecutable(state, command))

  return (
    <CommandItem
      gestureInProgress={gestureInProgress}
      search={search}
      onClick={onClick}
      selected={selected}
      command={command}
      isActive={isActive}
      disabled={disabled}
      onHover={onHover}
      shouldScrollSelectionIntoView
    />
  )
}

/** Render a command palette with keyboard or gesture autocomplete. */
const CommandPalette: FC<{
  commands: Command[]
  recentCommands: CommandId[]
  setRecentCommands: (commandIds: CommandId[]) => void
  search: string
  setSearch: (search: string) => void
}> = ({ commands, recentCommands, setRecentCommands, search, setSearch }) => {
  const store = useStore()
  const dispatch = useDispatch()
  const gestureInProgress = gestureStore.useSelector(state => state.gesture)
  const fontSize = useSelector(state => state.fontSize)
  const unmounted = useRef(false)

  const [selectedCommand, setSelectedCommand] = useState<Command>(commands[0])

  /** Execute a command. */
  const onExecute = useCallback(
    (e: React.MouseEvent<Element, MouseEvent> | KeyboardEvent, command: Command) => {
      e.stopPropagation()
      e.preventDefault()
      if (
        unmounted.current ||
        (command.canExecute && !command.canExecute(store.getState())) ||
        (store.getState().showModal && !command.allowExecuteFromModal)
      )
        return
      const commandsNew = [command.id, ...recentCommands].slice(0, MAX_RECENT_COMMANDS)
      dispatch(commandPalette())
      executeCommandWithMulticursor(command, { event: e, type: 'commandPalette', store })
      storageModel.set('recentCommands', commandsNew)
      setRecentCommands(commandsNew)
    },
    [dispatch, recentCommands, setRecentCommands, store],
  )

  /** Execute the selected command. */
  const onExecuteSelected = useCallback(
    (e: KeyboardEvent) => onExecute(e, selectedCommand),
    [onExecute, selectedCommand],
  )

  /** Select commands on hover. */
  const onHover = useCallback((e: MouseEvent, command: Command) => setSelectedCommand(command), [])

  // Select the first command when the input changes.
  useEffect(() => {
    setSelectedCommand(commands[0])
  }, [search, commands, setSelectedCommand])

  useEffect(() => {
    allowScroll(false)

    return () => {
      allowScroll(true)
      unmounted.current = true
    }
  }, [])

  /** Select the previous command in the list. */
  const onSelectUp = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (selectedCommand !== commands[0]) {
        const i = commands.indexOf(selectedCommand)
        setSelectedCommand(commands[i - 1])
      }
    },
    [commands, selectedCommand],
  )

  /** Select the next command in the list. */
  const onSelectDown = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (selectedCommand !== commands[commands.length - 1]) {
        const i = commands.indexOf(selectedCommand)
        setSelectedCommand(commands[i + 1])
      }
    },
    [commands, selectedCommand],
  )

  /** Select the first command in the list. */
  const onSelectTop = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedCommand(commands[0])
    },
    [commands],
  )

  /* Select the last command in the list. */
  const onSelectBottom = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedCommand(commands[commands.length - 1])
    },
    [commands],
  )

  return (
    <div
      className={css({
        marginBottom: isTouch ? 0 : fontSize,
        textAlign: 'left',
        border: '1px solid {colors.gray15}',
        borderRadius: '12px',
        backgroundColor: 'gray09',
        maxWidth: '100%',
        width: 826,
        maxHeight: isTouch ? undefined : '500px',
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
      })}
      onClick={e => e.stopPropagation()}
    >
      {!isTouch || (gestureInProgress && commands.length > 0) ? (
        <>
          {!isTouch ? (
            <h2
              className={css({
                margin: 0,
                borderBottom: 'solid 1px {colors.gray15}',
              })}
            >
              <CommandSearch
                onExecute={onExecuteSelected}
                onInput={setSearch}
                onSelectUp={onSelectUp}
                onSelectDown={onSelectDown}
                onSelectTop={onSelectTop}
                onSelectBottom={onSelectBottom}
              />
            </h2>
          ) : null}

          <div
            className={css({
              ...(!isTouch ? { maxHeight: 'calc(100vh - 10em)' } : null),
              overflow: 'auto',
            })}
            style={{ padding: fontSize * (2 / 3) }}
          >
            {commands.length > 0 ? (
              <>
                {(() => {
                  const hasMatchingCommand = commands.some(cmd => (gestureInProgress as string) === gestureString(cmd))

                  return commands.map(command => {
                    // Check if the current gesture sequence ends with help gesture
                    const cheatsheetInProgress = gestureInProgress
                      ?.toString()
                      .endsWith(gestureString(openGestureCheatsheetCommand))
                    const isCheatsheetMatch = command.id === 'openGestureCheatsheet' && cheatsheetInProgress
                    const isCancelMatch = command.id === 'cancel' && !hasMatchingCommand && !cheatsheetInProgress

                    return (
                      <CommandRow
                        search={search}
                        gestureInProgress={gestureInProgress as string}
                        key={command.id}
                        onClick={onExecute}
                        onHover={onHover}
                        selected={
                          !isTouch
                            ? command === selectedCommand
                            : isCheatsheetMatch || gestureInProgress === gestureString(command) || isCancelMatch
                        }
                        command={command}
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
  )
}

/** A CommandPalette component that fades in and out based on state.showCommandPalette. */
const CommandPaletteWithTransition: FC = () => {
  const [isDismissed, setDismiss] = useState(false)
  const dispatch = useDispatch()
  const popupRef = useRef<HTMLDivElement>(null)

  /** Dismiss the alert on close. */
  const onClose = useCallback(() => {
    setDismiss(true)
    dispatch(commandPalette())
  }, [dispatch])

  const showCommandPalette = useSelector(state => state.showCommandPalette)

  // Commands need to be calculated even if the command palette is not shown because useFilteredCommands is responsible for updating gestureStore's possibleCommands which is needed to prevent haptics when there are no more possible commands. Otherwise, either haptics would continue to fire when there are no more possible commands, or would falsely fire when the current sequence is not a valid gesture but there are possible commands with additional swipes.
  const [recentCommands, setRecentCommands] = useState(storageModel.get('recentCommands'))
  const [search, setSearch] = useState('')
  const commands = useFilteredCommands(search, {
    recentCommands,
    sortActiveCommandsFirst: true,
  })

  // clear search when command palette is closed
  useEffect(() => {
    if (!showCommandPalette) {
      setSearch('')
    }
  }, [showCommandPalette])

  // if dismissed, set timeout to 0 to remove alert component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <TransitionGroup
      childFactory={(child: ReactElement) => (!isDismissed ? child : React.cloneElement(child, { timeout: 0 }))}
    >
      {showCommandPalette ? (
        <FadeTransition duration='fast' nodeRef={popupRef} onEntering={() => setDismiss(false)}>
          <PopupBase background={token('colors.bgOverlay50')} ref={popupRef} fullScreen>
            <div
              data-testid='popup-value'
              className={css({
                zIndex: 'commandPalette',
                height: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: isTouch ? 'start' : 'center',
                alignItems: 'center',
              })}
              onClick={!isTouch ? onClose : undefined}
            >
              <CommandPalette
                commands={commands}
                recentCommands={recentCommands}
                setRecentCommands={setRecentCommands}
                search={search}
                setSearch={setSearch}
              />
            </div>
          </PopupBase>
        </FadeTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default CommandPaletteWithTransition
