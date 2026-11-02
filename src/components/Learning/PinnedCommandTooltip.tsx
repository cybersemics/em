import { RefObject, useCallback, useEffect, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import { toggleHelpGenieActionCreator as toggleHelpGenie } from '../../actions/toggleHelpGenie'
import { isTouch } from '../../browser'
import { formatKeyboardShortcut, gestureString } from '../../commands'
import usePrefetchImages from '../../hooks/usePrefetchImages'
import gestureStore from '../../stores/gestureStore'
import fastClick from '../../util/fastClick'
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
  /** The ring button. A press on it is not a press outside the tooltip: the ring toggles the tooltip itself. */
  ringRef: RefObject<HTMLElement | null>
  /** The row of genie and text, which the ring measures to line its center up with the row's. */
  rowRef: RefObject<HTMLDivElement | null>
  /** How far the enlarged ring reaches in from the right edge of the screen, in px. The row keeps its text clear of it. */
  ringFootprint: number
}

/** The image behind the tooltip's surface glow. */
const SURFACE_GLOW_IMAGE = '/img/pinned-command/pinned-command-glow.avif'
/** The glow behind the gesture diagram, separate from the surface glow because the diagram can be absent. */
const GESTURE_GLOW_IMAGE = '/img/pinned-command/pinned-command-gesture-glow.avif'
/** Both glow images. Stable, so usePrefetchImages does not re-run every render. */
const GLOW_IMAGES = [SURFACE_GLOW_IMAGE, GESTURE_GLOW_IMAGE]

/**
 * Dismisses the tooltip when the user taps outside it, while it is open.
 *
 * The tooltip lets pointer events through so its gesture can be traced on the page beneath, so a press that starts a
 * trace looks like a tap when it goes down. Rather than classify the press itself, this waits for it to end and asks
 * what MultiGesture made of it: a press during which the gesture store recorded a gesture was a trace, and leaves the
 * tooltip open. A press the browser cancels was taken over as a scroll, and also leaves it open. Any other press that
 * ends outside the tooltip and the ring was a tap, and dismisses it. The ring toggles the tooltip itself.
 */
const useDismissOnOutsideTap = (isOpen: boolean, insideRefs: RefObject<HTMLElement | null>[], dismiss: () => void) => {
  // The press in progress outside the tooltip, and whether it has drawn a gesture yet. Null between presses.
  const press = useRef<{ traced: boolean } | null>(null)

  gestureStore.useEffect(
    useCallback(({ gesture }: { gesture: string }) => {
      if (press.current && gesture) press.current.traced = true
    }, []),
  )

  useEffect(() => {
    if (!isOpen) return

    /** Starts watching a press that went down outside the tooltip and the ring. */
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      press.current = target && !insideRefs.some(ref => ref.current?.contains(target)) ? { traced: false } : null
    }

    /** Dismisses if the press ended without drawing a gesture. */
    const handlePointerUp = () => {
      if (press.current && !press.current.traced) dismiss()
      press.current = null
    }

    /** A cancelled press was taken over by the browser or the OS, such as for a scroll. It is not a tap. */
    const handlePointerCancel = () => {
      press.current = null
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('pointerup', handlePointerUp, true)
    document.addEventListener('pointercancel', handlePointerCancel, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('pointerup', handlePointerUp, true)
      document.removeEventListener('pointercancel', handlePointerCancel, true)
    }
  }, [isOpen, insideRefs, dismiss])
}

/**
 * The command's gesture, drawn large with its own glow behind it. Portrait only: there is no landscape design for the
 * diagram yet. It sits in the surface's content layer so the blur, gradient, fade, and inert state cover it, but the
 * surface passes pointer events through, so a trace that starts over it reaches the thoughtspace instead of the
 * swipe-to-dismiss handler. The glow is positioned relative to the diagram box so the two stay aligned on every device.
 * Sizes were tuned against the design at 393pt.
 */
const PinnedCommandGestureDiagram = ({ gesture }: { gesture: string }) => (
  <div
    data-testid='pinned-command-gesture'
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
        backgroundSize: '100% 100%',
        filter: 'blur(0px)',
        opacity: '1',
      })}
      style={{ backgroundImage: `url(${GESTURE_GLOW_IMAGE})` }}
    />
    <GestureDiagram
      path={gesture}
      // Inline rather than a className: GestureDiagram sets height: auto in its own class, and cx cannot make a
      // second class that sets height win over it.
      style={{ width: '100%', height: '100%' }}
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
)

/** The learning genie: the same button as the Command Universe header's Help. It lets the help genie out, or puts it back. */
const LearningGenieButton = () => {
  const dispatch = useDispatch()
  const genieVisible = useSelector(state => state.helpGenie.visible)
  const genieUnavailable = useSelector(state => state.helpGenie.unavailable)

  return (
    <div className={css({ flex: 'none', translate: '0px 0px' })}>
      <CircleButton
        ariaLabel='Help'
        size='1.7778rem'
        pressed={genieVisible}
        disabled={genieUnavailable}
        onClick={() => dispatch(toggleHelpGenie({}))}
      >
        <InfoGenieIcon
          size={24}
          fill={token('colors.pinnedCommandGenieIcon')}
          className={css({ width: '1.3333rem', height: '1.3333rem' })}
        />
      </CircleButton>
    </div>
  )
}

/**
 * The command's name, as a button that opens its Command Universe detail page, followed by a chevron.
 *
 * The name's last word and the chevron share a no-break span, so the chevron can never wrap onto a line of its own. A
 * break opportunity always exists before an inline box, whatever character precedes it, so a word joiner or a
 * non-breaking space cannot do this.
 */
