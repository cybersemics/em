import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import themeColors from '../selectors/themeColors'
import alpha from '../util/alpha'

/** Applies alpha transparency to colors (or default foreground color) for autofocus. */
const useAutofocus = (autofocus?: 'show' | 'dim' | 'hide' | 'hide-parent', style?: React.CSSProperties) => {
  const colors = useSelector(themeColors)

  // track when the color or background color changes
  // used to determine transition
  const [color, setColor] = useState<`rgb${string}` | undefined>(style?.color as `rgb${string}`)
  const [backgroundColor, setBackgroundColor] = useState<`rgb${string}` | undefined>(
    style?.backgroundColor as `rgb${string}`,
  )

  // By default, App.css will apply a slow (0.75s) color and backgroundColor transition for smooth autofocus animations while navigating. See .children > .child styles.
  // However, we need to disable the transition when clicking a color swatch in order to provide snappier feedback to the user.
  const [disableTransition, setDisableTransition] = useState<boolean>(false)

  const styleColors = useMemo(() => {
    if (
      color !== style?.color &&
      (!color || !style?.color || alpha(style.color as `rgb${string}`, 1) !== alpha(color, 1))
    ) {
      setColor(style?.color as `rgb${string}`)
      setDisableTransition(true)
      setTimeout(() => {
        setDisableTransition(false)
      })
    }

    if (
      backgroundColor !== style?.backgroundColor &&
      (!backgroundColor ||
        !style?.backgroundColor ||
        alpha(style.backgroundColor as `rgb${string}`, 1) !== alpha(backgroundColor, 1))
    ) {
      setBackgroundColor(style?.backgroundColor as `rgb${string}`)
      setDisableTransition(true)
      setTimeout(() => {
        setDisableTransition(false)
      })
    }

    return {
      // add transparency to the background color based on autofocus
      ...(style?.backgroundColor
        ? {
            backgroundColor: alpha(
              style.backgroundColor as `rgb${string}`,
              autofocus === 'show' ? 1 : autofocus === 'dim' ? 0.5 : 0,
            ),
          }
        : null),
      // add transparency to the foreground color based on autofocus
      color: alpha(
        (style?.color as `rgb${string}`) || colors.fg,
        autofocus === 'show' ? 1 : autofocus === 'dim' ? 0.5 : 0,
      ),
      ...(disableTransition
        ? {
            transition: 'color 0s, background-color 0s',
          }
        : null),
    }
  }, [autofocus, colors, style?.color, style?.backgroundColor, disableTransition])

  return styleColors
}

export default useAutofocus
