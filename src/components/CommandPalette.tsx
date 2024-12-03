import React, { FC, ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import State from '../@types/State'
import { commandPaletteActionCreator as commandPalette } from '../actions/commandPalette'
import { isTouch } from '../browser'
import { commandById, formatKeyboardShortcut, gestureString, hashCommand, hashKeyDown } from '../commands'
import { GESTURE_CANCEL_ALERT_TEXT } from '../constants'
import allowScroll from '../device/disableScroll'
import * as selection from '../device/selection'
import useFilteredCommands from '../hooks/useFilteredCommands'
import gestureStore from '../stores/gesture'
import storageModel from '../stores/storageModel'
import { executeShortcutWithMulticursor } from '../util/executeShortcut'
import FadeTransition from './FadeTransition'
import GestureDiagram from './GestureDiagram'
import HighlightedText from './HighlightedText'
import Popup from './Popup'

/**********************************************************************
 * Constants
 **********************************************************************/

/** The maximum number of recent commands to store for the command palette. */
const MAX_RECENT_COMMANDS = 5

const commandPaletteShortcut = commandById('commandPalette')

/**********************************************************************
 * Helper Functions
 **********************************************************************/

/** Returns true if the shortcut can be executed. */
const isExecutable = (state: State, shortcut: Command) =>
  (!shortcut.canExecute || shortcut.canExecute(state)) && (shortcut.allowExecuteFromModal || !state.showModal)

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

  /** Handle command palette shortuts. */
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' ||
        // manually check if the commandPalette shortcut is entered since global shortcuts are disabled while the command palette is open
        hashKeyDown(e) === hashCommand(commandPaletteShortcut)
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
        placeholder='Search commands by name...'
        ref={inputRef}
        onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
          onInput?.(e.target.value)
        }}
        className={css({ marginLeft: 0, marginBottom: 0, border: 'none' })}
      />
    </div>
  )
}

