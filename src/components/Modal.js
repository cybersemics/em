import { connect } from 'react-redux'

// components
import { ModalComponent } from './ModalComponent.js'

export const Modal = connect(({ showModal }, props) => ({ show: showModal === props.id }))(ModalComponent)
