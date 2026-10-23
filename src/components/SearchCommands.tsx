import { FC, useRef } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import useDismissKeyboardOnScroll from '../hooks/useDismissKeyboardOnScroll'
import SearchIcon from './icons/SearchIcon'

/** Search bar for filtering commands. */
const SearchCommands: FC<{ onInput?: (value: string) => void }> = ({ onInput }) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useDismissKeyboardOnScroll(inputRef)

  /**
   * Focuses the input on tap while preventing iOS' native autoscroll.
   *
   * The WebView is scrolled by iOS to raise a focused input above the keyboard. That scroll moves the whole
   * document, so a caller that lifts the input itself — the Command Center drawer does — sees everything,
   * its own header and the toolbar included, drop for a frame before the lift puts them back.
   *
   * Matches the handler on `CommandUniverseSearch`.
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    e.preventDefault()
    input.focus({ preventScroll: true })
  }

  return (
    <div id='search' className={css({ flexGrow: 1, border: 'solid 1px {colors.gray50}', borderRadius: '8px' })}>
      <div className={css({ position: 'relative' })}>
        <div
          className={css({
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
          })}
        >
          <SearchIcon size={16} fill={token('colors.lightgray')} />
        </div>
        <input
          ref={inputRef}
          type='text'
          placeholder='Search commands...'
          onMouseDown={handleMouseDown}
          onInput={(e: React.FormEvent<HTMLInputElement>) => {
            onInput?.(e.currentTarget.value)
          }}
          className={css({
            marginLeft: 0,
            marginBottom: 0,
            boxSizing: 'border-box',
            width: '100%',
            minWidth: '100%',
            paddingLeft: '1.78rem',
            borderRadius: '8px',
          })}
        />
      </div>
    </div>
  )
}

export default SearchCommands
