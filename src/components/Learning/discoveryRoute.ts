import { Waypoint } from '../HelpGenie/route'
import { ANCHORS, GENIE_PATH } from './discoveryDesign'

/** A span of an axis: where something starts and ends along it. */
interface Span {
  start: number
  end: number
}

/**
 * Moves a coordinate from a span in the design onto the same span on screen. Inside the span it is stretched in
 * proportion, so a point a third of the way along the design's name is a third of the way along the real one; outside
 * it, it keeps its distance from the nearer end, so the loop past the end of the name stays the same size.
 */
const mapAxis = (v: number, design: Span, screen: Span) =>
  v < design.start
    ? screen.start + (v - design.start)
    : v > design.end
      ? screen.end + (v - design.end)
      : screen.start + ((v - design.start) / (design.end - design.start)) * (screen.end - screen.start)

/** Eases from 0 to 1 across a span of time, and holds either side. */
const blend = (t: number, { start, end }: Span) => {
  const p = Math.min(1, Math.max(0, (t - start) / (end - start)))
  return p * p * (3 - 2 * p)
}

/**
 * When the genie's flight passes from one thing to the next, in seconds from the discovery: from the name to the
 * description as it leaves its loop for its orbit, and from the description to the ring as it dips.
 */
const HANDOVER = {
  toDescription: { start: 2.53, end: 2.73 },
  toRing: { start: 4.43, end: 5.03 },
}

/**
 * The genie's route through Command Discovery: its path in the design (GENIE_PATH), moved onto the real screen. Each
 * point is placed against what the genie is performing over at that moment — the command's name (`title`), the
 * description and note beneath it (`block`), or the pinned command ring's center (`ring`) — so the flight fits any
 * name, any description, and any screen, and is the design's flight wherever they match it. Times are in seconds from
 * the discovery.
 */
const discoveryRoute = ({
  title,
  block,
  ring,
}: {
  title: { left: number; right: number; centerY: number }
  block: { left: number; right: number; top: number; bottom: number }
  ring: { x: number; y: number }
}): Waypoint[] =>
  GENIE_PATH.map(([at, x, y]) => {
    const overTitle = {
      x: mapAxis(x, { start: ANCHORS.title.left, end: ANCHORS.title.right }, { start: title.left, end: title.right }),
      y: title.centerY + (y - ANCHORS.title.centerY),
    }
    const overBlock = {
      x: mapAxis(x, { start: ANCHORS.block.left, end: ANCHORS.block.right }, { start: block.left, end: block.right }),
      y: mapAxis(y, { start: ANCHORS.block.top, end: ANCHORS.block.bottom }, { start: block.top, end: block.bottom }),
    }
    const overRing = { x: ring.x + (x - ANCHORS.ring.x), y: ring.y + (y - ANCHORS.ring.y) }
    const toBlock = blend(at, HANDOVER.toDescription)
    const toRing = blend(at, HANDOVER.toRing)
    /** Where the point is, against whichever thing the genie is over by then. */
    const place = (axis: 'x' | 'y') =>
      (overTitle[axis] * (1 - toBlock) + overBlock[axis] * toBlock) * (1 - toRing) + overRing[axis] * toRing
    return { at, x: place('x'), y: place('y') }
  })

export default discoveryRoute
