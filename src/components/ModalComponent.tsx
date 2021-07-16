/* eslint-disable fp/no-class, fp/no-this */
import React from 'react'
import classNames from 'classnames'
import { FADEOUT_DURATION } from '../constants'
import { modalCleanup } from '../util'
import { Connected } from '../@types'
import { closeModal, modalComplete, tutorial } from '../action-creators'

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
  positionAtCursor?: boolean
  show?: boolean
  style?: React.CSSProperties
  actions?: (modalActionHelpers: ModalActionHelpers) => React.ReactNode
  title: string
  top?: number
}

/** Retrieves the { x, y } coordinates of the selection range. */
const getSelectionCoordinates = () => {
  const sel = document.getSelection()
  // JSDOM implementation of Range does not support getClientRects
  return sel && sel.type !== 'None' && sel.getRangeAt(0).getClientRects
    ? sel.getRangeAt(0).getClientRects()[0] || {}
    : { x: 0, y: 0 }
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
        if (e.key === 'Escape') {
          e.stopPropagation()
          this.close!()
        }
      }

      /**
       * Animate and close the modal.
       */
      this.animateAndClose = () => {
        const { dispatch, id } = this.props
        window.removeEventListener('keydown', this.escapeListener!, true)
        modalCleanup()
        if (this.ref.current) {
          this.ref.current.classList.add('animate-fadeout')
        }
        setTimeout(() => {
          if (id === 'signup' && window && window.location.pathname.substr(1) === 'signup') {
            window.history.pushState({}, '', window.location.origin)
          }
          dispatch(closeModal())
        }, FADEOUT_DURATION)
      }

      // use capturing so that this fires before the global window Escape which removes the cursor
      window.addEventListener('keydown', this.escapeListener, true)
    }
  }

  close = () => this.animateAndClose!()

  componentWillUnmount() {
    modalCleanup()
    window.removeEventListener('keydown', this.escapeListener!, true)
  }

  /** Dispatches a modalComplete action for the modal. */
  complete = () => this.props.dispatch(modalComplete(this.props.id))

  /** Dispatches a tutorial action that ends the tutorial. */
  endTutorial = () => this.props.dispatch(tutorial({ value: false }))

  render() {
    const {
      show,
      id,
      title,
      arrow,
      center,
      opaque,
      className,
      style,
      actions,
      positionAtCursor,
      hideModalActions,
      top,
      children,
    } = this.props

    if (!show) return null

    const cursorCoords = getSelectionCoordinates()

    /** Dispatches a closeModal action for the modal. */

    // /** Dispatches a modalComplete action for the modal. */
    // const complete = () => dispatch(modalComplete(id))

    // /** Dispatches a tutorial action that ends the tutorial. */
    // const endTutorial = () => dispatch(tutorial({ value: false }))

    return (
      <div
        ref={this.ref}
        style={Object.assign(
          {},
          style,
          top ? { top: 55 } : null,
          positionAtCursor
            ? {
                top: cursorCoords.y,
                left: cursorCoords.x,
              }
            : null,
        )}
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
        {id !== 'welcome' ? (
          <a className='upper-right popup-close-x text-small' onClick={this.close}>
            ✕
          </a>
        ) : null}
        <div
          className={classNames({
            'modal-content': true,
            ...(arrow ? { [arrow]: arrow } : null),
          })}
        >
          {title ? <h1 className='modal-title'>{title}</h1> : null}
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
