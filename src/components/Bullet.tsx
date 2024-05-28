import classNames from 'classnames'
import React, { useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import { deleteAttributeActionCreator as deleteAttribute } from '../actions/deleteAttribute'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { setDescendantActionCreator as setDescendant } from '../actions/setDescendant'
import { isMac, isSafari, isTouch, isiPhone } from '../browser'
import attributeEquals from '../selectors/attributeEquals'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts, getChildren } from '../selectors/getChildren'
import getLexeme from '../selectors/getLexeme'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import themeColors from '../selectors/themeColors'
import hashPath from '../util/hashPath'
import head from '../util/head'
import parentOf from '../util/parentOf'

interface BulletProps {
  // See: ThoughtProps['isContextPending']
  isContextPending?: boolean
  isDragging?: boolean
  isEditing?: boolean
  leaf?: boolean
  onClick?: (event: React.MouseEvent | React.TouchEvent) => void
  publish?: boolean
  showContexts?: boolean
  simplePath: SimplePath
  path: Path
  thoughtId: ThoughtId
}

const isIOSSafari = isTouch && isiPhone && isSafari()

/** A circle bullet for leaf thoughts. */
const BulletLeaf = ({
  fill,
  isHighlighted,
  missing,
  pending,
  showContexts,
}: { fill?: string; isHighlighted?: boolean; missing?: boolean; pending?: boolean; showContexts?: boolean } = {}) => {
  const colors = useSelector(themeColors)
  const radius = isIOSSafari ? 105 : 92
  return (
    <ellipse
      aria-label='bullet-glyph'
      className={classNames({
        'glyph-fg': true,
        gray: missing,
        graypulse: pending,
      })}
      ry={radius}
      rx={radius}
      cy='298'
      cx='297'
      style={{
        // allow .gray to define fill when missing
        // allow .graypulse to define fill when pending
        fill: showContexts ? 'none' : isHighlighted ? colors.highlight : fill,
        stroke: showContexts ? 'none' : isHighlighted ? colors.highlight : fill,
      }}
      strokeWidth={showContexts ? 30 : undefined}
    />
  )
}

/** A triangle-shaped bullet for thoughts with children. */
const BulletParent = ({
  currentScale,
  fill,
  childrenMissing,
  pending,
  showContexts,
}: {
  currentScale?: number
  fill?: string
  isHighlighted?: boolean
  childrenMissing?: boolean
  pending?: boolean
  showContexts?: boolean
} = {}) => {
  const colors = useSelector(themeColors)
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
      className={classNames({ 'glyph-fg': true, triangle: true, gray: childrenMissing, graypulse: pending })}
      style={{
        transformOrigin: calculateTransformOrigin(),
      }}
      d={path}
      strokeWidth={showContexts ? 30 : undefined}
      stroke={colors.fg85}
      fill={showContexts ? 'none' : fill}
    />
  )
}

/** A larger circle that surrounds the bullet of the cursor thought. */
const BulletCursorOverlay = ({
  isHighlighted,
}: {
  isEditing?: boolean
  isHighlighted?: boolean
  leaf?: boolean
  publish?: boolean
  simplePath: SimplePath
}) => {
  const colors = useSelector(themeColors)
  const bulletOverlayRadius = isIOSSafari ? 300 : 245
  return (
    <ellipse
      className='bullet-cursor-overlay'
      ry={bulletOverlayRadius}
      rx={bulletOverlayRadius}
      cy='300'
      cx='300'
      style={{
        fillOpacity: isHighlighted ? 1 : 0.25,
        fill: isHighlighted ? colors.highlight : colors.fg,
        stroke: isHighlighted ? colors.highlight : undefined,
      }}
    />
  )
}

