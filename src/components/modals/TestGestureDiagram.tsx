import { token } from '../../../styled-system/tokens'
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
      <svg width={24} height={24} viewBox='0 0 24 24' style={{ marginBottom: 11, marginLeft: 2 }}>
        <path
          d='M9.2725 0.714111C7.51965 3.8284 5.38488 6.62757 3.32706 9.53916C2.78228 10.31 2.34409 10.9449 1.86001 11.742C1.61923 12.1385 1.24853 12.6919 1.15146 13.1773C1.13411 13.264 1.17847 13.2863 1.25138 13.2681C1.67295 13.1627 2.15668 12.9113 2.52768 12.7276C7.4968 10.2679 11.7666 6.68876 16.4261 3.73452C18.1996 2.61011 20.1063 1.47669 22.1308 0.863996C22.8342 0.651122 22.5133 1.3142 22.3443 1.74968C21.91 2.86867 21.1473 3.86772 20.4094 4.80188C18.9097 6.70051 16.9227 8.26976 15.0181 9.74354C12.4635 11.7203 9.78768 13.554 7.29674 15.6118C6.3193 16.4192 5.37795 17.2552 4.47618 18.1462C4.01607 18.6008 3.51334 19.0404 3.18172 19.6042C3.0095 19.8969 3.10278 19.9327 3.39519 19.9221C4.08649 19.897 4.79822 19.8572 5.47541 19.7086C7.05389 19.3623 8.53153 18.5857 10.0219 17.9872C11.5619 17.3688 13.1128 16.7992 14.632 16.1296C17.0018 15.085 19.356 14.0449 21.4995 12.5777C22.2937 12.0341 23.0976 11.5068 23.884 10.9517C24.1828 10.7408 24.8514 10.0682 24.8514 10.4339C24.8514 10.8715 24.3341 11.4593 24.1247 11.7874C23.4648 12.8219 22.7443 13.8086 21.99 14.776C20.5168 16.6656 18.6452 17.9367 16.6759 19.2726C15.9788 19.7455 15.2156 20.2057 14.5821 20.7669C14.4752 20.8616 14.332 21.0133 14.2777 21.153C14.1713 21.4267 14.8675 21.199 15.1589 21.1621C16.8507 20.9478 18.5347 20.6994 20.2277 20.4989'
          stroke={token('colors.fg')}
          strokeWidth={1.25}
          strokeLinecap='round'
          fill='none'
        />
      </svg>
    </ModalComponent>
  )
}

export default ModalTestGestureDiagram
