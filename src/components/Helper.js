import { connect } from 'react-redux'

// components
import { HelperComponent } from './HelperComponent.js'

export const Helper = connect(({ showHelper }, props) => ({ show: showHelper === props.id }))(HelperComponent)

