import { shallowEqual } from 'react-redux'
import { css } from '../../styled-system/css'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import useEditorSelector from '../hooks/useEditorSelector'
import useHideBullet from '../hooks/useHideBullet'
import useScrollCursorIntoView from '../hooks/useScrollCursorIntoView'
import attributeEquals from '../selectors/attributeEquals'
import { findAnyChild, getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import calculateCursorOverlayRadius from '../util/calculateCursorOverlayRadius'
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

/** Returns true if two lists contain the same child ids and values in the same order. */
const equalChildren = (a: Thought[], b: Thought[]) =>
  a === b || (a.length === b.length && a.every((thought, i) => thought.id === b[i].id && thought.value === b[i].value))

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
  const value: string | undefined = useEditorSelector(state => {
    const thought = getThoughtById(state, head(path))
    return thought?.value || ''
  })

  const isMulticursorActive = useEditorSelector(hasMulticursor)

  const childrenAttributeId = useEditorSelector(
    state => (value !== '=children' && findAnyChild(state, parentId, child => child.value === '=children')?.id) || null,
  )
  const grandparentId = simplePath[simplePath.length - 3]

  const grandchildrenAttributeId = useEditorSelector(
    state =>
      (value !== '=style' && findAnyChild(state, grandparentId, child => child.value === '=grandchildren')?.id) || null,
  )

  const isInContextView = useEditorSelector(state => isContextViewActive(state, parentOf(path)))

  const hideBulletProp = useEditorSelector(state => {
    // A context view entry is rendered in place of its context, so the =children/=bullet of its real parent must not hide its bullet.
    if (isInContextView) return false
    const hideBulletsChildren = attributeEquals(state, childrenAttributeId, '=bullet', 'None')
    if (hideBulletsChildren) return true
    const hideBulletsGrandchildren =
      value !== '=bullet' && attributeEquals(state, grandchildrenAttributeId, '=bullet', 'None')
    if (hideBulletsGrandchildren) return true
    return false
  })

  const children = useEditorSelector<Thought[]>(
    state => getChildrenRanked(state, head(simplePath)),
    // Only compare child ids, values, and order for re-renders.
    equalChildren,
  )

  const hideBullet = useHideBullet({
    children,
    env: {},
    hideBulletProp,
    isEditing: true,
    path,
    simplePath,
    isInContextView,
    thoughtId: head(simplePath),
  })

  // Must match the breadcrumbs rendered by Thought so that the cursor overlay is aligned with the thought.
  const contextBreadcrumbsAncestors = useEditorSelector(state => rootedParentOf(state, simplePath), shallowEqual)

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
      {showContexts && !isRoot(simplePath) && (
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
          <ContextBreadcrumbs hidden path={contextBreadcrumbsAncestors} />
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