/** Connect bullet to contextViews so it can re-render independent from <Subthought>. */
const Bullet = ({
  isContextPending,
  isDragging,
  isEditing,
  leaf,
  onClick,
  path,
  publish,
  simplePath,
  thoughtId,
}: BulletProps) => {
  const svgElement = useRef<SVGSVGElement>(null)
  const dispatch = useDispatch()
  const dragHold = useSelector(state => state.dragHold)
  const showContexts = useSelector(state => isContextViewActive(state, path))
  // if being edited and meta validation error has occured
  const invalid = useSelector(state => !!isEditing && state.invalidState)
  const fontSize = useSelector(state => state.fontSize)
  const isTableCol1 = useSelector(state =>
    attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table'),
  )
  const isHighlighted = useSelector(state => {
    const isHolding = state.draggedSimplePath && head(state.draggedSimplePath) === head(simplePath)
    return isHolding || isDragging
  })

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

  const colors = useSelector(themeColors)

  // fill =bullet/=style override
  const fill = useSelector(state => {
    const bulletId = findDescendant(state, head(simplePath), '=bullet')
    const styles = getStyle(state, bulletId)
    return styles?.color
  })

  // offset margin with padding by equal amounts proportional to the font size to extend the click area
  const extendClickWidth = fontSize * 1.2
  const extendClickHeight = fontSize / 3
  const lineHeight = fontSize * 1.25
  const isRoot = simplePath.length === 1
  const isRootChildLeaf = simplePath.length === 2 && leaf

  // expand or collapse on click
  // has some additional logic to make it work intuitively with pin true/false
  const clickHandler = useCallback(
    (e: React.MouseEvent) => {
      // stop click event from bubbling up to Content.clickOnEmptySpace
      e.stopPropagation()
      // short circuit if dragHold
      // useLongPress stop is activated in onMouseUp but is delayed to ensure that dragHold is still true here
      // stopping propagation from useLongPress was not working either due to bubbling order or mismatched event type
      if (dragHold) return

      dispatch((dispatch, getState) => {
        const state = getState()
        const isExpanded = state.expanded[hashPath(path)]
        const children = getChildren(state, head(path))
        const shouldCollapse = isExpanded && children.length > 0
        const pathParent = path.length > 1 ? parentOf(path) : null
        const parentChildren = pathParent ? getChildren(state, head(pathParent)) : null
        // if thought is not expanded, set the cursor on the thought
        // if thought is expanded, collapse it by moving the cursor to its parent
        dispatch([
          // set pin false on expanded only child
          ...(isExpanded &&
          (parentChildren?.length === 1 ||
            findDescendant(state, pathParent && head(pathParent), ['=children', '=pin', 'true']))
            ? [setDescendant({ path: simplePath, values: ['=pin', 'false'] })]
            : [deleteAttribute({ path: simplePath, value: '=pin' })]),
          // move cursor
          setCursor({ path: shouldCollapse ? pathParent : path }),
        ])
      })
      onClick?.(e)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragHold],
  )

  return (
    <span
      aria-label='bullet'
      className={classNames({
        bullet: true,
        'show-contexts': showContexts,
        'invalid-option': invalid,
      })}
      style={{
        marginTop: -extendClickHeight,
        // calculate position of thought for different font sizes
        // Table column 1 needs more space between the bullet and thought for some reason
        marginLeft: (fontSize - 9) * 0.5 - 11 - extendClickWidth - (isTableCol1 ? fontSize / 4 : 0),
        marginBottom: -extendClickHeight - 2,
        paddingTop: extendClickHeight,
        paddingLeft: extendClickWidth,
        paddingBottom: extendClickHeight + 2,
        position: 'absolute',
        verticalAlign: 'top',
        width: 4, // make the bullet wide enough to be clicked, but not enough to encroach on the editable
        cursor: 'pointer',
      }}
      onClick={clickHandler}
    >
      <svg
        className='glyph'
        viewBox='0 0 600 600'
        style={{
          height: lineHeight,
          width: lineHeight,
          marginLeft: -lineHeight,
          // required to make the distance between bullet and thought scale properly at all font sizes.
          left: lineHeight * 0.317,
          marginBottom: isIOSSafari ? '-0.2em' : '-0.3em',
          ...(isHighlighted
            ? {
                fillOpacity: 1,
                fill: colors.highlight,
                stroke: colors.highlight,
              }
            : null),
        }}
        ref={svgElement}
      >
        <g>
          {!(publish && (isRoot || isRootChildLeaf)) && (isEditing || isHighlighted) && (
            <BulletCursorOverlay
              isEditing={isEditing}
              isHighlighted={isHighlighted}
              leaf={leaf}
              publish={publish}
              simplePath={simplePath}
            />
          )}
          {leaf && !showContexts ? (
            <BulletLeaf
              fill={fill}
              isHighlighted={isHighlighted}
              missing={missing}
              pending={pending}
              showContexts={showContexts}
            />
          ) : (
            <BulletParent
              currentScale={svgElement.current?.currentScale || 1}
              fill={fill}
              isHighlighted={isHighlighted}
              childrenMissing={childrenMissing}
              pending={pending}
              showContexts={showContexts}
            />
          )}
        </g>
      </svg>
    </span>
  )
}

const BulletMemo = React.memo(Bullet)
BulletMemo.displayName = 'Bullet'

export default BulletMemo
