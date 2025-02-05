/*

Test:

  - Gestures disabled during toolbar scroll
  - Overlay shown on hover/tap-and-hold after delay
  - Overlay hidden on toolbar scroll
  - Overlay hidden on touch "leave"

*/
import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { css, cva, cx } from '../../styled-system/css'
import { toolbarPointerEventsRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import CommandType from '../@types/Command'
import CommandId from '../@types/CommandId'
import TipId from '../@types/TipId'
import { showTipActionCreator as showTip } from '../actions/showTip'
import { isIOS } from '../browser'
import { commandById } from '../commands'
import { TOOLBAR_DEFAULT_COMMANDS, TOOLBAR_PRESS_ANIMATION_DURATION } from '../constants'
import usePositionFixed from '../hooks/usePositionFixed'
import getUserToolbar from '../selectors/getUserToolbar'
import distractionFreeTypingStore from '../stores/distractionFreeTyping'
import FadeTransition from './FadeTransition'
import ToolbarButton from './ToolbarButton'
import TriangleLeft from './TriangleLeft'
import TriangleRight from './TriangleRight'

interface ToolbarProps {
  // places the toolbar into customize mode where buttons can be dragged and dropped.
  customize?: boolean
  onSelect?: (command: CommandType) => void
  selected?: CommandId
}

const arrow = cva({
  base: {
    position: 'absolute',
    fontSize: '80%',
    paddingTop: '15px',
    verticalAlign: 'middle',
    color: 'gray66',
    backgroundColor: 'bg',
    display: 'inline-block',
    lineHeight: '20px',
    zIndex: 'toolbarArrow',
  },
  variants: {
    isHidden: {
      true: {
        display: 'none !important',
      },
    },
    direction: {
      left: {
        marginLeft: '-5px',
        paddingLeft: '5px',
        paddingRight: '4px',
      },
      right: {
        right: '-11px',
        paddingLeft: '4px',
        paddingRight: '13px',
      },
    },
    fixed: { true: {} },
  },
  compoundVariants: [
    {
      direction: 'right',
      fixed: true,
      css: {
        right: '0',
      },
    },
  ],
})

/** Calculates the top padding for vertically centering toolbar arrows. */
const calculatePaddingTop = (fontSize: number) => Math.floor(0.3 * fontSize + 11.6)

/** Toolbar component. */
const Toolbar: FC<ToolbarProps> = ({ customize, onSelect, selected }) => {
  const dispatch = useDispatch()
  // track scrollLeft after each touchend
  // this is used to reset pressingToolbarId when the user has scrolled at least 5px
  const lastScrollLeft = useRef<number>(0)
  const toolbarContainerRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [leftArrowIsShown, setLeftArrowIsShown] = useState(false)
  const [rightArrowIsShown, setRightArrowIsShown] = useState(true)
  const [pressingToolbarId, setPressingToolbarId] = useState<string | null>(null)
  const [latestPress, setLatestPress] = useState(0)
  const isDraggingAny = useSelector(state => !!state.dragCommand)
  const distractionFreeTyping = distractionFreeTypingStore.useState()
  const fontSize = useSelector(state => state.fontSize)
  const arrowWidth = fontSize / 3
  const showDropDown = useSelector(state => state.showColorPicker || state.showLetterCase)
  const positionFixedStyles = usePositionFixed()

  // re-render only (why?)
  useSelector(state => state.showHiddenThoughts)

  /**********************************************************************
   * Methods
   **********************************************************************/

  /** Deselects the toolbar button. */
  const deselectPressingToolbarId = useCallback(() => {
    const timeSinceLastPress = Date.now() - latestPress
    const timeUntilAnimationEnd = TOOLBAR_PRESS_ANIMATION_DURATION - timeSinceLastPress
    // ensure that the delay is not negative
    const delay = Math.max(0, timeUntilAnimationEnd)
    setTimeout(() => {
      setPressingToolbarId(null)
      setLatestPress(0)
    }, delay)
  }, [latestPress])

  /** Selects the toolbar button that is pressed. */
  const selectPressingToolbarId = useCallback((id: string) => {
    setPressingToolbarId(id)
    setLatestPress(Date.now())
  }, [])

  /** Shows or hides the toolbar scroll arrows depending on where the scroll bar is. */
  const updateArrows = useCallback(() => {
    const el = toolbarRef.current
    if (el) {
      setLeftArrowIsShown(el.scrollLeft > 20)
      setRightArrowIsShown(el.offsetWidth + el.scrollLeft < el.scrollWidth - 20)
    }
  }, [])

  /** Handles toolbar scroll event. */
  const onScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      const scrollDifference = e.target ? Math.abs(lastScrollLeft.current - (e.target as HTMLElement).scrollLeft) : 0

      if (scrollDifference >= 5) {
        deselectPressingToolbarId()
      }

      updateArrows()
    },
    [updateArrows, deselectPressingToolbarId],
  )

  /**********************************************************************
   * Effects
   **********************************************************************/

  useEffect(() => {
    window.addEventListener('resize', updateArrows)
    updateArrows()

    return () => {
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows])

  // disable pressing on drag
  useEffect(() => {
    if (isDraggingAny) {
      deselectPressingToolbarId()
    }
  }, [isDraggingAny, deselectPressingToolbarId])

  /**********************************************************************
   * Render
   **********************************************************************/

  // custom user toolbar
  // fall back to defaults if user does not have Settings defined
  const commandIds = useSelector(state => {
    const userCommandIds = getUserToolbar(state)
    return userCommandIds || state.storageCache?.userToolbar || TOOLBAR_DEFAULT_COMMANDS
  }, shallowEqual)

  const onTapUp = useCallback(
    (id: CommandId) => {
      deselectPressingToolbarId()
      if (!customize) {
        if (id === 'newThought') {
          dispatch(showTip({ tip: TipId.NewThought }))
        } else if (id === 'newSubthought') {
          dispatch(showTip({ tip: TipId.NewSubthought }))
        }
      }
      onSelect?.(commandById(id))
    },
    [onSelect, deselectPressingToolbarId, dispatch, customize],
  )

  return (
    <FadeTransition
      nodeRef={toolbarContainerRef}
      in={!distractionFreeTyping}
      duration='distractionFreeTyping'
      unmountOnExit
    >
      <div
        ref={toolbarContainerRef}
        aria-label='toolbar'
        className={cx(
          // When a dropdown like ColorPicker or LetterCase is open, set pointer-events: none, otherwise the toolbar will block the editor. This will be overridden by the toolbar buttons to allow interaction.
          showDropDown && toolbarPointerEventsRecipe(),
          css({
            right: 0,
            textAlign: 'right',
            maxWidth: '100%',
            userSelect: 'none',
            WebkitTapHighlightColor: 'bgTransparent',
            whiteSpace: 'nowrap',
            ...(!customize && {
              zIndex: 'toolbarContainer',
              marginTop: '-500px',
              paddingTop: '500px',
            }),
          }),
        )}
        style={{
          // height: fontSize + 300,
          ...(!customize ? positionFixedStyles : null),
          // make toolbar flush with left padding
          marginLeft: customize ? -5 : 0,

          // offset extended drop area of ToolbarButton
          marginBottom: isDraggingAny ? '-7em' : 0,
        }}
      >
        <div
          className={css({
            position: 'absolute',
            /* sometimes the body peeks through with top:0 */
            top: '-1px',
            left: '0',
            /* Hide the popup-close-x in the customize modal by extending the toolbar-mask to the right. Otherwise it would be too cluttered. Use just enough to cover popup-close-x without  */
            right: '-1.75em',
            backgroundColor: 'bg',
            pointerEvents: 'none',
            boxShadow: '-10px 10px 20px 0 {colors.bg}',
            ...(!customize && {
              boxShadow: '10px -20px 15px 25px {colors.bg}',
              paddingTop: '500px',
            }),
          })}
          style={{
            // must scale height with fontSize, since height does not scale linearly with em or px
            height: fontSize + 30,
            ...(isIOS && {
              height: 2 * (fontSize + 30),
            }),
          }}
        />
        <div>
          <span
            id='left-arrow'
            style={{
              paddingTop: `${calculatePaddingTop(fontSize)}px`,
              ...(isIOS && {
                marginTop: '48px',
              }),
            }}
            className={arrow({ direction: 'left', isHidden: !leftArrowIsShown, fixed: !customize })}
          >
            <TriangleLeft width={arrowWidth} height={fontSize} fill={token('colors.gray50')} />
          </span>
          <div
            id='toolbar'
            ref={toolbarRef}
            className={css({
              maxWidth: '100%',
              position: 'relative',
              touchAction: 'inherit',
              display: 'inline-flex',
              overflowX: 'scroll',
              zIndex: 'toolbar',
              alignItems: 'flex-start',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              ...(!customize && { maxWidth: 'calc(100% - 4em)', '& > *:last-child': { marginRight: '1em' } }),
              marginLeft: customize ? -3 : 0,
              paddingLeft: customize ? 3 : 0,
              ...(isIOS && {
                marginTop: '48px',
              }),
            })}
            data-scroll-at-edge={customize}
            onScroll={onScroll}
          >
            {commandIds.map(id => {
              return (
                <ToolbarButton
                  customize={customize}
                  fontSize={fontSize}
                  isPressing={pressingToolbarId === id}
                  key={id}
                  lastScrollLeft={lastScrollLeft}
                  onTapDown={selectPressingToolbarId}
                  onTapUp={onTapUp}
                  onMouseLeave={deselectPressingToolbarId}
                  selected={selected === id}
                  commandId={id}
                />
              )
            })}
          </div>

          <span
            id='right-arrow'
            style={{
              paddingTop: `${calculatePaddingTop(fontSize)}px`,
              ...(isIOS && {
                marginTop: '48px',
              }),
            }}
            className={arrow({ direction: 'right', isHidden: !rightArrowIsShown, fixed: !customize })}
          >
            <TriangleRight width={arrowWidth} height={fontSize} fill={token('colors.gray50')} />
          </span>
        </div>
      </div>
    </FadeTransition>
  )
}

const ToolbarMemo = React.memo(Toolbar)
ToolbarMemo.displayName = 'Toolbar'

export default ToolbarMemo
