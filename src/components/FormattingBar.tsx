import { animate, useMotionValue, useTransform } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { toggleFormattingBarActionCreator as toggleFormattingBar } from '../actions/toggleFormattingBar'
import { isTouch } from '../browser'
import usePositionFixed from '../hooks/usePositionFixed'
import useVirtualKeyboardCssProperty from '../hooks/useVirtualKeyboardCssProperty'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'
import durations from '../util/durations'
import haptics from '../util/haptics'
import ProgressiveBlur from './ProgressiveBlur'

/** Height of the formatting bar in pixels. */
const BAR_HEIGHT = 48

/** Height of the glow layer in pixels (matches the glow image intrinsic height). */
const GLOW_HEIGHT = 408

/** How far the glow extends above the top of the bar. The rest of the image sits behind the keyboard, deep enough that the image's hard bottom edge never shows beside the keyboard's rounded corners. */
const GLOW_RISE = 232

/** Offset of the glow from the top of the keyboard. Negative, because most of the glow sits behind the keyboard. */
const GLOW_OFFSET = BAR_HEIGHT + GLOW_RISE - GLOW_HEIGHT

/** How far above the bar the falloff starts fading content to black. Kept short so the thoughts just above the bar stay legible. */
const FALLOFF_RISE = 40

/** How far the falloff extends below the top of the keyboard, so the keyboard's rounded corners reveal black rather than content. */
const FALLOFF_UNDERHANG = 32

/** Height of the falloff layer in pixels. */
const FALLOFF_HEIGHT = FALLOFF_RISE + BAR_HEIGHT + FALLOFF_UNDERHANG

/** How far above the bar the progressive blur starts. */
const BLUR_RISE = 16

/** Tap padding around the overflow button. Enlarges the hit target without changing the visible button size. */
const OVERFLOW_BUTTON_TAP_PADDING = 8

/** Visible offset of the overflow button above the virtual keyboard. */
const OVERFLOW_BUTTON_VISIBLE_OFFSET = 12

/** Offset of the (padded) overflow button container — accounts for the tap padding so the visible circle stays put. */
const OVERFLOW_BUTTON_OFFSET = OVERFLOW_BUTTON_VISIBLE_OFFSET - OVERFLOW_BUTTON_TAP_PADDING

const transitionDuration = `${durations.get('fast')}ms`

/** The CSS `ease` timing function as a cubic bezier, so the blur's JS animation keeps pace with the CSS transitions on the other layers. */
const CSS_EASE = [0.25, 0.1, 0.25, 1] as const

/** Returns button event handlers that run the given handler without moving focus out of the editable, so the virtual keyboard stays open.
 * On desktop, mousedown sets focus before click — preventDefault stops the focus shift.
 * On iOS, focus shifts on touchend — preventDefault on touchend keeps the editable focused,
 * but it also cancels the synthetic click, so the handler is triggered manually.
 */
const keepEditableFocused = (handler: () => void) =>
  isTouch
    ? {
        onTouchEnd: (e: React.TouchEvent) => {
          e.preventDefault()
          handler()
        },
      }
    : {
        onClick: handler,
        onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
      }

/** Displays keyboard diagnostics without re-rendering the Formatting Bar on every animation frame. */
const VirtualKeyboardDebugOverlay = ({ isOpen, isAnimating }: { isOpen: boolean; isAnimating: boolean }) => {
  const vkState = virtualKeyboardStore.useState()
  return (
    <div
      className={css({
        position: 'fixed',
        top: '0.5rem',
        left: '0.5rem',
        zIndex: 'dialog',
        pointerEvents: 'none',
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: '1.4',
        padding: '0.5rem',
        borderRadius: '6px',
      })}
      style={{
        background: 'rgba(0, 0, 0, 0.75)',
        color: 'rgba(255, 255, 255, 0.85)',
      }}
    >
      <div
        style={{
          marginBottom: 2,
          fontWeight: 'bold',
          color: 'rgba(150, 200, 255, 0.9)',
        }}
      >
        VirtualKeyboardStore
      </div>
      <div>open: {String(vkState.open)}</div>
      <div>height: {vkState.height.toFixed(1)}px</div>
      <div>openPercent: {vkState.openPercent.toFixed(2)}</div>
      <div
        style={{
          marginTop: 4,
          borderTop: '1px solid rgba(255,255,255,0.2)',
          paddingTop: 4,
          fontWeight: 'bold',
          color: 'rgba(150, 200, 255, 0.9)',
        }}
      >
        CSS Custom Properties
      </div>
      <div>
        --virtual-keyboard-height:{' '}
        {document.documentElement.style.getPropertyValue('--virtual-keyboard-height') || '(unset)'}
      </div>
      <div>
        --virtual-keyboard-open-percent:{' '}
        {document.documentElement.style.getPropertyValue('--virtual-keyboard-open-percent') || '(unset)'}
      </div>
      <div
        style={{
          marginTop: 4,
          borderTop: '1px solid rgba(255,255,255,0.2)',
          paddingTop: 4,
        }}
      >
        barOpen: {String(isOpen)}
      </div>
      <div>animating: {String(isAnimating)}</div>
    </div>
  )
}

