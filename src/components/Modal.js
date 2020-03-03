import { connect } from 'react-redux'

// components
import { ModalComponent } from './ModalComponent.js'

export const Modal = connect((state, props) => ({ isLoading: state.present.isLoading, show: state.present.showModal === props.id }))(ModalComponent)
