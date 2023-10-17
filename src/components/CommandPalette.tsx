import React, { FC, useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import State from '../@types/State'
import commandPalette from '../action-creators/commandPalette'
import error from '../action-creators/error'
import * as selection from '../device/selection'
import fastClick from '../util/fastClick'

/** An error message that can be dismissed with a close button. */
const CommandPalette: FC<{
  onInput?: (value: string) => void
  onSelect?: (e: Event, value: string) => void
}> = ({ onInput, onSelect }) => {
  const dispatch = useDispatch()
  const showCommandPalette = useSelector((state: State) => state.showCommandPalette)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const savedSelectionRef = useRef<selection.SavedSelection | null>(null)

  /** Toggle the command palette off on escape. */
  const onKeyDown = useCallback(
    e => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        dispatch(commandPalette())
      } else if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        onSelect?.(e, inputRef.current?.value || '')
        dispatch(commandPalette())
      }
    },
    [onSelect, showCommandPalette],
  )

  /** Restores the cursor and removes event listeners. */
  const cleanup = useCallback(() => {
    selection.restore(savedSelectionRef.current || null)
    window.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  // cleanup on unmount
  useEffect(() => cleanup, [])

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
  }, [showCommandPalette])

  return (
    <TransitionGroup>
      {showCommandPalette ? (
        <CSSTransition key={0} timeout={200} classNames='fade'>
          <div>
            <input
              type='text'
              placeholder='Search commands by name...'
              ref={inputRef}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => onInput?.(e.target.value)}
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

export default CommandPalette
