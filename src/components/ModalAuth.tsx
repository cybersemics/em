import React, { ChangeEvent, FC, useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { alert, login, showModal } from '../action-creators'
import { FIREBASE_REDIRECT_URL } from '../constants'
import { ActionButton } from './ActionButton'
import { Index } from '../@types'
import Modal from './Modal'

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
  onBlur: (e: ChangeEvent<HTMLInputElement>) => void
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
  const onChange = (e: ChangeEvent<HTMLInputElement>) => updateInputValue(e.target.value)

  return <input type={type} placeholder={placeholder} value={inputValue} onChange={onChange} onBlur={onBlur} />
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

/** A modal dialog for signing up, logging in, and resetting password. */
const ModalAuth = () => {
  /** Checks if the given mode is active. */
  const isModeActive = (mode: Mode) => activeMode.name === mode.name

  const [activeMode, updateActiveMode] = useState(modes.login)
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
  const onChangeEmail = (e: ChangeEvent<HTMLInputElement>) => updateEmail(e.target.value)

  /** Handle password change. */
  const onChangePassword = (e: ChangeEvent<HTMLInputElement>) => updatePassword(e.target.value)

  /** Show Sign Up with email and password. */
  const showSignup = () => dispatch(showModal({ id: 'signup' }))

  /** Show Login with email and password. */
  const showLogin = () => updateActiveMode(modes.login)

  /** Show Password recovery assistance. */
  const showForgotPassword = () => updateActiveMode(modes.resetPassword)

  return (
    <Modal
      id='auth'
      title={activeMode.modalTitle}
      className='popup'
      center
      actions={({ close: closeModal }) => (
        <div style={isModeActive(modes.resetPassword) ? { marginTop: '-50px' } : undefined}>
          <ActionButton
            key={activeMode.modalKey}
            title={activeMode.modalTitle}
            active={true}
            isLoading={isSubmitting}
            onClick={() => submitAction(closeModal, email, password)}
          />

          {!isModeActive(modes.login) && (
            <button
              disabled={isSubmitting}
              className='button'
              onClick={showLogin}
              style={{ textDecoration: 'underline', marginTop: 15 }}
            >
              {isModeActive(modes.resetPassword) ? 'Back to Login' : 'Log in'}
            </button>
          )}

          {isModeActive(modes.login) && (
            <button
              disabled={isSubmitting}
              className='button'
              onClick={showSignup}
              style={{ textDecoration: 'underline', marginTop: 15 }}
            >
              Create an account
            </button>
          )}

          {!isModeActive(modes.resetPassword) && (
            <button
              disabled={isSubmitting}
              className='button'
              style={{ textDecoration: 'underline', marginTop: 15 }}
              onClick={signInWithGoogle}
            >
              Sign in with Google
            </button>
          )}

          <button
            disabled={isSubmitting}
            className='button'
            key='cancel'
            style={{ fontSize: '1.2rem', opacity: 0.5, marginTop: 12 }}
          >
            <a id='cancel-login' onClick={() => closeModal()}>
              Work Offline
            </a>
          </button>
        </div>
      )}
    >
      <div style={{ display: 'flex', minHeight: '100px', flexDirection: 'column' }}>
        <Input type='email' placeholder='email' value={email} onBlur={onChangeEmail} />

        {!isModeActive(modes.resetPassword) && (
          <Input type='password' placeholder='password' value={password} onBlur={onChangePassword} />
        )}

        {isModeActive(modes.login) && (
          <button disabled={isSubmitting} className='button' onClick={showForgotPassword}>
            Forgot Password?
          </button>
        )}

        {error && <span style={{ color: 'crimson' }}>{error}</span>}
      </div>
    </Modal>
  )
}

export default ModalAuth
