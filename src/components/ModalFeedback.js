import React from 'react'

// components
import { Modal } from './Modal.js'

export const ModalFeedback = () => {
  const ref = React.createRef()
  return <Modal id='feedback' title='Feedback' className='popup' onSubmit={e => {
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
