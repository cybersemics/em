import { FC } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import theme from '../selectors/theme'
import SearchIcon from './icons/SearchIcon'

/** Search bar for filtering commands. */
const SearchCommands: FC<{ onInput?: (value: string) => void }> = ({ onInput }) => {
  const isLightTheme = useSelector(state => theme(state) === 'Light')

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
          <SearchIcon size={16} fill={isLightTheme ? '#666' : '#999'} />
        </div>
        <input
          type='text'
          placeholder='Search gestures...'
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
