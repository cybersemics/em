import { useMotionValue } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { toggleFormattingBarActionCreator as toggleFormattingBar } from '../actions/toggleFormattingBar'
import { isTouch } from '../browser'
import usePositionFixed from '../hooks/usePositionFixed'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'
import durations from '../util/durations'
import haptics from '../util/haptics'
import ProgressiveBlur from './ProgressiveBlur'

/** Height of the formatting bar in pixels. */
const BAR_HEIGHT = 48

/** Height of the glow/falloff layers in pixels (matches the glow image intrinsic height). */
const GLOW_HEIGHT = 408

/** Tap padding around the overflow button. Enlarges the hit target without changing the visible button size. */
const OVERFLOW_BUTTON_TAP_PADDING = 8

/** Visible offset of the overflow button above the virtual keyboard. */
const OVERFLOW_BUTTON_VISIBLE_OFFSET = 12

/** Offset of the (padded) overflow button container — accounts for the tap padding so the visible circle stays put. */
const OVERFLOW_BUTTON_OFFSET = OVERFLOW_BUTTON_VISIBLE_OFFSET - OVERFLOW_BUTTON_TAP_PADDING

const transitionDuration = `${durations.get('fast')}ms`

/** The Formatting Bar is a mobile-only component displayed above the virtual keyboard.
 * When "open" it shows the bar, glow and falloff layers.
 * When "closed" it shows only a small overflow (...) button. */
