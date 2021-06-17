import React, { ChangeEvent, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { submitFeedback } from '../util'
import { ActionButton } from './ActionButton'

import { alert } from '../action-creators'
import { AxiosError } from 'axios'
import { State } from '../util/initialState'
import { Alert, Modal, StyleSheet, Text, Pressable, View } from 'react-native'

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
  const showModal = useSelector((state: State) => state.showModal)
  const [modalVisible, setModalVisible] = useState(false)

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
      // remindMeLater()
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

  useEffect(() => {
    console.log({ showModal })
  }, [showModal])

  return <Modal
    animationType='slide'
    transparent={true}
    visible={false}
    onRequestClose={() => {
      Alert.alert('Modal has been closed.')

    }}
  >
    <View style={styles.centeredView}>
      <View style={styles.modalView}>
        <Text style={styles.modalText}>Hello World!</Text>
        <Pressable
          style={[styles.button, styles.buttonClose]}
        // onPress={() => setModalVisible(!modalVisible)}
        >
          <Text style={styles.textStyle}>Hide Modal</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2
  },
  buttonOpen: {
    backgroundColor: '#F194FF',
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center'
  }
})

export default ModalFeedback
