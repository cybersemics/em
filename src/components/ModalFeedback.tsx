import React, { ChangeEvent, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { submitFeedback } from '../util'
import { ActionButton } from './ActionButton'
import Modal from './Modal'
import { alert } from '../action-creators'
import { AxiosError } from 'axios'
import { State } from '../util/initialState'

const FEEDBACK_MIN_LENGTH = 10

interface FeedbackResponse {
  message: string,
}

/** Modal to leave feedback. */
const ModalFeedback = () => {

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDisabled, setIsDisabled] = useState(true)
  const [feedback, setFeedback] = useState('')
  const dispatch = useDispatch()
  const uid = useSelector((state: State) => state.user?.uid)

  /** On text area change handler. */
  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)

  useEffect(() => {
    setIsDisabled(feedback.trim().length < FEEDBACK_MIN_LENGTH)
  }, [feedback])

  return <Modal id='feedback' title='Feedback' className='popup' center actions={({ remindMeLater }) => [
    <ActionButton key='cancel' title='Cancel' onClick={remindMeLater} inActive={true}/>,
    <ActionButton key='send' title='Send' active={true} isLoading={isSubmitting} isDisabled={isDisabled} onClick={async () => {
      setIsSubmitting(true)
      try {
        await submitFeedback(feedback, uid)
        dispatch(alert('Feedback sent!'))
        remindMeLater()
      }
      catch (err) {
        console.error('Error sending feedback', err)
        const { response } = err as AxiosError
        const message = (response?.data as FeedbackResponse)?.message ?? 'Error sending feedback'
        dispatch(alert(message))
        setIsSubmitting(false)
      }
    }}/>,
  ]}>
    <textarea placeholder='Enter feedback' rows={1} value={feedback} onChange={onChange}/>
  </Modal>
}

export default ModalFeedback
