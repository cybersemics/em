import { PropsWithChildren, forwardRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css, cva, cx } from '../../styled-system/css'
import { bulletRecipe } from '../../styled-system/recipes'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import { deleteAttributeActionCreator as deleteAttribute } from '../actions/deleteAttribute'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { setDescendantActionCreator as setDescendant } from '../actions/setDescendant'
import { isMac, isSafari, isTouch, isiPhone } from '../browser'
import { LongPressState } from '../constants'
import findDescendant from '../selectors/findDescendant'
import getChildren from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import isMulticursorPath from '../selectors/isMulticursorPath'
import isPinned from '../selectors/isPinned'
import fastClick from '../util/fastClick'
import getBulletWidth from '../util/getBulletWidth'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isDivider from '../util/isDivider'
import parentOf from '../util/parentOf'

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

type BulletWrapperProps = {
  path: Path
  simplePath: SimplePath
  isEditing: boolean
  isInContextView?: boolean
  isTableCol1?: boolean
  isCursorParent?: boolean
  isCursorGrandparent?: boolean
  leaf: boolean | undefined
  cursorOverlay?: boolean
  isDragging?: boolean
}

/**
 * BulletWrapper is a reusable component that being used to render the actual Bullet and BulletCursorOverlay.
 */
const BulletWrapper = forwardRef<SVGSVGElement, PropsWithChildren<BulletWrapperProps>>(
  (
    {
      children,
      path,
      isEditing,
      isInContextView,
      isTableCol1,
      simplePath,
      isCursorParent,
      isCursorGrandparent,
      leaf,
      isDragging,
      cursorOverlay,
    },
    ref,
  ) => {
    const thoughtId = head(path)

    const dispatch = useDispatch()

    const showContexts = useSelector(state => isContextViewActive(state, path))

    const invalid = useSelector(state => isEditing && state.invalidState)

    const bulletIsDivider = useSelector(state => isDivider(getThoughtById(state, head(path))?.value))

    const fontSize = useSelector(state => state.fontSize)

    const dragHold = useSelector(state => state.longPress === LongPressState.DragHold)
    const isMulticursor = useSelector(state => isMulticursorPath(state, path))

    const isHighlighted = useSelector(state => {
      const isHolding = state.draggedSimplePath && head(state.draggedSimplePath) === head(simplePath)
      return isHolding || isDragging || isMulticursor
    })
    // expand or collapse on click
    // has some additional logic to make it work intuitively with pin true/false
    const clickHandler = useCallback(
      (e: React.MouseEvent) => {
        // short circuit if dragHold
        // useLongPress stop is activated in onMouseUp but is delayed to ensure that dragHold is still true here
        // stopping propagation from useLongPress was not working either due to bubbling order or mismatched event type
        if (dragHold) return

        // short circuit if toggling multiselect
        if (!isTouch && (isMac ? e.metaKey : e.ctrlKey)) {
          return
        }

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
            (!pathParent ||
              parentChildren?.length === 1 ||
              findDescendant(state, pathParent && head(pathParent), ['=children', '=pin', 'true']))
              ? [setDescendant({ path: simplePath, values: ['=pin', 'false'] })]
              : [deleteAttribute({ path: simplePath, value: '=pin' })]),
            // move cursor
            setCursor({ path: shouldCollapse ? pathParent : path, preserveMulticursor: true }),
          ])
        })
      },
      [dispatch, dragHold, path, simplePath],
    )

    // check if the thought is pinned
    const isThoughtPinned = useSelector(state => !!isPinned(state, thoughtId))

    const isExpanded = useSelector(state => !!state.expanded[hashPath(path)])
    const isBulletExpanded = isCursorParent || isCursorGrandparent || isEditing || isExpanded

    // offset margin with padding by equal amounts proportional to the font size to extend the click area
    const extendClickWidth = fontSize * 1.2
    const extendClickHeight = fontSize / 3
    const lineHeight = fontSize * 1.25

    const width = getBulletWidth(fontSize) + (!isInContextView && isTableCol1 ? fontSize / 4 : 0)
    const marginLeft = -width

    // Bottom margin for bullet to align with thought text
    const glyphBottomMargin = isIOSSafari ? '-0.2em' : '-0.3em'

    return (
      <span
        data-testid={cursorOverlay ? undefined : 'bullet-' + hashPath(path)}
        aria-label={cursorOverlay ? undefined : 'bullet'}
        data-highlighted={cursorOverlay ? undefined : isHighlighted}
        className={cx(
          bulletRecipe({ invalid }),
          css({
            _mobile: {
              marginRight: showContexts ? '-1.5px' : undefined,
            },
            '@media (min-width: 560px) and (max-width: 1024px)': {
              _android: {
                transition: `transform {durations.veryFast} ease-in-out`,
                marginLeft: '-3px',
              },
            },
            '@media (max-width: 500px)': {
              _android: {
                marginLeft: '-3px',
              },
            },
            display: bulletIsDivider ? 'none' : undefined,
            position: 'absolute',
            verticalAlign: 'top',
            cursor: 'pointer',
          }),
        )}
        style={{
          top: -extendClickHeight,
          left: -extendClickWidth + marginLeft,
          paddingTop: extendClickHeight,
          paddingLeft: extendClickWidth,
          paddingBottom: extendClickHeight + 2,
          width,
        }}
        {...(!cursorOverlay && fastClick(clickHandler, { enableHaptics: false }))}
      >
        <svg
          className={cx(
            glyph({ isBulletExpanded, showContexts, leaf }),
            css({
              // Safari has a known issue with subpixel calculations, especially during animations and with SVGs.
              // This caused the bullet slide animation to end with a jerky movement.
              // By setting "will-change: transform;", we hint to the browser that the transform property will change in the future,
              // allowing the browser to optimize the animation.
              willChange: 'transform',
              // run grow animation on pin activation
              animation: isThoughtPinned ? 'bulletGrow {durations.fast} ease-out' : undefined,
              ...(isHighlighted
                ? {
                    fillOpacity: 1,
                    fill: 'highlight',
                    stroke: 'highlight',
                  }
                : null),
            }),
          )}
          viewBox='0 0 600 600'
          style={{
            height: lineHeight,
            width: lineHeight,
            marginLeft: -lineHeight,
            // required to make the distance between bullet and thought scale properly at all font sizes.
            left: lineHeight * 0.317,
            marginBottom: glyphBottomMargin,
          }}
          ref={ref}
        >
          {children}
        </svg>
      </span>
    )
  },
)

BulletWrapper.displayName = 'BulletWrapper'

export default BulletWrapper
