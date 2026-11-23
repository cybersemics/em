import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import GestureDiagram from '../GestureDiagram'
import ModalComponent from './ModalComponent'

const COMMAND_UNIVERSE_GRADIENT = {
  from: token('colors.gestureDiagramGradientStart'),
  to: token('colors.gestureDiagramGradientEnd'),
}

/** Mirrors the GestureDiagram props in GestureMenuItem, at the size of the other diagrams in this modal. */
const GESTURE_MENU_PROPS = {
  size: 48,
  arrowhead: 'filled',
  glow: false,
  useGradient: false,
  color: token('colors.dim'),
  chevronSize: 2.5,
  chevronApexAngle: 60,
  strokeWidth: 3,
  rounded: true,
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
        className={css({
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

      {/* Gesture Menu presentation: rounded gestures drawn as arcs ending in the filled chevron. */}
      {/* newThoughtAbove */}
      <GestureDiagram path='rul' {...GESTURE_MENU_PROPS} />
      {/* cursorPrev (its former gesture; the command has none today but is still marked rounded) */}
      <GestureDiagram path='lur' {...GESTURE_MENU_PROPS} />
      {/* toggleSort */}
      <GestureDiagram path='lurd' {...GESTURE_MENU_PROPS} />

      <div className={css({ display: 'inline-block', width: '48px', verticalAlign: 'middle' })}>
        <GestureDiagram
          path='rdrd'
          display='block'
          size={48}
          arrowSize={4}
          strokeWidth={4}
          arrowhead='outlined-wide'
          cornerRadius={5}
          gradient={COMMAND_UNIVERSE_GRADIENT}
          glow={false}
        />
      </div>
    </ModalComponent>
  )
}

export default ModalTestGestureDiagram