/** The Formatting Bar is a mobile-only component displayed above the virtual keyboard.
 * When "open" it shows the bar, glow and falloff layers.
 * When "closed" it shows only a small overflow (...) button. */
const FormattingBar = () => {
  const dispatch = useDispatch()
  const isOpen = useSelector(state => state.showFormattingBar)
  const [isAnimating, setIsAnimating] = useState(false)

  const keyboardOpen = virtualKeyboardStore.useSelector(state => state.open)

  const barShapeRef = useRef<HTMLDivElement>(null)
  const barContentRef = useRef<HTMLDivElement>(null)
  const overflowRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const falloffRef = useRef<HTMLDivElement>(null)
  const falloffGradientRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const positionElementRefs = useMemo(
    () => ({
      bar: [barShapeRef, barContentRef],
      overflow: [overflowRef],
      glow: [glowRef],
      falloff: [falloffRef],
      picker: [pickerRef],
    }),
    [barShapeRef, barContentRef, overflowRef, glowRef, falloffRef, pickerRef],
  )

  const keyboardOpacityRefs = useMemo(
    () => [overflowRef, glowRef, falloffGradientRef],
    [overflowRef, glowRef, falloffGradientRef],
  )
  useVirtualKeyboardCssProperty('openPercent', keyboardOpacityRefs)

  // Position fixed styles for the bar (from bottom, above keyboard)
  const barPositionStyles = usePositionFixed({
    fromBottom: true,
    height: BAR_HEIGHT,
    offset: 0,
    elementRefs: positionElementRefs.bar,
  })

  // Position fixed styles for the overflow button
  const overflowPositionStyles = usePositionFixed({
    fromBottom: true,
    height: 24,
    offset: OVERFLOW_BUTTON_OFFSET,
    elementRefs: positionElementRefs.overflow,
  })

  // Position fixed styles for the glow layer
  const glowPositionStyles = usePositionFixed({
    fromBottom: true,
    height: GLOW_HEIGHT,
    offset: GLOW_OFFSET,
    elementRefs: positionElementRefs.glow,
  })

  // Position fixed styles for the falloff layer
  const falloffPositionStyles = usePositionFixed({
    fromBottom: true,
    height: FALLOFF_HEIGHT,
    offset: -FALLOFF_UNDERHANG,
    elementRefs: positionElementRefs.falloff,
  })

  const handleOpen = useCallback(() => {
    haptics.light()
    setIsAnimating(true)
    dispatch(toggleFormattingBar({ value: true }))
  }, [dispatch])

  const handleClose = useCallback(() => {
    setIsAnimating(true)
    dispatch(toggleFormattingBar({ value: false }))
  }, [dispatch])

  // When closed, slide the bar and falloff down so they hide under the virtual keyboard,
  // and slide them back up to "dock" just above the keyboard when open.
  const slideTransform = isOpen ? undefined : `translateY(${BAR_HEIGHT}px)`

  // iOS Safari drops backdrop-filter rendering whenever an ancestor's opacity is between 0 and 1.
  // Pass opacity into ProgressiveBlur as a MotionValue so it can apply opacity directly to each
  // blur layer (bypassing the parent-opacity bug). The blur fades in and out with the bar's slide,
  // and also follows the keyboard as it opens and closes.
  const openProgress = useMotionValue(isOpen ? 1 : 0)
  const keyboardOpenProgress = useMotionValue(virtualKeyboardStore.getState().openPercent)
  const blurOpacity = useTransform(() => openProgress.get() * keyboardOpenProgress.get())
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
    <div
      style={{
        display: 'contents',
        visibility: keyboardOpen || isAnimating ? 'visible' : 'hidden',
      }}
    >
      {import.meta.env.DEV && <VirtualKeyboardDebugOverlay isOpen={isOpen} isAnimating={isAnimating} />}

      {/* Overflow menu button (visible when closed). The wrapper's right offset is reduced by the tap
        padding so the visible circle stays anchored at 0.75rem from the right edge. */}
      <div
        ref={overflowRef}
        className={css({
          zIndex: 'formattingBar',
          pointerEvents: 'auto',
        })}
        style={{
          ...overflowPositionStyles,
          right: `calc(0.75rem - ${OVERFLOW_BUTTON_TAP_PADDING}px)`,
          opacity: 'var(--virtual-keyboard-open-percent, 0)',
        }}
        onTransitionEnd={() => setIsAnimating(false)}
      >
        <button
          aria-label='Open formatting bar'
          {...keepEditableFocused(handleOpen)}
          className={css({
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          })}
          style={{
            padding: `${OVERFLOW_BUTTON_TAP_PADDING}px`,
            opacity: isOpen ? 0 : 1,
            transition: `opacity ${transitionDuration}`,
            pointerEvents: isOpen ? 'none' : 'auto',
          }}
        >
          {/* Visible circle. Sized to the original 24x24 so the button looks the same; the surrounding
            transparent padding extends the tap target. */}
          <span
            className={css({
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            })}
            style={{
              background: 'rgb(24,24,24)',
              boxShadow: 'inset 0 0 1px rgba(255, 255, 255, 0.5)',
            }}
          >
            {/* Three-dot overflow icon */}
            <svg width='14' height='14' viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <circle cx='3' cy='7' r='1.25' fill='rgb(150,150,150)' />
              <circle cx='7' cy='7' r='1.25' fill='rgb(150,150,150)' />
              <circle cx='11' cy='7' r='1.25' fill='rgb(150,150,150)' />
            </svg>
          </span>
        </button>
      </div>

      {/* Falloff layer (underneath glow). Slides up from beneath the keyboard with the bar.
        Note: we deliberately do NOT apply opacity to this wrapper — iOS Safari disables
        backdrop-filter rendering whenever an ancestor opacity is between 0 and 1. The blur
        and gradient children handle their own fade instead. */}
      <div
        ref={falloffRef}
        className={css({
          left: 0,
          width: '100%',
          zIndex: 'formattingBarFalloff',
          pointerEvents: 'none',
        })}
        style={{
          ...falloffPositionStyles,
          height: `${FALLOFF_HEIGHT}px`,
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
            <ProgressiveBlur direction='to top' minBlur={0} maxBlur={8} opacity={blurOpacity} promoteLayers />
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
            <div
              ref={falloffGradientRef}
              className={css({
                position: 'absolute',
                inset: 0,
              })}
              style={{
                background: `linear-gradient(180deg, rgba(0, 0, 0, 0) 0px, #000 ${FALLOFF_RISE + BAR_HEIGHT}px)`,
                // Drive opacity off the CSS custom property the keyboard store updates per frame
                // (see virtualKeyboardStore.ts). Avoids React re-renders during the close animation,
                // which were causing choppy repaints on iOS.
                opacity: 'var(--virtual-keyboard-open-percent)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Glow layer (on top of falloff, below bar) */}
      <div
        ref={glowRef}
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
          opacity: 'var(--virtual-keyboard-open-percent)',
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
            opacity: isOpen ? 1 : 0,
            transition: `opacity ${transitionDuration}`,
          }}
        />
      </div>

      {/* Bar (on top of everything) */}
      <div
        ref={barShapeRef}
        className={css({
          zIndex: 'formattingBar',
          pointerEvents: 'auto',
          left: 0,
          right: 0,
          marginLeft: 'auto',
          marginRight: 'auto',
          width: '92.5%',
          maxWidth: '350px',
        })}
        style={{
          ...barPositionStyles,
          height: `${BAR_HEIGHT}px`,
          // The blend mode belongs on this wrapper and not on anything inside it. A fixed-position element
          // with a z-index always starts its own stacking context, so a blend mode set on a descendant would
          // only blend with the wrapper's transparent interior. Here it blends the whole bar with the glow,
          // falloff and thoughts behind it, which is what keeps the fill and strokes subtle on a dark page.
          mixBlendMode: 'color-dodge',
          opacity: isOpen ? undefined : 0,
          // usePositionFixed pins the bar above the keyboard via `bottom`/`top`; this transform
          // only adds the open/close slide (down to hide under the keyboard, up to dock above it).
          transform: slideTransform,
          transition: `transform ${transitionDuration}, opacity ${transitionDuration}`,
        }}
        onTransitionEnd={() => setIsAnimating(false)}
      >
        <div
          className={css({
            position: 'relative',
            width: '100%',
            height: '100%',
            borderTopLeftRadius: '32px',
            borderTopRightRadius: '32px',
            overflow: 'hidden',
          })}
          style={{
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
                borderTopLeftRadius: '32px',
                borderTopRightRadius: '32px',
                pointerEvents: 'none',
              })}
              style={{
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

          {/* Content area with down arrow */}
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              paddingLeft: '1rem',
              paddingRight: '1rem',
            })}
          >
            {/* Down arrow button to close */}
            <button
              aria-label='Close formatting bar'
              {...keepEditableFocused(handleClose)}
              className={css({
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
              })}
            >
              <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path
                  d='M4 6L8 10L12 6'
                  stroke='rgba(255, 255, 255, 0.5)'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </button>

            {/* Empty content area — commands will be added later */}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FormattingBar
