import { connect } from 'react-redux'

// components
import ModalComponent from './ModalComponent'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = ({ isLoading, showModal }, props) => ({
  isLoading,
  show: showModal === props.id
})

/** A generic modal component. */
const Modal = connect(mapStateToProps)(ModalComponent)

export default Modal
