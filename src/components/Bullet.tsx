import classNames from 'classnames'
import React, { useRef } from 'react'
import { connect, useDispatch, useSelector } from 'react-redux'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import deleteAttribute from '../action-creators/deleteAttribute'
import setCursor from '../action-creators/setCursor'
import setDescendant from '../action-creators/setDescendant'
import { isMac, isSafari, isTouch, isiPhone } from '../browser'
import findDescendant from '../selectors/findDescendant'
import { getChildren } from '../selectors/getChildren'
import getLexeme from '../selectors/getLexeme'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import isPending from '../selectors/isPending'
import theme from '../selectors/theme'
import themeColors from '../selectors/themeColors'
import hashPath from '../util/hashPath'
import head from '../util/head'
import parentOf from '../util/parentOf'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

interface BulletProps {
  // See: ThoughtProps['isContextPending']
  isContextPending?: boolean
  isDragging?: boolean
  isEditing?: boolean
  leaf?: boolean
  onClick?: (event: React.MouseEvent) => void
  publish?: boolean
  showContexts?: boolean
  simplePath: SimplePath
  path: Path
  thoughtId: ThoughtId
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: BulletProps) => {
  const { invalidState } = state
  const thought = getThoughtById(state, props.thoughtId)
  const lexeme = thought ? getLexeme(state, thought.value) : null
  const isHolding = state.draggedSimplePath && head(state.draggedSimplePath) === head(props.simplePath)
  return {
    // if being edited and meta validation error has occured
    invalid: !!props.isEditing && invalidState,
    isHighlighted: isHolding || props.isDragging,
    missing: !lexeme,
    fontSize: state.fontSize,
    // Do not show context as pending since it will remain pending until expanded, and the context value is already loaded so there is nothing missing from the context view UI.
    // (Another approach would be to pre-load the context children as soon as the context view is activated.)
    pending: props.isContextPending || (!isContextViewActive(state, parentOf(props.path)) && isPending(state, thought)),
    showContexts: isContextViewActive(state, props.path),
    dark: theme(state) !== 'Light',
  }
}

/** A circle bullet for leaf thoughts. */
const BulletLeaf = ({
  fill,
  isHighlighted,
  missing,
  pending,
  showContexts,
}: { fill?: string; isHighlighted?: boolean; missing?: boolean; pending?: boolean; showContexts?: boolean } = {}) => {
  const colors = useSelector(themeColors)
  const isIOSSafari = isTouch && isiPhone && isSafari()
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
        // allow 'gray' className to define fill when missing
        fill: isHighlighted ? colors.highlight : missing ? undefined : colors.fg,
        stroke: isHighlighted ? colors.highlight : undefined,
      }}
      strokeWidth={showContexts ? 30 : undefined}
      stroke={showContexts ? 'none' : colors.fg85}
      fill={showContexts ? 'none' : fill}
    />
  )
}

/** A triangle-shaped bullet for thoughts with children. */
const BulletParent = ({
  currentScale,
  fill,
  isHighlighted,
  missing,
  pending,
  showContexts,
}: {
  currentScale?: number
  fill?: string
  isHighlighted?: boolean
  missing?: boolean
  pending?: boolean
  showContexts?: boolean
} = {}) => {
  const colors = useSelector(themeColors)
  const isIOSSafari = isTouch && isiPhone && isSafari()
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
      className={classNames({ 'glyph-fg': true, triangle: true, gray: missing, graypulse: pending })}
      style={{
        transformOrigin: calculateTransformOrigin(),
      }}
      d={path}
      strokeWidth={showContexts ? 30 : undefined}
      stroke={showContexts ? 'none' : colors.fg85}
      fill={showContexts ? 'none' : fill}
    />
  )
}

/** A larger circle that surrounds the bullet of the cursor thought. */
const BulletCursorOverlay = ({
  isEditing,
  isHighlighted,
  leaf,
  publish,
  simplePath,
}: {
  isEditing?: boolean
  isHighlighted?: boolean
  leaf?: boolean
  publish?: boolean
  simplePath: SimplePath
}) => {
  const colors = useSelector(themeColors)
  const isIOSSafari = isTouch && isiPhone && isSafari()
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
  dark,
  fontSize,
  invalid,
  isContextPending,
  isHighlighted,
  isEditing,
  leaf,
  missing,
  onClick,
  path,
  pending,
  publish,
  showContexts,
  simplePath,
}: BulletProps & ReturnType<typeof mapStateToProps>) => {
  const svgElement = useRef<SVGSVGElement>(null)
  const dispatch = useDispatch()
  const dragHold = useSelector((state: State) => state.dragHold)
  const colors = useSelector(themeColors)
  const fill = useSelector((state: State) => {
    const bulletId = findDescendant(state, head(simplePath), '=bullet')
    const styles = getStyle(state, bulletId)
    return styles?.color || colors.fg85
  })

  // offset margin with padding by equal amounts proportional to the font size to extend the click area
  const extendClickWidth = fontSize * 1.2
  const extendClickHeight = fontSize / 3
  const lineHeight = fontSize * 1.25
  const isIOSSafari = isTouch && isiPhone && isSafari()
  const isRoot = simplePath.length === 1
  const isRootChildLeaf = simplePath.length === 2 && leaf

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
        marginLeft: (fontSize - 9) * 0.5 - 11 - extendClickWidth,
        marginBottom: -extendClickHeight - 2,
        paddingTop: extendClickHeight,
        paddingLeft: extendClickWidth,
        paddingBottom: extendClickHeight + 2,
        position: 'absolute',
        verticalAlign: 'top',
        width: 4, // make the bullet wide enough to be clicked, but not enough to encroach on the editable
        cursor: 'pointer',
      }}
      onClick={(e: React.MouseEvent) => {
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
      }}
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
              missing={missing}
              pending={pending}
              showContexts={showContexts}
            />
          )}
        </g>
      </svg>
    </span>
  )
}

export default connect(mapStateToProps)(Bullet)
