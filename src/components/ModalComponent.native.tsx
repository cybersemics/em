/* eslint-disable fp/no-class, fp/no-this */
import React from 'react'
import classNames from 'classnames'
import { FADEOUT_DURATION, MODAL_CLOSE_DURATION } from '../constants'
import { modalCleanup } from '../util'
import { Connected } from '../types'
import { modalRemindMeLater, modalComplete, tutorial } from '../action-creators'
import { useDispatch } from 'react-redux'
import { Modal, Text, View, StyleSheet } from 'react-native'

interface ModalActionHelpers {
  close: (duration?: number) => void,
  remindMeLater: ModalComponent['remindMeLater'],
  complete: ModalComponent['complete'],
}

export interface ModalProps {
  hideModalActions?: boolean,
  id: string,
  onSubmit?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void,
  show?: boolean,
  actions?: (modalActionHelpers: ModalActionHelpers) => React.ReactNode,
  title: string,
}

/** A generic modal component. */
const ModalComponent: React.FC<ModalProps> = (props) => {

  const dispatch = useDispatch()

  /** Dispatches a remindMeLater action for the modal. */
  const remindMeLater = () => dispatch(modalRemindMeLater({ id: props.id }))

  /** Dispatches a modalComplete action for the modal. */
  const complete = () => dispatch(modalComplete(props.id))

  /** Dispatches a tutorial action that ends the tutorial. */
  const endTutorial = () => dispatch(tutorial({ value: false }))

  const { show, id, title, actions, children, onSubmit } = props

  if (!show) return null

  return <Modal
    animationType='slide'

    visible={show}
    onRequestClose={complete}
  >
    <View style={styles.centeredView}>
      {id !== 'welcome' ? <Text style={styles.close} onPress={complete}>✕</Text> : null}

      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View>{children}</View>
    </View>

    {/* {!hideModalActions && actions &&
      <div className='modal-actions'>
        {actions({
          remindMeLater: remindMeLater,
          complete: complete,
        })}
      </div>
    }
    <a className='modal-close' onClick={() => complete()}><span>✕</span></a> */}

  </Modal>

}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    paddingVertical: 40,
    backgroundColor: 'red',
    paddingHorizontal: 15
  },
  close: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'right',
    fontSize: 20
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 32
  }
})

export default ModalComponent
