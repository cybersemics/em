/* eslint-disable fp/no-class, fp/no-this */
import React from 'react'
import classNames from 'classnames'
import { FADEOUT_DURATION, MODAL_CLOSE_DURATION, MODAL_REMIND_ME_LATER_DURATION } from '../constants'
import { modalCleanup } from '../util'
import { Connected } from '../types'
import { modalComplete, modalRemindMeLater, tutorial } from '../action-creators'

export interface ModalProps {
  arrow?: string,
  center?: boolean,
  children?: React.ReactNode,
  className?: string,
  hideModalActions?: boolean,
  id: string,
  onSubmit?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void,
  opaque?: boolean,
  positionAtCursor?: boolean,
  show?: boolean,
  style?: React.CSSProperties,
  title: string,
  top?: number,
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

  close: ((duration: number) => void) | null = null;
  escapeListener: ((e: KeyboardEvent) => void) | null = null;
  ref: React.RefObject<HTMLDivElement>;

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
          this.close!(MODAL_CLOSE_DURATION)
        }
      }

      /**
       * Animate and close the modal.
       */
      this.close = (duration: number) => {
        const { id, dispatch } = this.props
        window.removeEventListener('keydown', this.escapeListener!, true)
        modalCleanup()
        if (this.ref.current) {
          this.ref.current.classList.add('animate-fadeout')
        }
        setTimeout(() => {
          dispatch(modalRemindMeLater({ id, duration }))
        }, FADEOUT_DURATION)
      }

      // use capturing so that this fires before the global window Escape which removes the cursor
      window.addEventListener('keydown', this.escapeListener, true)
    }
  }

  componentWillUnmount() {
    modalCleanup()
    window.removeEventListener('keydown', this.escapeListener!, true)
  }

  render() {
    const { show, id, title, arrow, center, opaque, onSubmit, className, style, positionAtCursor, top, children, hideModalActions, dispatch } = this.props

    if (!show) return null

    const cursorCoords = getSelectionCoordinates()

    /** Dispatches a modalRemindMeLater action for the modal. */
    const remindMeLater = () => dispatch(modalRemindMeLater({ id }))

    /** Dispatches a modalComplete action for the modal. */
    const complete = () => dispatch(modalComplete(id))

    /** Dispatches a tutorial action that ends the tutorial. */
    const endTutorial = () => dispatch(tutorial({ value: false }))

    return <div ref={this.ref} style={Object.assign({}, style, top ? { top: 55 } : null, positionAtCursor ? {
      top: cursorCoords.y,
      left: cursorCoords.x
    } : null)} className={className + ' ' + classNames({
      modal: true,
      animate: true,
      [`modal-${id}`]: true,
      center,
      opaque
    })}>
      {id !== 'welcome' ? <a className='upper-right popup-close-x text-small' onClick={remindMeLater}>✕</a> : null}
      <div className={classNames({
        'modal-content': true,
        ...arrow ? { [arrow]: arrow } : null
      })}>
        {title ? <h1 className='modal-title'>{title}</h1> : null}
        <div className='modal-text'>{children}</div>
        {!hideModalActions && <div className='modal-actions'>
          {
            id === 'welcome' ? <a className='button' onClick={complete}>START TUTORIAL</a> :
            id === 'feedback' ? <div>
              <a className='button button-small button-inactive' onClick={remindMeLater}>Cancel</a>
              <a className='button button-small button-active' onClick={e => {
                if (onSubmit) {
                  onSubmit(e)
                }
                remindMeLater()
              }}>Send</a>
            </div> :
            id === 'help' ? <a className='button' onClick={remindMeLater}>Close</a> :
            <span>
              {id !== 'export' && <a onClick={complete}>Got it!</a>}
              <span> </span>{ id !== 'export' && <a onClick={() => this.close!(MODAL_REMIND_ME_LATER_DURATION)}>Remind me later</a> }
              { // <span> </span><a onClick={() => this.close(MODAL_REMIND_ME_TOMORROW_DURATION)}>Remind me tomorrow</a>
              }
            </span>}
          {id === 'welcome' ? <div style={{ marginTop: 10, opacity: 0.5 }}><a id='skip-tutorial' onClick={() => {
            endTutorial()
            complete()
          }}>This ain’t my first rodeo. Skip it.</a></div> : null}
        </div>}
        <a className='modal-close' onClick={() => this.close!(MODAL_CLOSE_DURATION)}><span>✕</span></a>
      </div>
    </div>
  }
}

export default ModalComponent
