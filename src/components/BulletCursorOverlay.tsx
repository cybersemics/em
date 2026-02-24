import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import useHideBullet from '../hooks/useHideBullet'
import useScrollCursorIntoView from '../hooks/useScrollCursorIntoView'
import attributeEquals from '../selectors/attributeEquals'
import { findAnyChild, getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import calculateCursorOverlayRadius from '../util/calculateCursorOverlayRadius'
import equalThoughtRanked from '../util/equalThoughtRanked'
import head from '../util/head'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import BulletPositioner from './BulletPositioner'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import ThoughtAnnotationWrapper from './ThoughtAnnotationWrapper'
import ThoughtPositioner from './ThoughtPositioner'
import TreeNodePositioner from './TreeNodePositioner'

type BulletCursorOverlayProps = {
  x: number
  y: number
  simplePath: SimplePath
  height: number
  path: Path
  isTableCol1: boolean
  width?: number
  parentId: ThoughtId
  showContexts?: boolean
  leaf?: boolean
}

/** Returns true if two lists of children are equal. Deeply compares id, value, and rank. */
const equalChildren = (a: Thought[], b: Thought[]) =>
  a === b ||
  (a && b && a.length === b.length && a.every((thought, i) => equalThoughtRanked(a[i], b[i]) && a[i].id === b[i].id))

/**
 * CursorOverlay is a component that renders the cursor overlay for a thought bullet.
 */
function CursorOverlay({
  simplePath,
  path,
  leaf,
  isInContextView,
  isTableCol1,
}: {
  simplePath: SimplePath
  path: Path
  leaf?: boolean
  isInContextView?: boolean
  isTableCol1?: boolean
}) {
  const bulletOverlayRadius = calculateCursorOverlayRadius()

  return (
    <BulletPositioner
      isEditing
      leaf={leaf}
      path={path}
      simplePath={simplePath}
      isInContextView={isInContextView}
      isTableCol1={isTableCol1}
      cursorOverlay
    >
      <g>
        <ellipse
          ry={bulletOverlayRadius}
          rx={bulletOverlayRadius}
          cy='300'
          cx='300'
          className={css({
            stroke: 'highlight',
            fillOpacity: 0.25,
            fill: 'fg',
          })}
        />
      </g>
    </BulletPositioner>
  )
}

/**
 * BulletCursorOverlay is a component used to animate the cursor overlay from the bullet.
 * This component also contains placeholders for other components to maintain consistency of cursor overlay position.
 **/
export default function BulletCursorOverlay({
  x,
  y,
  simplePath,
  height,
  path,
  isTableCol1,
  width = 0,
  parentId,
  showContexts,
  leaf,
}: BulletCursorOverlayProps) {
  const value: string | undefined = useSelector(state => {
    const thought = getThoughtById(state, head(path))
    return thought?.value || ''
  })

  const isMulticursorActive = useSelector(hasMulticursor)

  const childrenAttributeId = useSelector(
    state => (value !== '=children' && findAnyChild(state, parentId, child => child.value === '=children')?.id) || null,
  )
  const grandparentId = simplePath[simplePath.length - 3]

  const grandchildrenAttributeId = useSelector(
    state =>
      (value !== '=style' && findAnyChild(state, grandparentId, child => child.value === '=grandchildren')?.id) || null,
  )

  const hideBulletProp = useSelector(state => {
    const hideBulletsChildren = attributeEquals(state, childrenAttributeId, '=bullet', 'None')
    if (hideBulletsChildren) return true
    const hideBulletsGrandchildren =
      value !== '=bullet' && attributeEquals(state, grandchildrenAttributeId, '=bullet', 'None')
    if (hideBulletsGrandchildren) return true
    return false
  })

  const children = useSelector<Thought[]>(
    state => getChildrenRanked(state, head(simplePath)),
    // only compare id, value, and rank for re-renders
    equalChildren,
  )

  const isInContextView = useSelector(state => isContextViewActive(state, parentOf(path)))

  const hideBullet = useHideBullet({
    children,
    env: {},
    hideBulletProp,
    isEditing: true,
    simplePath,
    isInContextView,
    thoughtId: head(simplePath),
  })

  const homeContext = useSelector(state => {
    const pathParent = rootedParentOf(state, path)
    const showContexts = isContextViewActive(state, path)
    return showContexts && isRoot(pathParent)
  })

  useScrollCursorIntoView(y, height)

  return (
    <TreeNodePositioner
      cursorOverlay
      contextAnimation={null}
      isTableCol1={isTableCol1}
      x={x}
      y={y}
      thoughtId={head(simplePath)}
      width={width}
      path={path}
      isMounted
    >
      {showContexts && simplePath?.length > 1 && (
        <div
          className={css({
            /* Tighten up the space between the context-breadcrumbs and the thought (similar to the space above a note). */
            marginBottom: '-0.21675rem',
            /* Use padding-top instead of margin-top to ensure this gets included in the dynamic height of each thought.
            Otherwise the accumulated y value will not be correct. */
            paddingTop: '0.4335rem',
            marginLeft: 'calc(1.1271rem - 14.5px)',
            marginTop: '0.462rem',
          })}
        >
          <ContextBreadcrumbs hidden path={parentOf(simplePath)} homeContext={homeContext} />
        </div>
      )}
      <ThoughtPositioner path={path} hideBullet={hideBullet} cursorOverlay>
        {!isMulticursorActive && (
          <CursorOverlay
            simplePath={simplePath}
            path={path}
            leaf={leaf}
            isInContextView={isInContextView}
            isTableCol1={isTableCol1}
          />
        )}
        <ThoughtAnnotationWrapper cursorOverlay />
      </ThoughtPositioner>
    </TreeNodePositioner>
  )
}
