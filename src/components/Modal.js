import { connect } from 'react-redux'

// components
import { ModalComponent } from './ModalComponent.js'

export default connect(({ isLoading, showModal }, props) => ({ isLoading, show: showModal === props.id }))(ModalComponent)
