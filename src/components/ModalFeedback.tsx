// @ts-nocheck

import React from 'react'
import Modal from './Modal'

/** A modal that asks the user to leave feedback. */
const ModalFeedback = () => {
  const ref = React.createRef()
  return <Modal id='feedback' title='Feedback' className='popup' onSubmit={() => {
    if (ref.current && ref.current.value) {
      // sendEmail('from', 'raine@clarityofheart.com', ref.current.value)
    }
  }} center>
    <textarea ref={el => {
      if (el) {
        ref.current = el
      }
    }} placeholder='Enter feedback' />
  </Modal>
}

export default ModalFeedback
