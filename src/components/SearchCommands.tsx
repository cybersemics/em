import { FC } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import SearchIcon from './icons/SearchIcon'

/** Search bar for filtering commands. */
const SearchCommands: FC<{ onInput?: (value: string) => void }> = ({ onInput }) => {
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
          type='text'
          placeholder='Search commands...'
          onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
            onInput?.(e.target.value)
          }}
          className={css({
            marginLeft: 0,
            marginBottom: 0,
            boxSizing: 'border-box',
            width: '100%',
            minWidth: '100%',
            paddingLeft: '2rem',
            borderRadius: '8px',
          })}
        />
      </div>
    </div>
  )
}

export default SearchCommands
