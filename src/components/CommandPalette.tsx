import React, { FC, ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { css } from '../../styled-system/css'
import Shortcut from '../@types/Shortcut'
import State from '../@types/State'
import { commandPaletteActionCreator as commandPalette } from '../actions/commandPalette'
import { isTouch } from '../browser'
import { GESTURE_CANCEL_ALERT_TEXT } from '../constants'
import { disableScroll, enableScroll } from '../device/disableScroll'
import * as selection from '../device/selection'
import useShortcut from '../hooks/useShortcut'
import themeColors from '../selectors/themeColors'
import { formatKeyboardShortcut, gestureString, hashKeyDown, hashShortcut, shortcutById } from '../shortcuts'
import gestureStore from '../stores/gesture'
import storageModel from '../stores/storageModel'
import allowScroll from '../device/disableScroll'
import GestureDiagram from './GestureDiagram'
import { HighlightedText } from './HighlightedText'
import Popup from './Popup'

/**********************************************************************
 * Constants
 **********************************************************************/

/** The maximum number of recent commands to store for the command palette. */
const MAX_RECENT_COMMANDS = 5

const commandPaletteShortcut = shortcutById('commandPalette')

/**********************************************************************
 * Helper Functions
 **********************************************************************/

/** Returns true if the shortcut can be executed. */
const isExecutable = (state: State, shortcut: Shortcut) =>
  (!shortcut.canExecute || shortcut.canExecute(() => state)) && (shortcut.allowExecuteFromModal || !state.showModal)

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
        hashKeyDown(e) === hashShortcut(commandPaletteShortcut)
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
        style={{ marginLeft: 0, marginBottom: 0, border: 'none' }}
      />
    </div>
  )
}

