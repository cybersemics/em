import React, { useRef } from 'react'
import { ConnectDragSource } from 'react-dnd'
import { shallowEqual, useSelector } from 'react-redux'
import { css, cva, cx } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import { isMac, isSafari, isTouch, isiPhone } from '../browser'
import { AlertType } from '../constants'
import { LongPressProps } from '../hooks/useLongPress'
import attribute from '../selectors/attribute'
import attributeEquals from '../selectors/attributeEquals'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getLexeme from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import getThoughtFill from '../selectors/getThoughtFill'
import isContextViewActive from '../selectors/isContextViewActive'
import isMulticursorPath from '../selectors/isMulticursorPath'
import rootedParentOf from '../selectors/rootedParentOf'
import calculateCursorOverlayRadius from '../util/calculateCursorOverlayRadius'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import parentOf from '../util/parentOf'
import BulletPositioner from './BulletPositioner'

interface BulletProps {
  dragSource: ConnectDragSource
  longPressProps: LongPressProps
  // See: ThoughtProps['isContextPending']
  isContextPending?: boolean
  isDragging?: boolean
  isEditing: boolean
  leaf?: boolean
  publish?: boolean
  showContexts?: boolean
  simplePath: SimplePath
  path: Path
  thoughtId: ThoughtId
  // depth?: number
  // debugIndex?: number
  isCursorGrandparent?: boolean
  isCursorParent?: boolean
  isInContextView?: boolean
  /** 1-based ordinal position among visible non-attribute siblings (from linearizeTree), used to number =bullet/Ordered lists. -1 for attributes. */
  childIndexNonAttribute?: number
}

const isIOSSafari = isTouch && isiPhone && isSafari()

const glyphFg = cva({
  base: {
    transition: `transform {durations.veryFast} ease-out, fill-opacity {durations.medium} ease-out`,
  },
  variants: {
    gray: {
      true: {
        color: 'bulletGray',
        fill: 'bulletGray',
      },
    },
    graypulse: {
      true: {
        color: 'bulletGray',
        fill: 'bulletGray',
        '-webkit-animation': 'tofg 400ms infinite alternate ease-in-out',
      },
    },
    triangle: {
      true: {},
    },
    leaf: {
      true: {},
    },
    showContexts: { true: {} },
    isBulletExpanded: { true: {} },
  },
  compoundVariants: [
    {
      leaf: false,
      triangle: true,
      isBulletExpanded: true,
      css: {
        transform: 'rotate(90deg) translateX(10px)',
      },
    },
    {
      leaf: false,
      showContexts: true,
      isBulletExpanded: true,
      css: {
        _mobile: {
          left: '-0.016rem',
        },
      },
    },
  ],
  defaultVariants: {
    leaf: false,
  },
})

/** A circle bullet for leaf thoughts. */
const BulletLeaf = ({
  dimmed,
  done,
  fill,
  isHighlighted,
  missing,
  pending,
  showContexts,
  isBulletExpanded,
}: {
  dimmed?: boolean
  done?: boolean
  fill?: string
  isHighlighted?: boolean
  missing?: boolean
  pending?: boolean
  showContexts?: boolean
  isBulletExpanded?: boolean
} = {}) => {
  const radius = isIOSSafari ? 105 : 92
  return (
    <ellipse
      aria-label='bullet-glyph'
      data-pending={pending}
      className={cx(
        glyphFg({
          gray: missing || done,
          graypulse: pending,
          showContexts,
          leaf: true,
          isBulletExpanded,
        }),
        css({
          fill: showContexts ? 'none' : isHighlighted ? 'highlight' : undefined,
        }),
      )}
      data-bullet='leaf'
      ry={radius}
      rx={radius}
      cy='300'
      cx='300'
      style={{
        // allow .gray to define fill when missing
        // allow .graypulse to define fill when pending
        fill: !showContexts && !isHighlighted ? fill : undefined,
        stroke: !showContexts && !isHighlighted ? fill : undefined,
        opacity: dimmed ? 0.5 : undefined,
      }}
      strokeWidth={showContexts ? 30 : undefined}
    />
  )
}

