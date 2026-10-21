// Every tuned value behind the help genie's look and movement, grouped by the part of the genie it shapes. The values
// were tuned by eye against the Affinity design. Lengths are CSS pixels and times are milliseconds unless noted.

// Motion.
//
// The head chases its target on a spring and remembers where it has been. That memory is the trail: a fast head
// covers more ground within it, so the trail grows with speed and shrinks back into the head at rest.

/** How long a position stays in the trail. A longer memory gives a longer trail at the same speed. */
export const MEMORY = 420

/** How strongly the head is pulled towards its target. Higher follows more tightly. */
export const STIFFNESS = 90

/** How quickly the head's swing dies out. Below 1 it overshoots slightly, which gives the genie its arcing flight. */
export const DAMPING = 0.62

/** Radius of the gentle hover around the target when the genie is still. */
export const BOB = 2.5

/** The longest frame the motion will step at once. A stall, such as a background tab, would otherwise fling the head. */
export const MAX_FRAME = 1000 / 30

// Trail.
//
// The ribbon of light the head leaves behind. It is full width just behind the head, then tapers to nothing at the
// tail, and fades from pink to clear violet along the way. It is blurred so it reads as light rather than a shape.

/** Width of the trail just behind the head. */
export const TRAIL_WIDTH = 34

/** The fraction of the trail, from the head, that keeps its full width before tapering. */
export const TRAIL_NECK = 0.14

/** How the taper curves. 1 narrows at a constant rate; higher stays wide longer, then narrows quickly. */
export const TRAIL_TAPER = 1.2

/** Strength of the trail's blur. Pixi's scale is not CSS pixels: 9 matches the design's 12px blur. */
export const TRAIL_BLUR = 9

/** Colors along the trail, from the head (t = 0) to the tail (t = 1), from the design: FFB2B2, CE83C6 at 50%, violet, clear. */
export const TRAIL_STOPS: { t: number; rgba: [number, number, number, number] }[] = [
  { t: 0, rgba: [255, 190, 190, 1] },
  { t: 0.26, rgba: [206, 131, 198, 0.5] },
  { t: 0.62, rgba: [128, 92, 196, 0.26] },
  { t: 1, rgba: [84, 58, 170, 0] },
]

// Hot core.
//
// A narrower, near-white stroke down the front of the trail. It is what makes the head look bright: in flight it
// stretches into the trail, and at rest it gathers into a round head.

/** Half-width of the core at the head. */
export const CORE_RADIUS = 15

/** The fraction of the trail, from the head, that the core runs along. */
export const CORE_LENGTH = 0.32

/** Color of the core. */
export const CORE_COLOR = 0xffdeea

/** Opacity of the core at the head. It fades to nothing where the core ends. */
export const CORE_OPACITY = 0.75

// Halo.
//
// The broad glow surrounding the head. It sits slightly behind the head, stretches along the recent path as the head
// speeds up, and bends with the path on a turn.

/** Diameter of the unstretched glow. */
export const HALO_SIZE = 260

/** How much longer the glow gets at full speed: 0.6 is 60% longer (and correspondingly narrower). */
export const HALO_STRETCH = 0.6

/** The speed, in px/s, at which the glow is fully stretched. */
export const HALO_FULL_SPEED = 1600

/** Seconds of recent movement used to place the glow behind the head. */
export const HALO_LAG = 0.03

/** The furthest the glow may sit behind the head, as a fraction of its diameter, so it cannot come loose at speed. */
export const HALO_MAX_LAG = 0.2

/** Brightness of the glow. 1 is the design's colors as they are. */
export const HALO_INTENSITY = 1.1

/** How far the colors are pushed outwards. Above 1 widens the bright center. */
export const HALO_SPREAD = 1.1

/** The glow's colors from its center (0) to its edge (1), measured from the design's export of the head. */
export const HALO_STOPS: [number, number][] = [
  [0, 0x84708f],
  [0.06, 0x7d6a87],
  [0.12, 0x6a5973],
  [0.18, 0x524458],
  [0.24, 0x3a303f],
  [0.3, 0x29212c],
  [0.38, 0x1c161d],
  [0.46, 0x141015],
  [0.56, 0x0d0b0f],
  [0.68, 0x060508],
  [0.84, 0x020202],
  [1, 0x000000],
]

/** Strength of the cool blue light on the glow's underside, as in the design. */
export const HALO_COOL = 2.2

/** Color of the cool light at strength 1, as red, green, blue from 0 to 255. */
export const HALO_COOL_COLOR: [number, number, number] = [4, 10, 26]

/** How far below the glow's center the cool light sits, as a fraction of the glow's half-width. */
export const HALO_COOL_OFFSET = 0.12

/** How many points along the path the glow's shape is measured from. More bends more smoothly; must match halo.frag. */
export const HALO_SAMPLES = 36

// Sparkles.
//
// Glitter scattered along the trail. Each sparkle is born where the head passed, drifts in towards the middle of the
// trail as the trail narrows behind it, and fades before its stretch of trail disappears. They only show where the
// halo or trail is already lit.

/** Sparkles born per pixel the head travels. */
export const SPARKLE_DENSITY = 1.6

/** Sparkles born per second while the head is still, so a resting genie keeps a little glitter. */
export const SPARKLE_REST_RATE = 4.8

/** The shortest sparkle lifetime, as a fraction of MEMORY. Lifetimes vary between this and all of MEMORY. */
export const SPARKLE_MIN_LIFE = 0.45

/** How far across the trail sparkles spread, as a fraction of its width. */
export const SPARKLE_SPREAD = 0.45

/** Opacity of the sparkle layer as a whole. */
export const SPARKLE_OPACITY = 0.75

/** The most sparkles alive at once. Caps the work of a very long, very fast flight. */
export const MAX_SPARKLES = 900
