import { connect } from 'react-redux'
import { State } from '../util/initialState'
import ModalComponent, { ModalProps } from './ModalComponent'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = ({ isLoading, showModal }: State, props: ModalProps) => ({
  isLoading,
  show: showModal === props.id
})

/** A generic modal component. */
const Modal = connect(mapStateToProps)(ModalComponent)

export default Modal
