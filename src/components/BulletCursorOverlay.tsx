import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { isSafari, isTouch, isiPhone } from '../browser'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import useHideBullet from '../hooks/useHideBullet'
import attributeEquals from '../selectors/attributeEquals'
import { findAnyChild, getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import isPinned from '../selectors/isPinned'
import rootedParentOf from '../selectors/rootedParentOf'
import editingValueStore from '../stores/editingValue'
import equalThoughtRanked from '../util/equalThoughtRanked'
import getBulletWidth from '../util/getBulletWidth'
import head from '../util/head'
import isDivider from '../util/isDivider'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import FauxCaret from './FauxCaret'

type BulletCursorOverlayProps = {
  x: number
  y: number
  simplePath: SimplePath
  height: number
  path: Path
  isTableCol1: boolean
  width?: number
  value?: string
  parentId: ThoughtId
  showContexts?: boolean
  leaf?: boolean
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
    <span
      aria-label='placeholder-bullet'
      style={{
        top: -extendClickHeight,
        left: -extendClickWidth + marginLeft,
        paddingTop: extendClickHeight,
        paddingLeft: extendClickWidth,
        paddingBottom: extendClickHeight + 2,
        width,
        position: 'absolute',
        verticalAlign: 'top',
        display: bulletIsDivider ? 'none' : undefined,
        zIndex: isIOSSafari ? 4 : undefined, // fix misalignment of cursor on iOS
      }}
    >
      <svg
        className={css({
          willChange: 'transform',
          transformBox: 'fill-box',
          transformOrigin: 'center',
          animation: isThoughtPinned ? 'bulletGrow {durations.fast} ease-out' : undefined,
        })}
        viewBox='0 0 600 600'
        style={{
          height: lineHeight,
          width: lineHeight,
          marginLeft: -lineHeight,
          // required to make the distance between bullet and thought scale properly at all font sizes.
          left: lineHeight * 0.317,
          marginBottom: glyphBottomMargin,
          position: 'relative',

          top: showContexts && isIOSSafari ? '-0.05em' : undefined,
        }}
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
      </svg>
    </span>
  )
}

/**
 * PlaceholderContextBreadcrumbs is a component that renders invisible breadcrumbs for context view.
 * Used to maintain layout consistency when context breadcrumbs are present.
 */
function PlaceholderContextBreadcrumbs({ simplePath }: { simplePath: SimplePath }) {
  const isHaveMultipleAncestors = simplePath.length > 2

  return (
    <div
      aria-label='placeholder-ctx-breadcrumbs-outer-container'
      className={css({
        marginLeft: 'calc(1.3em - 14.5px)',
        minHeight: '1em',
        visibility: 'hidden',
        marginBottom: '-0.25em', // Tighten up the space between the context-breadcrumbs and the thought (similar to the space above a note).
        paddingTop: '0.5em', // Use padding-top instead of margin-top to ensure this gets included in the dynamic height of each thought. Otherwise the accumulated y value will not be correct.
      })}
      style={{
        fontSize: '0.867em',
        marginTop: '0.533em',
      }}
    >
      {isRoot(simplePath) ? null : (
        <span
          style={{
            wordBreak: 'break-word',
            textDecoration: 'none',
            WebkitTextStrokeWidth: '0.05em',

            height: '1em',
            margin: '-0.5em',
            padding: '0.5em',
            ...(isHaveMultipleAncestors
              ? {
                  lineHeight: '16px',
                }
              : {}),
          }}
          dangerouslySetInnerHTML={{ __html: '&ZeroWidthSpace;' }}
        ></span>
      )}
    </div>
  )
}

/**
 * PlaceholderTreeNode is a component used to mimic behavior of TreeNode.
 * Any position changes from one Thought to another will be animated within this component.
 */
