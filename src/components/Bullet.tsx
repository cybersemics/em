import React, { useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css, cva, cx } from '../../styled-system/css'
import { bulletRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import { deleteAttributeActionCreator as deleteAttribute } from '../actions/deleteAttribute'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { setDescendantActionCreator as setDescendant } from '../actions/setDescendant'
import { isMac, isSafari, isTouch, isiPhone } from '../browser'
import { AlertType, LongPressState } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts, getChildren } from '../selectors/getChildren'
import getLexeme from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import getThoughtFill from '../selectors/getThoughtFill'
import isContextViewActive from '../selectors/isContextViewActive'
import isMulticursorPath from '../selectors/isMulticursorPath'
import isPinned from '../selectors/isPinned'
import rootedParentOf from '../selectors/rootedParentOf'
import fastClick from '../util/fastClick'
import getBulletWidth from '../util/getBulletWidth'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isDivider from '../util/isDivider'
import parentOf from '../util/parentOf'
import BulletWrapper from './BulletWrapper'

interface BulletProps {
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
}

const isIOSSafari = isTouch && isiPhone && isSafari()

const glyph = cva({
  base: {
    fill: 'bullet',
    position: 'relative',
    '@media (max-width: 500px)': {
      _android: {
        position: 'relative',
        marginLeft: '-16.8px',
        marginRight: '-5px',
        left: '3px',
        fontSize: '16px',
      },
    },
    '@media (min-width: 560px) and (max-width: 1024px)': {
      _android: {
        position: 'relative',
        marginLeft: '-16.8px',
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

/** A larger circle that surrounds the bullet of the cursor thought. */
const BulletHighlightOverlay = ({
  isHighlighted,
}: {
  isHighlighted?: boolean
  leaf?: boolean
  publish?: boolean
  simplePath: SimplePath
}) => {
  const bulletOverlayRadius = isIOSSafari ? 300 : 245
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

  /** True if the the user is dragging the thought and hovering over the DeleteDrop QuickDrop icon. */
  const isQuickDropDeleteHovering = useSelector(
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

  const isExpanded = useSelector(state => !!state.expanded[hashPath(path)])
  const isBulletExpanded = isCursorParent || isCursorGrandparent || isEditing || isExpanded

  const isRoot = simplePath.length === 1
  const isRootChildLeaf = simplePath.length === 2 && leaf

  return (
    <BulletWrapper
      isEditing={isEditing}
      leaf={leaf}
      path={path}
      simplePath={simplePath}
      isCursorGrandparent={isCursorGrandparent}
      isCursorParent={isCursorParent}
      isInContextView={isInContextView}
      isHighlighted={isHighlighted}
      isTableCol1={isTableCol1}
      ref={svgElement}
    >
      <g>
        {!(publish && (isRoot || isRootChildLeaf)) && isHighlighted && !isQuickDropDeleteHovering && (
          <BulletHighlightOverlay isHighlighted={isHighlighted} leaf={leaf} publish={publish} simplePath={simplePath} />
        )}
        {leaf && !showContexts ? (
          <BulletLeaf
            done={isDone}
            fill={fill}
            isHighlighted={isHighlighted}
            dimmed={isQuickDropDeleteHovering}
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
    </BulletWrapper>
  )
}

const BulletMemo = React.memo(Bullet)
BulletMemo.displayName = 'Bullet'

export default BulletMemo
