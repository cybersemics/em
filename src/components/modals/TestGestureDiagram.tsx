import { css } from '../../../styled-system/css'
import GestureDiagram from '../GestureDiagram'
import ModalComponent from './ModalComponent'

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
    </ModalComponent>
  )
}

export default ModalTestGestureDiagram