/** A triangle-shaped bullet for thoughts with children. */
const BulletParent = ({
  currentScale,
  done,
  fill,
  childrenMissing,
  pending,
  showContexts,
  isBulletExpanded,
}: {
  currentScale?: number
  done?: boolean
  fill?: string
  isHighlighted?: boolean
  childrenMissing?: boolean
  pending?: boolean
  showContexts?: boolean
  isBulletExpanded?: boolean
} = {}) => {
  const path = isIOSSafari
    ? 'M194.95196151422277,180.42647327382525 L194.95196151422277,419.57354223877866 L413.24607972032067,298.0609718441649 L194.95196151422277,180.42646533261976 L194.95196151422277,180.42647327382525 z'
    : 'M260.8529375873694,149.42646091838702 L260.8529375873694,450.5735238982077 L409.1470616167427,297.55825763741126 L260.8529375873694,149.42646091838702 z'

  /** Gets pixel based center for OSX safari as it can't handle "center" or percentage based values in SVGs. */
  const calculateTransformOrigin = () => {
    const isOSXSafari = isMac && isSafari()
    const svgCenter = 300
    const scale = currentScale || 1
    const transformOrigin = isOSXSafari ? `${scale * svgCenter}px ${scale * svgCenter}px` : 'center'
    return transformOrigin
  }

  return (
    <path
      className={glyphFg({
        triangle: true,
        gray: childrenMissing || done,
        graypulse: pending,
        isBulletExpanded,
        showContexts,
        leaf: false,
      })}
      data-bullet='parent'
      style={{
        transformOrigin: calculateTransformOrigin(),
      }}
      d={path}
      strokeWidth={showContexts ? 30 : undefined}
      stroke={token('colors.fg85')}
      fill={showContexts ? 'none' : fill}
    />
  )
}

/** Converts a 1-based index to a lowercase letter sequence (1→a, 26→z, 27→aa, …) for lettered ordered lists. */
const numberToLetters = (n: number): string =>
  n <= 0 ? '' : numberToLetters(Math.floor((n - 1) / 26)) + String.fromCharCode(97 + ((n - 1) % 26))

/** An ordered-list glyph (number or letter) rendered in place of a bullet for =children/=bullet/Ordered or =children/=bullet/Alpha. Rendered inside the same scaling bullet SVG (viewBox 0 0 600 600) so it sizes and positions consistently across platforms and font sizes. */
const BulletOrdered = ({ fill, index, style }: { fill?: string; index: number; style: 'Ordered' | 'Alpha' }) => {
  const label = style === 'Alpha' ? numberToLetters(index) : `${index}`
  return (
    <text
      aria-label='bullet-glyph'
      data-bullet={style === 'Alpha' ? 'alpha' : 'ordered'}
      // Right-anchor the glyph so multi-character ordinals form a period-aligned column. x is offset to the right of the
      // viewBox center (300) so a single character is centered on the bullet position, aligning with the leaf bullet and
      // cursor overlay (both centered at cx=300).
      x={567}
      // Sit on the thought text's alphabetic baseline. The viewBox (0 0 600 600) is mapped to lineHeight (fontSize *
      // 1.25), so the text baseline falls at a fixed user-space y independent of font size; 440 aligns the number with
      // the text baseline while keeping it visually centered in the cursor overlay (radius 245 at cy=300).
      y={440}
      textAnchor='end'
      className={css({ fill: 'bullet' })}
      // fontSize 480 in user space renders at fontSize * 1.25 * (480/600) = fontSize, matching the thought text size.
      style={{ fill, fontSize: '480px' }}
    >
      {label}.
    </text>
  )
}

/** A larger circle that surrounds the bullet of the cursor thought. */
const BulletHighlightOverlay = ({
  isHighlighted,
}: {
  isHighlighted?: boolean
  leaf?: boolean
  publish?: boolean
  simplePath: SimplePath
}) => {
  const bulletOverlayRadius = calculateCursorOverlayRadius()
  return (
    <ellipse
      ry={bulletOverlayRadius}
      rx={bulletOverlayRadius}
      cy='300'
      cx='300'
      className={css({
        fillOpacity: isHighlighted ? 1 : 0.25,
        fill: isHighlighted ? 'highlight' : 'fg',
        stroke: isHighlighted ? 'highlight' : undefined,
      })}
    />
  )
}

