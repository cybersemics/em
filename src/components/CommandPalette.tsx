import React, { FC, ReactElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import CommandId from '../@types/CommandId'
import Key from '../@types/Key'
import { commandPaletteActionCreator as commandPalette } from '../actions/commandPalette'
import { hashCommand, hashKeyDown } from '../commands'
import { executeCommandWithMulticursor } from '../commands'
import commandPaletteCommand from '../commands/commandPalette'
import * as selection from '../device/selection'
import useFilteredCommands from '../hooks/useFilteredCommands'
import storageModel from '../stores/storageModel'
import throttleByAnimationFrame from '../util/throttleByAnimationFrame'
import CommandItem from './CommandItem'
import FadeTransition from './FadeTransition'
import PopupBase from './PopupBase'

/**********************************************************************
 * Constants
 **********************************************************************/

/** The maximum number of recent commands to store for the command palette. */
const MAX_RECENT_COMMANDS = 5

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
    const throttledOnKeyDown = throttleByAnimationFrame(onKeyDown)
    window.addEventListener('keydown', throttledOnKeyDown)
    return () => {
      window.removeEventListener('keydown', throttledOnKeyDown)
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
        className={css({
          lineHeight: '1.5',
          border: 'none',
          background: 'transparent',
          padding: '1em',
          margin: 0,
          width: '100%',
        })}
      />
    </div>
  )
}

/** Render a command palette with keyboard. */
const CommandPalette: FC<{
  commands: Command[]
  recentCommands: CommandId[]
  setRecentCommands: (commandIds: CommandId[]) => void
  search: string
  setSearch: (search: string) => void
}> = ({ commands, recentCommands, setRecentCommands, search, setSearch }) => {
  const store = useStore()
  const dispatch = useDispatch()
  const fontSize = useSelector(state => state.fontSize)
  const unmounted = useRef(false)

  const [selectedCommand, setSelectedCommand] = useState<{
    command: Command
    source: 'mouse' | 'keyboard' | 'search'
  }>({ command: commands[0], source: 'search' })

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
    (e: KeyboardEvent) => onExecute(e, selectedCommand.command),
    [onExecute, selectedCommand.command],
  )

  /** Select commands on hover. */
  const onHover = useCallback((command: Command) => setSelectedCommand({ command, source: 'mouse' }), [])
  // Select the first command when the input changes. useLayoutEffect is used to prevent a jarring flash from the auto scroll
  useLayoutEffect(() => {
    setSelectedCommand({ command: commands[0], source: 'search' })
  }, [search, commands, setSelectedCommand])

  useEffect(() => {
    return () => {
      unmounted.current = true
    }
  }, [])

  /** Select the previous command in the list. */
  const onSelectUp = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (selectedCommand.command !== commands[0]) {
        const i = commands.indexOf(selectedCommand.command)
        setSelectedCommand({ command: commands[i - 1], source: 'keyboard' })
      }
    },
    [commands, selectedCommand.command],
  )

  /** Select the next command in the list. */
  const onSelectDown = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (selectedCommand.command !== commands[commands.length - 1]) {
        const i = commands.indexOf(selectedCommand.command)
        setSelectedCommand({ command: commands[i + 1], source: 'keyboard' })
      }
    },
    [commands, selectedCommand.command],
  )

  /** Select the first command in the list. */
  const onSelectTop = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedCommand({ command: commands[0], source: 'keyboard' })
    },
    [commands],
  )

  /* Select the last command in the list. */
  const onSelectBottom = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedCommand({ command: commands[commands.length - 1], source: 'keyboard' })
    },
    [commands],
  )

  return (
    <div
      data-testid='command-palette'
      className={css({
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        maxWidth: '100%',
        height: '500px',
      })}
    >
      <div
        className={css({
          textAlign: 'left',
          border: '1px solid {colors.gray15}',
          borderRadius: '12px',
          backgroundColor: 'gray09',
          maxWidth: '100%',
          maxHeight: '100%',
          width: 826,
          cursor: 'default',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '1em',
        })}
        /**
         * Clicking anywhere outside this element will close the command palette.
         * `e.stopPropagation()` prevents the command palette from closing when clicked.
         * See `onClick` on parent.
         * */
        onClick={e => e.stopPropagation()}
        style={{ fontSize }}
      >
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

        <div
          className={css({
            overflow: 'auto',
            padding: '0.85em 0.66em',
          })}
        >
          {commands.length > 0 ? (
            commands.map((command, index) => (
              <CommandItem
                search={search}
                key={command.id}
                onClick={onExecute}
                onHover={onHover}
                selected={command === selectedCommand.command}
                command={command}
                shouldScrollSelectedIntoView={selectedCommand.source === 'keyboard'}
                isFirstCommand={index === 0}
                isLastCommand={index === commands.length - 1}
              />
            ))
          ) : (
            <span className={css({ marginLeft: '1em' })}>No matching commands</span>
          )}
        </div>
      </div>
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
      childFactory={(child: ReactElement<{ timeout: number }>) =>
        !isDismissed ? child : React.cloneElement(child, { timeout: 0 })
      }
    >
      {showCommandPalette ? (
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
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2em',
              })}
              onClick={onClose}
            >
              <CommandPalette
                search={search}
                setSearch={setSearch}
                commands={commands}
                recentCommands={recentCommands}
                setRecentCommands={setRecentCommands}
              />
            </div>
          </PopupBase>
        </FadeTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default CommandPaletteWithTransition
