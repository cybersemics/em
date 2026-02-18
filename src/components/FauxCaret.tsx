import { head } from 'lodash'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { Property } from '../../styled-system/types/csstype'
import FauxCaretType from '../@types/FauxCaretType'
import Path from '../@types/Path'
import { isSafari, isTouch } from '../browser'
import { getBoundingClientRect } from '../device/selection'
import useLayoutAnimationFrameEffect from '../hooks/useLayoutAnimationFrameEffect'
import attributeEquals from '../selectors/attributeEquals'
import editingValueStore from '../stores/editingValue'
import equalPath from '../util/equalPath'

/**
 * Faux caret to display during hideCaret animations on mobile Safari.
 *
 * Combined with the hideCaret animations, this replaces the actual caret with a
 * simulated caret in order to side-step issues mobile Safari has with positioning
 * said caret during animated transforms.
 *
 * There is a faux caret in each TreeNode that moves with the position of the real caret
 * according to the bounding rect fetched from `window.getSelection()` (see
 * `getBoundingClientRect` in selection.ts for implementation details).
 *
 * Additionally, there are line start and end faux carets defined in ThoughtAnnotation.tsx and
 * Note.tsx to cover cases where the client rect is not available because the selection is
 * not a text node (see `isStartOfElementNode` in selection.ts for implementation details).
 */
const FauxCaret = ({
  caretType,
  path,
  wrapperElement,
}: {
  caretType: FauxCaretType
  /** The Path of the TreeNode used to detect table view and when keyboard is open. Only used if caretType is 'positioned'. */
  path?: Path
  /** If a thought is deleted and re-created by undo or redo, its other properties will remain the same, and the element node itself will provide the only evidence of the change. Only used if caretType is 'positioned'. */
  wrapperElement?: HTMLDivElement | null
}) => {
  const [styles, setStyles] = useState<{
    position?: 'absolute'
    display?: Property.Display
    fontSize?: Property.FontSize
    top?: Property.Top
    left?: Property.Left
  }>(() => (isTouch && isSafari() && caretType === 'positioned' ? { display: 'none' } : {}))

  const isEditingCursor = useSelector(state => state.isKeyboardOpen && equalPath(path, state.cursor))
  const isTableCol1 = useSelector(state => path && attributeEquals(state, head(path), '=view', 'Table'))

  // Hide the positioned faux caret when typing occurs.
  editingValueStore.useEffect(() => {
    if (!isTouch || !isSafari() || caretType !== 'positioned') return
    setStyles({ display: 'none' })
  })

  // If the thought isCursor and keyboard is open, position the faux cursor at the point where the selection is created.
  // The selection ranges aren't updated until the end of the frame when the thought is focused.
  useLayoutAnimationFrameEffect(() => {
    if (!isTouch || !isSafari() || caretType !== 'positioned') return

    if (isEditingCursor) {
      if (!wrapperElement) return

      const offset = wrapperElement.getBoundingClientRect()

      if (!offset) return

      const rect = getBoundingClientRect()

      if (rect) {
        setStyles({
          position: 'absolute',
          display: undefined,
          fontSize: `${rect.height}px`,
          top: `${rect.y - offset.y}px`,
          left: `${rect.x - offset.x}px`,
        })
      } else {
        setStyles({ display: 'none' })
      }
    } else {
      setStyles({ display: 'none' })
    }
  }, [caretType, isEditingCursor, isTableCol1, path, wrapperElement])

  if (!isTouch || !isSafari()) return null
  return (
    <span
      className={css({
        color: 'caret',
        pointerEvents: 'none',
        WebkitTextStroke: '1px {colors.caret}',
      })}
      // opacity cannot be determined statically for PandaCSS, so it must be applied as an inline style
      style={{
        opacity: {
          none: '',
          noteEnd: 'var(--faux-caret-note-line-end-opacity)',
          noteStart: 'var(--faux-caret-note-line-start-opacity)',
          positioned: 'var(--faux-caret-opacity)',
          thoughtEnd: 'var(--faux-caret-line-end-opacity)',
          thoughtStart: 'var(--faux-caret-line-start-opacity)',
        }[caretType],
        ...styles,
      }}
    >
      |
    </span>
  )
}

export default FauxCaret
