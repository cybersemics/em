import React, { PropsWithChildren } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'
import CloseButton from './CloseButton'

interface DialogTitleProps {
  onClose: () => void
}

/**
 * Dialog title.
 */
const DialogTitle: React.FC<PropsWithChildren<DialogTitleProps>> = ({ children, onClose }) => {
  const dialog = dialogRecipe()
  return (
    <div className={dialog.titleContainer}>
      <h2 className={dialog.titleText}>{children}</h2>
      <CloseButton onClick={onClose} />
    </div>
  )
}

export default DialogTitle
