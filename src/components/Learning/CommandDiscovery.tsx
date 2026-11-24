import {
  AnimatePresence,
  MotionValue,
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useTime,
  useTransform,
} from 'motion/react'
import { RefObject, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import { commandDiscoveryActionCreator as commandDiscovery } from '../../actions/commandDiscovery'
import { toggleHelpGenieActionCreator as toggleHelpGenie } from '../../actions/toggleHelpGenie'
import { commandById, gestureString } from '../../commands'
import { PINNED_COMMAND_RING_SIZE } from '../../constants'
import { SELECTED_ITEM_DESCRIPTION_LINE_HEIGHT_REM, SELECTED_ITEM_GAP_REM } from '../../hooks/useGestureMenuLayout'
import useLockBodyScroll from '../../hooks/useLockBodyScroll'
import commandDiscoveryStore from '../../stores/commandDiscoveryStore'
import haptics from '../../util/haptics'
import sampleCurve from '../../util/sampleCurve'
import GestureDiagram from '../GestureDiagram'
import GhostFog from '../GestureMenu/GhostFog'
import FOG_BLEED from '../GestureMenu/fogBleed'
import flightSpeeds from '../HelpGenie/flightSpeeds'
import geniePerformanceStore, {
  endPerformance,
  genieOpacity,
  startPerformance,
} from '../HelpGenie/geniePerformanceStore'
import route from '../HelpGenie/route'
import BlurCrossfade from './BlurCrossfade'
import DiscoveryBase from './DiscoveryBase'
import PinnedCommandRing from './PinnedCommandRing'
import { ANCHORS, DEVELOP_CURVE, FRAME, GLITTER } from './discoveryDesign'
import discoveryHaptics from './discoveryHaptics'
import discoveryRoute from './discoveryRoute'
import discoveryTimeline, { fogDescent } from './discoveryTimeline'
import pinnedCommandDock from './pinnedCommandDock'
import ringGeometry from './ringGeometry'

const T = discoveryTimeline

/**
 * The type, matched to the Gesture Menu's, so a command reads the same here as it did in the menu a moment before: the
 * name as a selected row's title, the description as the ghost's italic hint, and the note as a row's description. In
 * rem, so it follows the user's font size.
 */
const TYPE = {
  title: { fontSize: 0.95, lineHeight: 1.3 },
  description: { fontSize: 0.83, lineHeight: SELECTED_ITEM_DESCRIPTION_LINE_HEIGHT_REM * 1.15 },
  note: { fontSize: 0.78, lineHeight: SELECTED_ITEM_DESCRIPTION_LINE_HEIGHT_REM },
  /** The gesture's box and the gap after it, as in a menu row. */
  gesture: { box: 1, gap: 0.89 },
  /** The gap between the name, the description, the note, and Done. */
  gap: SELECTED_ITEM_GAP_REM,
}

/** How much smaller the name is drawn until the fog lands, when it settles to its size. From the design. */
const TITLE_SETTLE_FROM = 0.73 / 0.748

/** Where the parts sit, in px, beyond what ANCHORS gives. From the design. */
const LAYOUT = {
  /** The left edge of the gesture, which the name follows. */
  rowLeft: 42.87,
  /** How far left of the name the italic description starts, and Done's pill. */
  descriptionIndent: ANCHORS.block.left - ANCHORS.title.left,
  doneIndent: -11.6,
  /** The gap between the end of the name and its chevron. */
  chevronGap: 16.9,
  /** Where the hint beside the ring ends and its first line begins, from the ring's center: a little closer than the design's. */
  pinHint: { right: 38, top: -14.5 },
  /** The widest the description and note run, from Figma. */
  descriptionWidth: 279,
  noteWidth: 245,
}

/** How thick and how blurred the fog becomes once it settles, against 1 and 0 as it falls. */
const SETTLED_FOG = { opacity: 0.86, blur: 5 }

/** Half the width of the soft edge where the genie reveals the name, and where it clears the fog, in px. */
const REVEAL_EDGE = { title: 26, fog: 10 }
/** How blurred the name is before the genie reaches it, in px. It sharpens as the genie crosses it. */
const UNREVEALED_BLUR = 8
/** Far enough left that nothing is revealed, in px. */
const NOTHING_REVEALED = -1000
/** How far before the chevron the genie starts to reveal it, and over how far. */
const CHEVRON_REVEAL = { lead: 5, over: 14 }
/** The chevron's opacity once revealed. */
const CHEVRON_OPACITY = 0.47

/** How blurred the description and note are before they develop, in px. */
const UNDEVELOPED_BLUR = 6
/** How far below its place Done starts, in px, and how small. */
/** Done's opacity once it is in, as the design's. */
const DONE_OPACITY = 0.8
const DONE_RISE = { y: 10, scale: 0.96 }
/** How much larger the ring starts as it appears, and how far its ripple spreads. */
const RING_GROWTH = { appear: 1.25, ripple: 1.8 }
/** The ripple's brightest. */
const RIPPLE_OPACITY = 0.45

/** The genie at its brightest. */
const GENIE_OPACITY = 0.85
/** A stiff spring that does not overshoot, so the genie follows the design's flight closely rather than rounding it. */
const FLIGHT_SPRING = { stiffness: 2500, damping: 1 }

/** The size of a speck of glitter at a size of 1, in px. */
const GLITTER_SPECK = 40
/** How fast a speck of glitter drifts to where it settles, and how fast it fades from its first glint, in seconds. */
const GLITTER_TIMING = { drift: 0.7, fade: 0.35, glint: 0.03 }
/** How bright a speck of glitter is when it is dropped, and how far it wanders once it has settled, in px. */
const GLITTER_LOOK = { opacity: 0.9, wander: 9 }
/**
 * How much faster a settled speck wanders than the design's, which barely moved: slowly, on a loop of ten to twenty
 * seconds, made of two waves at unrelated speeds so it never traces a visible circle.
 */
const GLITTER_WANDER = { speed: 1.2, overtone: 2.7, overtoneSize: 0.4 }
/**
 * The design's glitter twinkles on its own clock, which starts 1.5s before the discovery; the specks keep the same
 * phases by counting from there.
 */
const DESIGN_CLOCK_OFFSET = 1.5

/** How far the playhead is through a span of the timeline, from 0 to 1, eased if the span has an easing. */
const through = (t: number, { start, end, ease }: { start: number; end: number; ease?: (p: number) => number }) => {
  const p = Math.min(1, Math.max(0, (t - start) / (end - start)))
  return ease ? ease(p) : p
}

/** Linear interpolation from a to b. */
const mix = (a: number, b: number, p: number) => a + (b - a) * p

/**
 * Whether the playhead has just crossed a time, going forward. A cue at that time plays once: a playhead that jumps
 * past it still plays it, and one that never reaches it never does.
 */
const crossed = (previous: number, t: number, at: number) => previous < at && t >= at

/** Where things are on screen, measured once the screen has laid out, in viewport px. */
interface Layout {
  /** The command's name: its left and right edges and its vertical center. */
  title: { left: number; right: number; centerY: number }
  /** The left edge of the gesture beside it. */
  rowLeft: number
  /** The description and note. */
  block: { left: number; right: number; top: number; bottom: number }
  /** The center of the pinned command ring. */
  ring: { x: number; y: number }
  /** The center of the command's gesture. */
  gesture: { x: number; y: number } | null
  /** Where the ghost's title was in the Gesture Menu: its left edge and vertical center, and its gesture's center. */
  origin: { x: number; y: number; gesture: { x: number; y: number } | null }
  /** Where the genie's route is at a time, in seconds from the discovery. */
  path: (time: number) => { x: number; y: number }
  /** How fast the genie flies its route, from setting off until it lands. */
  flight: { time: number; speed: number }[]
}

/** The props each part of the screen is drawn from: the playhead, and where things are once measured. */
interface PartProps {
  t: MotionValue<number>
  layout: RefObject<Layout | null>
}

/**
 * The fog the command was in, fully charged, as the hold left it. It falls straight down from where it was in the
 * Gesture Menu to where the name will be, thins and softens as it settles, and clears behind the genie.
 */
const Fog = ({ command, t, layout, reveal }: PartProps & { command: Command; reveal: MotionValue<number> }) => {
  // It moves across to where the name starts as it falls, so it lands on the name, with the gesture beside it.
  const left = useTransform(t, time => {
    const l = layout.current
    return l ? mix(l.origin.x, l.title.left, fogDescent(time)) : 0
  })
  const top = useTransform(t, () => layout.current?.origin.y ?? 0)
  const y = useTransform(t, time => {
    const l = layout.current
    return l ? (l.title.centerY - l.origin.y) * fogDescent(time) : 0
  })
  /** How far the fog has settled at a moment, from 0 to 1. */
  const settled = (time: number) => through(time, T.fogSettles)
  const opacity = useTransform(t, time => (layout.current ? mix(1, SETTLED_FOG.opacity, settled(time)) : 0))
  const sharpness = useTransform(t, time => 1 - settled(time))
  // The mask is drawn across the fog's box, which reaches FOG_BLEED past the fog on each side for its blur.
  // The genie only reaches the fog once it has landed on the name.
  const edgeStart = useTransform(reveal, r => r - (layout.current?.title.left ?? 0) + FOG_BLEED - REVEAL_EDGE.fog)
  const edgeEnd = useTransform(reveal, r => r - (layout.current?.title.left ?? 0) + FOG_BLEED + REVEAL_EDGE.fog)
  const mask = useMotionTemplate`linear-gradient(90deg, transparent ${edgeStart}px, black ${edgeEnd}px)`
  return (
    <motion.div
      aria-hidden
      style={{
        left,
        top,
        y,
        opacity,
        maskImage: mask,
        WebkitMaskImage: mask,
        padding: FOG_BLEED,
        margin: -FOG_BLEED,
        marginTop: `calc(-0.5em - ${FOG_BLEED}px)`,
      }}
      className={css({ position: 'absolute', fontSize: '0.95rem', pointerEvents: 'none' })}
    >
      <BlurCrossfade sharpness={sharpness} blur={SETTLED_FOG.blur}>
        <GhostFog label={command.label} />
      </BlurCrossfade>
    </motion.div>
  )
}

/**
 * The command's gesture and name. The gesture appears as the fog lands, and the name settles to its size. Then the
 * genie skims the fog, and the name sharpens into view behind its head, with a chevron after it once the genie has
 * passed.
 */
const Title = ({
  command,
  t,
  layout,
  reveal,
  rowRef,
  nameRef,
  gestureRef,
}: PartProps & {
  command: Command
  reveal: MotionValue<number>
  rowRef: RefObject<HTMLDivElement | null>
  nameRef: RefObject<HTMLDivElement | null>
  gestureRef: RefObject<HTMLDivElement | null>
}) => {
  const scale = useTransform(t, time => mix(TITLE_SETTLE_FROM, 1, through(time, T.titleSettles)))
  // The gesture comes down with the fog from where it was in the Gesture Menu, rather than appearing as the fog lands.
  /** How far the gesture still has to travel at a moment, on one axis. */
  const gestureOffset = (time: number, axis: 'x' | 'y') => {
    const l = layout.current
    return l?.origin.gesture && l.gesture ? (l.origin.gesture[axis] - l.gesture[axis]) * (1 - fogDescent(time)) : 0
  }
  const gestureX = useTransform(t, time => gestureOffset(time, 'x'))
  const gestureY = useTransform(t, time => gestureOffset(time, 'y'))
  // Hidden until the screen has been measured, so it never shows a frame out of place.
  const gestureOpacity = useTransform(t, () => (layout.current ? 1 : 0))
  // How far across the row the genie has reached, from 0 to 1. The name sharpens as it goes.
  const across = useTransform(reveal, r => {
    const l = layout.current
    return l ? Math.min(1, Math.max(0, (r - l.rowLeft) / (l.title.right - l.rowLeft))) : 0
  })
  // The mask is drawn across the name's box, which reaches FOG_BLEED past it on each side for its blur and glow.
  const edgeStart = useTransform(reveal, r => r - (layout.current?.title.left ?? 0) + FOG_BLEED - REVEAL_EDGE.title)
  const edgeEnd = useTransform(reveal, r => r - (layout.current?.title.left ?? 0) + FOG_BLEED + REVEAL_EDGE.title)
  const mask = useMotionTemplate`linear-gradient(90deg, black ${edgeStart}px, transparent ${edgeEnd}px)`
  const chevronOpacity = useTransform(reveal, r => {
    const l = layout.current
    if (!l) return 0
    const chevron = l.title.right + LAYOUT.chevronGap - CHEVRON_REVEAL.lead
    return Math.min(1, Math.max(0, (r - chevron) / CHEVRON_REVEAL.over)) * CHEVRON_OPACITY
  })

  return (
    <motion.div
      ref={rowRef}
      style={{ scale, transformOrigin: `${TYPE.gesture.box / 2}rem 50%`, gap: `${TYPE.gesture.gap}rem` }}
      className={css({ display: 'flex', alignItems: 'center' })}
    >
      <motion.div
        ref={gestureRef}
        style={{
          x: gestureX,
          y: gestureY,
          opacity: gestureOpacity,
          width: `${TYPE.gesture.box}rem`,
          height: `${TYPE.gesture.box}rem`,
        }}
        className={css({ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' })}
      >
        <GestureDiagram
          path={gestureString(command)}
          maxWidth={18}
          maxHeight={18}
          strokeWidth={3}
          arrowhead='none'
          rounded={command.rounded}
          color={token('colors.fg')}
          glow={false}
          useGradient={false}
        />
      </motion.div>
      <div
        ref={nameRef}
        style={{ fontSize: `${TYPE.title.fontSize}rem`, lineHeight: `${TYPE.title.lineHeight}rem` }}
        // A selected Gesture Menu row's title.
        className={css({
          // Its own formatting context, so the reveal's negative margins cannot collapse through it.
          display: 'flow-root',
          fontWeight: 600,
          color: 'white',
          whiteSpace: 'nowrap',
          textShadow: '0px 0px 24px rgba(255, 255, 255, 0.8), 0px 0px 12px rgba(255, 255, 255, 0.6)',
        })}
      >
        <motion.span
          style={{ maskImage: mask, WebkitMaskImage: mask, padding: FOG_BLEED, margin: -FOG_BLEED }}
          className={css({ display: 'block' })}
        >
          <BlurCrossfade sharpness={across} blur={UNREVEALED_BLUR}>
            {command.label}
          </BlurCrossfade>
        </motion.span>
      </div>
      <motion.svg
        aria-hidden
        width='6'
        height='12'
        viewBox='-1 -1 7.6 13.4'
        style={{ opacity: chevronOpacity, marginLeft: `calc(${LAYOUT.chevronGap}px - ${TYPE.gesture.gap}rem)` }}
        className={css({ flex: 'none', overflow: 'visible' })}
      >
        <path d='M0 0L5.8 5.8L0 11.6' fill='none' stroke='white' strokeWidth='1.8' />
      </motion.svg>
    </motion.div>
  )
}

/** The description and the note beneath it, which develop as the genie orbits them, and Done. */
const Details = ({
  description,
  t,
  blockRef,
  onDone,
}: {
  description: string | undefined
  t: MotionValue<number>
  blockRef: RefObject<HTMLDivElement | null>
  onDone: () => void
}) => {
  // The description and note develop: they sharpen as they brighten.
  const developed = useTransform(t, time => sampleCurve(DEVELOP_CURVE, through(time, T.description))[1])
  const doneIn = useTransform(t, time => through(time, T.done))
  // The design's pill is at 80%.
  const doneOpacity = useTransform(doneIn, p => p * DONE_OPACITY)
  const doneY = useTransform(doneIn, p => (1 - p) * DONE_RISE.y)
  const doneScale = useTransform(doneIn, p => mix(DONE_RISE.scale, 1, p))
  // Done cannot be pressed before it is there to see. Escape always closes.
  const donePointerEvents = useTransform(doneIn, p => (p > 0 ? 'auto' : 'none'))
  return (
    <div style={{ paddingLeft: ANCHORS.title.left - LAYOUT.rowLeft }}>
      <div ref={blockRef} className={css({ width: 'fit-content' })}>
        <BlurCrossfade sharpness={developed} visibility={developed} blur={UNDEVELOPED_BLUR} bleed={FOG_BLEED}>
          <p
            className={css({
              margin: 0,
              fontStyle: 'italic',
              color: 'commandDiscoveryDescription',
              textShadow: '0 1px 7px {colors.commandDiscoveryDescriptionGlow}',
            })}
            style={{
              marginTop: `${TYPE.gap}rem`,
              marginLeft: LAYOUT.descriptionIndent,
              maxWidth: LAYOUT.descriptionWidth,
              fontSize: `${TYPE.description.fontSize}rem`,
              lineHeight: `${TYPE.description.lineHeight}rem`,
            }}
          >
            {/* The design's 0.83, kept apart from the development's opacity, which would overwrite it. */}
            <span className={css({ opacity: 0.83 })}>{description}</span>
          </p>
          <p
            className={css({ margin: 0, color: 'white/60' })}
            style={{
              marginTop: `${TYPE.gap}rem`,
              maxWidth: LAYOUT.noteWidth,
              fontSize: `${TYPE.note.fontSize}rem`,
              lineHeight: `${TYPE.note.lineHeight}rem`,
            }}
          >
            This gesture will show up in the Gesture Menu from now on.
          </p>
        </BlurCrossfade>
      </div>
      <motion.button
        type='button'
        onClick={onDone}
        style={{
          opacity: doneOpacity,
          y: doneY,
          scale: doneScale,
          pointerEvents: donePointerEvents,
          marginTop: `${TYPE.gap * 1.6}rem`,
          marginLeft: LAYOUT.doneIndent,
        }}
        // A glass pill, from the design's glass button texture: a faint blue wash that fades towards the bottom, edged by a
        // hairline stroke that is blue-violet along the top and dark along the bottom.
        className={css({
          position: 'relative',
          width: '80px',
          height: '35px',
          padding: 0,
          border: 'none',
          borderRadius: '999px',
          // The design's wash is a radial gradient centered far above the button, so across it, it fades top to bottom.

          background:
            'linear-gradient(180deg, {colors.commandDiscoveryDoneSheen}, {colors.commandDiscoveryDoneSheenFade})',
          cursor: 'pointer',
          // The stroke, which CSS cannot draw as a gradient: two gradients, the dark one over the blue-violet one, masked
          // down to a hairline ring.
          _before: {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            padding: '0.84px',

            background:
              'linear-gradient(180deg, {colors.commandDiscoveryDoneEdgeDeepFade}, {colors.commandDiscoveryDoneEdgeDeep}), linear-gradient(180deg, {colors.commandDiscoveryDoneEdge}, {colors.commandDiscoveryDoneEdgeFade})',
            WebkitMask: 'linear-gradient(white 0 0) content-box, linear-gradient(white 0 0)',
            WebkitMaskComposite: 'xor',
            mask: 'linear-gradient(white 0 0) content-box, linear-gradient(white 0 0)',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          },
        })}
      >
        <span
          className={css({
            fontFamily: 'radioCanada',
            fontSize: '15px',
            lineHeight: '25px',
            letterSpacing: '-0.01em',
            color: 'white',
            opacity: 0.65,
            mixBlendMode: 'hard-light',
          })}
        >
          Done
        </span>
      </motion.button>
    </div>
  )
}

/**
 * The pinned command ring's dock, which the genie lands in, with the hint beside it. With no command pinned, an empty
 * ring appears for the genie to land in; a pinned command's own ring is raised above this screen instead. Either way a
 * ripple leaves the ring as the genie lands.
 */
const Ring = ({
  t,
  pinned,
  ringRef,
}: {
  t: MotionValue<number>
  pinned: boolean
  ringRef: RefObject<HTMLDivElement | null>
}) => {
  const appear = useTransform(t, time => through(time, T.ring))
  const scale = useTransform(appear, p => mix(RING_GROWTH.appear, 1, p))
  const rippleScale = useTransform(t, time => mix(1, RING_GROWTH.ripple, through(time, T.ripple)))
  const rippleOpacity = useTransform(t, time =>
    time < T.ripple.peak
      ? through(time, { start: T.ripple.start, end: T.ripple.peak }) * RIPPLE_OPACITY
      : (1 - through(time, { start: T.ripple.peak, end: T.ripple.end })) * RIPPLE_OPACITY,
  )
  const origin = `${ringGeometry.centerX}px ${ringGeometry.centerY}px`
  return (
    <div className={pinnedCommandDock}>
      <div
        ref={ringRef}
        className={css({ position: 'relative' })}
        style={{ width: PINNED_COMMAND_RING_SIZE, height: PINNED_COMMAND_RING_SIZE }}
      >
        <motion.p
          style={{
            opacity: appear,
            right: PINNED_COMMAND_RING_SIZE - ringGeometry.centerX + LAYOUT.pinHint.right,
            top: ringGeometry.centerY + LAYOUT.pinHint.top,
          }}
          className={css({
            position: 'absolute',
            width: '163px',
            margin: 0,
            fontFamily: 'radioCanada',
            fontSize: '14px',
            lineHeight: '18px',
            letterSpacing: '-0.01em',
            textAlign: 'right',
            color: 'white/35',
          })}
        >
          Drag the command here to pin it.
        </motion.p>
        {!pinned && (
          <motion.div
            style={{ opacity: appear, scale, transformOrigin: origin }}
            className={css({ position: 'absolute', inset: 0 })}
          >
            <PinnedCommandRing progress={0} />
          </motion.div>
        )}
        <motion.div
          aria-hidden
          style={{ opacity: rippleOpacity, scale: rippleScale, transformOrigin: origin }}
          className={css({ position: 'absolute', inset: 0, pointerEvents: 'none' })}
        >
          <PinnedCommandRing progress={0} />
        </motion.div>
      </div>
    </div>
  )
}

/** One speck of glitter the genie leaves behind. See GLITTER. */
const GlitterSpeck = ({
  t,
  speck,
  dropped,
  index,
}: {
  t: MotionValue<number>
  speck: number[]
  /** Where the genie's head was when the speck was dropped, once it has been. */
  dropped: RefObject<({ x: number; y: number } | null)[]>
  /** Which speck it is, in GLITTER. */
  index: number
}) => {
  const [born, fromX, fromY, toX, toY, wanderX, phaseX, wanderY, phaseY, settled, twinkle, twinklePhase, size] = speck
  /** The speck at a moment: its position and opacity. */
  const at = (time: number) => {
    const at = dropped.current[index]
    const age = time - born
    if (!at || age < 0) return { x: 0, y: 0, opacity: 0 }
    const clock = time + DESIGN_CLOCK_OFFSET
    /** Where the speck has wandered to on one axis, from -1 to 1 or so: a wave and a smaller, faster overtone. */
    const wander = (speed: number, phase: number, wave: (x: number) => number) =>
      wave(speed * GLITTER_WANDER.speed * clock + phase) +
      GLITTER_WANDER.overtoneSize * wave(speed * GLITTER_WANDER.speed * GLITTER_WANDER.overtone * clock + 2 * phase)
    const drift = 1 - Math.exp(-age / GLITTER_TIMING.drift)
    return {
      x: at.x + mix(fromX, toX, drift) + GLITTER_LOOK.wander * wander(wanderX, phaseX, Math.sin) * drift,
      y: at.y + mix(fromY, toY, drift) + GLITTER_LOOK.wander * wander(wanderY, phaseY, Math.cos) * drift,
      opacity:
        mix(settled, GLITTER_LOOK.opacity, Math.exp(-age / GLITTER_TIMING.fade)) *
        Math.min(age / GLITTER_TIMING.glint, 1) *
        (0.55 + 0.45 * Math.sin(2 * Math.PI * twinkle * clock + twinklePhase)),
    }
  }
  const x = useTransform(t, time => at(time).x)
  const y = useTransform(t, time => at(time).y)
  const opacity = useTransform(t, time => at(time).opacity)
  const diameter = GLITTER_SPECK * size
  return (
    <motion.div
      style={{ x, y, opacity, width: diameter, height: diameter, marginLeft: -diameter / 2, marginTop: -diameter / 2 }}
      className={css({
        position: 'absolute',
        left: 0,
        top: 0,
        background:
          'radial-gradient(circle closest-side, {colors.commandDiscoveryGlitter} 5%, {colors.commandDiscoveryGlitterHalo} 35%, {colors.bgTransparent} 75%)',
      })}
    />
  )
}

/**
 * The glitter the genie leaves behind as it flies, which lingers and twinkles for as long as the screen is open. It
 * runs on its own clock, from when the screen opened, rather than on the playhead, which stops once the genie lands.
 */
const Glitter = ({ dropped }: { dropped: RefObject<({ x: number; y: number } | null)[]> }) => {
  const elapsed = useTime()
  const time = useTransform(elapsed, ms => ms / 1000)
  return (
    <div aria-hidden className={css({ position: 'absolute', inset: 0, pointerEvents: 'none' })}>
      {GLITTER.map((speck, index) => (
        <GlitterSpeck key={index} t={time} speck={speck} dropped={dropped} index={index} />
      ))}
    </div>
  )
}

/**
 * Plays the discovery: runs the playhead from 0 to the end of the timeline once the screen is measured, and each
 * frame steers the genie along its route, follows the genie's head with the reveal, drops its glitter, and plays the
 * haptics as the playhead crosses them.
 *
 * The genie is let out for the discovery, invisible, as soon as it starts, so that it has loaded by the time it is
 * needed, and is put back afterwards unless it was already out.
 */
const usePerformance = ({
  t,
  reveal,
  layout,
  dropped,
  measure,
}: {
  t: MotionValue<number>
  reveal: MotionValue<number>
  layout: RefObject<Layout | null>
  dropped: RefObject<({ x: number; y: number } | null)[]>
  measure: () => Layout | null
}) => {
  const dispatch = useDispatch()
  const store = useStore()
  // Whether the genie was out before the discovery let it out, in which case it stays out afterwards.
  // A genie warmed up for this discovery (useGenieWarmup) was not really out.
  const genieWasOut = useRef(store.getState().helpGenie.visible && !geniePerformanceStore.getState().warm)
  // The playhead as of the last frame, to tell which cues it has crossed since.
  const previous = useRef(-Infinity)

  useLayoutEffect(() => {
    const measured = measure()
    if (!measured) return
    layout.current = measured
    genieOpacity.set(0)
    // The discovery takes over a genie warmed up for it, and puts it back when it ends.
    geniePerformanceStore.update({ warm: false })
    startPerformance(measured.path(0))
    dispatch(toggleHelpGenie({ value: true }))

    const playback = animate(t, T.end, { duration: T.end, ease: 'linear' })
    const putGenieBack = !genieWasOut.current
    return () => {
      playback.stop()
      endPerformance()
      genieOpacity.set(1)
      if (putGenieBack) dispatch(toggleHelpGenie({ value: false }))
    }
  }, [dispatch, layout, measure, t])

  useMotionValueEvent(t, 'change', time => {
    const l = layout.current
    if (!l) return
    const last = previous.current
    previous.current = time

    // Steer the genie, and fade it in and, if it was only let out for this, back out.
    if (time < T.end) {
      geniePerformanceStore.update({ target: l.path(time), spring: FLIGHT_SPRING })
    } else {
      endPerformance()
    }
    const leaves = genieWasOut.current ? 0 : through(time, T.genieLeaves)
    genieOpacity.set(through(time, T.genieAppears) * (1 - leaves) * GENIE_OPACITY)

    // The genie's head, or while it is not drawing (still loading, or unable to run here) where its route is.
    const head = geniePerformanceStore.getState().head ?? l.path(time)
    if (time >= T.genieSetsOff) {
      const before = reveal.get()
      if (head.x > before) reveal.set(head.x)
      if (before < l.title.right && head.x >= l.title.right) haptics.pattern(discoveryHaptics.nameRevealed)
    }
    GLITTER.forEach(([born], index) => {
      if (crossed(last, time, born)) dropped.current[index] = head
    })

    if (crossed(last, time, 0)) haptics.pattern(discoveryHaptics.discovered)
    if (crossed(last, time, T.fogDescends.end)) haptics.pattern(discoveryHaptics.fogLanded)
    if (crossed(last, time, T.genieSetsOff)) haptics.pattern(discoveryHaptics.flight(l.flight))
    if (crossed(last, time, T.lands)) haptics.pattern(discoveryHaptics.landed)
  })
}

/** The screen for one command. Split from CommandDiscovery so that it mounts, and plays, once for each discovery. */
const Discovery = ({ command }: { command: Command }) => {
  const dispatch = useDispatch()
  const description = useSelector(state =>
    typeof command.description === 'function' ? command.description(state) : command.description,
  )
  const pinned = useSelector(state => !!state.learning.pinnedCommandId)
  const close = useCallback(() => dispatch(commandDiscovery({ commandId: null })), [dispatch])

  // The playhead, in seconds from the discovery. Everything on the screen is derived from it.
  const t = useMotionValue(0)
  // How far right the genie's head has reached, in viewport px. It only grows, so the genie looping back over the name
  // does not hide it again.
  const reveal = useMotionValue(NOTHING_REVEALED)
  // Where the genie dropped each speck of glitter.
  const dropped = useRef<({ x: number; y: number } | null)[]>(GLITTER.map(() => null))

  const contentRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLDivElement>(null)
  const gestureRef = useRef<HTMLDivElement>(null)
  const blockRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const layout = useRef<Layout | null>(null)

  const measure = useCallback((): Layout | null => {
    const content = contentRef.current?.getBoundingClientRect()
    const name = nameRef.current
    const row = rowRef.current
    const block = blockRef.current?.getBoundingClientRect()
    const dock = ringRef.current?.getBoundingClientRect()
    if (!content || !name || !row || !block || !dock) return null
    // The name is measured by its layout rather than as drawn, since it is drawn a little smaller until the fog lands.
    const title = {
      left: content.left + name.offsetLeft,
      right: content.left + name.offsetLeft + name.offsetWidth,
      centerY: content.top + name.offsetTop + name.offsetHeight / 2,
    }
    const ring = { x: dock.left + ringGeometry.centerX, y: dock.top + ringGeometry.centerY }
    const drawing = gestureRef.current?.querySelector('svg')?.getBoundingClientRect()
    const gesture = drawing ? { x: drawing.left + drawing.width / 2, y: drawing.top + drawing.height / 2 } : null
    // Without a ghost to start from, the fog and the gesture start where they end.
    const origin = commandDiscoveryStore.getState().origin ?? { x: title.left, y: title.centerY, gesture }
    const path = route(discoveryRoute({ title, block, ring }))
    return {
      title,
      gesture,
      rowLeft: content.left + row.offsetLeft,
      block,
      ring,
      origin,
      path,
      // The genie's speed from setting off until it lands, for the hum that follows it.
      flight: flightSpeeds({
        target: time => path(T.genieSetsOff + time),
        duration: T.lands - T.genieSetsOff,
        spring: () => FLIGHT_SPRING,
      }),
    }
  }, [])

  usePerformance({ t, reveal, layout, dropped, measure })
  // The app does not scroll behind the screen.
  useLockBodyScroll(true)

  // Done and Escape finish.
  useEffect(() => {
    /** Closes on Escape. */
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close])

  // The name's row sits with its center where the design puts it, as a fraction of the screen's height.
  const rowHalfHeight = Math.max(TYPE.title.lineHeight, TYPE.gesture.box) / 2
  return (
    <>
      {/* The dimmed app and the light, beneath the Gesture Menu, which fades into the same picture while the user
      holds. The menu's rows fade over it as the menu closes, and nothing behind them changes. */}
      <motion.div
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={css({ position: 'fixed', inset: 0, zIndex: 'commandDiscoveryBase', pointerEvents: 'none' })}
      >
        <DiscoveryBase t={t} />
      </motion.div>
      <motion.div
        role='dialog'
        aria-label={`Discovered ${command.label}`}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={css({
          position: 'fixed',
          inset: 0,
          zIndex: 'commandDiscovery',
          fontFamily: 'radioCanada',
          userSelect: 'none',
          // A swipe on the screen scrolls nothing, rather than passing its scroll through to the app beneath.
          touchAction: 'none',
          overscrollBehavior: 'contain',
          WebkitTouchCallout: 'none',
          overflow: 'hidden',
        })}
      >
        <Fog command={command} t={t} layout={layout} reveal={reveal} />
        <div
          ref={contentRef}
          className={css({ position: 'absolute' })}
          style={{
            left: LAYOUT.rowLeft,
            right: LAYOUT.rowLeft,
            top: `calc(${(ANCHORS.title.centerY / FRAME.height) * 100}% - ${rowHalfHeight}rem)`,
          }}
        >
          <Title
            command={command}
            t={t}
            layout={layout}
            reveal={reveal}
            rowRef={rowRef}
            nameRef={nameRef}
            gestureRef={gestureRef}
          />
          <Details description={description} t={t} blockRef={blockRef} onDone={close} />
        </div>
        <Glitter dropped={dropped} />
        <Ring t={t} pinned={pinned} ringRef={ringRef} />
      </motion.div>
    </>
  )
}

/**
 * Command Discovery: the screen that introduces a command the user has just discovered in the Gesture Menu, by holding
 * still on its ghost. It plays the design made in EffectCraft (discoveryDesign). The fog the command was in falls from
 * the menu while the light pours down into a pool that fills the screen. Then the help genie swoops in and skims the
 * fog, revealing the name behind it; loops over its end; orbits the description, which develops as it goes round;
 * hovers while Done rises in; and dips into the pinned command ring, leaving glitter behind it. Haptics mark each beat.
 * Everything runs from one playhead (discoveryTimeline). See "Command Discovery" in docs/learning.md.
 */
const CommandDiscovery = () => {
  const commandId = useSelector(state => state.commandDiscovery)
  const command = commandId ? commandById(commandId) : undefined
  return <AnimatePresence>{command && <Discovery key={command.id} command={command} />}</AnimatePresence>
}

export default CommandDiscovery
