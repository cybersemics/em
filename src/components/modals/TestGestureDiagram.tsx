import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import GestureDiagram from '../GestureDiagram'
import ModalComponent from './ModalComponent'

const COMMAND_UNIVERSE_GRADIENT = {
  from: token('colors.gestureDiagramGradientStart'),
  to: token('colors.gestureDiagramGradientEnd'),
}

// Restyled presentation shared by the shape fixtures below, so each one varies only the option it covers.
const RESTYLED_GESTURE = {
  size: 48,
  arrowSize: 4,
  strokeWidth: 4,
  gradient: COMMAND_UNIVERSE_GRADIENT,
  glow: false,
} as const

/** Modal used for GestureDiagram snapshot test. */
const ModalTestGestureDiagram = () => {
  return (
    <ModalComponent id='testGestureDiagram' hideClose={true}>
      <GestureDiagram path='r' size={48} arrowSize={12} />
      <GestureDiagram path='rd' size={48} arrowSize={12} />
      <GestureDiagram path='rdr' size={48} arrowSize={12} />
      <GestureDiagram path='rdrd' size={48} arrowSize={12} />
      <GestureDiagram path='rdu' size={48} arrowSize={12} />
      <GestureDiagram path='rudr' size={48} arrowSize={12} />
      <GestureDiagram path='rlr' size={48} arrowSize={12} />
      <GestureDiagram path='dud' size={48} arrowSize={12} />
      <GestureDiagram path='rdlu' size={48} arrowSize={12} />
      <GestureDiagram path='rdrul' size={48} arrowSize={12} />
      <GestureDiagram path='rl' size={48} arrowSize={12} />
      <GestureDiagram path='rld' size={48} arrowSize={12} />
      <GestureDiagram path='lurd' size={48} arrowSize={12} rounded />
      <GestureDiagram path='lur' size={48} arrowSize={12} rounded />
      <GestureDiagram path='rul' size={48} arrowSize={12} rounded />
      <GestureDiagram path='rdl' size={48} arrowSize={12} />
      <GestureDiagram path='ldr' size={48} arrowSize={12} />

      {/* Custom Help gesture */}
      <GestureDiagram path='rdld' size={48} arrowSize={12} />

      {/* Custom Cancel gesture */}
      <GestureDiagram
        path={null}
        cssRaw={css.raw({
          marginBottom: '12px !important',
          marginLeft: '2px !important',
        })}
      />

      {/* Add specific rounded gesture examples */}

      {/* Command Universe presentation: one representative of each geometry family. */}
      <GestureDiagram
        path='rdr'
        size={48}
        arrowSize={4}
        strokeWidth={4}
        arrowhead='outlined-wide'
        cornerRadius={5}
        gradient={COMMAND_UNIVERSE_GRADIENT}
        glow={false}
      />
      <GestureDiagram
        path='lurd'
        size={48}
        arrowSize={4}
        strokeWidth={4}
        rounded
        arrowhead='outlined-wide'
        gradient={COMMAND_UNIVERSE_GRADIENT}
        glow={false}
      />
      <GestureDiagram
        path='rdld'
        size={48}
        arrowSize={4}
        strokeWidth={4}
        gradient={COMMAND_UNIVERSE_GRADIENT}
        glow={false}
      />

      <div className={css({ display: 'inline-block', width: '48px', verticalAlign: 'middle' })}>
        <GestureDiagram
          path='rdrd'
          fillContainer
          size={48}
          arrowSize={4}
          strokeWidth={4}
          arrowhead='outlined-wide'
          cornerRadius={5}
          gradient={COMMAND_UNIVERSE_GRADIENT}
          glow={false}
        />
      </div>

      {/* Corner softening at three radii. Shortening is capped at half of each neighboring line, which the
          rightmost diagram reaches: its 48px gesture has 24px lines. */}
      <GestureDiagram path='rdrd' arrowhead='none' cornerRadius={0} {...RESTYLED_GESTURE} />
      <GestureDiagram path='rdrd' arrowhead='none' cornerRadius={4} {...RESTYLED_GESTURE} />
      <GestureDiagram path='rdrd' arrowhead='none' cornerRadius={12} {...RESTYLED_GESTURE} />

      {/* Chevron apex angle, from narrow to blunt. */}
      <GestureDiagram path='r' arrowhead='outlined-wide' chevronApexAngle={45} {...RESTYLED_GESTURE} />
      <GestureDiagram path='r' arrowhead='outlined-wide' chevronApexAngle={80} {...RESTYLED_GESTURE} />
      <GestureDiagram path='r' arrowhead='outlined-wide' chevronApexAngle={120} {...RESTYLED_GESTURE} />

      {/* Chevron half-span, as a multiple of the rendered stroke width. */}
      <GestureDiagram path='r' arrowhead='outlined-wide' chevronSize={1.2} {...RESTYLED_GESTURE} />
      <GestureDiagram path='r' arrowhead='outlined-wide' chevronSize={2.2} {...RESTYLED_GESTURE} />
      <GestureDiagram path='r' arrowhead='outlined-wide' chevronSize={4} {...RESTYLED_GESTURE} />

      {/* The chevron on each geometry family: a synthetic extension, a reversal offset, and a circular arc,
          whose fixed endpoint reaches the apex along a short tangent line. */}
      <GestureDiagram path='rdl' arrowhead='outlined-wide' cornerRadius={5} {...RESTYLED_GESTURE} />
      <GestureDiagram path='rl' arrowhead='outlined-wide' cornerRadius={5} {...RESTYLED_GESTURE} />
      <GestureDiagram path='dud' arrowhead='outlined-wide' cornerRadius={5} {...RESTYLED_GESTURE} />
      <GestureDiagram path='rul' rounded arrowhead='outlined-wide' {...RESTYLED_GESTURE} />

      {/* Highlighting: a partially highlighted gesture keeps its gradient chevron, a fully highlighted one
          paints the chevron in the highlight color. */}
      <GestureDiagram path='rdr' arrowhead='outlined-wide' cornerRadius={5} highlight={1} {...RESTYLED_GESTURE} />
      <GestureDiagram path='rdr' arrowhead='outlined-wide' cornerRadius={5} highlight={3} {...RESTYLED_GESTURE} />
    </ModalComponent>
  )
}

export default ModalTestGestureDiagram
