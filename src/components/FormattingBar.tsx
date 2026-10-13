import { motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import CommandId from '../@types/CommandId'
import Thunk from '../@types/Thunk'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import { toggleFormattingBarActionCreator as toggleFormattingBar } from '../actions/toggleFormattingBar'
import { isTouch } from '../browser'
import usePositionFixed from '../hooks/usePositionFixed'
import usePrefetchImages from '../hooks/usePrefetchImages'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'
import haptics from '../util/haptics'
import FormattingBarButton from './FormattingBarButton'
import ProgressiveBlur from './ProgressiveBlur'

const glowImages = ['/img/formatting-bar/glow.png', '/img/formatting-bar/popover-overlay.avif']

/** Commands exposed by this layer of the mobile bar. */
const commandIds: CommandId[] = ['bold', 'italic', 'underline', 'strikethrough']

/** Closes the current formatting-bar picker without affecting another surface. */
const closeFormattingBarPicker = (): Thunk => (dispatch, getState) => {
  const active = getState().activeDropdown
  if (active?.surface === 'formattingBar')
    dispatch(toggleDropdown({ dropDownType: active.picker, surface: active.surface, value: false }))
}

/** Fade the painted layers directly, leaving the panel free of opacity for backdrop filtering. */
const visibleWhenOpen = css.raw({
  opacity: 0,
  transition: 'opacity {durations.fast} ease',
  '[data-formatting-bar-open=true][data-keyboard-open=true] &': { opacity: 1 },
})

/** The opener keeps focus in the editor while revealing the bar. */
const FormattingBarOpener = ({ isOpen }: { isOpen: boolean }) => {
  const dispatch = useDispatch()

  return (
    <button
      aria-label='Open formatting bar'
      inert={isOpen}
      onMouseDown={event => {
        event.preventDefault()
        if (!isTouch) haptics.medium()
      }}
      onTouchStart={() => haptics.medium()}
      onTouchEnd={event => {
        // Cancels the synthesized click as well as the focus change, so activate here on touch devices.
        event.preventDefault()
        haptics.light()
        dispatch(toggleFormattingBar({ value: true }))
      }}
      onClick={() => {
        haptics.light()
        dispatch(toggleFormattingBar({ value: true }))
      }}
      className={css({
        position: 'absolute',
        right: '0.25rem',
        bottom: '0.25rem',
        minWidth: '40px',
        minHeight: '40px',
        padding: '0.5rem',
        display: 'grid',
        placeItems: 'center',
        background: 'transparent',
        border: 'none',
        pointerEvents: 'auto',
        cursor: 'pointer',
        opacity: 0,
        transition: 'opacity {durations.fast} ease',
        '[data-keyboard-open=true][data-formatting-bar-open=false] &': { opacity: 1 },
      })}
    >
      <span
        className={css({
          width: '1.5rem',
          height: '1.5rem',
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: 'formattingBarSurface',
          boxShadow: 'inset 0 0 1px rgba(255, 255, 255, 0.5)',
        })}
      >
        <svg
          viewBox='0 0 14 14'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
          className={css({ width: '0.875rem', height: '0.875rem' })}
        >
          <circle cx='3' cy='7' r='1.25' fill='rgb(150,150,150)' />
          <circle cx='7' cy='7' r='1.25' fill='rgb(150,150,150)' />
          <circle cx='11' cy='7' r='1.25' fill='rgb(150,150,150)' />
        </svg>
      </span>
    </button>
  )
}

/** Fades the thoughtspace into the keyboard edge; the blur and gradient are independent painted layers. */
const FormattingBarFalloff = () => (
  <div className={css({ position: 'absolute', inset: '-2.5rem 0 -2rem', pointerEvents: 'none' })}>
    <div className={css({ position: 'absolute', inset: '1.5rem 0 0' })}>
      <ProgressiveBlur direction='to top' maxBlur={8} layerClassName={css(visibleWhenOpen)} promoteLayers />
    </div>
    <div
      className={css(visibleWhenOpen, {
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(to bottom, transparent, {colors.black} 70%)',
      })}
    />
  </div>
)

/** Positions the glow artwork beneath the shell and masks the tail behind the keyboard. */
const FormattingBarGlow = () => (
  <img
    src='/img/formatting-bar/glow.png'
    alt=''
    className={css(visibleWhenOpen, {
      position: 'absolute',
      bottom: '-8rem',
      width: '100%',
      height: '25.5rem',
      objectFit: 'fill',
      display: 'block',
      pointerEvents: 'none',
      maskImage: 'linear-gradient(to top, transparent 6rem, #000 8rem)',
    })}
  />
)

/** Paints the shell behind the controls without blending or clipping the controls themselves. */
const FormattingBarShell = () => (
  <div
    className={css(visibleWhenOpen, {
      position: 'absolute',
      inset: '0 0 -2rem',
      borderTopRadius: '2rem',
      overflow: 'hidden',
      pointerEvents: 'none',
      mixBlendMode: 'color-dodge',
      zIndex: 2,
      backgroundImage:
        'radial-gradient(130.84% 151.39% at 57.5% 55.06%, {colors.formattingBarFillStart} 0%, {colors.formattingBarFillEnd} 100%)',
      maskImage: 'linear-gradient(to top, transparent, #000 2rem)',
    })}
  >
    {/* Both gradients paint the same rounded stroke. The first background is on top. */}
    <div
      className={css({
        position: 'absolute',
        inset: 0,
        borderTopRadius: '2rem',
        border: '1px solid transparent',
        borderBottomWidth: 0,
        backgroundImage:
          'linear-gradient(180deg, {colors.panelCommandBorderGradientGray} 76%, {colors.panelCommandBorderGradientPurpleLight} 143%), linear-gradient(180deg, {colors.panelCommandBorderGradientPurpleLight} 0%, {colors.panelCommandBorderGradientGray} 65%)',
        backgroundOrigin: 'border-box',
        mask: 'linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)',
        maskComposite: 'exclude',
      })}
    />
  </div>
)

/** Contains the bar's controls and consumes taps in the gaps so they cannot blur the editor. */
const FormattingBarControls = ({
  isOpen,
  iconSize,
  onIconSize,
}: {
  isOpen: boolean
  iconSize: number
  onIconSize: (size: number) => void
}) => {
  const dispatch = useDispatch()
  const iconProbeRef = useRef<HTMLSpanElement>(null)

  // CSS sizes the grid and icon probe. Measure its result only because legacy icon/picker APIs accept pixels.
  useLayoutEffect(() => {
    const element = iconProbeRef.current
    if (!element) return
    /** Reports the browser's resolved icon width without recreating its layout calculations. */
    const measure = () => {
      const width = element.getBoundingClientRect().width
      if (width <= 0) return
      onIconSize(width)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    return () => observer.disconnect()
  }, [onIconSize])

  return (
    <>
      <div
        role='toolbar'
        aria-label='Formatting Bar'
        inert={!isOpen}
        onMouseDown={event => event.preventDefault()}
        onTouchEnd={event => event.preventDefault()}
        className={css(visibleWhenOpen, {
          position: 'relative',
          zIndex: 2,
          width: '100%',
          minHeight: '48px',
          paddingBlock: '0.625rem',
          paddingInline: '1rem',
          boxSizing: 'border-box',
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: 'minmax(0, 1fr)',
          alignItems: 'center',
          pointerEvents: 'auto',
        })}
      >
        <span
          ref={iconProbeRef}
          aria-hidden='true'
          className={css({
            position: 'absolute',
            gridColumn: '1 / 2',
            gridRow: '1 / 2',
            justifySelf: 'center',
            width: '1.25rem',
            maxWidth: '100%',
            height: 0,
            pointerEvents: 'none',
          })}
        />
        {commandIds.map(id => (
          <FormattingBarButton key={id} commandId={id} iconSize={iconSize} />
        ))}
        <button
          aria-label='Close formatting bar'
          onMouseDown={() => {
            if (!isTouch) haptics.medium()
          }}
          onTouchStart={() => haptics.medium()}
          onTouchEnd={event => {
            event.preventDefault()
            haptics.light()
            dispatch([closeFormattingBarPicker(), toggleFormattingBar({ value: false })])
          }}
          onClick={() => {
            haptics.light()
            dispatch([closeFormattingBarPicker(), toggleFormattingBar({ value: false })])
          }}
          className={css({
            display: 'grid',
            placeItems: 'center',
            height: '100%',
            flex: 1,
            minWidth: 0,
            padding: 0,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          })}
        >
          <svg
            viewBox='0 0 16 16'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
            className={css({ width: '1.25rem', maxWidth: '100%', height: '1.25rem' })}
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
    </>
  )
}

/** Positions the whole keyboard accessory; CSS lays out its controls and transitions its painted layers. */
const FormattingBar = () => {
  const isOpen = useSelector(state => state.showFormattingBar)
  const keyboardOpen = virtualKeyboardStore.useSelector(state => state.open)
  const position = usePositionFixed({ fromBottom: true, height: 0 })
  const dispatch = useDispatch()
  const [iconSize, setIconSize] = useState(20)
  useEffect(() => {
    if (!keyboardOpen) dispatch(closeFormattingBarPicker())
  }, [dispatch, keyboardOpen])
  usePrefetchImages(glowImages)

  return (
    <motion.div
      data-formatting-bar-open={isOpen}
      data-keyboard-open={keyboardOpen}
      inert={!keyboardOpen}
      className={css({
        left: 0,
        width: '100%',
        height: 0,
        zIndex: 'formattingBar',
        pointerEvents: 'none',
        fontFamily: 'radioCanada',
      })}
      style={position}
    >
      <FormattingBarOpener isOpen={isOpen} />
      <div
        className={css({
          position: 'absolute',
          bottom: 0,
          width: '100%',
          display: 'grid',
          transform: 'translateY(100%)',
          transition: 'transform {durations.fast} ease',
          '[data-formatting-bar-open=true][data-keyboard-open=true] &': { transform: 'translateY(0)' },
        })}
      >
        <div className={css({ position: 'absolute', inset: 0, zIndex: 0 })}>
          <FormattingBarFalloff />
        </div>
        <div className={css({ position: 'absolute', inset: 0, zIndex: 1 })}>
          <FormattingBarGlow />
        </div>
        <div className={css({ position: 'relative', width: '92.5%', maxWidth: '36rem', marginInline: 'auto' })}>
          <FormattingBarShell />
          <FormattingBarControls isOpen={isOpen} iconSize={iconSize} onIconSize={setIconSize} />
        </div>
      </div>
    </motion.div>
  )
}

export default FormattingBar
