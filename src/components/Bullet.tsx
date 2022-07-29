import classNames from 'classnames'
import React, { useRef } from 'react'
import { connect, useDispatch } from 'react-redux'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import deleteAttribute from '../action-creators/deleteAttribute'
import setAttribute from '../action-creators/setAttribute'
import setCursor from '../action-creators/setCursor'
import { isMac, isSafari, isTouch, isiPhone } from '../browser'
import findDescendant from '../selectors/findDescendant'
import { getChildren } from '../selectors/getChildren'
import getLexeme from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import { isContextViewActiveById } from '../selectors/isContextViewActive'
import isPending from '../selectors/isPending'
import theme from '../selectors/theme'
import hashPath from '../util/hashPath'
import head from '../util/head'
import parentOf from '../util/parentOf'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

interface BulletProps {
  hideBullet?: boolean
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
  const lexeme = getLexeme(state, thought.value)
  return {
    // if being edited and meta validation error has occured
    invalid: !!props.isEditing && invalidState,
    missing: !lexeme,
    fontSize: state.fontSize,
    pending: props.isContextPending || isPending(state, thought),
    showContexts: isContextViewActiveById(state, head(props.path)),
    dark: theme(state) !== 'Light',
  }
}

/** Connect bullet to contextViews so it can re-render independent from <Subthought>. */
const Bullet = ({
  dark,
  fontSize,
  hideBullet,
  invalid,
  isContextPending,
  isDragging,
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
  const isRoot = simplePath.length === 1
  const isRootChildLeaf = simplePath.length === 2 && leaf
  const svgElement = useRef<SVGSVGElement>(null)
  const dispatch = useDispatch()

  const lineHeight = fontSize * 1.25
  const svgSizeStyle = {
    height: lineHeight,
    width: lineHeight,
    marginLeft: -lineHeight,
    // required to make the distance between bullet and thought scale properly at all font sizes.
    left: lineHeight * 0.317,
  }

  // calculate position of thought for different font sizes
  const bulletMarginLeft = (fontSize - 9) * 0.5 - 11

  /** Gets pixel based center for OSX safari as it can't handle "center" or percentage based values in SVGs. */
  const calculateTransformOrigin = () => {
    const isOSXSafari = isMac && isSafari()
    const currentScale = svgElement.current?.currentScale || 1
    const svgCenter = 300
    const transformOrigin = isOSXSafari ? `${currentScale * svgCenter}px ${currentScale * svgCenter}px` : 'center'
    return transformOrigin
  }

  // props to pass based on different platforms
  const isIOSSafari = isTouch && isiPhone && isSafari()
  const vendorSpecificData = isIOSSafari
    ? {
        foregroundShape: {
          ellipseRadius: '105',
          path: 'M194.95196151422277,180.42647327382525 L194.95196151422277,419.57354223877866 L413.24607972032067,298.0609718441649 L194.95196151422277,180.42646533261976 L194.95196151422277,180.42647327382525 z',
        },
        bulletOverlayRadius: '300',
        glyphMarginBottom: '-0.2em',
      }
    : {
        foregroundShape: {
          ellipseRadius: '92',
          path: 'M260.8529375873694,149.42646091838702 L260.8529375873694,450.5735238982077 L409.1470616167427,297.55825763741126 L260.8529375873694,149.42646091838702 z',
        },
        bulletOverlayRadius: '245',
        glyphMarginBottom: '-0.3em',
      }

  /** Return circle or triangle for the bullet. */
  const foregroundShape = (classes = {}) => {
    const foregroundShapeProps = showContexts
      ? {
          strokeWidth: '30',
          stroke: dark ? '#d9d9d9' : '#000',
          fill: 'none',
        }
      : {
          stroke: 'none',
          fill: dark ? '#d9d9d9' : '#000',
        }

    const { ellipseRadius, path } = vendorSpecificData.foregroundShape

    return leaf ? (
      <ellipse
        aria-label='bullet-glyph'
        className={classNames({
          'glyph-fg': true,
          ...classes,
        })}
        ry={ellipseRadius}
        rx={ellipseRadius}
        cy='298'
        cx='297'
        {...foregroundShapeProps}
      />
    ) : (
      <path
        className={classNames({ 'glyph-fg': true, triangle: true, ...classes })}
        style={{ transformOrigin: calculateTransformOrigin() }}
        d={path}
        {...foregroundShapeProps}
      />
    )
  }

  // offset margin with padding by equal amounts proportional to the font size to extend the click area
  const extendClickWidth = fontSize * 1.2
  const extendClickHeight = fontSize / 3

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
        marginLeft: bulletMarginLeft - extendClickWidth,
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
        e.stopPropagation()
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
              ? [setAttribute({ path: simplePath, key: '=pin', value: 'false' })]
              : [deleteAttribute({ path: simplePath, key: '=pin' })]),
            // move cursor
            setCursor({ path: shouldCollapse ? pathParent : path }),
          ])
        })
        onClick?.(e)
      }}
    >
      <svg
        className={classNames('glyph', {
          'glyph-highlighted': isDragging,
        })}
        viewBox='0 0 600 600'
        style={{
          ...svgSizeStyle,
          marginBottom: vendorSpecificData.glyphMarginBottom,
        }}
        ref={svgElement}
      >
        <g>
          {!(publish && (isRoot || isRootChildLeaf)) && !hideBullet && (
            <ellipse
              className='bullet-cursor-overlay'
              fillOpacity='0'
              ry={vendorSpecificData.bulletOverlayRadius}
              rx={vendorSpecificData.bulletOverlayRadius}
              cy='300'
              cx='300'
              fill={dark ? '#ffffff' : '#000'}
            />
          )}
          {foregroundShape({
            // Since Thoughts and Lexemes are loaded from the db separately, it is common for Lexemes to be temporarily missing.
            // Therefore render in a simple gray rather than an error color.
            // There is not an easy way to distinguish between a Lexeme that is missing and one that is loading, though eventually if all pulls have completed successfully and the Lexeme is still missing we could infer it was an error.
            gray: missing,
            graypulse: pending,
          })}
        </g>
      </svg>
    </span>
  )
}

export default connect(mapStateToProps)(Bullet)
