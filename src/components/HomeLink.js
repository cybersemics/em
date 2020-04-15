import React from 'react'
import { connect } from 'react-redux'

// constants
import {
  EM_TOKEN,
} from '../constants'

// util
import {
  restoreCursorBeforeSearch,
} from '../util'

// selectors
import { meta } from '../selectors'

// components
import Modal from './Modal'

// action-creators
import home from '../action-creators/home'

const mapStateToProps = state => {
  const { focus, showModal } = state
  return {
    dark: !meta(state, [EM_TOKEN, 'Settings', 'Theme']).Light,
    focus,
    showModal
  }
}

const mapDispatchToProps = (dispatch, getState) => ({

  goHome: e => {
    e.preventDefault()
    if (getState().search != null) {
      dispatch({ type: 'search', value: null })
      restoreCursorBeforeSearch()
    }
    else {
      home()
    }
  }

})

/** A link to the home screen */
const HomeLink = ({ dark, focus, goHome, showModal, inline }) => {

  return <span className='home'>
    <a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ href='/' onClick={goHome}>
      <span role='img' arial-label='home'>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
          className='logo'
          fill={dark ? '#FFF' : '#000'}
          alt='em'>
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          <path d="M0 0h24v24H0z" fill="none" />
        </svg>
      </span>
    </a>
    {showModal === 'home'
      ? <Modal id='home' title='Tap the "em" icon to return to the home context' arrow='arrow arrow-top arrow-topleft' />
      : null
    }
  </span>
}

export default connect(mapStateToProps, mapDispatchToProps)(HomeLink)
