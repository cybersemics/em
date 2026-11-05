/*

Test:

  - Gestures disabled during toolbar scroll
  - Overlay shown on hover/tap-and-hold after delay
  - Overlay hidden on toolbar scroll
  - Overlay hidden on touch "leave"

*/
import React, { FC, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { css, cva } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import CommandType from '../@types/Command'
import CommandId from '../@types/CommandId'
import TipId from '../@types/TipId'
import { showTipActionCreator as showTip } from '../actions/showTip'
import { commandById } from '../commands'
import {
  ICON_SCALING_FACTOR,
  TOOLBAR_BUTTON_PADDING,
  TOOLBAR_DEFAULT_COMMANDS,
  TOOLBAR_PRESS_ANIMATION_DURATION,
} from '../constants'
import usePositionFixed from '../hooks/usePositionFixed'
import getUserToolbar from '../selectors/getUserToolbar'
import distractionFreeTypingStore from '../stores/distractionFreeTypingStore'
import haptics from '../util/haptics'
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
    pointerEvents: 'auto',
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
  const lastHapticScrollPosition = useRef<number>(0)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const dropdownBounds = useRef<{ left: number; right: number; bottom: number; width: number } | null>(null)
  const [leftArrowIsShown, setLeftArrowIsShown] = useState(false)
  const [rightArrowIsShown, setRightArrowIsShown] = useState(true)
  const [pressingToolbarId, setPressingToolbarId] = useState<string | null>(null)
  const [latestPress, setLatestPress] = useState(0)
  const isDraggingAny = useSelector(state => !!state.dragCommand)
  const distractionFreeTyping = distractionFreeTypingStore.useState()
  const fontSize = useSelector(state => state.fontSize)
  const toolbarHeight = fontSize + 30
  const arrowWidth = fontSize / 3
  const showColorPicker = useSelector(state => state.showColorPicker)
  const showDropdown = useSelector(state => state.showColorPicker || state.showLetterCase)
  const showSortPicker = useSelector(state => state.showSortPicker)
  const showBulletPicker = useSelector(state => state.showBulletPicker)
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
  const selectPressingToolbarId = useCallback((id: string | null) => {
    setPressingToolbarId(id)
    setLatestPress(Date.now())
  }, [])

  /** Clips the scrolling toolbar to its button row and open dropdown, leaving the thoughts beside it tappable. */
  const updateClip = useCallback(
    (scrollLeft: number) => {
      const toolbar = toolbarRef.current
      const bounds = dropdownBounds.current
      if (!toolbar || !bounds) return

      const left = Math.max(0, Math.min(bounds.width, bounds.left - scrollLeft))
      const right = Math.max(left, Math.min(bounds.width, bounds.right - scrollLeft))
      toolbar.style.clipPath = `polygon(0 0, 100% 0, 100% ${toolbarHeight}px, ${right}px ${toolbarHeight}px, ${right}px ${bounds.bottom}px, ${left}px ${bounds.bottom}px, ${left}px ${toolbarHeight}px, 0 ${toolbarHeight}px)`
    },
    [toolbarHeight],
  )

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
      const el = e.target as HTMLElement
      const width = el.scrollWidth
      const scrollDifference = Math.abs(lastScrollLeft.current - el.scrollLeft)
      if (scrollDifference >= 5) {
        deselectPressingToolbarId()
      }
      const hapticScrollDifference = Math.abs(lastHapticScrollPosition.current - el.scrollLeft)
      const buttonWidth = fontSize * ICON_SCALING_FACTOR + TOOLBAR_BUTTON_PADDING * 2
      // do not fire haptics on overscroll
      if (el.scrollLeft >= 0 && el.scrollLeft <= width - window.innerWidth && hapticScrollDifference >= buttonWidth) {
        haptics.light()
        lastHapticScrollPosition.current = el.scrollLeft
      }

      updateArrows()
      updateClip(el.scrollLeft)
    },
    [fontSize, updateArrows, updateClip, deselectPressingToolbarId],
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

  // Keep dropdowns in the native scroller so a swipe on an option scrolls with momentum and the picker contributes
  // to the scroll range. Clip the empty area beside it. Cache the geometry on open/resize, never during scrolling.
  useLayoutEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) return
    const dropdown = toolbar.querySelector<HTMLElement>('[data-toolbar-dropdown]')
    if (customize || !dropdown) {
      dropdownBounds.current = null
      toolbar.style.clipPath = ''
      return
    }

    /** Measures the open dropdown in the toolbar's scroll coordinates. */
    const measure = () => {
      const toolbarRect = toolbar.getBoundingClientRect()
      const dropdownRect = dropdown.getBoundingClientRect()
      dropdownBounds.current = {
        left: dropdownRect.left - toolbarRect.left + toolbar.scrollLeft,
        right: dropdownRect.right - toolbarRect.left + toolbar.scrollLeft,
        bottom: dropdownRect.bottom - toolbarRect.top,
        width: toolbarRect.width,
      }
      updateClip(toolbar.scrollLeft)
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [customize, showColorPicker, showDropdown, showSortPicker, showBulletPicker, updateClip])

  // A keyboard shortcut can open the Color Picker outside the toolbar viewport. Scroll only by the clipped
  // distance after the picker renders, including when the toolbar remounts after distraction-free typing.
  useEffect(() => {
    if (customize || !showColorPicker) return

    const toolbar = toolbarRef.current
    const colorPicker = toolbar?.querySelector<HTMLElement>('[aria-label="Color Picker"]')
    if (!toolbar || !colorPicker) return

    const toolbarRect = toolbar.getBoundingClientRect()
    const colorPickerRect = colorPicker.getBoundingClientRect()
    const scrollOffset =
      colorPickerRect.left < toolbarRect.left
        ? colorPickerRect.left - toolbarRect.left
        : colorPickerRect.right > toolbarRect.right
          ? colorPickerRect.right - toolbarRect.right
          : 0

    // Scroll instantly under automation, as scrollTo and scrollCursorIntoView do. A smooth scroll keeps the swatches
    // moving for ~200ms after they are visible, so a test that clicks one races the animation and hits its neighbor.
    if (scrollOffset !== 0)
      toolbar.scrollBy({ behavior: navigator.webdriver ? 'instant' : 'smooth', left: scrollOffset })
  }, [customize, showColorPicker])

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
    <FadeTransition in={!distractionFreeTyping || showDropdown} type='distractionFreeTyping' unmountOnExit>
      <div
        aria-label='toolbar'
        className={css({
          // The scroller's clip defines the interactive area. The larger fixed wrapper must let taps through.
          pointerEvents: 'none',
          right: 0,
          textAlign: 'right',
          // Prevent horizontal scroll bar when keyboard is up.
          // overFlowX: 'hidden' does not work, as it breaks box-shadow on the child when the keyboard is up.
          // https://github.com/cybersemics/em/pull/2760#issuecomment-2701329862
          maxWidth: '100%',
          userSelect: 'none',
          WebkitTapHighlightColor: 'bgTransparent',
          whiteSpace: 'nowrap',
          ...(!customize && {
            zIndex: 'toolbarContainer',
            marginTop: '-500px',
            paddingTop: '500px',
          }),
        })}
        style={{
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
            maxWidth: '100%',
            pointerEvents: 'none',
            boxShadow: '-10px 10px 20px 0 {colors.bg}',
            ...(!customize && {
              boxShadow: '10px -20px 15px 25px {colors.bg}',
              paddingTop: '500px',
            }),
          })}
          style={{
            // must scale height with fontSize, since height does not scale linearly with em or px
            height: toolbarHeight,
          }}
        />
        <div>
          <span
            id='left-arrow'
            style={{ paddingTop: `${calculatePaddingTop(fontSize)}px` }}
            className={arrow({ direction: 'left', isHidden: !leftArrowIsShown, fixed: !customize })}
          >
            <TriangleLeft width={arrowWidth} height={fontSize} fill={token('colors.gray50')} />
          </span>
          <div
            id='toolbar'
            data-testid='toolbar'
            ref={toolbarRef}
            className={css({
              maxWidth: '100%',
              position: 'relative',
              pointerEvents: 'auto',
              // Constrain the horizontally-scrolling toolbar to horizontal panning only. Without this, a diagonal
              // (~45°) or vertical drag beginning on the toolbar is treated as a vertical pan and scrolls/overscrolls
              // the page; because the toolbar is position: fixed (usePositionFixed), that overscroll visually drags
              // the toolbar downward on iOS. pan-x preserves horizontal scrolling while blocking the vertical drag.
              // Keep inherit in customize mode so react-dnd TouchBackend button reordering is unaffected.
              touchAction: customize ? 'inherit' : 'pan-x',
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
            style={{ paddingTop: `${calculatePaddingTop(fontSize)}px` }}
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
