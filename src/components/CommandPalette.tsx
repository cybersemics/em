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
import { isMac } from '../browser'
import { arrowTextToArrowCharacter } from '../commands'
import { commandById, gestureString, hashCommand, hashKeyDown } from '../commands'
import allowScroll from '../device/disableScroll'
import * as selection from '../device/selection'
import useFilteredCommands from '../hooks/useFilteredCommands'
import gestureStore from '../stores/gesture'
import storageModel from '../stores/storageModel'
import { executeCommandWithMulticursor } from '../util/executeCommand'
import FadeTransition from './FadeTransition'
import GestureDiagram from './GestureDiagram'
import HighlightedText from './HighlightedText'
import Popup from './Popup'
import AltOrOptionIcon from './icons/AltOrOptionIcon'
import BackspaceIcon from './icons/BackspaceIcon'
// Icons
import CmdIcon from './icons/CmdIcon'
import CtrlIcon from './icons/CtrlIcon'
import PlusIcon from './icons/PlusIcon'
import ShiftIcon from './icons/ShiftIcon'

/**********************************************************************
 * Constants
 **********************************************************************/

/** The maximum number of recent commands to store for the command palette. */
const MAX_RECENT_COMMANDS = 5

const commandPaletteCommand = commandById('commandPalette')

/**********************************************************************
 * Helper Functions
 **********************************************************************/

/** Returns true if the command can be executed. */
const isExecutable = (state: State, command: Command) =>
  (!command.canExecute || command.canExecute(state)) && (command.allowExecuteFromModal || !state.showModal)

const formatKeyboardShortcutIcons = (inputKeyboardOrString: Key | string): JSX.Element => {
  const keyboard =
    typeof inputKeyboardOrString === 'string' ? { key: inputKeyboardOrString as string } : inputKeyboardOrString

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '0.3em',
      })}
    >
      {keyboard.meta && (isMac ? <CmdIcon /> : <CtrlIcon />)}
      {keyboard.meta && <PlusIcon />}
      {keyboard.alt && <AltOrOptionIcon />}
      {keyboard.alt && <PlusIcon />}
      {keyboard.control && <CtrlIcon />}
      {keyboard.control && <PlusIcon />}
      {keyboard.shift && <ShiftIcon />}
      {keyboard.shift && <PlusIcon />}
      {keyboard.key == 'Backspace' ? (
        <BackspaceIcon />
      ) : (
        arrowTextToArrowCharacter(
          keyboard.shift && keyboard.key.length === 1 ? keyboard.key.toUpperCase() : keyboard.key,
        )
      )}
    </div>
  )
}

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
        hashKeyDown(e) === hashCommand(commandPaletteCommand)
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
        className={css({ margin: '12px 24px', padding: 0, border: 'none', background: 'transparent' })}
      />
    </div>
  )
}

