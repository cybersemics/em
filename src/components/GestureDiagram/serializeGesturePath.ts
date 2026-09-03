import GestureSegment from './types/GestureSegment'

/** Serializes consecutive canonical segments as one continuous SVG path. */
const serializeGesturePath = (segments: readonly GestureSegment[]) =>
  segments.reduce((pathData, segment, index) => {
    const commaSeparated = segments[0]?.kind === 'quadratic'
    return `${pathData}${index === 0 ? `M ${segment.from.x}${commaSeparated ? ',' : ' '}${segment.from.y} ` : ' '}${
      segment.kind === 'line'
        ? `L ${segment.to.x}${commaSeparated ? ',' : ' '}${segment.to.y}`
        : segment.kind === 'arc'
          ? `A ${segment.radius} ${segment.radius} 0 0 ${segment.sweepFlag} ${segment.to.x} ${segment.to.y}`
          : `Q ${segment.control.x},${segment.control.y} ${segment.to.x},${segment.to.y}`
    }`
  }, '')

export default serializeGesturePath
