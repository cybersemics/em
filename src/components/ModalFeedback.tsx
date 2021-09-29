import React, { ChangeEvent, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { submitFeedback } from '../util'
import { ActionButton } from './ActionButton'
import Modal from './Modal'
import { alert } from '../action-creators'
import { AxiosError } from 'axios'
import { State } from '../@types'
import TextArea from './TextArea'
import TextLink from './TextLink'

// Needs to import twin.macro for tw prop to work
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import tw from 'twin.macro'

const FEEDBACK_MIN_LENGTH = 10

interface FeedbackResponse {
  message: string
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
  const onSubmit = async ({ close }: { close: () => void }) => {
    setSubmitAttempts(submitAttempts + 1)

    // minimum characters
    if (feedback.length < FEEDBACK_MIN_LENGTH) {
      dispatch(
        alert(`Message must be at least ${FEEDBACK_MIN_LENGTH} characters`, {
          alertType: 'modalFeedback',
          clearDelay: 5000,
        }),
      )
      setIsDisabled(true)
      return
    }

    setIsSubmitting(true)
    try {
      await submitFeedback(feedback, uid)
      dispatch(alert('Feedback sent!'))
      close()
    } catch (err) {
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

  return (
    <Modal
      id='feedback'
      title='Feedback'
      className='popup'
      center
      actions={({ close }) => (
        <div>
          <ActionButton
            key='send'
            title='Send'
            active={true}
            isLoading={isSubmitting}
            disabled={isDisabled}
            onClick={() => onSubmit({ close })}
          />
          <div key='cancel' tw='mt-2.5'>
            <TextLink onClick={() => close()} colorVariant='gray'>
              Cancel
            </TextLink>
          </div>
        </div>
      )}
    >
      <p tw='text-lg mb-5 text-center'>Send us your bugs, hopes, and dreams!</p>
      <TextArea
        placeholder={'Enter your message'}
        rows={1}
        value={feedback}
        onChange={onChange}
        style={{ borderRadius: 5 }}
      />
    </Modal>
  )
}

export default ModalFeedback
