import { PropsWithChildren, useEffect, useState } from 'react'
import { css } from '../../styled-system/css'
import Path from '../@types/Path'
import { isSafari, isTouch } from '../browser'
import { getBoundingClientRect } from '../device/selection'
import editingValueStore from '../stores/editingValue'

type Props = PropsWithChildren<{
  editing: boolean
  isCursor: boolean
  isTableCol1: boolean
  path: Path
  wrapperElement: HTMLDivElement | null
}>

/**
 * Wrapper for positioned faux caret.
 *
 * When text within an Editable text node is selected, the faux caret needs to move to the position where
 * the selection occurred. This differs from what happens when an element node is selected through the use
 * of commands (cursor down, undo/redo, etc.) where another faux caret is shown/hidden in a static position.
 *
 * See FauxCaret.tsx for more information.
 */
const PositionedFauxCaretWrapper = ({ children, editing, isCursor, isTableCol1, path, wrapperElement }: Props) => {
  const [styles, setStyles] = useState({})

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
      {children}
    </span>
  )
}

export default PositionedFauxCaretWrapper