const FormattingBar = () => {
  const dispatch = useDispatch()
  const isOpen = useSelector(state => state.showFormattingBar)
  const [isAnimating, setIsAnimating] = useState(false)

  const keyboardHeight = virtualKeyboardStore.useSelector(state => state.height)
  const keyboardOpen = virtualKeyboardStore.useSelector(state => state.open)
  const keyboardOpenPercent = virtualKeyboardStore.useSelector(state => state.openPercent)

  // Position fixed styles for the bar (from bottom, above keyboard)
  const barPositionStyles = usePositionFixed({ fromBottom: true, height: BAR_HEIGHT, offset: 0 })

  // Position fixed styles for the overflow button
  const overflowPositionStyles = usePositionFixed({
    fromBottom: true,
    height: 24,
    offset: OVERFLOW_BUTTON_OFFSET,
  })

  // Position fixed styles for the glow/falloff layers
  const glowPositionStyles = usePositionFixed({ fromBottom: true, height: GLOW_HEIGHT, offset: -32 })

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
  // When open we leave `transform` unset so the bar's outer wrapper does NOT create a new
  // stacking context — that's required for `mix-blend-mode: color-dodge` on the bar's
  // inner gradient (and its descendants, including the down-arrow icon) to remain visible.
  // CSS still animates between `none` and a transform function, so the slide transition works.
  const slideTransform = isOpen ? undefined : `translateY(${BAR_HEIGHT}px)`

  // iOS Safari drops backdrop-filter rendering whenever an ancestor's opacity is between 0 and 1.
  // Pass opacity into ProgressiveBlur as a MotionValue so it can apply opacity directly to each
  // blur layer (bypassing the parent-opacity bug).
  const blurOpacity = useMotionValue(isOpen ? keyboardOpenPercent : 0)
  useEffect(() => {
    blurOpacity.set(isOpen ? keyboardOpenPercent : 0)
  }, [blurOpacity, isOpen, keyboardOpenPercent])

  // Virtual keyboard state for debug overlay
  const vkState = virtualKeyboardStore.useState()

  // Don't render at all when keyboard is fully closed and not animating
  if (!keyboardOpen && keyboardHeight === 0 && !isAnimating) return null

  return (
    <>
      {/* Debug overlay — VirtualKeyboardStore state */}
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
        <div style={{ marginBottom: 2, fontWeight: 'bold', color: 'rgba(150, 200, 255, 0.9)' }}>
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
          {getComputedStyle(document.documentElement).getPropertyValue('--virtual-keyboard-height') || '(unset)'}
        </div>
        <div>
          --virtual-keyboard-open-percent:{' '}
          {getComputedStyle(document.documentElement).getPropertyValue('--virtual-keyboard-open-percent') || '(unset)'}
        </div>
        <div style={{ marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 4 }}>
          barOpen: {String(isOpen)}
        </div>
        <div>animating: {String(isAnimating)}</div>
      </div>

      {/* Overflow menu button (visible when closed). The wrapper's right offset is reduced by the tap
        padding so the visible circle stays anchored at 0.75rem from the right edge. */}
      <div
        className={css({
          zIndex: 'formattingBar',
          pointerEvents: 'auto',
        })}
        style={{
          ...overflowPositionStyles,
          right: `calc(0.75rem - ${OVERFLOW_BUTTON_TAP_PADDING}px)`,
          opacity: isOpen ? 0 : keyboardOpenPercent,
          transition: `opacity ${transitionDuration}`,
        }}
        onTransitionEnd={() => setIsAnimating(false)}
      >
        <button
          aria-label='Open formatting bar'
          onClick={isTouch ? undefined : handleOpen}
          // Prevent focus from leaving the editable so the virtual keyboard stays open.
          // On desktop, mousedown sets focus before click — preventDefault stops the focus shift.
          // On iOS, focus shifts on touchend — preventDefault on touchend keeps the editable focused,
          // but it also cancels the synthetic click, so trigger the handler manually.
          onMouseDown={isTouch ? undefined : e => e.preventDefault()}
          onTouchEnd={
            isTouch
              ? e => {
                  e.preventDefault()
                  handleOpen()
                }
              : undefined
          }
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
        className={css({
          left: 0,
          width: '100%',
          zIndex: 'formattingBarFalloff',
          pointerEvents: 'none',
        })}
        style={{
          ...glowPositionStyles,
          height: `${GLOW_HEIGHT}px`,
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
          {/* Progressive blur — confined to the bottom half so it tracks the falloff gradient
            (which starts going opaque at 50.1%). Without this constraint the blur fills the
            whole 408px-tall falloff region and visibly blurs most of the screen. */}
          <div
            className={css({
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              top: '50%',
            })}
          >
            <ProgressiveBlur direction='to bottom' minBlur={0} maxBlur={12} opacity={blurOpacity} />
          </div>
          {/* Gradient falloff: fades content underneath to black so the translucent bar is legible. */}
          <div
            className={css({
              position: 'absolute',
              inset: 0,
            })}
            style={{
              background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.00) 50.1%, #000 79.27%)',
              // Drive opacity off the CSS custom property the keyboard store updates per frame
              // (see virtualKeyboardStore.ts). Avoids React re-renders during the close animation,
              // which were causing choppy repaints on iOS.
              opacity: isOpen ? 'var(--virtual-keyboard-open-percent)' : 0,
            }}
          />
        </div>
      </div>

      {/* Glow layer (on top of falloff, below bar) */}
      <div
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
          opacity: isOpen ? 'var(--virtual-keyboard-open-percent)' : 0,
        }}
      >
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
          }}
        />
      </div>

      {/* Bar (on top of everything) */}
      <div
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
          // When open we leave opacity unset (defaults to 1) so the wrapper does NOT create a new
          // stacking context. That matters because `mix-blend-mode: color-dodge` on the inner
          // gradient (and its descendants — including the down-arrow icon) needs to blend against
          // the page backdrop; an isolated stacking context would render it invisible.
          // Slide alone handles in/out — no opacity tween needed.
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
            mixBlendMode: 'color-dodge',
          }}
        >
          {/* Double border stroke effect */}
          <div
            className={css({
              position: 'absolute',
              inset: 0,
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              pointerEvents: 'none',
            })}
            style={{
              border: '1px solid transparent',
              borderImage: 'linear-gradient(180deg, rgba(186, 187, 187, 0.26) 0%, rgba(208, 210, 224, 0) 100%) 1',
              maskImage: 'linear-gradient(180deg, black 0%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(180deg, black 0%, transparent 100%)',
            }}
          />
          <div
            className={css({
              position: 'absolute',
              inset: '-1px',
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              pointerEvents: 'none',
            })}
            style={{
              border: '1px solid transparent',
              borderImage: 'linear-gradient(90deg, rgba(186, 187, 187, 0.26) 0%, rgba(208, 210, 224, 0) 100%) 1',
              maskImage: 'linear-gradient(90deg, black 0%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(90deg, black 0%, transparent 100%)',
            }}
          />

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
              onClick={handleClose}
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
    </>
  )
}

export default FormattingBar
