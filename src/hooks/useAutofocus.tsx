import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import Autofocus from '../@types/Autofocus'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import themeColors from '../selectors/themeColors'
import alpha from '../util/alpha'
import { isDescendantPath } from '../util/isDescendantPath'

/** Applies alpha transparency to colors (or default foreground color) for autofocus. */
const useAutofocus = (simplePath: SimplePath, autofocus?: Autofocus, style?: React.CSSProperties) => {
  const colors = useSelector(themeColors)
  const isHidden = useSelector(
    (state: State) =>
      (autofocus === 'hide' || autofocus === 'hide-parent') && !isDescendantPath(state.cursor, simplePath),
  )
  const [noHeight, setNoHeight] = useState<boolean>(false)
  const timerRef = useRef<number | undefined>(undefined)

  // track when the color or background color changes
  // used to determine transition
  const [color, setColor] = useState<`rgb${string}` | undefined>(style?.color as `rgb${string}`)
  const [backgroundColor, setBackgroundColor] = useState<`rgb${string}` | undefined>(
    style?.backgroundColor as `rgb${string}`,
  )

  // By default, App.css will apply a slow (0.75s ease-out) color and backgroundColor transition for smooth autofocus animations while navigating. See .children > .child styles.
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

    const styles: React.CSSProperties = {
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
      // set height:0 instead of display:none as display:none breads the CSS autofocus animation for fade-in
      ...(noHeight ? { height: 0 } : null),
      ...(disableTransition
        ? {
            transition: 'color 0s, background-color 0s',
          }
        : null),
    }

    return styles
  }, [autofocus, colors, noHeight, style?.color, style?.backgroundColor, disableTransition])

  // set display:none after the autofocus fade out transition completes (750ms)
  if (isHidden && !noHeight) {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setNoHeight(true)
    }, 800) as unknown as number
  }
  // remove display:none when visible
  else if (noHeight && !isHidden) {
    clearTimeout(timerRef.current)
    setNoHeight(false)
  }

  // prevent setters after unmount
  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  return styleColors
}

export default useAutofocus
