import { FC, useEffect, useRef } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import SearchIcon from './icons/SearchIcon'

/** Search bar for filtering commands. */
const SearchCommands: FC<{ onInput?: (value: string) => void }> = ({ onInput }) => {
  const inputRef = useRef<HTMLInputElement>(null)

  /** Blurs the search input when the user scrolls. */
  const handleScroll = () => {
    if (inputRef.current && document.activeElement === inputRef.current) {
      inputRef.current.blur()
    }
  }

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

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
