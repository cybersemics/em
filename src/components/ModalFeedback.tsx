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
  const [isDisabled, setIsDisabled] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [submitAttempts, setSubmitAttempts] = useState(0)
  const dispatch = useDispatch()
  const uid = useSelector((state: State) => state.user?.uid)

  /** On text area change handler. */
  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)

  /** Submit handler. */
  const onSubmit = async ({ remindMeLater }: { remindMeLater: () => void }) => {

    setSubmitAttempts(submitAttempts + 1)

    // minimum characters
    if (feedback.length < FEEDBACK_MIN_LENGTH) {
      dispatch(alert(`Message must be at least ${FEEDBACK_MIN_LENGTH} characters`, { alertType: 'modalFeedback', clearTimeout: 5000 }))
      setIsDisabled(true)
      return
    }

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
  }

  useEffect(() => {
    if (submitAttempts > 0) {
      const disable = feedback.length < FEEDBACK_MIN_LENGTH
      setIsDisabled(disable)
      if (!disable) {
        dispatch(alert(null, { alertType: 'modalFeedback' }))
      }
    }
  }, [feedback])

  return <Modal id='feedback' title='Feedback' className='popup' center actions={({ remindMeLater }) => [
    <ActionButton key='cancel' title='Cancel' onClick={remindMeLater} inActive={true}/>,
    <ActionButton key='send' title='Send' active={true} isLoading={isSubmitting} isDisabled={isDisabled} onClick={() => onSubmit({ remindMeLater })}/>,
  ]}>
    <textarea placeholder='Enter feedback' rows={1} value={feedback} onChange={onChange}/>
  </Modal>
}

export default ModalFeedback
