/* eslint-disable fp/no-class, fp/no-this */
import React from 'react'
/* import classNames from 'classnames'
import { FADEOUT_DURATION, MODAL_CLOSE_DURATION } from '../constants'
import { Connected } from '../@types' */
import { /* closeModal */ modalComplete /* tutorial */ } from '../action-creators'
import { useDispatch } from 'react-redux'
import { Modal, View, StyleSheet, ScrollView } from 'react-native'
import { Text } from './Text.native'
import { commonStyles } from '../style/commonStyles'
import tw from 'tailwind-react-native-classnames'
import styled from 'styled-components/native'
import themeSpecific from '../styled-helpers/themeSpecific'

const { title: titleStyle } = commonStyles

interface ModalActionHelpers {
  close: (duration?: number) => void
  // complete: typeof ModalComponent,
}

export interface ModalProps {
  hideModalActions?: boolean
  id: string
  onSubmit?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void
  show?: boolean
  actions?: (modalActionHelpers: ModalActionHelpers) => React.ReactNode
  title: string
  preventCloseOnEscape?: boolean
}

const ModalWrapper = styled.View`
  ${themeSpecific({
    light: tw`bg-white`,
    dark: tw`bg-black`,
  })}
`

/** A generic modal component. */
const ModalComponent: React.FC<ModalProps> = props => {
  const dispatch = useDispatch()

  /** Dispatches a remindMeLater action for the modal. */
  // const remindMeLater = () => dispatch(closeModal({ id: props.id }))

  /** Dispatches a modalComplete action for the modal. */
  const close = () => dispatch(modalComplete(props.id))

  /** Dispatches a tutorial action that ends the tutorial. */
  // const endTutorial = () => dispatch(tutorial({ value: false }))

  const { show, title, actions, children, hideModalActions /* onSubmit */ } = props

  if (!show) return null

  return (
    <Modal animationType='slide' visible={show} onRequestClose={close}>
      <ModalWrapper style={tw`flex-1 py-10 px-4 `}>
        {!props.preventCloseOnEscape && (
          <Text style={styles.close} onPress={close}>
            ✕
          </Text>
        )}

        <ScrollView>
          {title ? <Text style={titleStyle}>{title}</Text> : null}
          <View>{children}</View>

          <View>{!hideModalActions && actions && actions({ close })}</View>
        </ScrollView>
      </ModalWrapper>
    </Modal>
  )
}

const styles = StyleSheet.create({
  close: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'right',
    fontSize: 16,
  },
})

export default ModalComponent
