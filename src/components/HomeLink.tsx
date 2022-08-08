import React from 'react'
import { useDispatch } from 'react-redux'
import home from '../action-creators/home'
import modalComplete from '../action-creators/modalComplete'
import { MODAL_CLOSE_DURATION } from '../constants'
import Modal from './Modal'
import HomeIcon from './icons/HomeIcon'

interface HomeLinkProps {
  color?: string
  showModal?: string | null
  size?: number
  style?: React.CSSProperties
}

/** A link to the home screen. */
const HomeLink = ({ color, showModal, size, style }: HomeLinkProps) => {
  const dispatch = useDispatch()
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
        <HomeIcon color={color} size={size} style={style} />
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

export default HomeLink
