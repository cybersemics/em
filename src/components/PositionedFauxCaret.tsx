import { PropsWithChildren, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { Property } from '../../styled-system/types/csstype'
import Path from '../@types/Path'
import { isSafari, isTouch } from '../browser'
import { getBoundingClientRect } from '../device/selection'
import attributeEquals from '../selectors/attributeEquals'
import editingValueStore from '../stores/editingValue'
import equalPath from '../util/equalPath'
import head from '../util/head'
import FauxCaret from './FauxCaret'

type Props = PropsWithChildren<{
  /** If the thought is moved, it may trigger a transition that requires the faux caret. */
  path: Path
  /** If a thought is deleted and re-created by undo or redo, its other properties will remain
   * the same, and the element node itself will provide the only evidence of the change.
   */
  wrapperElement: HTMLDivElement | null
}>

type StyleProps = {
  display?: Property.Display
  fontSize?: Property.FontSize
  top?: Property.Top
  left?: Property.Left
}

/**
 * Wrapper for positioned faux caret.
 *
 * When text within an Editable text node is selected, the faux caret needs to move to the position where
 * the selection occurred. This differs from what happens when an element node is selected through the use
 * of commands (cursor down, undo/redo, etc.) where another faux caret is shown/hidden in a static position.
 *
 * See FauxCaret.tsx for more information.
 */
const PositionedFauxCaret = ({ children, path, wrapperElement }: Props) => {
  const editing = useSelector(state => state.editing)
  const isCursor = useSelector(state => equalPath(path, state.cursor))
  const isTableCol1 = useSelector(state => attributeEquals(state, head(path), '=view', 'Table'))
  const [styles, setStyles] = useState<StyleProps>({})

  // Hide the faux caret when typing occurs.
  editingValueStore.useEffect(() => {
    if (!isTouch || !isSafari()) return
    setStyles({ display: 'none' })
  })

  // If the thought isCursor and edit mode is on, position the faux cursor at the point where the
  // selection is created.
  useEffect(() => {
    if (!isTouch || !isSafari()) return

    if (editing && isCursor) {
      // The selection ranges aren't updated until the end of the frame when the thought is focused.
      setTimeout(() => {
        if (!wrapperElement) return

        const offset = wrapperElement.getBoundingClientRect()

        if (!offset) return

        const rect = getBoundingClientRect()

        if (rect) {
          setStyles({
            display: undefined,
            fontSize: `${rect.height}px`,
            top: `${rect.y - offset.y}px`,
            left: `${rect.x - offset.x}px`,
          })
        } else {
          setStyles({ display: 'none' })
        }
      })
    } else {
      setStyles({ display: 'none' })
    }
  }, [editing, isCursor, isTableCol1, path, wrapperElement])

  if (!isTouch || !isSafari()) return null
  return (
    <span className={css({ position: 'absolute', margin: '-0.1875em 0 0 -0.05em' })} style={styles}>
      <FauxCaret opacity='var(--faux-caret-opacity)' />
    </span>
  )
}

export default PositionedFauxCaret
