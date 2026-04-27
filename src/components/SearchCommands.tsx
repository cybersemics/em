import { FC, useRef } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import useDismissKeyboardOnScroll from '../hooks/useDismissKeyboardOnScroll'
import CommandsSearchIcon from './icons/CommandsSearchIcon'

/**
 * Search bar for filtering commands. The input sits flush against the surrounding panel —
 * no border or background — and the search icon left-aligns with the section headers and
 * command titles down the panel (per the alignment spec).
 */
const SearchCommands: FC<{ onInput?: (value: string) => void }> = ({ onInput }) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useDismissKeyboardOnScroll(inputRef)

  return (
    <div
      id='search'
      className={css({
        flexGrow: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      })}
    >
      <div
        className={css({
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          color: 'fgOverlay50',
        })}
      >
        <CommandsSearchIcon size={18} fill={token('colors.fgOverlay50')} />
      </div>
      <input
        ref={inputRef}
        type='text'
        placeholder='Search for a command'
        onInput={(e: React.FormEvent<HTMLInputElement>) => {
          onInput?.(e.currentTarget.value)
        }}
        className={css({
          marginLeft: 0,
          marginBottom: 0,
          boxSizing: 'border-box',
          width: '100%',
          minWidth: '100%',
          // Indent so the typed text starts past the search glyph.
          paddingLeft: '1.625rem',
          paddingBlock: '0.25rem',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'fg',
          fontSize: '0.9rem',
          _placeholder: {
            color: 'fgOverlay50',
          },
        })}
      />
    </div>
  )
}

export default SearchCommands
