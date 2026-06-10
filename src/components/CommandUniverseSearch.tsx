import { FC, useRef } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import useDismissKeyboardOnScroll from '../hooks/useDismissKeyboardOnScroll'
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
  const inputRef = useRef<HTMLInputElement>(null)

  useDismissKeyboardOnScroll(inputRef)

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
          // `flex: none` cancels iconRecipe's base `flex: 1`. Explicit width/height keep the
          // glyph at its declared dimensions regardless of parent flex behavior.
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          width: '28px',
          height: '28px',
          opacity: 0.5,
          // plus-lighter additively brightens the glyph against the dialog glass, same as
          // the gradient text — so search icon, text, and sort icon read as one element.
          mixBlendMode: 'plus-lighter',
        })}
      >
        <CommandsSearchIcon
          size={28}
          fill={token('colors.dialogSearchAccent')}
          strokeWidth={1.5}
          cssRaw={css.raw({ flex: 'none' })}
        />
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
          // 28 (28px) + 8px gap so typed text always clears the glyph. Written
          // as a literal because Panda's `css()` is compile-time and won't evaluate `${expr}`.
          paddingLeft: '36px',
          paddingBlock: '0.25rem',
          border: 'none',
          outline: 'none',
          fontSize: '0.9rem',
          // Form controls don't inherit font-family by default — opt in so the dialog's font applies to the placeholder and typed text.
          fontFamily: 'inherit',
          // plus-lighter brightens the input text against the dialog's translucent glass — additive blend lifts the placeholder & typed text out of the background.
          mixBlendMode: 'plus-lighter',
          // Gradient-fill the text by clipping the background to the glyph shape. `color: transparent` reveals the gradient through the text. Applied to ::placeholder too so the empty-state text shows the same fill.
          background: 'linear-gradient(90deg, {colors.dialogSearchAccent} 0%, {colors.dialogSearchAccentFade} 100%)',
          backgroundClip: 'text',
          color: 'transparent',
          // `color: transparent` hides the caret too — restore it explicitly so the focused state is visible.
          caretColor: 'dialogSearchAccent',
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
