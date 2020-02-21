import { connect } from 'react-redux'

// constants
import {
  EM_TOKEN,
} from '../../constants'

// util
import {
  getSetting,
  meta,
} from '../../util'
import { AppComponent } from '../../components/AppComponent/AppComponent'

const mapStateToProps = state => {
  const { dataNonce, focus, search, user, dragInProgress, isLoading, showModal, showSplitView } = state
  const dark = (isLoading ? localStorage['Settings/Theme'] : getSetting('Theme')[0]) !== 'Light'
  const scaleSize = (isLoading ? +(localStorage['Settings/Font Size'] || 16) : getSetting('Font Size')[0] || 16) / 16
  const tutorial = isLoading ? localStorage['Settings/Tutorial'] === 'On' : meta([EM_TOKEN, 'Settings', 'Tutorial']).On
  const tutorialStep = isLoading ? +(localStorage['Settings/Tutorial Step'] || 1) : getSetting('Tutorial Step')[0] || 1
  return {
    dark,
    dataNonce,
    dragInProgress,
    focus,
    isLoading,
    scaleSize,
    search,
    showModal,
    showSplitView,
    tutorial,
    tutorialStep,
    user
  }
}

export const AppComponentContainer = connect(mapStateToProps)(AppComponent)
