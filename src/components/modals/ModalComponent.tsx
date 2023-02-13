/* eslint-disable fp/no-class, fp/no-this */
import classNames from 'classnames'
import React from 'react'
import ModalType from '../../@types/Modal'
import closeModal from '../../action-creators/closeModal'
import modalComplete from '../../action-creators/modalComplete'
import { FADEOUT_DURATION } from '../../constants'
import store from '../../stores/app'

interface ModalActionHelpers {
  close: (duration?: number) => void
  complete: ModalComponent['complete']
}

export interface ModalProps {
  arrow?: string
  center?: boolean
  children?: React.ReactNode
  className?: string
  hideClose?: boolean
  hideModalActions?: boolean
  id: ModalType
  onClose?: () => void
  onSubmit?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void
  opaque?: boolean
  style?: React.CSSProperties
  actions?: (modalActionHelpers: ModalActionHelpers) => React.ReactNode
  title: string
  top?: number
  preventCloseOnEscape?: boolean
}

/** A generic modal component. */
class ModalComponent extends React.Component<ModalProps> {
  animateAndClose: (() => void) | null = null
  escapeListener: ((e: KeyboardEvent) => void) | null = null
  ref: React.RefObject<HTMLDivElement>

  constructor(props: ModalProps) {
    super(props)
    this.ref = React.createRef()
  }

  componentDidMount() {
    /**
     * A handler that closes the modal when the escape key is pressed.
     */
    this.escapeListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !this.props.preventCloseOnEscape) {
        e.stopPropagation()
        this.close!()
      }
    }

    /**
     * Animate and close the modal.
     */
    this.animateAndClose = () => {
      window.removeEventListener('keydown', this.escapeListener!, true)
      if (this.ref.current) {
        this.ref.current.classList.add('animate-fadeout')
      }
      setTimeout(() => {
        store.dispatch(closeModal())
      }, FADEOUT_DURATION)
    }

    // use capturing so that this fires before the global window Escape which removes the cursor
    window.addEventListener('keydown', this.escapeListener, true)
  }

  close = () => {
    this.animateAndClose!()
    this.props.onClose?.()
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.escapeListener!, true)
  }

  /** Dispatches a modalComplete action for the modal. */
  complete = () => store.dispatch(modalComplete(this.props.id))

  render() {
    const { actions, arrow, center, children, className, hideClose, hideModalActions, id, opaque, style, title, top } =
      this.props

    return (
      <div
        ref={this.ref}
        style={{ ...style, ...(top ? { top: 55 } : null) }}
        className={
          className +
          ' ' +
          classNames({
            modal: true,
            animate: true,
            [`modal-${id}`]: true,
            center,
            opaque,
          })
        }
      >
        {!this.props.preventCloseOnEscape && !hideClose && (
          <a className='upper-right popup-close-x' onClick={this.close}>
            ✕
          </a>
        )}
        <div
          className={classNames({
            'modal-content': true,
            ...(arrow && { [arrow]: arrow }),
          })}
        >
          {title && <h1 className='modal-title'>{title}</h1>}
          <div className='modal-text'>{children}</div>
          {!hideModalActions && actions && (
            <div className='modal-actions center'>
              {actions({
                close: this.close,
                complete: this.complete,
              })}
            </div>
          )}
          {!hideClose && (
            <a className='modal-close' onClick={() => this.close()}>
              <span>✕</span>
            </a>
          )}
        </div>
      </div>
    )
  }
}

export default ModalComponent
