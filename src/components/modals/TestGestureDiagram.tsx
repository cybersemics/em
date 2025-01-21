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
      <GestureDiagram
        path={null}
        cssRaw={css.raw({
          marginBottom: '12px !important',
          marginLeft: '2px !important',
        })}
      />
    </ModalComponent>
  )
}

export default ModalTestGestureDiagram
