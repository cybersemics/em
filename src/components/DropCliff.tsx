import { useSelector } from 'react-redux'
import Path from '../@types/Path'
import { isTouch } from '../browser'
import { HOME_PATH } from '../constants'
import testFlags from '../e2e/testFlags'
import { hasChildren } from '../selectors/getChildren'
import head from '../util/head'
import unroot from '../util/unroot'
import DropEnd from './DropEnd'

/** Renders a DropEnd for each level of "cliff", or the depth jump after a deeply nested thought. */
const DropCliff = ({
  cliff,
  depth,
  isTableCol2,
  prevWidth,
  path,
}: {
  /** The height of the cliff. For example, if the current thought has depth 5 and the next thought has depth 3, the cliff is -2. */
  cliff: number
  /** The depth of the thought before the cliff. */
  depth: number
  /** True if the thought before the cliff is in table col2. */
  isTableCol2: boolean
  /** The width of the previously rendered thought, used to shift the DropEnd left in table col2. See: dropEndMarginLeft.  */
  prevWidth?: number
  /** The path of the thought before the cliff. */
  path: Path
}) => {
  // cursor depth, taking into account that a leaf cursor has the same autofocus depth as its parent
  const autofocusDepth = useSelector(state => {
    // only set during drag-and-drop to avoid re-renders
    if ((!state.dragInProgress && !testFlags.simulateDrag && !testFlags.simulateDrop) || !state.cursor) return 0
    const isCursorLeaf = !hasChildren(state, head(state.cursor))
    return state.cursor.length + (isCursorLeaf ? -1 : 0)
  })

  // do not render hidden cliffs
  // rough autofocus estimate
  if (autofocusDepth - depth > 1) return

  return (
    <>
      {Array(-cliff)
        .fill(0)
        .map((x, i) => {
          const pathEnd = -(cliff + i) < path.length ? (path.slice(0, cliff + i) as Path) : HOME_PATH
          const cliffDepth = unroot(pathEnd).length

          /**
           * After table col2, shift the DropEnd left by the width of col1.
           * This correctly positions the drop target for dropping after the table view.
           * Otherwise it would be too far to the right.
           **/
          const dropEndMarginLeft = isTableCol2 && cliffDepth - depth < 0 ? (prevWidth ?? 0) : 0

          return (
            <div
              key={'DropEnd-' + head(pathEnd)}
              className='z-index-subthoughts-drop-end'
              style={{
                position: 'relative',
                top: '-0.2em',
                left: `calc(${cliffDepth - depth}em - ${dropEndMarginLeft}px + ${isTouch ? -1 : 1}px)`,
                transition: 'left 0.15s ease-out',
              }}
            >
              <DropEnd
                depth={pathEnd.length}
                path={pathEnd}
                // Extend the click area of the drop target when there is nothing below.
                // The last visible drop-end will always be a dimmed thought at distance 1 (an uncle).
                // Dimmed thoughts at distance 0 should not be extended, as they are dimmed siblings and sibling descendants that have thoughts below
                // last={!nextChildId}
              />
            </div>
          )
        })}
    </>
  )
}

export default DropCliff
