import React, { useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css, cva, cx } from '../../styled-system/css'
import { bullet } from '../../styled-system/recipes'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import { deleteAttributeActionCreator as deleteAttribute } from '../actions/deleteAttribute'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { setDescendantActionCreator as setDescendant } from '../actions/setDescendant'
import { isMac, isSafari, isTouch, isiPhone } from '../browser'
// import testFlags from '../e2e/testFlags'
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
import isDivider from '../util/isDivider'
import parentOf from '../util/parentOf'

interface BulletProps {
  // See: ThoughtProps['isContextPending']
  isContextPending?: boolean
  isDragging?: boolean
  isEditing?: boolean
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
}

const isIOSSafari = isTouch && isiPhone && isSafari()

const glyph = cva({
  base: {
    fill: { base: 'rgba(39, 39, 39, 1)', _dark: 'rgba(217, 217, 217, 1)' },
    position: 'relative',
    '@media (max-width: 500px)': {
      _android: {
        position: 'relative',
        marginLeft: '-16.8px',
        opacity: 0.9,
        transition: 'opacity 0.75s ease-in-out',
        marginRight: '-5px',
        left: '3px',
        fontSize: '16px',
      },
    },
    '@media (min-width: 560px) and (max-width: 1024px)': {
      _android: {
        position: 'relative',
        marginLeft: '-16.8px',
        opacity: 0.8,
        transition: 'opacity 0.75s ease-in-out',
        marginRight: '-5px',
        left: '4px',
        fontSize: '28px',
      },
    },
  },
  variants: {
    leaf: { true: {} },
    showContexts: {
      true: {
        _mobile: {
          fontSize: '80%',
          left: '-0.08em',
          top: '0.05em',
        },
        '@media (max-width: 500px)': {
          _android: {
            fontSize: '149%',
            left: '2px',
            top: '-5.1px',
          },
        },
        '@media (min-width: 560px) and (max-width: 1024px)': {
          _android: {
            fontSize: '149%',
            left: '2px',
            top: '-5.1px',
          },
        },
      },
    },
    isBulletExpanded: { true: {} },
    // childrenNew currently unused as NewThought is not importing Bullet
    childrenNew: {
      true: {
        content: "'+'",
        left: '-0.15em',
        top: '-0.05em',
        marginRight: '-0.3em',
        _mobile: {
          left: '0.05em',
          top: '-0.1em',
          marginRight: '-0.1em',
        },
        '@media (max-width: 500px)': {
          _android: {
            content: "'+'",
            left: '0.05em',
            top: '-0.1em',
            marginRight: '-0.1em',
          },
        },
        '@media (min-width: 560px) and (max-width: 1024px)': {
          _android: {
            content: "'+'",
            left: '0.05em',
            top: '-0.1em',
            marginRight: '-0.1em',
          },
        },
      },
    },
  },
  compoundVariants: [
    {
      leaf: true,
      showContexts: true,
      css: {
        fontSize: '90%',
        top: '-0.05em',
        _mobile: {
          top: '0',
          left: '-0.3em',
          marginRight: 'calc(-0.48em - 5px)',
        },
        '@media (max-width: 500px)': {
          _android: {
            position: 'relative',
            fontSize: '160%',
            left: '1px',
            top: '-8.1px',
            marginRight: '-5px',
            paddingRight: '10px',
          },
        },
        '@media (min-width: 560px) and (max-width: 1024px)': {
          _android: {
            position: 'relative',
            fontSize: '171%',
            left: '2px',
            top: '-7.1px',
            marginRight: '-5px',
            paddingRight: '10px',
          },
        },
      },
    },
    {
      leaf: false,
      isBulletExpanded: true,
      css: {
        '@media (max-width: 500px)': {
          _android: {
            left: '2px',
            top: '-1.6px',
            fontSize: '19px',
          },
        },
        '@media (min-width: 560px) and (max-width: 1024px)': {
          _android: {},
        },
      },
    },
    {
      leaf: false,
      showContexts: true,
      isBulletExpanded: true,
      css: {
        '@media (max-width: 500px)': {
          _android: {
            left: '2px',
            fontSize: '20px',
            top: '-2.5px',
          },
        },
        '@media (min-width: 560px) and (max-width: 1024px)': {
          _android: {
            left: '3px',
            top: '-5.1px',
          },
        },
      },
    },
  ],
  defaultVariants: {
    leaf: false,
    showContexts: false,
  },
})

