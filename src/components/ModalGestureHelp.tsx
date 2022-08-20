import React from 'react'
import { ActionButton } from './ActionButton'
import Modal from './Modal'
import ShortcutTable from './ShortcutTable'

/** A modal that shows a list of all gestures. */
const ModalGestureHints = () => (
  <Modal
    id='gesture-help'
    title='Gestures'
    className='popup'
    center
    actions={({ close }) => <ActionButton key='close' title='Close' onClick={() => close()} />}
  >
    <ShortcutTable />
  </Modal>
)

export default ModalGestureHints
