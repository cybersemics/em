import { connect } from 'react-redux'

// components
import { ModalComponent } from './ModalComponent.js'

export const Modal = connect((state, props) => ({ isLoading: state.isLoading, show: state.showModal === props.id }))(ModalComponent)