const PinnedCommandTooltipTitle = ({ label, onClick }: { label: string; onClick: () => void }) => {
  const lastSpace = label.lastIndexOf(' ')
  // Every word but the last, which may wrap freely.
  const labelHead = lastSpace === -1 ? '' : label.slice(0, lastSpace + 1)
  // The last word, which stays on the chevron's line.
  const labelTail = lastSpace === -1 ? label : label.slice(lastSpace + 1)

  return (
    <button
      type='button'
      onPointerDown={event => event.preventDefault()}
      onClick={onClick}
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
          className={css({
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
  )
}

/**
 * How to activate the command. Touch devices practice the gesture and other devices the shortcut; a command with
 * neither is only reachable from the Command Universe, so it points there. Over the Mobile Command Universe nothing can
 * be activated: a trace there is a dry run, and shortcuts do not run. The gradient is painted as the background
 * and clipped to the glyphs, as on the Command Universe detail page's gesture caption.
 */
const PinnedCommandTooltipSubtitle = ({ command }: { command: Command }) => {
  const gesture = gestureString(command)
  const keyboard = command.keyboardDisplay ?? command.keyboard
  const inCommandUniverse = useSelector(state => !!state.showMobileCommandUniverse)
  const shortcut = keyboard ? formatKeyboardShortcut(keyboard) : null
  const instruction =
    isTouch && gesture
      ? inCommandUniverse
        ? 'Trace the gesture to practice.'
        : 'Trace the gesture to activate.'
      : shortcut
        ? inCommandUniverse
          ? `Close Commands, then press ${shortcut} to activate.`
          : `Press ${shortcut} to activate.`
        : 'Open it in the Command Universe to learn more.'

  return (
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
  )
}

/**
 * Dismisses the tooltip. It hangs below the row and outside its flow, aligned with the text column, so it does not
 * pull the row's vertical center down; it sits in the surface's bottom padding.
 */
const ClearButton = ({ onClear }: { onClear: () => void }) => (
  <div
    className={css({
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
    {...fastClick(onClear)}
  >
    <CloseIcon size={10} className={css({ width: '0.5556rem', height: '0.5556rem' })} />
    <span>Clear</span>
  </div>
)

/** The pinned command's expanded overlay: its gesture drawn large in portrait, its name, a link to its detail page, and how to activate it. */
const PinnedCommandTooltip = ({
  command,
  id,
  isOpen,
  onClose,
  onOpacityChange,
  onReveal,
  ringRef,
  rowRef,
  ringFootprint,
}: PinnedCommandTooltipProps) => {
  const surfaceRef = useRef<{ dismiss: () => void }>(null)
  const tooltipRef = useRef<HTMLElement>(null)
  // A press on the tooltip or the ring is not a press outside.
  const insideRefs = useMemo(() => [tooltipRef, ringRef], [ringRef])
  const gesture = gestureString(command)
  usePrefetchImages(GLOW_IMAGES)

  /** Fades the surface out, then closes the tooltip. */
  const dismiss = useCallback(() => surfaceRef.current?.dismiss(), [])
  useDismissOnOutsideTap(isOpen, insideRefs, dismiss)

  const inCommandUniverse = useSelector(state => !!state.showMobileCommandUniverse)
  // A gesture is in progress on the page beneath: the user is practicing. Dim everything but the diagram.
  const isTracing = gestureStore.useSelector(state => state.gesture !== '')

  return (
    <NotificationSurface
      ref={surfaceRef}
      anchor={{ base: 'bottom-full', lg: 'bottom-right' }}
      glow='pinnedCommand'
      glowImage={SURFACE_GLOW_IMAGE}
      isVisible={isOpen}
      onDismiss={onClose}
      onOpacityChange={onOpacityChange}
      dimmed={isTracing}
      // Over the Command Universe a press that fell through would land on the dialog's backdrop and close it.
      pointerEventsPassThrough={!inCommandUniverse}
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
        {gesture ? <PinnedCommandGestureDiagram gesture={gesture} /> : null}

        {/* The only interactive region: the surface passes pointer events through elsewhere. One row, vertically centered, so the genie, the text, and the ring in the corner read as a single unit; Clear hangs below it in the surface's bottom padding. The ring lines its center up with this row's, and the right padding keeps the text clear of the enlarged ring. */}
        <div
          ref={rowRef}
          className={css({
            display: 'flex',
            position: 'relative',
            alignItems: 'center',
            transition: 'opacity {durations.fast} ease',
            // A fixed height keeps the row's center in the same place however the text wraps; wrapped text overflows
            // the row symmetrically.
            height: '3rem',
            translate: '0 -0.3889rem',
            gap: '1rem',
          })}
          style={{
            // Reserve what the enlarged ring covers, plus a gap, less the surface's own 1.5rem side padding that already
            // keeps the text off the edge of the screen.
            paddingRight: `calc(${ringFootprint}px + 0.5rem - 1.5rem)`,
            // Dims with the surface while the user traces, through the row's opacity transition.
            opacity: isTracing ? 0.5 : 1,
            pointerEvents: isOpen ? 'auto' : 'none',
          }}
        >
          <LearningGenieButton />
          {/* Title and subtitle, tuned against the design; text metrics are rem so they follow the font size setting. */}
          <div
            className={css({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.1111rem',
            })}
          >
            <PinnedCommandTooltipTitle label={command.label} onClick={onReveal} />
            <PinnedCommandTooltipSubtitle command={command} />
          </div>
          <ClearButton onClear={dismiss} />
        </div>
      </section>
    </NotificationSurface>
  )
}

export default PinnedCommandTooltip
