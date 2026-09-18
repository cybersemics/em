import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import { isTouch } from '../../browser'
import { formatKeyboardShortcut, gestureString } from '../../commands'
import { Settings } from '../../constants'
import usePrefetchImages from '../../hooks/usePrefetchImages'
import getUserSetting from '../../selectors/getUserSetting'
import gestureStore from '../../stores/gesture'
import fastClick from '../../util/fastClick'
import isInGestureZone from '../../util/isInGestureZone'
import GestureDiagram from '../GestureDiagram'
import NotificationSurface from '../Notifications/NotificationSurface'
import CircleButton from '../dialog/CircleButton'
import ChevronRightIcon from '../icons/ChevronRightIcon'
import CloseIcon from '../icons/CloseIcon'
import InfoGenieIcon from '../icons/InfoGenieIcon'

interface PinnedCommandTooltipProps {
  /** The command selected by the learning widget. */
  command: Command
  /** Connects the ring button with this interactive tooltip. */
  id: string
  /** Whether the tooltip is expanded. */
  isOpen: boolean
  /** Closes the tooltip after its fade. */
  onClose: () => void
  /** Reports the surface opacity so the ring can scale with it. */
  onOpacityChange: (opacity: number) => void
  /** Reveals this command's detail page without executing it. */
  onReveal: () => void
}

/** How far a pointer may travel between down and up and still count as a tap. Matches MultiGesture's minimum swipe distance, so anything further is a gesture. */
const TAP_SLOP = 10

/** The glow behind the gesture diagram. Owned here rather than by the surface because it exists only with the diagram. Stable so usePrefetchImages does not re-run every render. */
const GESTURE_GLOW_IMAGE: [string] = ['/img/pinned-command/pinned-command-gesture-glow.avif']

