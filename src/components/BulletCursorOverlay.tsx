import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { isSafari, isTouch, isiPhone } from '../browser'
import useHideBullet from '../hooks/useHideBullet'
import useScrollCursorIntoView from '../hooks/useScrollCursorIntoView'
import attributeEquals from '../selectors/attributeEquals'
import { findAnyChild, getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import isPinned from '../selectors/isPinned'
import rootedParentOf from '../selectors/rootedParentOf'
import equalThoughtRanked from '../util/equalThoughtRanked'
import getBulletWidth from '../util/getBulletWidth'
import head from '../util/head'
import isDivider from '../util/isDivider'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import BulletWrapper from './BulletWrapper'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import ThoughtAnnotationWrapper from './ThoughtAnnotationWrapper'
import ThoughtWrapper from './ThoughtWrapper'
import TreeNodeWrapper from './TreeNodeWrapper'

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
  index: number
}

const isIOSSafari = isTouch && isiPhone && isSafari()

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
}: {
  simplePath: SimplePath
  path: Path
  leaf?: boolean
  isInContextView?: boolean
}) {
  const bulletOverlayRadius = isIOSSafari ? 300 : 245

  // Bottom margin for bullet to align with thought text
  const glyphBottomMargin = isIOSSafari ? '-0.2em' : '-0.3em'

  const showContexts = useSelector(state => isContextViewActive(state, path))
  const fontSize = useSelector(state => state.fontSize)

  const thoughtId = head(simplePath)

  const bulletIsDivider = useSelector(state => isDivider(getThoughtById(state, thoughtId)?.value))

  // animate overlay when the thought is pinned
  const isThoughtPinned = useSelector(state => !!isPinned(state, thoughtId))

  const lineHeight = fontSize * 1.25

  const extendClickWidth = fontSize * 1.2
  const extendClickHeight = fontSize / 3

  const isTableCol1 = useSelector(state =>
    attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table'),
  )

  // calculate position of bullet for different font sizes
  // Table column 1 needs more space between the bullet and thought for some reason
  const width = getBulletWidth(fontSize) + (!isInContextView && isTableCol1 ? fontSize / 4 : 0)
  const marginLeft = -width

  return (
    <BulletWrapper
      isEditing
      leaf={leaf}
      path={path}
      simplePath={simplePath}
      isInContextView={isInContextView}
      isTableCol1={isTableCol1}
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
    </BulletWrapper>
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
  index,
}: BulletCursorOverlayProps) {
  const value: string | undefined = useSelector(state => {
    const thought = getThoughtById(state, head(path))
    return thought?.value || ''
  })

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
    <TreeNodeWrapper
      cursorOverlay
      contextAnimation={null}
      isTableCol1={isTableCol1}
      x={x}
      y={y}
      thoughtId={head(simplePath)}
      width={width}
      path={path}
      index={index}
      isMounted
    >
      {showContexts && simplePath?.length > 1 && (
        <ContextBreadcrumbs
          hidden
          cssRaw={css.raw({
            /* Tighten up the space between the context-breadcrumbs and the thought (similar to the space above a note). */
            marginBottom: '-0.25em',
            /* Use padding-top instead of margin-top to ensure this gets included in the dynamic height of each thought.
            Otherwise the accumulated y value will not be correct. */
            paddingTop: '0.5em',
          })}
          path={parentOf(simplePath)}
          homeContext={homeContext}
        />
      )}
      <ThoughtWrapper path={path} hideBullet={hideBullet} cursorOverlay>
        <CursorOverlay simplePath={simplePath} path={path} leaf={leaf} isInContextView={isInContextView} />

        <ThoughtAnnotationWrapper cursorOverlay />
      </ThoughtWrapper>
    </TreeNodeWrapper>
  )
}