function PlaceholderTreeNode({
  children,
  isTableCol1 = false,
  x,
  y,
  width,
}: {
  children?: React.ReactNode
  isTableCol1?: boolean
  x: number
  y: number
  width: number
}) {
  const outerDivStyle = {
    left: x,
    top: y,
    // Table col1 uses its exact width since cannot extend to the right edge of the screen.
    // All other thoughts extend to the right edge of the screen. We cannot use width auto as it causes the text to wrap continuously during the counter-indentation animation, which is jarring. Instead, use a fixed width of the available space so that it changes in a stepped fashion as depth changes and the word wrap will not be animated. Use x instead of depth in order to accommodate ancestor tables.
    // 1em + 10px is an eyeball measurement at font sizes 14 and 18
    // (Maybe the 10px is from .content padding-left?)
    width: isTableCol1 ? width : `calc(100% - ${x}px + 1em + 10px)`,
    textAlign: isTableCol1 ? ('right' as const) : undefined,
  }

  return (
    <div
      aria-label='placeholder-tree-node'
      className={css({
        transition: 'left {durations.layoutNodeAnimation} linear,top {durations.layoutNodeAnimation} ease-in-out',
        ...(isTableCol1
          ? {
              position: 'relative',
              width: 'auto',
            }
          : {
              position: 'absolute',
              width: '100%',
            }),
      })}
      style={{
        ...outerDivStyle,
      }}
    >
      {children}
    </div>
  )
}

/**
 * A placeholder component for the ThoughtAnnotation component.
 * Used to maintain consistent positioning of the cursor and bullet in normal view on iOS.
 */
function PlaceholderThoughtAnnotation() {
  return (
    <div
      aria-label='placeholder-thought-annotation-outer-container'
      className={css({
        opacity: 0,
        position: 'absolute',
        boxSizing: 'border-box',
        width: '100%',
        marginTop: '0',
        display: 'inline-block',
        verticalAlign: 'top',
        whiteSpace: 'pre-wrap',
        maxWidth: '100%',
        '@media (max-width: 500px)': {
          marginTop: { _android: '-2.1px' },
          marginLeft: { _android: '0.5em' },
        },
        '@media (min-width: 560px) and (max-width: 1024px)': {
          marginTop: { _android: '-0.1px' },
          marginLeft: { _android: '0.5em' },
        },
      })}
    >
      <div
        aria-label='placeholder-thought-annotation-inner-container'
        className={css({
          display: 'inline-block',
          maxWidth: '100%',
          boxSizing: 'border-box',
          paddingRight: '0.333em',
        })}
        style={{
          padding: '0 0.333em',
          margin: '-0.5px 0 0 calc(1em - 18px)',
        }}
      >
        <span
          className={css({
            fontSize: '1.25em',
            margin: '-0.375em 0 0 -0.05em',
            position: 'absolute',
          })}
        >
          <FauxCaret caretType='thoughtStart' />
        </span>
        <span
          className={css({
            visibility: 'hidden',
            position: 'relative',
            clipPath: 'inset(0.001px 0 0.1em 0)',
            wordBreak: 'break-word',
          })}
          dangerouslySetInnerHTML={{ __html: '&ZeroWidthSpace;' }}
        />
      </div>
    </div>
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
  value,
  parentId,
  showContexts,
  leaf,
}: BulletCursorOverlayProps) {
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

  // Scroll the cursor into view after it is edited, e.g. toggling bold in a long, sorted context.
  // The cursor typically changes rank most dramatically on the first edit, and then less as its rank stabilizes.
  const editingValue = editingValueStore.useSelector(value => value)

  useEffect(() => scrollCursorIntoView(y, height), [editingValue, height, y])

  return (
    <PlaceholderTreeNode width={width} x={x} y={y} isTableCol1={isTableCol1}>
      {showContexts && simplePath?.length > 1 && <PlaceholderContextBreadcrumbs simplePath={simplePath} />}

      <div
        aria-label='placeholder-thought-container'
        className={css({
          /* Use line-height to vertically center the text and bullet. We cannot use padding since it messes up the selection. This needs to be overwritten on multiline elements. See ".child .editable" below. */
          /* must match value used in Editable useMultiline */
          lineHeight: '2',
          // ensure that ThoughtAnnotation is positioned correctly
          position: 'relative',
          ...(hideBullet ? { marginLeft: -12 } : null),
        })}
      >
        <CursorOverlay simplePath={simplePath} path={path} leaf={leaf} isInContextView={isInContextView} />

        <PlaceholderThoughtAnnotation />
      </div>
    </PlaceholderTreeNode>
  )
}
