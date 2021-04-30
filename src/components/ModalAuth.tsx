import React, { ChangeEvent, FC, useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { alert, login } from '../action-creators'
import { FIREBASE_REDIRECT_URL } from '../constants'
import { ActionButton } from './ActionButton'
import Modal from './Modal'

const firebaseErrorsIndex = {
  'auth/weak-password': 'Password should be at least 6 characters',
  'auth/email-already-in-use': 'Account already present. Please log in',
  'auth/wrong-password': 'Invalid username or password',
  'auth/user-not-found': 'User not found',
  'auth/too-many-requests': 'Account temporarily disabled. You can restore it by resetting your password',
  default: 'Something went wront'
}

type errorCode = keyof typeof firebaseErrorsIndex

type SubmitAction = (closeModal: () => void, email: string, password?: string) => Promise<void>

interface InputProps {
  type: 'email' | 'password',
  placeholder: string,
  onBlur: (e: ChangeEvent<HTMLInputElement>) => void,
  value: string,
}
/**
 *
 */
const Input:FC<InputProps> = ({ type, placeholder, value, onBlur }) => {
  const [inputValue, updateInputValue] = useState(value)

  useEffect(() => {
    updateInputValue(value)
  }, [value])

  /** On input change handler. */
  const onChange = (e: ChangeEvent<HTMLInputElement>) => updateInputValue(e.target.value)

  return <input type={type} placeholder={placeholder} value={inputValue} onChange={onChange} onBlur={onBlur}/>
}

const modalKeys = {
  login: 'login',
  signup: 'signup',
  resetPassword: 'resetPassword',
}

const modalTitles = {
  login: 'Log In',
  signup: 'Sign Up',
  resetPassword: 'Reset Password',
}

/** Modal to leave feedback. */
const ModalAuth = () => {

  const [title, updateTitle] = useState(modalTitles.signup)
  const [modalKey, updateModalKey] = useState(modalKeys.signup)

  const [showLogin, updateShowLogin] = useState(false)
  const [forgotPassword, updateForgotPassword] = useState(false)
  const [showForgotPasswordOption, updateShowForgotPasswordOption] = useState(false)
  const [email, updateEmail] = useState('')
  const [password, updatePassword] = useState('')
  const [error, updateError] = useState<null | string>(null)

  const [isSubmitting, updateIsSubmitting] = useState(false)

  const dispatch = useDispatch()

  /** Sign up with email and password. */
  const signUp: SubmitAction = useCallback(async (closeModal, email, password) => {

    updateIsSubmitting(true)
    try {
      await window.firebase.auth().createUserWithEmailAndPassword(email, password!)
      closeModal()
      updateIsSubmitting(false)
    }
    catch (error) {
      updateIsSubmitting(false)
      return updateError(firebaseErrorsIndex[error?.code as errorCode] || firebaseErrorsIndex.default)
    }
  }, [])

  const submitAction = useRef<SubmitAction>(signUp)

  /** Handle email change. */
  const onChangeEmail = (e: ChangeEvent<HTMLInputElement>) => {
    updateEmail(e.target.value)
  }

  /** Handle password change. */
  const onChangePassword = (e: ChangeEvent<HTMLInputElement>) => updatePassword(e.target.value)

  /** Reset password using reset email. */
  const resetPassword: SubmitAction = useCallback(async (closeModal, email) => {
    updateIsSubmitting(true)

    try {
      await window.firebase.auth().sendPasswordResetEmail(email, { url: FIREBASE_REDIRECT_URL! })
      updateIsSubmitting(false)
    }
    catch (error) {
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
    }
    catch (error) {
      updateIsSubmitting(false)
      if (error?.code === 'auth/wrong-password') {
        updateShowForgotPasswordOption(true)
      }
      return updateError(firebaseErrorsIndex[error?.code as errorCode] || firebaseErrorsIndex.default)
    }
  }, [])

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

  /**
   * Enable Login with email and password.
   */
  const handleLogin = () => {
    updateModalKey(modalKeys.login)
    updateTitle(modalTitles.login)
    updateShowLogin(true)
    resetFormFields()
    submitAction.current = loginWithEmailAndPassword
  }

  /**
   * Enable Password recovery assistance.
   */
  const handleForgotPassword = () => {
    updateModalKey(modalKeys.resetPassword)
    updateTitle(modalTitles.resetPassword)
    updateForgotPassword(true)
    resetFormFields()
    submitAction.current = resetPassword
  }

  return <Modal id='auth' title='Auth' className='popup' center actions={({ remindMeLater: closeModal }) => <div>
    <ActionButton key={modalKey} title={title} active={true} isLoading={isSubmitting} onClick={() => submitAction.current?.(closeModal, email, password)} />
    {!showLogin && <button disabled={isSubmitting} className='button' onClick={handleLogin}>Already have an account? Login</button>}
    <button disabled={isSubmitting} className='button' onClick={signInWithGoogle}>Login using Google</button>
    <button disabled={isSubmitting} className='button' key='cancel' style={{ fontSize: '1.2rem', opacity: 0.5 }}><a id='cancel-login' onClick={() => closeModal()}>Cancel</a></button>
  </div>}>
    <div style={{ display: 'flex', minHeight: '100px', flexDirection: 'column' }}>
      {
        !showLogin ? <>
          <Input type='email' placeholder='email' value={email} onBlur={onChangeEmail} />
          <Input type='password' placeholder='password' value={password} onBlur={onChangePassword} />
        </> : <>
          {
            !forgotPassword ? <>
              <Input type='email' placeholder='email' value={email} onBlur={onChangeEmail} />
              <Input type='password' placeholder='password' value={password} onBlur={onChangePassword} />
              {
                showForgotPasswordOption ? <button disabled={isSubmitting} className='button' onClick={handleForgotPassword}>Forgot Password?</button> : <></>
              }
            </>
            : <>
              <Input type='email' placeholder='email' value={email} onBlur={onChangeEmail} />
            </>
          }
        </>
      }
      {error && <span style={{ color: 'crimson' }}>{error}</span>}
    </div>

  </Modal>
}

export default ModalAuth
