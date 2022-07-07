/* eslint-disable fp/no-class, fp/no-this */
import classNames from 'classnames'
import React from 'react'
import Connected from '../@types/Connected'
import closeModal from '../action-creators/closeModal'
import modalComplete from '../action-creators/modalComplete'
import tutorial from '../action-creators/tutorial'
import { FADEOUT_DURATION } from '../constants'

interface ModalActionHelpers {
  close: (duration?: number) => void
  complete: ModalComponent['complete']
}

export interface ModalProps {
  arrow?: string
  center?: boolean
  children?: React.ReactNode
  className?: string
  hideModalActions?: boolean
  id: string
  onSubmit?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void
  opaque?: boolean
  show?: boolean
  style?: React.CSSProperties
  actions?: (modalActionHelpers: ModalActionHelpers) => React.ReactNode
  title: string
  top?: number
  preventCloseOnEscape?: boolean
}

/** A generic modal component. */
class ModalComponent extends React.Component<Connected<ModalProps>> {
  animateAndClose: (() => void) | null = null
  escapeListener: ((e: KeyboardEvent) => void) | null = null
  ref: React.RefObject<HTMLDivElement>

  constructor(props: Connected<ModalProps>) {
    super(props)
    this.ref = React.createRef()
  }

  componentDidMount() {
    // add a global escape listener
    if (this.props.show) {
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
        const { dispatch } = this.props
        window.removeEventListener('keydown', this.escapeListener!, true)
        if (this.ref.current) {
          this.ref.current.classList.add('animate-fadeout')
        }
        setTimeout(() => {
          dispatch(closeModal())
        }, FADEOUT_DURATION)
      }

      // use capturing so that this fires before the global window Escape which removes the cursor
      window.addEventListener('keydown', this.escapeListener, true)
    }
  }

  close = () => this.animateAndClose!()

  componentWillUnmount() {
    window.removeEventListener('keydown', this.escapeListener!, true)
  }

  /** Dispatches a modalComplete action for the modal. */
  complete = () => this.props.dispatch(modalComplete(this.props.id))

  /** Dispatches a tutorial action that ends the tutorial. */
  endTutorial = () => this.props.dispatch(tutorial({ value: false }))

  render() {
    const { show, id, title, arrow, center, opaque, className, style, actions, hideModalActions, top, children } =
      this.props

    if (!show) return null

    /** Dispatches a closeModal action for the modal. */

    // /** Dispatches a modalComplete action for the modal. */
    // const complete = () => dispatch(modalComplete(id))

    // /** Dispatches a tutorial action that ends the tutorial. */
    // const endTutorial = () => dispatch(tutorial({ value: false }))

    return (
      <div
        ref={this.ref}
        style={Object.assign({}, style, top && { top: 55 })}
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
        {!this.props.preventCloseOnEscape && (
          <a className='upper-right popup-close-x text-small' onClick={this.close}>
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
            <div className='modal-actions'>
              {actions({
                close: this.close,
                complete: this.complete,
              })}
            </div>
          )}
          <a className='modal-close' onClick={() => this.close()}>
            <span>✕</span>
          </a>
        </div>
      </div>
    )
  }
}

export default ModalComponent
