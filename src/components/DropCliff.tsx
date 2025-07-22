import { css } from '../../styled-system/css'
import Path from '../@types/Path'
import { isTouch } from '../browser'
import { HOME_PATH } from '../constants'
import head from '../util/head'
import unroot from '../util/unroot'
import DropEnd from './DropEnd'

/** Renders drop targets for dropping thoughts after cliffs. One for every cliff level. */
const DropCliff = ({
  cliff,
  depth,
  path,
  isTableCol2,
  prevWidth = 0,
  isLastVisible,
}: {
  cliff: number
  depth: number
  path: Path
  isTableCol2: boolean
  prevWidth?: number
  isLastVisible?: boolean
}) => {
  if (cliff >= 0) return null

  return Array(-cliff)
    .fill(0)
    .map((_, i) => {
      const pathEnd = -(cliff + i) < path.length ? (path.slice(0, cliff + i) as Path) : HOME_PATH
      const cliffDepth = unroot(pathEnd).length
      const depthDiff = cliffDepth - depth

      // After table col2, shift the DropEnd left by the width of col1.
      // This correctly positions the drop target for dropping after the table view.
      // Otherwise it would be too far to the right.
      const dropEndMarginLeft = isTableCol2 && depthDiff < 0 ? prevWidth : 0
      return (
        <div
          key={'DropEnd-' + head(pathEnd)}
          className={css({
            position: 'relative',
            // The original value was -0.2em, and it is decreased by 0.1em to let drop hover blue line renders in correct places for better UX
            top: '-0.3em',
            transition: `left {durations.fast} ease-out`,
            zIndex: 'subthoughtsDropEnd',
          })}
          style={{
            left: `calc(${cliffDepth - depth}em - ${dropEndMarginLeft}px + ${isTouch ? -1 : 1}px)`,
          }}
        >
          <DropEnd
            depth={pathEnd.length}
            path={pathEnd}
            cliff={cliff}
            isLastVisible={isLastVisible}
            // Extend the click area of the drop target when there is nothing below.
            // The last visible drop-end will always be a dimmed thought at distance 1 (an uncle).
            // Dimmed thoughts at distance 0 should not be extended, as they are dimmed siblings and sibling descendants that have thoughts below
            // last={!nextChildId}
          />
        </div>
      )
    })
}

export default DropCliff
