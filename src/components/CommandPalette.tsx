import _ from 'lodash'
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import Shortcut from '../@types/Shortcut'
import ShortcutId from '../@types/ShortcutId'
import State from '../@types/State'
import commandPalette from '../action-creators/commandPalette'
import error from '../action-creators/error'
import { GESTURE_CANCEL_ALERT_TEXT } from '../constants'
import * as selection from '../device/selection'
import themeColors from '../selectors/themeColors'
import {
  formatKeyboardShortcut,
  gestureString,
  globalShortcuts,
  hashKeyDown,
  hashShortcut,
  shortcutById,
} from '../shortcuts'
import storageModel from '../stores/storageModel'
import fastClick from '../util/fastClick'
import GestureDiagram from './GestureDiagram'

/** The maxmimum number of recent commands to store for the command palette. */
const MAX_RECENT_COMMANDS = 5

const commandPaletteShortcut = shortcutById('commandPalette')

/** Search input for the Command Palette. */
const CommandSearch: FC<{
  onExecute?: (e: KeyboardEvent, value: string) => void
  onInput?: (value: string) => void
  onSelectDown?: (e: KeyboardEvent) => void
  onSelectUp?: (e: KeyboardEvent) => void
}> = ({ onExecute, onInput, onSelectDown, onSelectUp }) => {
  const dispatch = useDispatch()
  const showCommandPalette = useSelector((state: State) => state.showCommandPalette)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const savedSelectionRef = useRef<selection.SavedSelection | null>(null)

  /** Handle command palette shortuts. */
  const onKeyDown = useCallback(
    e => {
      if (
        e.key === 'Escape' ||
        // manually check if the commandPalette shortcut is entered since global shortcuts are disabled while the command palette is open
        hashKeyDown(e) === hashShortcut(commandPaletteShortcut)
      ) {
        e.preventDefault()
        e.stopPropagation()
        dispatch(commandPalette())
      } else if (e.key === 'Enter') {
        onExecute?.(e, inputRef.current?.value || '')
      } else if (e.key === 'ArrowDown') {
        onSelectDown?.(e)
      } else if (e.key === 'ArrowUp') {
        onSelectUp?.(e)
      }
    },
    [onExecute, onSelectDown, onSelectUp, showCommandPalette],
  )

  /** Restores the cursor and removes event listeners. */
  const cleanup = useCallback(() => {
    selection.restore(savedSelectionRef.current || null)
    window.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  // cleanup on unmount
  useEffect(() => cleanup, [cleanup])

  // save selection and add event listeners when command palette is showCommandPalette
  // cleanup when command palette is hidden
  useEffect(() => {
    if (showCommandPalette) {
      savedSelectionRef.current = selection.save()
      inputRef.current?.focus()
      window.addEventListener('keydown', onKeyDown)
    } else {
      cleanup()
    }
  }, [cleanup, onKeyDown, showCommandPalette])

  return (
    <TransitionGroup>
      {showCommandPalette ? (
        <CSSTransition key={0} timeout={200} classNames='fade'>
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
            <a className='upper-right status-close-x text-small' {...fastClick(() => dispatch(error({ value: null })))}>
              ✕
            </a>
          </div>
        </CSSTransition>
      ) : null}
    </TransitionGroup>
  )
}

/** Renders a GestureDiagram and its label as a hint during a MultiGesture. */
const CommandRow: FC<{
  gestureInProgress: string
  keyboardInProgress: string
  onClick: (e: React.MouseEvent, shortcut: Shortcut) => void
  onHover: (e: MouseEvent, shortcut: Shortcut) => void
  selected?: boolean
  shortcut: Shortcut
  style?: React.CSSProperties
}> = ({ gestureInProgress, keyboardInProgress, onClick, onHover, selected, shortcut, style }) => {
  const store = useStore()
  const ref = React.useRef<HTMLDivElement>(null)
  const colors = useSelector(themeColors)
  const isActive = shortcut.isActive?.(store.getState)
  const description = shortcut.descriptionInverse && isActive ? shortcut.descriptionInverse : shortcut.description
  const label = shortcut.labelInverse && isActive ? shortcut.labelInverse! : shortcut.label
  const highlightIndexStart = label.toLowerCase().indexOf(keyboardInProgress.toLowerCase())
  const highlightIndexEnd = highlightIndexStart + keyboardInProgress.length
  const disabled = shortcut.canExecute && !shortcut.canExecute?.(store.getState)
  const showCommandPalette = useSelector((state: State) => state.showCommandPalette)

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
      ref.current?.removeEventListener('mousemove', onHoverShortcut)
    }
  }, [])

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
        paddingBottom: 10,
        paddingLeft: selected ? 'calc(1em - 10px)' : '1em',
        position: 'relative',
        textAlign: 'left',
        ...style,
      }}
    >
      <div
        style={{
          backgroundColor: selected ? '#212121' : undefined,
          padding: selected ? '5px 0.5em' : undefined,
          ...(showCommandPalette
            ? {
                alignItems: 'baseline',
                display: 'flex',
                justifyContent: 'stretch',
                margin: selected ? '-5px 0' : undefined,
              }
            : null),
        }}
      >
        <div>
          {/* gesture diagram */}
          {!showCommandPalette && (
            <GestureDiagram
              color={disabled ? colors.gray : undefined}
              highlight={!disabled ? gestureInProgress.length : undefined}
              path={gestureString(shortcut)}
              strokeWidth={4}
              style={{
                position: 'absolute',
                marginLeft: selected ? 5 : 15,
                left: selected ? '-1.75em' : '-2.2em',
                top: selected ? '-0.2em' : '-0.75em',
              }}
              width={45}
              height={45}
            />
          )}

          {/* label */}
          <div
            style={{
              whiteSpace: 'nowrap',
              color: disabled
                ? colors.gray
                : gestureInProgress === shortcut.gesture
                ? colors.vividHighlight
                : colors.fg,
              fontWeight: selected ? 'bold' : undefined,
            }}
          >
            {label.slice(0, highlightIndexStart)}
            <span style={{ color: !disabled ? colors.vividHighlight : undefined }}>
              {label.slice(highlightIndexStart, highlightIndexEnd)}
            </span>
            {label.slice(highlightIndexEnd)}
          </div>
        </div>

        {/* description */}
        {selected && (
          <div
            style={{
              fontSize: '80%',
              ...(showCommandPalette
                ? {
                    flexGrow: 1,
                    marginLeft: '2em',
                  }
                : null),
            }}
          >
            {description}
          </div>
        )}

        {/* keyboard shortcut */}
        {selected && showCommandPalette && (
          <div
            style={{
              fontSize: '80%',
              position: 'relative',
              top: -1,
              ...(showCommandPalette
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
  )
}

/** Render an extended gesture hint with embedded GestureDiagrams. Handled here to avoid creating a HOC or cause AppComponent to re-render too frequently. This could be separated into a HOC or hook if needed. */
const CommandPalette: FC = () => {
  const store = useStore()
  const alert = useSelector((state: State) => state.alert)
  const showCommandPalette = useSelector((state: State) => state.showCommandPalette)
  const fontSize = useSelector((state: State) => state.fontSize)
  const [keyboardInProgress, setKeyboardInProgress] = useState('')
  const [recentCommands, setRecentCommands] = useState<ShortcutId[]>(storageModel.get('recentCommands'))
  const show = alert?.value || showCommandPalette
  const unmounted = useRef(false)

  // when the extended gesture hint is activated, the alert value is co-opted to store the gesture that is in progress
  const gestureInProgress = alert?.value === '*' ? '' : alert?.value || ''

  // get the shortcuts that can be executed from the current gesture in progress
  const possibleShortcutsSorted = useMemo(() => {
    if (!show) return []

    const possibleShortcuts = globalShortcuts.filter(
      shortcut =>
        !shortcut.hideFromCommandPalette &&
        !shortcut.hideFromInstructions &&
        (showCommandPalette
          ? // keyboard
            (shortcut.labelInverse && shortcut.isActive?.(store.getState) ? shortcut.labelInverse! : shortcut.label)
              .toLowerCase()
              .includes(keyboardInProgress.toLowerCase())
          : // gesture
            shortcut.gesture && gestureString(shortcut).startsWith(gestureInProgress)),
    )

    // sorted shortcuts
    const sorted = _.sortBy(possibleShortcuts, shortcut => {
      const label =
        shortcut.labelInverse && shortcut.isActive?.(store.getState) ? shortcut.labelInverse : shortcut.label
      return [
        // canExecute
        !shortcut.canExecute || shortcut.canExecute?.(store.getState) ? 0 : 1,
        // gesture length
        gestureInProgress ? shortcut.gesture?.length : '',
        // recent commands
        !keyboardInProgress &&
          (() => {
            const i = recentCommands.indexOf(shortcut.id)
            // if not found, sort to the end
            // pad with zeros so that the sort is correct
            return i === -1 ? 'z' : i.toString().padStart(5, '0')
          })(),
        // label that starts with keyboardInProgress
        keyboardInProgress && label.toLowerCase().startsWith(keyboardInProgress.toLowerCase()) ? 0 : 1,
        // label
        label,
      ].join('\x00')
    })
    return sorted
  }, [gestureInProgress, keyboardInProgress, showCommandPalette])

  const [selectedShortcut, setSelectedShortcut] = useState<Shortcut>(possibleShortcutsSorted[0])

  /** Handler for command palette selection. */
  const onExecute = useCallback(
    (e: React.MouseEvent<Element, MouseEvent> | KeyboardEvent, shortcut: Shortcut) => {
      e.stopPropagation()
      e.preventDefault()
      if (unmounted.current || (shortcut.canExecute && !shortcut.canExecute(store.getState))) return
      const commandsNew = [shortcut.id, ...recentCommands].slice(0, MAX_RECENT_COMMANDS)
      setRecentCommands(commandsNew)
      store.dispatch(commandPalette())
      shortcut.exec(store.dispatch, store.getState, e, { type: 'commandPalette' })
      storageModel.set('recentCommands', commandsNew)
    },
    [possibleShortcutsSorted],
  )

  // Select the first shortcut when the input changes.
  // For some reason onInput retains an old reference to possibleShortcutsSorted .
  useEffect(() => {
    setSelectedShortcut(possibleShortcutsSorted[0])
  }, [keyboardInProgress])

  useEffect(
    () => () => {
      unmounted.current = true
    },
    [],
  )

  return (
    <div
      style={{
        ...(show ? { paddingLeft: '4em', paddingRight: '4em' } : null),
        marginBottom: fontSize,
        textAlign: 'left',
      }}
    >
      {showCommandPalette || (alert?.value && possibleShortcutsSorted.length > 0) ? (
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
            {showCommandPalette ? (
              <CommandSearch
                onExecute={e => onExecute(e, selectedShortcut)}
                onInput={setKeyboardInProgress}
                onSelectDown={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  setSelectedShortcut(selectedShortcut => {
                    const i = possibleShortcutsSorted.indexOf(selectedShortcut)
                    return possibleShortcutsSorted[i === possibleShortcutsSorted.length - 1 ? 0 : i + 1]
                  })
                }}
                onSelectUp={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  setSelectedShortcut(selectedShortcut => {
                    const i = possibleShortcutsSorted.indexOf(selectedShortcut)
                    return possibleShortcutsSorted[i === 0 ? possibleShortcutsSorted.length - 1 : i - 1]
                  })
                }}
              />
            ) : (
              'Gestures'
            )}
          </h2>

          <div
            style={{
              marginLeft: showCommandPalette ? '-2.4em' : '-1.2em',
              // offset the negative marginTop on CommandRow
              paddingTop: 5,
              ...(showCommandPalette ? { maxHeight: 'calc(100vh - 8em)', overflow: 'auto' } : null),
            }}
          >
            {possibleShortcutsSorted.map(shortcut => (
              <CommandRow
                keyboardInProgress={keyboardInProgress}
                gestureInProgress={gestureInProgress}
                key={shortcut.id}
                onClick={onExecute}
                onHover={(e, shortcut) => setSelectedShortcut(shortcut)}
                selected={showCommandPalette ? shortcut === selectedShortcut : gestureInProgress === shortcut.gesture}
                shortcut={shortcut}
              />
            ))}
            {possibleShortcutsSorted.length === 0 && <span style={{ marginLeft: '1em' }}>No matching commands</span>}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>{GESTURE_CANCEL_ALERT_TEXT}</div>
      )}
    </div>
  )
}

export default CommandPalette
