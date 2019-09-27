import React from 'react'
import { connect } from 'react-redux'
import { store } from '../store.js'
import logo from '../images/logo-black-inline.png'
import logoDark from '../images/logo-white-inline.png'
import logoInline from '../images/logo-black-inline.png'
import logoDarkInline from '../images/logo-white-inline.png'

// components
import { Helper } from './Helper.js'

// util
import {
  home,
  restoreCursorBeforeSearch,
} from '../util.js'

/** A link to the home screen */
export const HomeLink = connect(({ settings, focus, showHelper }) => ({
  dark: settings.dark,
  focus,
  showHelper
}))(({ dark, focus, showHelper, inline, dispatch }) =>
  <span className='home'>
    <a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ href='/' onClick={e => {
      e.preventDefault()
      if (store.getState().search != null) {
        dispatch({ type: 'search', value: null })
        restoreCursorBeforeSearch()
      }
      else {
        home()
      }
    }}><span role='img' arial-label='home'><img className='logo' src={inline ? (dark ? logoDarkInline : logoInline) : (dark ? logoDark : logo)} alt='em' /></span></a>
    {showHelper === 'home' ? <Helper id='home' title='Tap the "em" icon to return to the home context' arrow='arrow arrow-top arrow-topleft' /> : null}
  </span>
)

