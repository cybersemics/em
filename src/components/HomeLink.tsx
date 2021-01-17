import React from 'react'
import { connect } from 'react-redux'
import { theme } from '../selectors'
import { home } from '../action-creators'
import { Connected } from '../types'
import { State } from '../util/initialState'
import Modal from './Modal'

interface HomeLinkProps {
  color?: string,
  dark?: boolean,
  showModal?: string | null,
  size?: number,
  style?: React.CSSProperties,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => ({
  dark: theme(state) !== 'Light',
  showModal: state.showModal,
})

/** A link to the home screen. */
const HomeLink = ({ dark, color, showModal, size, style, dispatch }: Connected<HomeLinkProps>) => {

  return <span className='home'>
    <a tabIndex={-1}/* TODO: Add setting to enable tabIndex for accessibility */ href='/' onClick={e => {
      e.preventDefault()
      dispatch(home())
    }}>
      <span role='img' arial-label='home' className='logo-wrapper'>
        <svg xmlns='http://www.w3.org/2000/svg' width={size || 24} height={size || 24} viewBox='0 0 24 24'
          className='logo'
          fill={color || (dark ? '#FFF' : '#000')}
          style={style}
        >
          <path d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' />
          <path d='M0 0h24v24H0z' fill='none' />
        </svg>
      </span>
    </a>
    {showModal === 'home'
      ? <Modal id='home' title='Tap the "em" icon to return to the home context' arrow='arrow arrow-top arrow-topleft' />
      : null
    }
  </span>
}

export default connect(mapStateToProps)(HomeLink)
