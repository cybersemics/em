import { MotionStyle, animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import CommandId from '../@types/CommandId'
import IconType from '../@types/IconType'
import Thunk from '../@types/Thunk'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import { toggleFormattingBarActionCreator as toggleFormattingBar } from '../actions/toggleFormattingBar'
import { isTouch } from '../browser'
import usePositionFixed from '../hooks/usePositionFixed'
import getHeadingLevel from '../selectors/getHeadingLevel'
import viewportStore from '../stores/viewportStore'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'
import durations from '../util/durations'
import haptics from '../util/haptics'
import head from '../util/head'
import FormattingBarColorPicker from './FormattingBarColorPicker'
import FormattingBarContext from './FormattingBarContext'
import FormattingBarHeadingPicker from './FormattingBarHeadingPicker'
import FormattingBarLetterCasePicker from './FormattingBarLetterCasePicker'
import ProgressiveBlur from './ProgressiveBlur'
import ToolbarButton from './ToolbarButton'
import Heading1Icon from './icons/Heading1Icon'
import Heading2Icon from './icons/Heading2Icon'
import Heading3Icon from './icons/Heading3Icon'
import Heading4Icon from './icons/Heading4Icon'
import Heading5Icon from './icons/Heading5Icon'
import LetterCaseIcon from './icons/LetterCaseIcon'
import TextColorIcon from './icons/TextColor'

/** Minimum height of the formatting bar in pixels, also used as its scaling baseline. */
const BAR_HEIGHT = 48

/** The commands shown in the Formatting Bar, in order. */
const COMMAND_IDS: CommandId[] = [
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'textColor',
  'letterCase',
  'toggleHeadingPicker',
]

/** Shows the current heading level as bare icon artwork, without mounting a picker inside the button. */
const FormattingBarHeadingIcon = (props: IconType) => {
  const level = useSelector(state => (state.cursor ? getHeadingLevel(state, head(state.cursor)) : 0))
  const Icon = [Heading1Icon, Heading1Icon, Heading2Icon, Heading3Icon, Heading4Icon, Heading5Icon][level]
  return <Icon {...props} />
}

/** Closes a picker that the Formatting Bar opened. Pickers are mutually exclusive, so closing one closes any of them. A picker the Toolbar opened is left alone. */
const closeFormattingBarPicker = (): Thunk => (dispatch, getState) => {
  if (getState().dropdownHost !== 'formattingBar') return
  dispatch(toggleDropdown({ dropDownType: 'colorPicker', value: false }))
}

/** Height of the glow layer in pixels (matches the glow image intrinsic height). */
const GLOW_HEIGHT = 408

/** How far the glow extends above the top of the bar. Its tail is masked below the keyboard's rounded corners. */
const GLOW_RISE = 232

/** How far above the bar the falloff starts fading content to black. Kept short so the thoughts just above the bar stay legible. */
const FALLOFF_RISE = 40

/** How far the falloff extends below the top of the keyboard, so the keyboard's rounded corners reveal black rather than content. */
const FALLOFF_UNDERHANG = 32

/** How far above the bar the progressive blur starts. */
const BLUR_RISE = 16

const transitionDuration = `${durations.get('fast')}ms`

/** The CSS `ease` timing function as a cubic bezier, so the blur's JS animation keeps pace with the CSS transitions on the other layers. */
const CSS_EASE = [0.25, 0.1, 0.25, 1] as const

/** Returns button event handlers that run the given handler without moving focus out of the editable, so the virtual keyboard stays open.
 * On desktop, mousedown sets focus before click — preventDefault stops the focus shift.
 * On iOS, focus shifts on touchend — preventDefault on touchend keeps the editable focused,
 * but it also cancels the synthetic click, so the handler is triggered manually.
 */
const keepEditableFocused = (handler: () => void, { commandHaptics = false } = {}) =>
  isTouch
    ? {
        onTouchStart: commandHaptics ? haptics.medium : undefined,
        onTouchEnd: (e: React.TouchEvent) => {
          e.preventDefault()
          if (commandHaptics) haptics.light()
          handler()
        },
      }
    : {
        onClick: () => {
          if (commandHaptics) haptics.light()
          handler()
        },
        onMouseDown: (e: React.MouseEvent) => {
          e.preventDefault()
          if (commandHaptics) haptics.medium()
        },
      }

/** The Formatting Bar is a mobile-only component displayed above the virtual keyboard.
 * When "open" it shows the bar, glow and falloff layers.
 * When "closed" it shows only a small overflow (...) button. */
const FormattingBar = () => {
  const dispatch = useDispatch()
  const isOpen = useSelector(state => state.showFormattingBar)
  const fontSize = useSelector(state => state.fontSize)
  const viewportWidth = viewportStore.useSelector(state => state.innerWidth)
  const [isAnimating, setIsAnimating] = useState(false)

  // The 375px phone and default font size keep the original proportions. Wider phones grow the controls,
  // with width growth capped for tablets. Each of the eight buttons retains 8px of space around its icon.
  // The width and padding mirror the content layer's 92.5%, 36rem cap, and 1rem side padding below.
  const barWidth = Math.min(viewportWidth * 0.925, fontSize * 36)
  const buttonWidth = (barWidth - fontSize * 2) / (COMMAND_IDS.length + 1)
  const iconSize = Math.min(fontSize * 1.25 * Math.min(Math.max(viewportWidth / 375, 1), 1.25), buttonWidth - 8)
  const barHeight = Math.max(BAR_HEIGHT, iconSize * 2.4)
  const cornerRadius = iconSize * 1.6
  const overflowSize = iconSize * 1.2
  // Keep the opener's tap target at least 40px even when a small font setting shrinks its visible circle.
  const overflowTapPadding = Math.max(iconSize * 0.4, (40 - overflowSize) / 2)
  const overflowOffset = iconSize * 0.6 - overflowTapPadding
  const glowOffset = barHeight + GLOW_RISE - GLOW_HEIGHT
  const falloffHeight = FALLOFF_RISE + barHeight + FALLOFF_UNDERHANG
  // Keep the underhang tied to the keyboard's corners, rather than scaling it with the controls.
  const glowMask = `linear-gradient(to bottom, #000 ${GLOW_HEIGHT + glowOffset}px, transparent ${GLOW_HEIGHT + glowOffset + FALLOFF_UNDERHANG}px)`
  const barMask = `linear-gradient(to bottom, #000 ${barHeight}px, transparent ${barHeight + FALLOFF_UNDERHANG}px)`

  const keyboardOpen = virtualKeyboardStore.useSelector(state => state.open)

  const colorButtonRef = useRef<HTMLDivElement>(null)
  const letterCaseButtonRef = useRef<HTMLDivElement>(null)
  const headingButtonRef = useRef<HTMLDivElement>(null)
  // Position fixed styles for the bar (from bottom, above keyboard)
  const barPositionStyles = usePositionFixed({
    fromBottom: true,
    height: barHeight,
    offset: 0,
  })

  // Position fixed styles for the overflow button
  const overflowPositionStyles = usePositionFixed({
    fromBottom: true,
    height: overflowSize + overflowTapPadding * 2,
    offset: overflowOffset,
  })

  // Position fixed styles for the glow layer
  const glowPositionStyles = usePositionFixed({
    fromBottom: true,
    height: GLOW_HEIGHT,
    offset: glowOffset,
  })

  // Position fixed styles for the falloff layer
  const falloffPositionStyles = usePositionFixed({
    fromBottom: true,
    height: falloffHeight,
    offset: -FALLOFF_UNDERHANG,
  })

  const handleOpen = useCallback(() => {
    setIsAnimating(true)
    dispatch(toggleFormattingBar({ value: true }))
  }, [dispatch])

  const handleClose = useCallback(() => {
    setIsAnimating(true)
    dispatch([closeFormattingBarPicker(), toggleFormattingBar({ value: false })])
  }, [dispatch])

  // A picker stays open in Redux after the keyboard closes and the bar is hidden, and would reappear with the keyboard.
  useEffect(() => {
    if (!keyboardOpen) dispatch(closeFormattingBarPicker())
  }, [dispatch, keyboardOpen])

  // The command button being pressed. ToolbarButton only treats a touch as a tap while it is pressed.
  const [pressingId, setPressingId] = useState<CommandId | null>(null)
  const lastScrollLeft = useRef(0)

  // The element above the bar that pickers are portalled into, since anything inside the bar is blended and clipped
  // with it. A state rather than a ref, so that the pickers re-render once it mounts.
  const [pickerContainer, setPickerContainer] = useState<HTMLDivElement | null>(null)
  const [pickerBackdropContainer, setPickerBackdropContainer] = useState<HTMLDivElement | null>(null)
  // Keep the portal container available to the picker components.
  const handlePickerContainerRef = useCallback((element: HTMLDivElement | null) => {
    setPickerContainer(element)
  }, [])
  const pickerContainerPositionStyles = usePositionFixed({
    fromBottom: true,
    height: 0,
    offset: barHeight,
  })
  /** Attaches the picker's backdrop to the same keyboard positioning as its options and light. */
  const handlePickerBackdropRef = useCallback((element: HTMLDivElement | null) => {
    setPickerBackdropContainer(element)
  }, [])
  const formattingBarContext = useMemo(
    () => ({
      container: pickerContainer,
      backdropContainer: pickerBackdropContainer,
      iconSize,
    }),
    [pickerContainer, pickerBackdropContainer, iconSize],
  )

  // When closed, slide the bar and falloff down so they hide under the virtual keyboard,
  // and slide them back up to "dock" just above the keyboard when open.
  const slideTransform = isOpen ? undefined : `translateY(${barHeight}px)`

  // iOS Safari drops backdrop-filter rendering whenever an ancestor's opacity is between 0 and 1.
  // Pass opacity into ProgressiveBlur as a MotionValue so it can apply opacity directly to each
  // blur layer (bypassing the parent-opacity bug). The shape, commands and blur share the same fade
  // with the bar's slide and the keyboard's opening/closing progress.
  const openProgress = useMotionValue(isOpen ? 1 : 0)
  const keyboardOpenProgress = useMotionValue(virtualKeyboardStore.getState().openPercent)
  const barOpacity = useTransform(() => openProgress.get() * keyboardOpenProgress.get())
  useEffect(() => {
    const controls = animate(openProgress, isOpen ? 1 : 0, {
      duration: durations.get('fast') / 1000,
      ease: CSS_EASE,
    })
    return () => controls.stop()
  }, [openProgress, isOpen])
  useEffect(
    () =>
      virtualKeyboardStore.subscribeSelector(
        state => state.openPercent,
        value => keyboardOpenProgress.set(value),
      ),
    [keyboardOpenProgress],
  )

  // Keep the layers mounted so opening the keyboard does not have to build the bar and its blur layers.
  // display: contents preserves each layer's blending with the page without introducing a parent box.
  return (
    // The bar and its pickers, which are portalled into layers inside it, inherit the font from here.
    <div
      className={css({ fontFamily: 'radioCanada' })}
      style={{ display: 'contents', visibility: keyboardOpen || isAnimating ? 'visible' : 'hidden' }}
    >
      {/* Overflow menu button (visible when closed). The wrapper's right offset is reduced by the tap
        padding so the visible circle stays anchored at 0.75rem from the right edge. */}
      <motion.div
        className={css({
          zIndex: 'formattingBar',
          pointerEvents: 'auto',
        })}
        style={{
          ...overflowPositionStyles,
          right: `calc(0.75rem - ${overflowTapPadding}px)`,
          opacity: keyboardOpenProgress,
        }}
        onTransitionEnd={() => setIsAnimating(false)}
      >
        <button
          aria-label='Open formatting bar'
          {...keepEditableFocused(handleOpen, { commandHaptics: true })}
          className={css({
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          })}
          style={{
            padding: `${overflowTapPadding}px`,
            opacity: isOpen ? 0 : 1,
            transition: `opacity ${transitionDuration}`,
            pointerEvents: isOpen ? 'none' : 'auto',
          }}
        >
          {/* Scale the circle and dots together. The surrounding transparent padding extends the tap target. */}
          <span
            className={css({
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            })}
            style={{
              width: overflowSize,
              height: overflowSize,
              background: 'rgb(24,24,24)',
              boxShadow: 'inset 0 0 1px rgba(255, 255, 255, 0.5)',
            }}
          >
            {/* Three-dot overflow icon */}
            <svg
              width={iconSize * 0.7}
              height={iconSize * 0.7}
              viewBox='0 0 14 14'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <circle cx='3' cy='7' r='1.25' fill='rgb(150,150,150)' />
              <circle cx='7' cy='7' r='1.25' fill='rgb(150,150,150)' />
              <circle cx='11' cy='7' r='1.25' fill='rgb(150,150,150)' />
            </svg>
          </span>
        </button>
      </motion.div>

      {/* Falloff layer (underneath glow). Slides up from beneath the keyboard with the bar.
        Note: we deliberately do NOT apply opacity to this wrapper — iOS Safari disables
        backdrop-filter rendering whenever an ancestor opacity is between 0 and 1. The blur
        and gradient children handle their own fade instead. */}
      <motion.div
        className={css({
          left: 0,
          width: '100%',
          zIndex: 'formattingBarFalloff',
          pointerEvents: 'none',
        })}
        style={{
          ...falloffPositionStyles,
          height: `${falloffHeight}px`,
          // usePositionFixed pins the falloff above the keyboard via `bottom`/`top`; this
          // transform only adds the open/close slide (down to hide, up to dock above the keyboard).
          transform: slideTransform,
          transition: `transform ${transitionDuration}`,
        }}
      >
        <div
          className={css({
            position: 'relative',
            width: '100%',
            height: '100%',
          })}
        >
          {/* Progressive blur — starts just above the bar, so it softens only the content that passes
            behind the bar and leaves the thoughts above it sharp. ProgressiveBlur is strongest where its
            direction starts, so 'to top' puts the full blur at the bottom and fades it out upwards. */}
          <div
            className={css({
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
            })}
            style={{ top: `${FALLOFF_RISE - BLUR_RISE}px` }}
          >
            <ProgressiveBlur direction='to top' minBlur={0} maxBlur={8} opacity={barOpacity} promoteLayers />
          </div>
          {/* Gradient falloff: fades content underneath to black so the translucent bar is legible. Clear
            FALLOFF_RISE above the bar, and fully black by the top of the keyboard. The wrapper fades with
            the bar's slide, and the gradient inside it follows the keyboard. */}
          <div
            className={css({
              position: 'absolute',
              inset: 0,
            })}
            style={{
              opacity: isOpen ? 1 : 0,
              transition: `opacity ${transitionDuration}`,
            }}
          >
            <motion.div
              className={css({
                position: 'absolute',
                inset: 0,
              })}
              style={{
                background: `linear-gradient(180deg, rgba(0, 0, 0, 0) 0px, #000 ${FALLOFF_RISE + barHeight}px)`,
                // Drive opacity from scalar keyboard progress without rendering on each frame
                // (see virtualKeyboardStore.ts). Avoids React re-renders during the close animation,
                // which were causing choppy repaints on iOS.
                opacity: keyboardOpenProgress,
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Glow layer (on top of falloff, below bar) */}
      <motion.div
        className={css({
          left: 0,
          width: '100%',
          zIndex: 'formattingBarGlow',
          pointerEvents: 'none',
        })}
        style={{
          ...glowPositionStyles,
          height: `${GLOW_HEIGHT}px`,
          // See note above on the falloff: per-frame React re-renders from keyboardOpenPercent
          // make this heavy PNG repaint choppily on iOS during the close animation. The CSS
          // custom property is updated outside React, so the GPU can drive the fade smoothly.
          opacity: keyboardOpenProgress,
        }}
      >
        {/* Fades with the bar's slide. The bar's color-dodge blend draws mostly from the glow, so the
          glow has to stay visible while the bar slides out or the bar vanishes before it moves. */}
        <img
          src='/img/formatting-bar/glow.png'
          alt=''
          className={css({
            width: '100%',
            display: 'block',
            pointerEvents: 'none',
          })}
          style={{
            height: `${GLOW_HEIGHT}px`,
            objectFit: 'fill',
            // System keyboards can be translucent. Mask the image itself so the glow ends below their
            // rounded corners without changing the image's scale or masking the separate backdrop blur.
            maskImage: glowMask,
            WebkitMaskImage: glowMask,
            opacity: isOpen ? 1 : 0,
            transition: `opacity ${transitionDuration}`,
          }}
        />
      </motion.div>

      {/* Bar shape: the fill and strokes, blended with what is behind it. The buttons are a separate layer on top, so
        that the blend does not tint the icons and the shape's rounded clip does not cut off their highlights. */}
      <motion.div
        className={css({
          zIndex: 'formattingBar',
          pointerEvents: 'auto',
          left: 0,
          right: 0,
          marginLeft: 'auto',
          marginRight: 'auto',
          width: '92.5%',
          maxWidth: '36rem',
        })}
        style={{
          ...barPositionStyles,
          height: `${barHeight}px`,
          // The blend mode belongs on this wrapper and not on anything inside it. A fixed-position element
          // with a z-index always starts its own stacking context, so a blend mode set on a descendant would
          // only blend with the wrapper's transparent interior. Here it blends the whole bar with the glow,
          // falloff and thoughts behind it, which is what keeps the fill and strokes subtle on a dark page.
          mixBlendMode: 'color-dodge',
          opacity: barOpacity,
          // usePositionFixed pins the bar above the keyboard via `bottom`/`top`; this transform
          // only adds the open/close slide (down to hide under the keyboard, up to dock above it).
          transform: slideTransform,
          transition: `transform ${transitionDuration}`,
        }}
        onTransitionEnd={() => setIsAnimating(false)}
      >
        <div
          className={css({
            position: 'relative',
            width: '100%',
            overflow: 'hidden',
          })}
          style={{
            // Extend the fill and side strokes behind the keyboard's rounded corners while the wrapper
            // keeps the bar's top edge and buttons anchored at their original height.
            height: `calc(100% + ${FALLOFF_UNDERHANG}px)`,
            borderTopLeftRadius: cornerRadius,
            borderTopRightRadius: cornerRadius,
            maskImage: barMask,
            WebkitMaskImage: barMask,
            background:
              'radial-gradient(130.84% 151.39% at 57.5% 55.06%, rgba(130, 108, 203, 0.00) 0%, rgba(127, 172, 255, 0.08) 100%)',
          }}
        >
          {/* Double border stroke. Both strokes share the Figma gradient but run over different stretches
            of the bar's height: the first fades in from nothing at the top edge, and the second fades out
            below the bar. */}
          {[
            'linear-gradient(180deg, rgba(208, 210, 224, 0) 0%, rgba(186, 187, 187, 0.26) 65%)',
            'linear-gradient(180deg, rgba(186, 187, 187, 0.26) 76%, rgba(208, 210, 224, 0) 143%)',
          ].map(gradient => (
            <div
              key={gradient}
              className={css({
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
              })}
              style={{
                borderTopLeftRadius: cornerRadius,
                borderTopRightRadius: cornerRadius,
                // Paint the gradient across the whole border box, then mask away the padding box so only
                // the 1px border ring shows. Unlike border-image, this follows the rounded corners.
                border: '1px solid transparent',
                borderBottomWidth: 0,
                background: `${gradient} border-box`,
                mask: 'linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)',
                maskComposite: 'exclude',
                WebkitMask: 'linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)',
                WebkitMaskComposite: 'xor',
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Bar content: the commands, then the down arrow. Positioned and animated with the bar shape beneath it. */}
      <motion.div
        role='toolbar'
        aria-label='Formatting Bar'
        className={css({
          zIndex: 'formattingBar',
          pointerEvents: 'auto',
          left: 0,
          right: 0,
          marginLeft: 'auto',
          marginRight: 'auto',
          width: '92.5%',
          maxWidth: '36rem',
        })}
        style={
          {
            ...barPositionStyles,
            height: `${barHeight}px`,
            opacity: barOpacity,
            transform: slideTransform,
            transition: `transform ${transitionDuration}`,
          } as MotionStyle
        }
        // The closed bar is only faded out and slid down, so its buttons would otherwise still take taps.
        inert={!isOpen}
        // A tap that misses the buttons, e.g. between them or near the bar's edge, must not move the focus out of the
        // editable and close the virtual keyboard either.
        {...keepEditableFocused(() => {})}
      >
        {/* Content area: the commands, then the down arrow, spaced evenly */}
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            paddingLeft: '1rem',
            paddingRight: '1rem',
          })}
        >
          <FormattingBarContext.Provider value={formattingBarContext}>
            <div
              // ToolbarButton reads the scroll position of this container to tell a tap from a swipe. The row does not
              // scroll, since the commands fit the bar, and it must not clip the light behind an active button, which
              // spills beyond the bar. Clipping one axis with overflow-x would clip both.
              data-toolbar-scroll-container
              className={css({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flex: 1,
                height: '100%',
              })}
            >
              {COMMAND_IDS.map(id => (
                <ToolbarButton
                  key={id}
                  commandId={id}
                  type='formattingBar'
                  fontSize={fontSize}
                  iconSize={iconSize}
                  icon={
                    id === 'textColor'
                      ? TextColorIcon
                      : id === 'letterCase'
                        ? LetterCaseIcon
                        : id === 'toggleHeadingPicker'
                          ? FormattingBarHeadingIcon
                          : undefined
                  }
                  buttonRef={
                    id === 'textColor'
                      ? colorButtonRef
                      : id === 'letterCase'
                        ? letterCaseButtonRef
                        : id === 'toggleHeadingPicker'
                          ? headingButtonRef
                          : undefined
                  }
                  isPressing={pressingId === id}
                  lastScrollLeft={lastScrollLeft}
                  onTapDown={setPressingId}
                  onTapUp={() => setPressingId(null)}
                  onMouseLeave={() => setPressingId(null)}
                />
              ))}
              {/* Down arrow button to close. It sits in the row as one more button, with the same icon box and padding as
                the commands, so that the row keeps one rhythm through to the bar's edge. */}
              <button
                aria-label='Close formatting bar'
                {...keepEditableFocused(handleClose, { commandHaptics: true })}
                className={css({
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  flex: 1,
                  minWidth: 0,
                  padding: 0,
                })}
              >
                {/* The command icons are drawn with a 2-unit stroke on a 24-unit grid, so at 20px their lines are 1.67px.
                  1.33 units on this 16-unit grid matches that. */}
                <svg
                  width={iconSize}
                  height={iconSize}
                  viewBox='0 0 16 16'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M4 6L8 10L12 6'
                    stroke='rgba(255, 255, 255, 0.5)'
                    strokeWidth='1.33'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </button>
            </div>
            <FormattingBarColorPicker anchorRef={colorButtonRef} />
            <FormattingBarLetterCasePicker anchorRef={letterCaseButtonRef} />
            <FormattingBarHeadingPicker anchorRef={headingButtonRef} />
          </FormattingBarContext.Provider>
        </div>
      </motion.div>

      {/* Picker fade and blur: below both glows, so black hides thoughts without hiding the bar's light. */}
      <motion.div
        ref={handlePickerBackdropRef}
        className={css({ left: 0, width: '100%', zIndex: 'formattingBarFalloff', pointerEvents: 'none' })}
        style={
          {
            ...pickerContainerPositionStyles,
            height: 0,
            // Shares the bar's height and keyboard-corner coverage with the popover's backdrop.
            '--formatting-bar-popover-underhang': `${barHeight + FALLOFF_UNDERHANG}px`,
          } as React.CSSProperties
        }
      />

      {/* Picker options and light. The bar's shape and buttons stay above the image's tail. */}
      <motion.div
        ref={handlePickerContainerRef}
        className={css({
          left: 0,
          width: '100%',
          zIndex: 'formattingBarGlow',
          pointerEvents: 'none',
        })}
        style={{ ...pickerContainerPositionStyles, height: 0 }}
      />
    </div>
  )
}

export default FormattingBar
