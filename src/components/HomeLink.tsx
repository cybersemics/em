import React from 'react'
import { connect } from 'react-redux'
import Connected from '../@types/Connected'
import State from '../@types/State'
import home from '../action-creators/home'
import modalComplete from '../action-creators/modalComplete'
import { MODAL_CLOSE_DURATION } from '../constants'
import theme from '../selectors/theme'
import Modal from './Modal'
import HomeIcon from './icons/HomeIcon'

interface HomeLinkProps {
  color?: string
  dark?: boolean
  showModal?: string | null
  size?: number
  style?: React.CSSProperties
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => ({
  dark: theme(state) !== 'Light',
  showModal: state.showModal,
})

/** A link to the home screen. */
const HomeLink = ({ dark, color, showModal, size, style, dispatch }: Connected<HomeLinkProps>) => {
  return (
    <span className='home'>
      <a
        tabIndex={-1}
        /* TODO: Add setting to enable tabIndex for accessibility */ href='/'
        onClick={e => {
          e.preventDefault()
          dispatch(home())
        }}
      >
        <HomeIcon color={color} dark={dark} size={size} style={style} />
      </a>
      {showModal === 'home' ? (
        <Modal
          id='home'
          title='Tap the "em" icon to return to the home context'
          arrow='arrow arrow-top arrow-topleft'
          actions={({ close }) => (
            <span key='span'>
              <a onClick={() => dispatch(modalComplete('home'))}>Got it!</a>
              <a onClick={() => close && close(MODAL_CLOSE_DURATION)}>Remind me later</a>
            </span>
          )}
        />
      ) : null}
    </span>
  )
}

export default connect(mapStateToProps)(HomeLink)
