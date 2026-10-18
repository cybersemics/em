import { FC, useRef, useState } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import useDismissKeyboardOnScroll from '../hooks/useDismissKeyboardOnScroll'
import useFitText from '../hooks/useFitText'
import useRemAsPx from '../hooks/useRemAsPx'
import CommandsSearchIcon from './icons/CommandsSearchIcon'

/** The text shown in the empty search input. */
const PLACEHOLDER = 'Search for a command'

/** The largest the search glyph grows to as the font size increases. */
const MAX_ICON_SIZE = 36

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
  // The glyph is read with the search text, so it grows with the font size, but only as far as the search row has room for.
  const iconSize = Math.min(useRemAsPx(1.75), MAX_ICON_SIZE)
  const [hasValue, setHasValue] = useState(false)
  // The placeholder follows the user's font size for as long as it fits the search row, and holds the largest size that fits beyond that. Typed text stays at the user's font size and scrolls, as text in an input does.
  useFitText(inputRef, { text: hasValue ? '' : PLACEHOLDER, maxFontSize: useRemAsPx(0.9) })

  useDismissKeyboardOnScroll(inputRef)

  /**
   * When the input is clicked/tapped, focus it while preventing iOS' native autoscroll.
   * This solves an issue where the scroll position of the viewport would jitter when the
   * search input is focussed while the editor is scrolled. */
  const handleMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    e.preventDefault()
    input.focus({ preventScroll: true })
  }

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
          opacity: 0.5,
          // plus-lighter additively brightens the glyph against the dialog glass, same as
          // the gradient text — so search icon, text, and sort icon read as one element.
          mixBlendMode: 'plus-lighter',
        })}
        style={{ width: iconSize, height: iconSize }}
      >
        <CommandsSearchIcon
          size={iconSize}
          fill={token('colors.dialogSearchAccent')}
          strokeWidth={1.5}
          className={css({ flex: 'none' })}
        />
      </div>
      <input
        ref={inputRef}
        type='text'
        // The glyph plus an 8px gap, so typed text always clears it.
        style={{ paddingLeft: iconSize + 8 }}
        placeholder={PLACEHOLDER}
        onMouseDown={handleMouseDown}
        onInput={(e: React.FormEvent<HTMLInputElement>) => {
          setHasValue(!!e.currentTarget.value)
          onInput?.(e.currentTarget.value)
        }}
        className={css({
          marginLeft: 0,
          marginBottom: 0,
          boxSizing: 'border-box',
          width: '100%',
          minWidth: '100%',
          paddingBlock: '0.25rem',
          // A placeholder too long for the row at a large font size is cut short rather than clipped mid-word.
          textOverflow: 'ellipsis',
          border: 'none',
          outline: 'none',
          // Form controls don't inherit font-family by default — opt in so the dialog's font applies to the placeholder and typed text.
          fontFamily: 'inherit',
          // plus-lighter brightens the input text against the dialog's translucent glass — additive blend lifts the placeholder & typed text out of the background.
          mixBlendMode: 'plus-lighter',
          // Gradient-fill the text by clipping the background to the glyph shape. `color: transparent` reveals the gradient through the text. Applied to ::placeholder too so the empty-state text shows the same fill.
          // eslint-disable-next-line @pandacss/prefer-token -- every color in the gradient is a token reference
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
