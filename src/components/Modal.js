import { connect } from 'react-redux'

// components
import { ModalComponent } from './ModalComponent.js'

const mapStateToProps = ({ isLoading, showModal }, props) => ({
  isLoading,
  show: showModal === props.id
})

export default connect(mapStateToProps)(ModalComponent)
