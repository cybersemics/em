import { AxiosError } from 'axios'
import { ChangeEvent, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { alertActionCreator as alert } from '../../actions/alert'
import { AlertType } from '../../constants'
import fastClick from '../../util/fastClick'
import { ActionButton } from './../ActionButton'
import ModalComponent from './ModalComponent'

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

  /** On text area change handler. */
  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)

  /** Submit handler. */
  const onSubmit = async ({ close }: { close: () => void }) => {
    setSubmitAttempts(submitAttempts + 1)

    // minimum characters
    if (feedback.length < FEEDBACK_MIN_LENGTH) {
      dispatch(
        alert(`Message must be at least ${FEEDBACK_MIN_LENGTH} characters`, {
          alertType: AlertType.ModalFeedbackMaxChars,
          clearDelay: 5000,
        }),
      )
      setIsDisabled(true)
      return
    }

    setIsSubmitting(true)
    try {
      throw new Error('Not implemented')
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

  useEffect(
    () => {
      if (submitAttempts > 0) {
        const disable = feedback.length < FEEDBACK_MIN_LENGTH
        setIsDisabled(disable)
        if (!disable) {
          dispatch(alert(null, { alertType: AlertType.ModalFeedbackMaxChars }))
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feedback],
  )

  return (
    <ModalComponent
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
            isDisabled={isDisabled}
            {...fastClick(() => onSubmit({ close }))}
          />
          <div key='cancel' style={{ fontSize: 22, marginTop: 10, opacity: 0.5 }}>
            <a id='skip-tutorial' {...fastClick(() => close())}>
              Cancel
            </a>
          </div>
        </div>
      )}
    >
      <p style={{ fontSize: 18, marginBottom: 30 }}>Send us your bugs, hopes, and dreams!</p>
      <textarea
        placeholder={'Enter your message'}
        rows={1}
        value={feedback}
        onChange={onChange}
        style={{ borderRadius: 5 }}
      />
    </ModalComponent>
  )
}

export default ModalFeedback
