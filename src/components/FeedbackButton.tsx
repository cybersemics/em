import React from 'react'
import { useDispatch } from 'react-redux'
import { css } from '../../styled-system/css'
import { showModalActionCreator as showModal } from '../actions/showModal'
import fastClick from '../util/fastClick'
import FeedbackIcon from './icons/FeedbackIcon'

/**
 * Button that opens feedback model.
 */
const FeedbackButton: React.FC = () => {
  const dispatch = useDispatch()
  return (
    <div
      className={css({ display: 'inline-flex' })}
      {...fastClick(() => dispatch(showModal({ id: 'feedback' })))}
      title='Feedback'
    >
      <FeedbackIcon size={26} />
    </div>
  )
}

export default FeedbackButton