/** Renders a GestureDiagram and its label as a hint during a MultiGesture. */
const CommandRow: FC<{
  gestureInProgress: string
  keyboardInProgress: string
  last?: boolean
  onClick: (e: React.MouseEvent, shortcut: Shortcut) => void
  onHover: (e: MouseEvent, shortcut: Shortcut) => void
  selected?: boolean
  shortcut: Shortcut
  style?: React.CSSProperties
}> = ({ gestureInProgress, keyboardInProgress, last, onClick, onHover, selected, shortcut, style }) => {
  const store = useStore()
  const ref = React.useRef<HTMLDivElement>(null)
  const colors = useSelector(themeColors)
  const isActive = shortcut.isActive?.(store.getState)
  const label = shortcut.labelInverse && isActive ? shortcut.labelInverse! : shortcut.label
  const disabled = useSelector(state => !isExecutable(state, shortcut))

  // convert the description to a string
  const description = useSelector(state => {
    const descriptionStringOrFunction = (isActive && shortcut.descriptionInverse) || shortcut.description
    return descriptionStringOrFunction instanceof Function
      ? descriptionStringOrFunction(() => state)
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
      ref={ref}
      onClick={e => {
        if (!disabled) {
          onClick(e, shortcut)
        }
      }}
      style={{
        cursor: !disabled ? 'pointer' : undefined,
        paddingBottom: last ? (isTouch ? 0 : '4em') : '0.6em',
        paddingLeft: selected ? 'calc(1em - 10px)' : '1em',
        position: 'relative',
        textAlign: 'left',
        ...style,
      }}
    >
      <div
        style={{
          backgroundColor: selected ? '#212121' : undefined,
          padding: selected ? '5px 0 5px 0.5em' : undefined,
          ...(!isTouch
            ? {
                display: 'flex',
                margin: selected ? '-5px 0' : undefined,
              }
            : null),
        }}
      >
        <div>
          {/* gesture diagram */}
          {isTouch && (
            <GestureDiagram
              color={disabled ? colors.gray : undefined}
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
            style={{
              minWidth: '4em',
              whiteSpace: 'nowrap',
              color: disabled
                ? colors.gray
                : gestureInProgress === shortcut.gesture
                  ? colors.vividHighlight
                  : colors.fg,
              fontWeight: selected ? 'bold' : undefined,
            }}
          >
            <HighlightedText value={label} match={keyboardInProgress} disabled={disabled} />
          </div>
        </div>

        <div
          style={{
            maxHeight: !isTouch ? '1em' : undefined,
            flexGrow: 1,
            zIndex: 1,
          }}
        >
          <div
            style={{
              backgroundColor: selected ? '#212121' : undefined,
              display: 'flex',
              padding: !isTouch ? '3px 0.6em 0.3em 0.2em' : undefined,
              marginLeft: !isTouch ? '2em' : undefined,
            }}
          >
            {/* description */}
            {selected && (
              <div
                style={{
                  fontSize: '80%',
                  ...(!isTouch
                    ? {
                        flexGrow: 1,
                        marginLeft: '0.5em',
                      }
                    : null),
                }}
              >
                {description}
              </div>
            )}

            {/* keyboard shortcut */}
            {selected && !isTouch && (
              <div
                style={{
                  fontSize: '80%',
                  position: 'relative',
                  ...(!isTouch
                    ? {
                        display: 'inline',
                      }
                    : null),
                }}
              >
                <span
                  style={{
                    marginLeft: 20,
                    whiteSpace: 'nowrap',
                  }}
                >
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
  // when the command palette is activated, the alert value is co-opted to store the gesture that is in progress
  const isGestureActive = gestureInProgress || !isTouch
  const { keyboardInProgress, setKeyboardInProgress, possibleShortcutsSorted, recentCommands, setRecentCommands } =
    useShortcut({ isGestureActive: isGestureActive, includeRecentCommand: true, sortActiveCommandsFirst: false })

  const [selectedShortcut, setSelectedShortcut] = useState<Shortcut>(possibleShortcutsSorted[0])

  /** Execute a shortcut. */
  const onExecute = useCallback(
    (e: React.MouseEvent<Element, MouseEvent> | KeyboardEvent, shortcut: Shortcut) => {
      e.stopPropagation()
      e.preventDefault()
      if (
        unmounted.current ||
        (shortcut.canExecute && !shortcut.canExecute(store.getState)) ||
        (store.getState().showModal && !shortcut.allowExecuteFromModal)
      )
        return
      const commandsNew = [shortcut.id, ...recentCommands].slice(0, MAX_RECENT_COMMANDS)
      setRecentCommands(commandsNew)
      dispatch(commandPalette())
      shortcut.exec(dispatch, store.getState, e, { type: 'commandPalette' })
      storageModel.set('recentCommands', commandsNew)
    },
    [dispatch, recentCommands, setRecentCommands, store],
  )

  /** Execute the selected shortcut. */
  const onExecuteSelected = useCallback(
    (e: KeyboardEvent) => onExecute(e, selectedShortcut),
    [onExecute, selectedShortcut],
  )

  /** Select shortcuts on hover. */
  const onHover = useCallback((e: MouseEvent, shortcut: Shortcut) => setSelectedShortcut(shortcut), [])

  // Select the first shortcut when the input changes.
  useEffect(() => {
    setSelectedShortcut(possibleShortcutsSorted[0])
  }, [keyboardInProgress, possibleShortcutsSorted, setSelectedShortcut])
  useEffect(() => {
    allowScroll(false)

    return () => {
      allowScroll(true)
      unmounted.current = true
    }
  }, [])

  useEffect(() => {
    disableScroll()

    return () => {
      enableScroll()
      unmounted.current = true
    }
  }, [])

  /** Select the previous shortcut in the list. */
  const onSelectUp = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (selectedShortcut !== possibleShortcutsSorted[0]) {
        const i = possibleShortcutsSorted.indexOf(selectedShortcut)
        setSelectedShortcut(possibleShortcutsSorted[i - 1])
      }
    },
    [possibleShortcutsSorted, selectedShortcut],
  )

  /** Select the next shortcut in the list. */
  const onSelectDown = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (selectedShortcut !== possibleShortcutsSorted[possibleShortcutsSorted.length - 1]) {
        const i = possibleShortcutsSorted.indexOf(selectedShortcut)
        setSelectedShortcut(possibleShortcutsSorted[i + 1])
      }
    },
    [possibleShortcutsSorted, selectedShortcut],
  )

  /** Select the first shortcut in the list. */
  const onSelectTop = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedShortcut(possibleShortcutsSorted[0])
    },
    [possibleShortcutsSorted],
  )

  /* Select the last shortcut in the list. */
  const onSelectBottom = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedShortcut(possibleShortcutsSorted[possibleShortcutsSorted.length - 1])
    },
    [possibleShortcutsSorted],
  )

  return (
    <div
      style={{
        ...(isGestureActive ? { paddingLeft: '4em', paddingRight: '1.8em' } : null),
        marginBottom: isTouch ? 0 : fontSize,
        textAlign: 'left',
      }}
    >
      {!isTouch || (gestureInProgress && possibleShortcutsSorted.length > 0) ? (
        <div>
          <h2
            style={{
              marginTop: 0,
              marginBottom: '1em',
              marginLeft: -fontSize * 1.8,
              paddingLeft: 5,
              borderBottom: 'solid 1px gray',
            }}
          >
            {!isTouch ? (
              <CommandSearch
                onExecute={onExecuteSelected}
                onInput={setKeyboardInProgress}
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
            style={{
              marginLeft: !isTouch ? '-2.4em' : '-1.2em',
              // offset the negative marginTop on CommandRow
              paddingTop: 5,
              ...(!isTouch ? { maxHeight: 'calc(100vh - 8em)', overflow: 'auto' } : null),
            }}
          >
            {possibleShortcutsSorted.map(shortcut => (
              <CommandRow
                keyboardInProgress={keyboardInProgress}
                gestureInProgress={gestureInProgress as string}
                key={shortcut.id}
                last={shortcut === possibleShortcutsSorted[possibleShortcutsSorted.length - 1]}
                onClick={onExecute}
                onHover={onHover}
                selected={!isTouch ? shortcut === selectedShortcut : gestureInProgress === shortcut.gesture}
                shortcut={shortcut}
              />
            ))}
            {possibleShortcutsSorted.length === 0 && <span style={{ marginLeft: '1em' }}>No matching commands</span>}
          </div>
        </div>
      ) : isTouch ? (
        <div style={{ textAlign: 'center' }}>{GESTURE_CANCEL_ALERT_TEXT}</div>
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
        <CSSTransition key={0} nodeRef={popupRef} timeout={200} classNames='fade' onEntering={() => setDismiss(false)}>
          <Popup
            ref={popupRef}
            // only show the close link on desktop
            // do not show the close link on touch devices since the CommandPalette is automatically dismissed when the gesture ends.
            {...(!isTouch ? { onClose } : null)}
            cssRaw={popUpStyles}
          >
            <CommandPalette />
          </Popup>
        </CSSTransition>
      ) : null}
    </TransitionGroup>
  )
}

export default CommandPaletteWithTransition
