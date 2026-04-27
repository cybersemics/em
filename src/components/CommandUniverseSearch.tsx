import { FC } from 'react'
import { css } from '../../styled-system/css'
import { useCommandUniverseDebug } from './dialog/CommandUniverseDebug'
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
  const { state: debug } = useCommandUniverseDebug()
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
          // `flex: none` cancels iconRecipe's base `flex: 1`. Explicit width/height (sized
          // from debug state) keep the glyph at its declared dimensions regardless of
          // parent flex behavior.
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        })}
        style={{
          width: debug.searchIconSize,
          height: debug.searchIconSize,
          opacity: debug.searchIconOpacity,
          // plus-lighter additively brightens the glyph against the dialog glass, same as
          // the gradient text — so search icon, text, and sort icon read as one element.
          mixBlendMode: debug.iconsPlusLighter ? 'plus-lighter' : 'normal',
        }}
      >
        <CommandsSearchIcon
          size={debug.searchIconSize}
          fill={debug.searchIconColor}
          strokeWidth={debug.searchIconStroke}
          cssRaw={css.raw({ flex: 'none' })}
        />
      </div>
      <input
        type='text'
        placeholder='Search for a command'
        onInput={(e: React.FormEvent<HTMLInputElement>) => {
          onInput?.(e.currentTarget.value)
        }}
        // paddingLeft scales with the search glyph size so typed text always clears it,
        // regardless of the size dialed in via the debug overlay (8px gap past the icon).
        style={{ paddingLeft: debug.searchIconSize + 8 }}
        className={css({
          marginLeft: 0,
          marginBottom: 0,
          boxSizing: 'border-box',
          width: '100%',
          minWidth: '100%',
          paddingBlock: '0.25rem',
          border: 'none',
          outline: 'none',
          fontSize: '0.9rem',
          // Form controls don't inherit font-family by default — opt in so the dialog's Radio Canada Big applies to the placeholder and typed text.
          fontFamily: 'inherit',
          // plus-lighter brightens the input text against the dialog's translucent glass — additive blend lifts the placeholder & typed text out of the background.
          mixBlendMode: 'plus-lighter',
          // Gradient-fill the text by clipping the background to the glyph shape. `color: transparent` reveals the gradient through the text. Applied to ::placeholder too so the empty-state text shows the same fill.
          background: 'linear-gradient(90deg, #E3BECD 0%, rgba(217, 211, 213, 0.50) 100%)',
          backgroundClip: 'text',
          color: 'transparent',
          // `color: transparent` hides the caret too — restore it explicitly so the focused state is visible.
          caretColor: '#E3BECD',
          _placeholder: {
            color: 'transparent',
          },
          // Dim the whole input while it's empty (showing the placeholder); full opacity once the user types.
          _placeholderShown: {
            opacity: 0.55,
          },
        })}
      />
    </div>
  )
}

export default CommandUniverseSearch