const glyphFg = cva({
  base: {
    transition: 'transform 0.1s ease-out, fill-opacity 0.5s ease-out',
  },
  variants: {
    gray: {
      true: {
        color: '#666',
        fill: '#666',
      },
    },
    graypulse: {
      true: {
        color: '#666',
        fill: '#666',
        '-webkit-animation': {
          // TODO: not sure if this will apply TODO CHRISTINA
          base: 'toblack 400ms infinite alternate ease-in-out',
          _dark: 'towhite 400ms infinite alternate ease-in-out',
        },
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
          left: '-0.02em',
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
  fill,
  isHighlighted,
  missing,
  pending,
  showContexts,
  isBulletExpanded,
}: {
  fill?: string
  isHighlighted?: boolean
  missing?: boolean
  pending?: boolean
  showContexts?: boolean
  isBulletExpanded?: boolean
} = {}) => {
  const colors = useSelector(themeColors)
  const radius = isIOSSafari ? 105 : 92
  return (
    <ellipse
      aria-label='bullet-glyph'
      className={glyphFg({
        gray: missing,
        graypulse: pending,
        showContexts,
        leaf: true,
        isBulletExpanded,
      })}
      data-bullet='leaf'
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
  isBulletExpanded,
}: {
  currentScale?: number
  fill?: string
  isHighlighted?: boolean
  childrenMissing?: boolean
  pending?: boolean
  showContexts?: boolean
  isBulletExpanded?: boolean
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
      className={glyphFg({
        triangle: true,
        gray: childrenMissing,
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
  path,
  publish,
  simplePath,
  thoughtId,
  isCursorGrandparent,
  isCursorParent,
  // depth,
  // debugIndex,
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
  const bulletIsDivider = useSelector(state =>
    isDivider(getThoughtById(state, thoughtId)?.value) ? 'none' : undefined,
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

  const colors = useSelector(themeColors)

  // fill =bullet/=style override
  const fill = useSelector(state => {
    const bulletId = findDescendant(state, head(simplePath), '=bullet')
    const styles = getStyle(state, bulletId)
    return styles?.color
  })

  const isExpanded = useSelector(state => !!state.expanded[hashPath(path)])
  const isBulletExpanded = isCursorParent || isCursorGrandparent || isEditing || isExpanded

  // offset margin with padding by equal amounts proportional to the font size to extend the click area
  const extendClickWidth = fontSize * 1.2
  const extendClickHeight = fontSize / 3
  const lineHeight = fontSize * 1.25
  const isRoot = simplePath.length === 1
  const isRootChildLeaf = simplePath.length === 2 && leaf
  // Bottom margin for bullet to align with thought text
  const glyphBottomMargin = isIOSSafari ? '-0.2em' : '-0.3em'

  // calculate position of bullet for different font sizes
  // Table column 1 needs more space between the bullet and thought for some reason
  const width = 11 - (fontSize - 9) * 0.5 + (isTableCol1 ? fontSize / 4 : 0)
  const marginLeft = -width

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
    },
    [dispatch, dragHold, path, simplePath],
  )

  return (
    <span
      data-testid={'bullet-' + hashPath(path)}
      aria-label='bullet'
      className={cx(
        bullet({ invalid }),
        css({
          _mobile: {
            marginRight: showContexts ? '-1.5px' : undefined,
          },
          '@media (min-width: 560px) and (max-width: 1024px)': {
            _android: {
              transition: 'transform 0.1s ease-in-out',
              marginLeft: '-3px',
            },
          },
          '@media (max-width: 500px)': {
            _android: {
              marginLeft: '-3px',
            },
          },
          display: bulletIsDivider,
          position: 'absolute',
          verticalAlign: 'top',
          cursor: 'pointer',
        }),
      )}
      style={{
        marginTop: -extendClickHeight,
        marginLeft: -extendClickWidth + marginLeft,
        marginBottom: -extendClickHeight - 2,
        paddingTop: extendClickHeight,
        paddingLeft: extendClickWidth,
        paddingBottom: extendClickHeight + 2,
        width,
      }}
      onClick={clickHandler}
    >
      <svg
        className={glyph({ isBulletExpanded, showContexts, leaf })}
        viewBox='0 0 600 600'
        style={{
          // Safari has a known issue with subpixel calculations, especially during animations and with SVGs.
          // This caused the bullet slide animation to end with a jerky movement.
          // By setting "will-change: transform;", we hint to the browser that the transform property will change in the future,
          // allowing the browser to optimize the animation.
          willChange: 'transform',
          height: lineHeight,
          width: lineHeight,
          marginLeft: -lineHeight,
          // required to make the distance between bullet and thought scale properly at all font sizes.
          left: lineHeight * 0.317,
          marginBottom: glyphBottomMargin,
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
              isBulletExpanded={isBulletExpanded}
            />
          ) : (
            <BulletParent
              currentScale={svgElement.current?.currentScale || 1}
              fill={fill}
              isHighlighted={isHighlighted}
              childrenMissing={childrenMissing}
              pending={pending}
              showContexts={showContexts}
              isBulletExpanded={isBulletExpanded}
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
