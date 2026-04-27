import { FC } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import CommandsSearchIcon from './icons/CommandsSearchIcon'

/**
 * Search input used by the Mobile Command Universe dialog. Sits flush against the
 * surrounding panel with no border or background, and the search glyph left-aligns
 * with the section headers and command titles down the panel.
 *
 * Distinct from SearchCommands (used by Help / CustomizeToolbar via CommandTable),
 * which keeps the legacy bordered look.
 */
const CommandUniverseSearch: FC<{ onInput?: (value: string) => void }> = ({ onInput }) => {
  return (
    <div
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
          // Indent so typed text starts past the search glyph.
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

export default CommandUniverseSearch
