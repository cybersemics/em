import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import GestureDiagram from '../GestureDiagram'
import ModalComponent from './ModalComponent'

const COMMAND_UNIVERSE_GRADIENT = {
  from: token('colors.gestureDiagramGradientStart'),
  to: token('colors.gestureDiagramGradientEnd'),
}

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
    </ModalComponent>
  )
}

export default ModalTestGestureDiagram