/** Renders a GestureDiagram and its label as a hint during a MultiGesture. */
const CommandRow: FC<{
  gestureInProgress: string
  search: string
  last?: boolean
  onClick: (e: React.MouseEvent, shortcut: Command) => void
  onHover: (e: MouseEvent, shortcut: Command) => void
  selected?: boolean
  shortcut: Command
  style?: React.CSSProperties
}> = ({ gestureInProgress, search, last, onClick, onHover, selected, shortcut, style }) => {
  const store = useStore()
  const ref = React.useRef<HTMLDivElement>(null)

  const isActive = shortcut.isActive?.(store.getState())
  const label = shortcut.labelInverse && isActive ? shortcut.labelInverse! : shortcut.label
  const disabled = useSelector(state => !isExecutable(state, shortcut))

  // convert the description to a string
  const description = useSelector(state => {
    const descriptionStringOrFunction = (isActive && shortcut.descriptionInverse) || shortcut.description
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
    const onHoverShortcut = (e: MouseEvent) => onHover(e, shortcut)

    // mouseover and mouseenter cause the command under the cursor to get selected on render, so we use mousemove to ensure that it only gets selected on an actual hover
    ref.current?.addEventListener('mousemove', onHoverShortcut)

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ref.current?.removeEventListener('mousemove', onHoverShortcut)
    }
  }, [onHover, shortcut])

  return (
    <div
      className={css({
        cursor: !disabled ? 'pointer' : undefined,
        paddingBottom: last ? (isTouch ? 0 : '4em') : '0.6em',
        paddingLeft: selected ? 'calc(1em - 10px)' : '1em',
        position: 'relative',
        textAlign: 'left',
      })}
      ref={ref}
      onClick={e => {
        if (!disabled) {
          onClick(e, shortcut)
        }
      }}
      style={style}
    >
      <div
        className={css({
          backgroundColor: selected ? 'commandSelected' : undefined,
          padding: selected ? '5px 0 5px 0.5em' : undefined,
          ...(!isTouch
            ? {
                display: 'flex',
                margin: selected ? '-5px 0' : undefined,
              }
            : null),
        })}
      >
        <div>
          {/* gesture diagram */}
          {isTouch && (
            <GestureDiagram
              color={disabled ? token('colors.gray') : undefined}
              highlight={!disabled ? gestureInProgress.length : undefined}
              path={gestureString(shortcut)}
              strokeWidth={4}
              cssRaw={css.raw({
                position: 'absolute',
                marginLeft: selected ? 5 : 15,
                left: selected ? '-1.75em' : '-2.2em',
                top: selected ? '-0.2em' : '-0.75em',
              })}
              width={45}
              height={45}
            />
          )}

          {/* label */}
          <div
            className={css({
              minWidth: '4em',
              whiteSpace: 'nowrap',
              color: disabled ? 'gray' : gestureInProgress === shortcut.gesture ? 'vividHighlight' : 'fg',
              fontWeight: selected ? 'bold' : undefined,
            })}
          >
            <HighlightedText value={label} match={search} disabled={disabled} />
          </div>
        </div>

        <div className={css({ maxHeight: !isTouch ? '1em' : undefined, flexGrow: 1, zIndex: 1 })}>
          <div
            className={css({
              backgroundColor: selected ? 'commandSelected' : undefined,
              display: 'flex',
              padding: !isTouch ? '3px 0.6em 0.3em 0.2em' : undefined,
              marginLeft: !isTouch ? '2em' : undefined,
            })}
          >
            {/* description */}
            {selected && (
              <div
                className={css({
                  fontSize: '80%',
                  ...(!isTouch
                    ? {
                        flexGrow: 1,
                        marginLeft: '0.5em',
                      }
                    : null),
                })}
              >
                {description}
              </div>
            )}

            {/* keyboard shortcut */}
            {selected && !isTouch && (
              <div
                className={css({
                  fontSize: '80%',
                  position: 'relative',
                  ...(!isTouch
                    ? {
                        display: 'inline',
                      }
                    : null),
                })}
              >
                <span className={css({ marginLeft: 20, whiteSpace: 'nowrap' })}>
                  {shortcut.keyboard && formatKeyboardShortcut(shortcut.keyboard)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Render a command palette with keyboard or gesture autocomplete. */
const CommandPalette: FC = () => {
  const store = useStore()
  const dispatch = useDispatch()
  const gestureInProgress = gestureStore.useState()
  const fontSize = useSelector(state => state.fontSize)
  const unmounted = useRef(false)
  const [recentCommands, setRecentCommands] = useState(storageModel.get('recentCommands'))
  const [search, setSearch] = useState('')
  const shortcuts = useFilteredCommands(search, {
    recentCommands,
    sortActiveCommandsFirst: true,
  })

  const [selectedShortcut, setSelectedShortcut] = useState<Command>(shortcuts[0])

  /** Execute a shortcut. */
  const onExecute = useCallback(
    (e: React.MouseEvent<Element, MouseEvent> | KeyboardEvent, shortcut: Command) => {
      e.stopPropagation()
      e.preventDefault()
      if (
        unmounted.current ||
        (shortcut.canExecute && !shortcut.canExecute(store.getState())) ||
        (store.getState().showModal && !shortcut.allowExecuteFromModal)
      )
        return
      const commandsNew = [shortcut.id, ...recentCommands].slice(0, MAX_RECENT_COMMANDS)
      dispatch(commandPalette())
      executeShortcutWithMulticursor(shortcut, { event: e, type: 'commandPalette', store })
      storageModel.set('recentCommands', commandsNew)
      setRecentCommands(commandsNew)
    },
    [dispatch, recentCommands, setRecentCommands, store],
  )

  /** Execute the selected shortcut. */
  const onExecuteSelected = useCallback(
    (e: KeyboardEvent) => onExecute(e, selectedShortcut),
    [onExecute, selectedShortcut],
  )

  /** Select shortcuts on hover. */
  const onHover = useCallback((e: MouseEvent, shortcut: Command) => setSelectedShortcut(shortcut), [])

  // Select the first shortcut when the input changes.
  useEffect(() => {
    setSelectedShortcut(shortcuts[0])
  }, [search, shortcuts, setSelectedShortcut])

  useEffect(() => {
    allowScroll(false)

    return () => {
      allowScroll(true)
      unmounted.current = true
    }
  }, [])

  /** Select the previous shortcut in the list. */
  const onSelectUp = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (selectedShortcut !== shortcuts[0]) {
        const i = shortcuts.indexOf(selectedShortcut)
        setSelectedShortcut(shortcuts[i - 1])
      }
    },
    [shortcuts, selectedShortcut],
  )

  /** Select the next shortcut in the list. */
  const onSelectDown = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (selectedShortcut !== shortcuts[shortcuts.length - 1]) {
        const i = shortcuts.indexOf(selectedShortcut)
        setSelectedShortcut(shortcuts[i + 1])
      }
    },
    [shortcuts, selectedShortcut],
  )

  /** Select the first shortcut in the list. */
  const onSelectTop = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedShortcut(shortcuts[0])
    },
    [shortcuts],
  )

  /* Select the last shortcut in the list. */
  const onSelectBottom = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedShortcut(shortcuts[shortcuts.length - 1])
    },
    [shortcuts],
  )

  return (
    <div
      className={css({
        ...(gestureInProgress || !isTouch ? { paddingLeft: '4em', paddingRight: '1.8em' } : null),
        marginBottom: isTouch ? 0 : fontSize,
        textAlign: 'left',
      })}
    >
      {!isTouch || (gestureInProgress && shortcuts.length > 0) ? (
        <div>
          <h2
            className={css({
              marginTop: 0,
              marginBottom: '1em',
              paddingLeft: 5,
              borderBottom: 'solid 1px {colors.gray50}',
            })}
            style={{ marginLeft: -fontSize * 1.8 }}
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
              marginLeft: !isTouch ? '-2.4em' : '-1.2em',
              // offset the negative marginTop on CommandRow
              paddingTop: 5,
              ...(!isTouch ? { maxHeight: 'calc(100vh - 8em)', overflow: 'auto' } : null),
            })}
          >
            {shortcuts.map(shortcut => (
              <CommandRow
                search={search}
                gestureInProgress={gestureInProgress as string}
                key={shortcut.id}
                last={shortcut === shortcuts[shortcuts.length - 1]}
                onClick={onExecute}
                onHover={onHover}
                selected={!isTouch ? shortcut === selectedShortcut : gestureInProgress === shortcut.gesture}
                shortcut={shortcut}
              />
            ))}
            {shortcuts.length === 0 && <span className={css({ marginLeft: '1em' })}>No matching commands</span>}
          </div>
        </div>
      ) : isTouch ? (
        <div className={css({ textAlign: 'center' })}>{GESTURE_CANCEL_ALERT_TEXT}</div>
      ) : null}
    </div>
  )
}

