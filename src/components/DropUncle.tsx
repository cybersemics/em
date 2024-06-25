import classNames from 'classnames'
import React from 'react'
import { ConnectDropTarget } from 'react-dnd'
import { useSelector } from 'react-redux'
import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import testFlags from '../e2e/testFlags'
import useDropHoverColor from '../hooks/useDropHoverColor'
import useHoveringPath from '../hooks/useHoveringPath'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import strip from '../util/strip'
import DragAndDropThought from './DragAndDropThought'

/** A drop target for after the hidden parent at a cliff (before the next hidden uncle). This is needed because the Thought will be hidden/shimmed so DragAndDropThought will not be rendered. DropEnd does not work since it drops at the end of a context, whereas this needs to drop before the next hidden uncle. */
const DropUncle = ({
  depth,
  dropTarget,
  isHovering,
  path,
  simplePath,
}: {
  depth?: number
  dropTarget?: ConnectDropTarget
  isHovering?: boolean
  path: Path
  simplePath: SimplePath
}) => {
  const dropHoverColor = useDropHoverColor(depth || 0)
  const value = useSelector(state =>
    testFlags.simulateDrop ? getThoughtById(state, head(simplePath))?.value || '' : '',
  )
  useHoveringPath(path, !!isHovering, DropThoughtZone.SubthoughtsDrop)

  if (!dropTarget) return null

  return dropTarget(
    <span
      className={classNames({
        'drop-end': true,
      })}
      style={{
        backgroundColor: testFlags.simulateDrop ? '#52305f' : undefined, // eggplant
        height: '1.9em',
        opacity: 0.9,
      }}
    >
      {testFlags.simulateDrop && (
        <span
          style={{
            paddingLeft: 5,
            position: 'absolute',
            // make sure label does not interfere with drop target hovering
            pointerEvents: 'none',
            left: 0,
            color: '#ff7bc3' /* mid pink */,
          }}
        >
          {strip(value)}
          {isHovering ? '*' : ''}
        </span>
      )}
      {(testFlags.simulateDrag || isHovering) && (
        <span className='drop-hover' style={{ backgroundColor: dropHoverColor }} />
      )}
    </span>,
  )
}

// TODO: Type this correctly so it does not require all the Thought props (which it does not use)
const DragAndDropDropUncle = DragAndDropThought(DropUncle) as any

const DropUncleMemo = React.memo(DragAndDropDropUncle)
DropUncleMemo.displayName = 'DropUncle'

export default DropUncleMemo
