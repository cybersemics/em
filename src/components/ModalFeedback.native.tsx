import { AxiosError } from 'axios'
import React, { useState } from 'react'
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputChangeEventData,
  TouchableOpacity,
  View,
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import State from '../@types/State'
import alert from '../action-creators/alert'
import { AlertType } from '../constants'
import submitFeedback from '../util/submitFeedback'
import { ActionButton } from './ActionButton'
import Modal from './Modal'
import { Text } from './Text.native'

const FEEDBACK_MIN_LENGTH = 10

interface FeedbackResponse {
  message: string
}

/** Modal to leave feedback. */
const ModalFeedback = () => {
  const [, setIsSubmitting] = useState(false)
  const [, setIsDisabled] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [submitAttempts, setSubmitAttempts] = useState(0)
  const dispatch = useDispatch()
  const uid = useSelector((state: State) => state.user?.uid)

  /** On text area change handler. */
  const onChange = (e: NativeSyntheticEvent<TextInputChangeEventData>) => setFeedback(e.nativeEvent.text)

  /** Submit handler. */
  const onSubmit = async ({ remindMeLater }: { remindMeLater: () => void }) => {
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
      await submitFeedback(feedback, uid)
      dispatch(alert('Feedback sent!'))
      // remindMeLater()
    } catch (err) {
      console.error('Error sending feedback', err)
      const { response } = err as AxiosError
      const message = (response?.data as FeedbackResponse)?.message ?? 'Error sending feedback'
      dispatch(alert(message))
      setIsSubmitting(false)
    }
  }

  /*  useEffect(() => {
     if (submitAttempts > 0) {
       const disable = feedback.length < FEEDBACK_MIN_LENGTH
       setIsDisabled(disable)
       if (!disable) {
         dispatch(alert(null, { alertType: AlertType.ModalFeedbackMaxChars }))
       }
     }
   }, [feedback]) */

  return (
    <Modal
      id='feedback'
      title='Feedback'
      actions={({ close }) => (
        <View style={styles.actionButtonContainer}>
          <ActionButton key='send' title='Send' onClick={() => close()} />
        </View>
      )}
    >
      <View style={styles.modalView}>
        <Text style={styles.modalText}>Send us your bugs, hopes, and dreams!</Text>
        <TextInput onChange={onChange} style={styles.input} multiline={true} />
        <TouchableOpacity onPress={() => onSubmit}></TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalView: {
    margin: 20,
    borderRadius: 20,
    justifyContent: 'center',
  },
  actionButtonContainer: { alignItems: 'center' },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 6,
    color: '#fff',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    height: 250,
    borderRadius: 8,
    borderColor: '#fff',
    padding: 5,
    color: '#fff',
  },
})

export default ModalFeedback
