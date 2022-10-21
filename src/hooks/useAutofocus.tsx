import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import Autofocus from '../@types/Autofocus'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { getChildrenSorted } from '../selectors/getChildren'
import rootedParentOf from '../selectors/rootedParentOf'
import themeColors from '../selectors/themeColors'
import alpha from '../util/alpha'
import head from '../util/head'
import { isDescendantPath } from '../util/isDescendantPath'

/** Applies alpha transparency to colors (or default foreground color) for autofocus. */
const useAutofocus = (simplePath: SimplePath, autofocus?: Autofocus, style?: React.CSSProperties) => {
  const timerRef = useRef<number | undefined>(undefined)
  const [noHeight, setNoHeight] = useState<boolean>(false)

  const colors = useSelector(themeColors)

  const isHidden = useSelector(
    (state: State) =>
      (autofocus === 'hide' || autofocus === 'hide-parent') && !isDescendantPath(state.cursor, simplePath),
  )

  // isHidden and isBelowCursor cannot be combined, since a hidden thought may no longer be below the cursor but still needs to have its height restored
  const isBelowCursor = useSelector((state: State) => {
    if (!state.cursor || simplePath.length > state.cursor.length) return false
    const cursorAncestor = state.cursor.slice(0, simplePath.length) as Path
    const thoughtId = head(simplePath)
    const siblings = getChildrenSorted(state, head(rootedParentOf(state, simplePath)))
    const index = siblings.findIndex(thought => thought.id === thoughtId)
    const cursorIndex = siblings.findIndex(thought => thought.id === head(cursorAncestor))
    return cursorIndex !== -1 && index > cursorIndex
  })

  // track when the color or background color changes
  // used to determine transition
  const [color, setColor] = useState<`rgb${string}` | undefined>(style?.color as `rgb${string}`)
  const [backgroundColor, setBackgroundColor] = useState<`rgb${string}` | undefined>(
    style?.backgroundColor as `rgb${string}`,
  )

  // By default, App.css will apply a slow (0.75s ease-out) color and backgroundColor transition for smooth autofocus animations while navigating. See .children > .child styles.
  // However, we need to disable the transition when clicking a color swatch since we want to change the thought's color instantly in that case. We change reset the transition whenever the alpha changes without a color change (i.e. autofocus)

  const styleColors = useMemo(() => {
    // compare color independent of alpha
    const colorChange =
      color !== style?.color && (!color || !style?.color || alpha(style.color as `rgb${string}`, 1) !== alpha(color, 1))
    if (colorChange) {
      setColor(style?.color as `rgb${string}`)
    }

    // compare background color independent of alpha
    if (
      backgroundColor !== style?.backgroundColor &&
      (!backgroundColor ||
        !style?.backgroundColor ||
        alpha(style.backgroundColor as `rgb${string}`, 1) !== alpha(backgroundColor, 1))
    ) {
      setBackgroundColor(style?.backgroundColor as `rgb${string}`)
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
      ...(colorChange
        ? {
            transition: 'color 0s, background-color 0s',
          }
        : null),
    }

    return styles
  }, [autofocus, colors, noHeight, style?.color, style?.backgroundColor])

  // set display:none after the autofocus fade out transition completes (750ms)
  if (isHidden && isBelowCursor && !noHeight) {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setNoHeight(true)
    }, 800) as unknown as number
  }
  // remove display:none when visible
  // isHidden and isBelowCursor cannot be combined, since a hidden thought may no longer be below the cursor but still needs to have its height restored
  else if (noHeight && !isHidden) {
    clearTimeout(timerRef.current)
    setNoHeight(false)
  }

  // prevent setters after unmount
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
    }
  }, [])

  return styleColors
}

export default useAutofocus