/** An alert component that fades in and out. */
const CommandPaletteWithTransition: FC = () => {
  const [isDismissed, setDismiss] = useState(false)
  const dispatch = useDispatch()
  const popupRef = useRef<HTMLDivElement>(null)

  const popUpStyles = css.raw({ zIndex: 'commandPalette' })

  /** Dismiss the alert on close. */
  const onClose = useCallback(() => {
    setDismiss(true)
    dispatch(commandPalette())
  }, [dispatch])

  const showCommandPalette = useSelector(state => state.showCommandPalette)

  // if dismissed, set timeout to 0 to remove alert component immediately. Otherwise it will block toolbar interactions until the timeout completes.
  return (
    <TransitionGroup
      childFactory={(child: ReactElement) => (!isDismissed ? child : React.cloneElement(child, { timeout: 0 }))}
    >
      {showCommandPalette ? (
        <FadeTransition duration='fast' nodeRef={popupRef} onEntering={() => setDismiss(false)}>
          <Popup
            ref={popupRef}
            // only show the close link on desktop
            // do not show the close link on touch devices since the CommandPalette is automatically dismissed when the gesture ends.
            {...(!isTouch ? { onClose } : null)}
            cssRaw={popUpStyles}
          >
            <CommandPalette />
          </Popup>
        </FadeTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default CommandPaletteWithTransition