/** The pinned command's expanded overlay: its gesture drawn large in portrait, its name, a link to its detail page, and how to activate it. */
const PinnedCommandTooltip = ({
  command,
  id,
  isOpen,
  onClose,
  onOpacityChange,
  onReveal,
}: PinnedCommandTooltipProps) => {
  const surfaceRef = useRef<{ dismiss: () => void }>(null)
  const tooltipRef = useRef<HTMLElement>(null)
  const gesture = gestureString(command)
  usePrefetchImages(GESTURE_GLOW_IMAGE)
  const keyboard = command.keyboardDisplay ?? command.keyboard
  // The title's last word and the chevron share a no-break span so the chevron can never wrap onto a line of its
  // own. A break opportunity always exists before an inline box whatever character precedes it, so a word joiner or
  // non-breaking space cannot do this.
  const lastSpace = command.label.lastIndexOf(' ')
  const labelHead = lastSpace === -1 ? '' : command.label.slice(0, lastSpace + 1)
  const labelTail = lastSpace === -1 ? command.label : command.label.slice(lastSpace + 1)

  // A gesture is in progress on the page beneath: the user is practicing. Dim everything but the diagram.
  const isTracing = gestureStore.useSelector(state => state.gesture !== '')

  const leftHanded = useSelector(getUserSetting(Settings.leftHanded))

  // A tap anywhere, on the tooltip or off it, dismisses. So does a scroll. A gesture trace does not: the surface passes
  // pointer events through, so a drag that starts in the gesture zone is a trace for the thoughtspace beneath, while
  // one that starts outside it, in the scroll zone or the toolbar, is a scroll. The zone is the same isInGestureZone
  // that MultiGesture applies, so the two cannot disagree. A tap is a pointer that never strays past TAP_SLOP from
  // where it went down, judged on every move rather than only at lift, since a trace can end back where it began.
  // Pointer events cover touch and mouse alike, and a touch the browser takes for scrolling ends in pointercancel,
  // which is not a tap. Listening in the capture phase means no control can hide a press by stopping propagation; the
  // dev-only tuning panel is the one place a press must not count, since it is operated while the tooltip stays open.
  useEffect(() => {
    if (!isOpen) return
    let start: { x: number; y: number; inGestureZone: boolean } | null = null

    /** Records where the pointer went down and which zone that was, unless it went down on the tuning panel. */
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      const { clientX: x, clientY: y } = event
      start = target?.closest?.('[data-pinned-command-debug]')
        ? null
        : { x, y, inGestureZone: isInGestureZone(x, y, leftHanded) }
    }

    /** Once the pointer has strayed past the slop, this press is a drag for good: a scroll dismisses, a trace does not. */
    const handlePointerMove = (event: PointerEvent) => {
      if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) < TAP_SLOP) return
      const isScroll = !start.inGestureZone
      start = null
      if (isScroll) surfaceRef.current?.dismiss()
    }

    /** Dismisses if the pointer lifted without ever leaving the tap slop. */
    const handlePointerUp = (event: PointerEvent) => {
      handlePointerMove(event)
      if (!start) return
      start = null
      surfaceRef.current?.dismiss()
    }

    /** A cancelled pointer was taken over by the browser or the OS; it is not a tap. */
    const handlePointerCancel = () => {
      start = null
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('pointermove', handlePointerMove, true)
    document.addEventListener('pointerup', handlePointerUp, true)
    document.addEventListener('pointercancel', handlePointerCancel, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('pointermove', handlePointerMove, true)
      document.removeEventListener('pointerup', handlePointerUp, true)
      document.removeEventListener('pointercancel', handlePointerCancel, true)
    }
  }, [isOpen, leftHanded])

  // Touch devices practice the gesture; other devices practice the shortcut. A command with neither is only reachable
  // from the Command Universe, so point there.
  const instruction =
    isTouch && gesture
      ? 'Trace the gesture to activate.'
      : keyboard
        ? `Press ${formatKeyboardShortcut(keyboard)} to activate.`
        : 'Open it in the Command Universe to learn more.'

  return (
    <NotificationSurface
      ref={surfaceRef}
      anchor={{ base: 'bottom-full', lg: 'bottom-right' }}
      glow='pinnedCommand'
      isVisible={isOpen}
      onDismiss={onClose}
      onOpacityChange={onOpacityChange}
      dimmed={isTracing}
      passThrough
    >
      <section
        ref={tooltipRef}
        id={id}
        role='dialog'
        aria-label={`Gesture for ${command.label}`}
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={css({
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          width: '100%',
          maxWidth: '24rem',
          marginLeft: { base: 0, lg: 'auto' },
          alignItems: 'flex-start',
          textAlign: 'left',
          fontFamily: 'radioCanada',
          // Clear hangs into the surface's bottom padding, which is tight on devices without a safe-area inset. Add
          // room there, shrinking to nothing as the inset itself provides it.
          paddingBottom: 'max(0px, calc(0.75rem - env(safe-area-inset-bottom)))',
        })}
      >
        {gesture ? (
          // Portrait only: there is no landscape design for the diagram yet. It sits in the content layer so the blur,
          // gradient, fade, and inert state cover it, but the surface passes pointer events through, so a trace that
          // starts over it reaches the thoughtspace instead of the swipe-to-dismiss handler. Its glow is its own image
          // behind it, positioned relative to the diagram box so the two stay aligned on every device; the surface
          // glow is separate because this one can be absent.
          // Sizes were tuned against the design at 393pt.
          <div
            aria-hidden
            className={css({
              position: 'relative',
              hideFrom: 'lg',
              width: '50.9vw',
              aspectRatio: '1 / 1',
              marginBottom: '2.5rem',
              // Tuned against the design at 393pt: the diagram overhangs the content padding slightly.
              marginLeft: '1.3333rem',
              translate: '0 0.8889rem',
            })}
          >
            <div
              className={css({
                position: 'absolute',
                zIndex: -1,
                left: 'calc(50% + -33%)',
                top: 'calc(50% + -17%)',
                width: '290%',
                aspectRatio: '1765 / 1459',
                transform: 'translate(-50%, -50%)',
                backgroundImage: 'url(/img/pinned-command/pinned-command-gesture-glow.avif)',
                backgroundSize: '100% 100%',
                filter: 'blur(0px)',
                opacity: '1',
              })}
            />
            <GestureDiagram
              path={gesture}
              cssRaw={css.raw({ width: '100%', height: '100%' })}
              // Each gesture has its own bounds, so anchor the drawing to the box's bottom-left rather than centering
              // it; the left edge and the gap to the text then hold for every command.
              preserveAspectRatio='xMinYMax meet'
              size={150}
              arrowSize={1}
              // Thinner than the Command Universe detail page's 12, which was tuned for a 130px box; at this size the
              // design's stroke is about 7% of the diagram's width.
              strokeWidth={7}
              arrowhead='outlined-wide'
              chevronApexAngle={80}
              chevronSize={2.2}
              cornerRadius={12}
              color='#ffffff'
              gradient={{ from: 'rgba(88, 181, 212, 0.45)', to: 'rgba(255, 255, 255, 1)' }}
              glow={false}
            />
          </div>
        ) : null}

        {/* The only interactive region: the surface passes pointer events through elsewhere. One row, vertically centered, so the genie, the text, and the ring in the corner read as a single unit; Clear hangs below it in the surface's bottom padding. The right padding keeps the text clear of the enlarged ring. */}
        <div
          className={css({
            pointerEvents: 'auto',
            display: 'flex',
            position: 'relative',
            alignItems: 'center',
            transition: 'opacity {durations.fast} ease',
            // A fixed height keeps the row's center a pure CSS quantity that PinnedCommand aims the ring at; wrapped
            // text overflows the row symmetrically. The value here mirrors PinnedCommand.
            height: '3rem',
            translate: '0 -0.3889rem',
            gap: '1rem',
            // Reserve only what the enlarged ring covers: its visible circle's left edge sits 59.3px from the box's
            // right edge (73 - (36.42 - 22.7)), scaled, plus a gap, less the surface's own 1.5rem side padding that
            // already keeps the text off the edge. The scale fallback mirrors PinnedCommand.
            paddingRight: 'calc(59.3px * 1.25 + 0.5rem - 1.5rem)',
          })}
          style={{ opacity: isTracing ? 0.5 : 1 }}
        >
          {/* The learning genie: the same button as the Command Universe header's Help. The learning portal it opens does not exist yet, so it has no action. */}
          <div
            className={css({
              flex: 'none',
              translate: '0px 0px',
            })}
          >
            <CircleButton ariaLabel='Help' size='1.7778rem'>
              <InfoGenieIcon
                size={24}
                fill={token('colors.pinnedCommandGenieIcon')}
                cssRaw={css.raw({
                  width: '1.3333rem',
                  height: '1.3333rem',
                })}
              />
            </CircleButton>
          </div>
          {/* Title and instruction, tuned against the design; text metrics are rem so they follow the font size setting. */}
          <div
            className={css({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.1111rem',
            })}
          >
            <button
              type='button'
              onPointerDown={event => event.preventDefault()}
              onClick={onReveal}
              className={css({
                // Plain block text rather than a flex row, so a wrapping title keeps the chevron in the text flow after
                // its last word instead of centering it beside the whole block.
                display: 'block',
                padding: 0,
                border: 0,
                background: 'transparent',
                color: 'pinnedCommandTitle',
                fontFamily: 'inherit',
                fontSize: '1rem',
                fontWeight: '700',
                lineHeight: 1.3,
                textAlign: 'left',
                // Avoid a short last line, so a wrap breaks the title earlier rather than leaving one word behind.
                textWrap: 'pretty',
                cursor: 'pointer',
              })}
            >
              {labelHead}
              <span className={css({ whiteSpace: 'nowrap' })}>
                {labelTail}
                {/* The chevron is sized in em so it follows the title's font size, and vertical-align lifts its inline
                box so the chevron's center sits on the caps' center: the chevron is 0.532em above the box bottom, the
                cap center 0.345em above the baseline, in Radio Canada Big. currentColor and a matching drop shadow
                give it the label's color and glow. */}
                <ChevronRightIcon
                  size={20}
                  strokeWidth={2}
                  fill='currentColor'
                  cssRaw={css.raw({
                    display: 'inline-block',
                    width: '1.111em',
                    height: '1.111em',
                    verticalAlign: '-0.187em',
                    marginLeft: '0.35rem',
                    filter: 'drop-shadow(0 0 4px {colors.fgOverlay40})',
                    opacity: '1',
                  })}
                />
              </span>
            </button>

            {/* Gradient text, as on the Command Universe detail page's gesture caption: the gradient is painted as the
            background and clipped to the glyphs. */}
            <span
              className={css({
                backgroundImage:
                  'linear-gradient(158deg, token(colors.pinnedCommandInstructionGradientStart) 0%, token(colors.pinnedCommandInstructionGradientEnd) 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
                opacity: '1',
                fontSize: '0.7778rem',
                fontWeight: '600',
                lineHeight: 1.4,
              })}
            >
              {instruction}
            </span>
          </div>
          <div
            className={css({
              // Below the row and outside its flow, aligned with the text column, so it does not pull the row's
              // vertical center down. It sits in the surface's bottom padding.
              position: 'absolute',
              left: 'calc(1.7778rem + 1rem + 0px)',
              top: 'calc(100% + 0.5rem)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              color: 'fg',
              opacity: 0.5,
              fontSize: '0.65rem',
              textDecoration: 'underline',
              WebkitTapHighlightColor: 'transparent',
              transition: 'opacity {durations.fast} ease',
              _hover: { opacity: 0.8 },
              _active: { opacity: 0.4 },
            })}
            {...fastClick(() => surfaceRef.current?.dismiss())}
          >
            <CloseIcon size={10} cssRaw={css.raw({ width: '0.5556rem', height: '0.5556rem' })} />
            <span>Clear</span>
          </div>
        </div>
      </section>
    </NotificationSurface>
  )
}

export default PinnedCommandTooltip
