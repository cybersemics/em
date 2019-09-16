import React from 'react'

// components
import { Helper } from './Helper.js'

export const HelperFeedback = () => {
  const ref = React.createRef()
  return <Helper id='feedback' title='Feedback' className='popup' onSubmit={e => {
    if (ref.current && ref.current.value) {
      // sendEmail('from', 'raine@clarityofheart.com', ref.current.value)
    }
  }} center>
    <textarea ref={el => {
      if (el) {
        ref.current = el
      }
    }} placeholder='Enter feedback' />
  </Helper>
}
