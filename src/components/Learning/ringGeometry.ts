const CENTER_X = 36.42
const CENTER_Y = 36.16
const FILL_RADIUS = 19.71
const STROKE_WIDTH = 6

/** The pinned command ring's geometry, in the px of its 73×73 box, from the original design in Figma. */
const ringGeometry = {
  centerX: CENTER_X,
  centerY: CENTER_Y,
  trackRadius: 17.95,
  fillRadius: FILL_RADIUS,
  strokeWidth: STROKE_WIDTH,
  /**
   * Where the visible ring sits inside its box: its center, and the left edge of its fill stroke. The box is wider
   * than the ring, so a layout that has to clear or line up with the ring itself, rather than its box, reads these
   * instead of measuring the drawing.
   */
  visible: {
    centerY: CENTER_Y,
    left: CENTER_X - FILL_RADIUS - STROKE_WIDTH / 2,
  },
}

export default ringGeometry