/** Renders a GestureDiagram and its label as a hint during a MultiGesture. */
const CommandRow: FC<{
  gestureInProgress: string
  search: string
  last?: boolean
  onClick: (e: React.MouseEvent, command: Command) => void
  onHover: (e: MouseEvent, command: Command) => void
  selected?: boolean
  command: Command
  style?: React.CSSProperties
}> = ({ gestureInProgress, search, last, onClick, onHover, selected, command, style }) => {
  const store = useStore()
  const ref = React.useRef<HTMLDivElement>(null)

  const isActive = command.isActive?.(store.getState())
  const label = command.labelInverse && isActive ? command.labelInverse! : command.label
  const disabled = useSelector(state => !isExecutable(state, command))
  const Icon = command.svg

  // convert the description to a string
  const description = useSelector(state => {
    const descriptionStringOrFunction = (isActive && command.descriptionInverse) || command.description
    return descriptionStringOrFunction instanceof Function
      ? descriptionStringOrFunction(state)
      : descriptionStringOrFunction
  })

  useEffect(() => {
    if (selected) {
      ref.current?.scrollIntoView({ block: 'nearest' })
    }
  })

  useEffect(() => {
    /** Hover handler. */
    const onHoverCommand = (e: MouseEvent) => onHover(e, command)

    // mouseover and mouseenter cause the command under the cursor to get selected on render, so we use mousemove to ensure that it only gets selected on an actual hover
    ref.current?.addEventListener('mousemove', onHoverCommand)

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ref.current?.removeEventListener('mousemove', onHoverCommand)
    }
  }, [onHover, command])

  return (
    <div
      className={css({
        cursor: !disabled ? 'pointer' : undefined,
        // paddingBottom: last ? (isTouch ? 0 : '4em') : 0,
        // paddingLeft: selected ? 'calc(1em - 10px)' : '1em',
        position: 'relative',
        textAlign: 'left',
      })}
      ref={ref}
      onClick={e => {
        if (!disabled) {
          onClick(e, command)
        }
      }}
      style={style}
    >
      <div
        className={css({
          backgroundColor: selected ? 'commandSelected' : undefined,
          // padding: selected ? '10px 0.3em 10px 0.5em' : undefined,
          borderRadius: '8px', // constant curve
          padding: '10px',
          ...(!isTouch
            ? {
                display: 'flex',
                // margin: selected ? '-5px 0' : undefined,
                flexDirection: 'row',
                justifyContent: 'flex-start',
                alignItems: 'center',
                gap: '0.5em',
              }
            : null),
        })}
      >
        {/* div used to contain width:100% and height:100% of icons while in a flex box */}
        <div>
          {/* gesture diagram */}
          {isTouch ? (
            <GestureDiagram
              color={disabled ? token('colors.gray') : undefined}
              highlight={
                !disabled
                  ? command.id === 'help'
                    ? // For help command, find the longest matching end portion
                      (() => {
                        const helpGesture = gestureString(command)
                        return (
                          [...helpGesture]
                            .map((_, i) => helpGesture.length - i)
                            .find(len => gestureInProgress.endsWith(helpGesture.slice(0, len))) ?? 0
                        )
                      })()
                    : // For other commands, use normal highlighting
                      command.id === 'cancel'
                      ? selected
                        ? 1
                        : undefined
                      : gestureInProgress.length
                  : undefined
              }
              path={command.id === 'cancel' ? null : gestureString(command)}
              strokeWidth={4}
              cssRaw={css.raw({
                position: 'absolute',
                marginLeft: selected ? 5 : 15,
                left: command.id == 'cancel' ? '-2.3em' : selected ? '-1.75em' : '-2.2em',
                top: selected ? '-0.2em' : '-0.75em',
              })}
              width={45}
              height={45}
              rounded={command.rounded}
            />
          ) : (
            Icon && <Icon fill='white' />
          )}
        </div>

        {/* label + description vertical styling*/}
        <div
          className={css({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '0.2em',
            marginRight: '3em',
            flexWrap: 'wrap',
          })}
        >
          {/* label */}
          <div
            className={css({
              minWidth: '4em',
              whiteSpace: 'nowrap',
              color: disabled
                ? 'gray'
                : isTouch
                  ? selected
                    ? '#64C7EA'
                    : gestureInProgress === command.gesture
                      ? 'vividHighlight'
                      : 'fg'
                  : 'fg',
              fontWeight: selected ? 'bold' : undefined,
            })}
          >
            <HighlightedText value={label} match={search} disabled={disabled} />
          </div>

          <div className={css({ maxHeight: !isTouch ? '1em' : undefined, flexGrow: 1, zIndex: 1 })}>
            <div
              className={css({
                display: 'flex',
              })}
            >
              {/* description */}
              <div
                className={css({
                  fontSize: '80%',
                  ...(!isTouch
                    ? {
                        flexGrow: 1,
                      }
                    : null),
                })}
              >
                {description}
              </div>
            </div>
          </div>
        </div>

        {/* keyboard shortcut */}
        {!isTouch && (
          <div
            className={css({
              fontSize: '80%',
              position: 'relative',
              ...(!isTouch
                ? {
                    display: 'inline',
                  }
                : null),
              marginLeft: 'auto',
            })}
          >
            <span className={css({ marginLeft: 20, whiteSpace: 'nowrap' })}>
              {command.keyboard && formatKeyboardShortcutIcons(command.keyboard)}
            </span>
          </div>
        )}
      </div>
    </div>
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
    <>
      <div
        className={css({
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'bgOverlay50',
          cursor: 'pointer',
        })}
      />
      <div
        className={css({
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'absolute',
          height: '100%',
          width: '100%',
        })}
      >
        <div
          className={css({
            marginBottom: isTouch ? 0 : fontSize,
            textAlign: 'left',
            border: '1px solid {colors.cpBorder}',
            borderRadius: '12px',
            backgroundColor: 'cpBackground',
            maxHeight: '100%',
            maxWidth: '826px',
          })}
        >
          {!isTouch || (gestureInProgress && commands.length > 0) ? (
            <div>
              <h2
                className={css({
                  margin: 0,
                  borderBottom: 'solid 1px {colors.cpBorder}',
                })}
                // style={{ marginLeft: -fontSize * 1.8 }}
              >
                {!isTouch ? (
                  <CommandSearch
                    onExecute={onExecuteSelected}
                    onInput={setSearch}
                    onSelectUp={onSelectUp}
                    onSelectDown={onSelectDown}
                    onSelectTop={onSelectTop}
                    onSelectBottom={onSelectBottom}
                  />
                ) : (
                  'Gestures'
                )}
              </h2>

              <div
                className={css({
                  ...(!isTouch ? { maxHeight: 'calc(100vh - 19em)' } : null),
                  overflow: 'auto',
                  // TODO: move padding here
                  padding: '12px',
                })}
              >
                {commands.length > 0 ? (
                  <>
                    {(() => {
                      const hasMatchingCommand = commands.some(cmd => gestureInProgress === cmd.gesture)
                      const helpCommand = commandById('help')

                      return commands.map(command => {
                        // Check if the current gesture sequence ends with help gesture
                        const isHelpMatch =
                          command.id === 'help' &&
                          (gestureInProgress as string)?.toString().endsWith(gestureString(helpCommand))
                        const isCancelMatch =
                          command.id === 'cancel' &&
                          !hasMatchingCommand &&
                          !(gestureInProgress as string)?.toString().endsWith(gestureString(helpCommand))

                        return (
                          <CommandRow
                            search={search}
                            gestureInProgress={gestureInProgress as string}
                            key={command.id}
                            last={command === commands[commands.length - 1]}
                            onClick={onExecute}
                            onHover={onHover}
                            selected={
                              !isTouch
                                ? command === selectedCommand
                                : isHelpMatch || gestureInProgress == command.gesture || isCancelMatch
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
            </div>
          ) : null}
        </div>
      </div>
    </>
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

  // if dismissed, set timeout to 0 to remove alert component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <TransitionGroup
      childFactory={(child: ReactElement) => (!isDismissed ? child : React.cloneElement(child, { timeout: 0 }))}
      // className={css({ display: 'flex', justifyContent: 'center', alignItems: 'center' })}
    >
      {showCommandPalette ? (
        <FadeTransition duration='fast' nodeRef={popupRef} onEntering={() => setDismiss(false)}>
          <Popup
            ref={popupRef}
            // only show the close link on desktop
            // do not show the close link on touch devices since the CommandPalette is automatically dismissed when the gesture ends.
            {...(!isTouch ? { onClose } : null)}
          >
            <CommandPalette
              commands={commands}
              recentCommands={recentCommands}
              setRecentCommands={setRecentCommands}
              search={search}
              setSearch={setSearch}
            />
          </Popup>
        </FadeTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default CommandPaletteWithTransition