/** Connect bullet to contextViews so it can re-render independent from <Subthought>. */
const Bullet = ({
  dragSource,
  longPressProps,
  isContextPending,
  isDragging,
  isEditing,
  leaf,
  path,
  publish,
  simplePath,
  thoughtId,
  isCursorGrandparent,
  isCursorParent,
  isInContextView,
  childIndexNonAttribute,
  // depth,
  // debugIndex,
}: BulletProps) => {
  const svgElement = useRef<SVGSVGElement>(null)
  const showContexts = useSelector(state => isContextViewActive(state, path))

  const isTableCol1 = useSelector(state =>
    attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table'),
  )
  const isDone = useSelector(state => !!findDescendant(state, thoughtId, '=done'))
  const isMulticursor = useSelector(state => isMulticursorPath(state, path))
  const isHighlighted = useSelector(state => {
    const isHolding = state.draggedSimplePath && head(state.draggedSimplePath) === head(simplePath)
    return isHolding || isDragging || isMulticursor
  })

  /** True if the the user is dragging the thought and hovering over the DeleteDrop DropGutter icon. */
  const isDropGutterDeleteHovering = useSelector(
    state => isDragging && state.alert?.alertType === AlertType.DeleteDropHint,
  )

  /** Returns true if the thought is pending. */
  const pending = useSelector(state => {
    const thought = getThoughtById(state, thoughtId)
    // Do not show context as pending since it will remain pending until expanded, and the context value is already loaded so there is nothing missing from the context view UI.
    // (Another approach would be to pre-load the context children as soon as the context view is activated.)
    const showContextsParent = isContextViewActive(state, parentOf(path))
    return isContextPending || (!showContextsParent && (thought?.pending || thought?.generating))
  })

  /** Returns true if the thought or its Lexeme is missing. */
  const missing = useSelector(state => {
    const thought = getThoughtById(state, thoughtId)
    return !thought || !getLexeme(state, thought.value)
  })

  // Returns true if any of the thought's children are missing. Only shown when showHiddenThoughts is true until an autorepair solution is found.
  const childrenMissing = useSelector(state => {
    if (!state.showHiddenThoughts) return false
    const thought = getThoughtById(state, thoughtId)
    if (!thought) return false
    const children = getAllChildrenAsThoughts(state, thought.id)
    return children.length < Object.keys(thought.childrenMap).length
  })

  const fill = useSelector(state => getThoughtFill(state, thoughtId))

  /** The 1-based ordinal and style of an ordered list item, or null if the thought is not in an ordered context. A thought is ordered when its parent has =children/=bullet/Ordered|Alpha or its grandparent has =grandchildren/=bullet/Ordered|Alpha. */
  const ordered = useSelector((state): { index: number; style: 'Ordered' | 'Alpha' } | null => {
    // Ordered numbering does not apply in the context view.
    if (showContexts) return null
    // childIndexNonAttribute is -1 for attributes and undefined outside the linearized tree; neither should be numbered.
    if (childIndexNonAttribute == null || childIndexNonAttribute < 0) return null
    const thought = getThoughtById(state, thoughtId)
    // Never number a meta attribute (e.g. =children itself when hidden thoughts are shown).
    if (!thought || isAttribute(thought.value)) return null
    const parentId = thought.parentId
    const grandparentId = getThoughtById(state, parentId)?.parentId ?? null
    const bulletStyle =
      attribute(state, findDescendant(state, parentId, '=children'), '=bullet') ??
      attribute(state, findDescendant(state, grandparentId, '=grandchildren'), '=bullet')
    if (bulletStyle !== 'Ordered' && bulletStyle !== 'Alpha') return null
    // Number by position among visible (non-meta) siblings, precomputed once by linearizeTree in render order.
    return { index: childIndexNonAttribute + 1, style: bulletStyle }
  }, shallowEqual)

  const isExpanded = useSelector(state => !!state.expanded[hashPath(path)])
  const isBulletExpanded = isCursorParent || isCursorGrandparent || isEditing || isExpanded

  const isRoot = simplePath.length === 1
  const isRootChildLeaf = simplePath.length === 2 && leaf

  return (
    <BulletPositioner
      dragSource={dragSource}
      longPressProps={longPressProps}
      isEditing={isEditing}
      leaf={leaf}
      path={path}
      simplePath={simplePath}
      isCursorGrandparent={isCursorGrandparent}
      isCursorParent={isCursorParent}
      isInContextView={isInContextView}
      isDragging={isDragging}
      isTableCol1={isTableCol1}
      ref={svgElement}
    >
      <g>
        {!(publish && (isRoot || isRootChildLeaf)) && isHighlighted && !isDropGutterDeleteHovering && (
          <BulletHighlightOverlay isHighlighted={isHighlighted} leaf={leaf} publish={publish} simplePath={simplePath} />
        )}
        {ordered != null ? (
          <BulletOrdered fill={fill} index={ordered.index} style={ordered.style} />
        ) : leaf && !showContexts ? (
          <BulletLeaf
            done={isDone}
            fill={fill}
            isHighlighted={isHighlighted}
            dimmed={isDropGutterDeleteHovering}
            missing={missing}
            pending={pending}
            showContexts={showContexts}
            isBulletExpanded={isBulletExpanded}
          />
        ) : (
          <BulletParent
            currentScale={svgElement.current?.currentScale || 1}
            done={isDone}
            fill={fill}
            isHighlighted={isHighlighted}
            childrenMissing={childrenMissing}
            pending={pending}
            showContexts={showContexts}
            isBulletExpanded={isBulletExpanded}
          />
        )}
      </g>
    </BulletPositioner>
  )
}

const BulletMemo = React.memo(Bullet)
BulletMemo.displayName = 'Bullet'

export default BulletMemo
