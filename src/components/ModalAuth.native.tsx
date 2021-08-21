import React, { FC, useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { alert, login } from '../action-creators'
import { FIREBASE_REDIRECT_URL } from '../constants'
import { ActionButton } from './ActionButton'
import { Index } from '../@types'
import Modal from './Modal'
import { NativeSyntheticEvent, TextInputFocusEventData, TouchableOpacity, View } from 'react-native'
import { Text } from './Text.native'
import { TextInput } from 'react-native-gesture-handler'

import { commonStyles } from '../style/commonStyles'

const firebaseErrorsIndex = {
  'auth/weak-password': 'Password should be at least 6 characters',
  'auth/email-already-in-use': 'Account already exists',
  'auth/invalid-email': 'Invalid email',
  'auth/wrong-password': 'Invalid username or password',
  'auth/user-not-found': 'User not found',
  'auth/too-many-requests': 'Account temporarily disabled. You can restore it by resetting your password',
  default: 'Something went wrong',
}

type errorCode = keyof typeof firebaseErrorsIndex

type SubmitAction = (closeModal: () => void, email: string, password?: string) => Promise<void>

interface InputProps {
  type: 'email' | 'password'
  placeholder: string
  onBlur: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void
  value: string
}

/**
 *
 */
const Input: FC<InputProps> = ({ type, placeholder, value, onBlur }) => {
  const [inputValue, updateInputValue] = useState(value)

  useEffect(() => {
    updateInputValue(value)
  }, [value])

  /** On input change handler. */
  const onChange = (text: string) => updateInputValue(text)

  return (
    <View style={[marginVertical, fullWidth]}>
      <TextInput
        style={textInput}
        placeholder={placeholder}
        placeholderTextColor={'white'}
        value={inputValue}
        secureTextEntry={type === 'password'}
        onChangeText={onChange}
        onBlur={onBlur}
      />
    </View>
  )
}

interface Mode {
  name: string
  modalKey: string
  modalTitle: string
}

const modes: Index<Mode> = {
  login: {
    name: 'login',
    modalKey: 'login',
    modalTitle: 'Log In',
  },
  resetPassword: {
    name: 'resetPassword',
    modalKey: 'resetPassword',
    modalTitle: 'Reset Password',
  },
}

const {
  whiteText,
  underlineText,
  alignItemsCenter,
  halfOpacity,
  marginTop,
  crimsonText,
  marginVertical,
  textInput,
  fullWidth,
} = commonStyles

/** A modal dialog for signing up, logging in, and resetting password. */
const ModalAuth = () => {
  /** Checks if the given mode is active. */
  const isModeActive = (mode: Mode) => activeMode.name === mode.name

  const [activeMode, updateActiveMode] = useState(modes.resetPassword)
  const [email, updateEmail] = useState('')
  const [password, updatePassword] = useState('')
  const [error, updateError] = useState<null | string>(null)

  const [isSubmitting, updateIsSubmitting] = useState(false)

  const dispatch = useDispatch()

  /** Reset password using reset email. */
  const resetPassword: SubmitAction = useCallback(async (closeModal, email) => {
    updateIsSubmitting(true)

    try {
      await window.firebase.auth().sendPasswordResetEmail(email, { url: FIREBASE_REDIRECT_URL! })
      updateIsSubmitting(false)
    } catch (error) {
      updateIsSubmitting(false)
      return updateError(error.message || firebaseErrorsIndex.default)
    }
    dispatch(alert('Please check your email'))
    closeModal()
  }, [])

  /** Login with email and password. */
  const loginWithEmailAndPassword: SubmitAction = useCallback(async (closeModal, email, password) => {
    updateIsSubmitting(true)
    try {
      await window.firebase.auth().signInWithEmailAndPassword(email, password!)
      updateIsSubmitting(false)
      closeModal()
    } catch (error) {
      updateIsSubmitting(false)
      return updateError(firebaseErrorsIndex[error?.code as errorCode] || firebaseErrorsIndex.default)
    }
  }, [])

  const submitAction = isModeActive(modes.login) ? loginWithEmailAndPassword : resetPassword

  /**
   * Reset Email and Password fields.
   */
  const resetFormFields = () => {
    updateEmail('')
    updatePassword('')
    updateError(null)
  }

  /**
   * Login using google account.
   */
  const signInWithGoogle = () => {
    updateIsSubmitting(true)
    dispatch(login())
  }

  useEffect(() => {
    resetFormFields()
  }, [activeMode])

  /** Handle email change. */
  const onChangeEmail = (e: NativeSyntheticEvent<TextInputFocusEventData>) => updateEmail(e.nativeEvent.text)

  /** Handle password change. */
  const onChangePassword = (e: NativeSyntheticEvent<TextInputFocusEventData>) => updatePassword(e.nativeEvent.text)

  /** Show Login with email and password. */
  const showLogin = () => updateActiveMode(modes.login)

  /** Show Password recovery assistance. */
  const showForgotPassword = () => updateActiveMode(modes.resetPassword)

  return (
    <Modal
      id='auth'
      title={activeMode.modalTitle}
      actions={({ close: closeModal }) => (
        <View style={alignItemsCenter}>
          <ActionButton
            key={activeMode.modalKey}
            title={activeMode.modalTitle}
            active={true}
            isLoading={isSubmitting}
            onClick={() => submitAction(closeModal, email, password)}
          />

          {!isModeActive(modes.login) && (
            <TouchableOpacity disabled={isSubmitting} onPress={showLogin} style={marginTop}>
              <Text style={[underlineText, whiteText]}>
                {isModeActive(modes.resetPassword) ? 'Back to Login' : 'Log in'}
              </Text>
            </TouchableOpacity>
          )}

          {!isModeActive(modes.resetPassword) && (
            <TouchableOpacity disabled={isSubmitting} style={marginTop} onPress={signInWithGoogle}>
              <Text style={[underlineText, whiteText]}>Sign in with Google</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity disabled={isSubmitting} style={[halfOpacity, marginTop]} onPress={() => closeModal()}>
            <Text style={[underlineText, whiteText]}>Work Offline</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      <View style={[alignItemsCenter, marginVertical]}>
        <Input type='email' placeholder='email' value={email} onBlur={onChangeEmail} />

        {!isModeActive(modes.resetPassword) && (
          <Input type='password' placeholder='password' value={password} onBlur={onChangePassword} />
        )}

        {isModeActive(modes.login) && (
          <TouchableOpacity style={marginTop} disabled={isSubmitting} onPress={showForgotPassword}>
            <Text style={whiteText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        {error && <Text style={crimsonText}>{error}</Text>}
      </View>
    </Modal>
  )
}

export default ModalAuth
