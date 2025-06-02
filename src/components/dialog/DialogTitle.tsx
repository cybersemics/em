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
  const dialogClasses = dialogRecipe()

  return (
    <div className={dialogClasses.titleContainer}>
      <h2 className={dialogClasses.title}>{children}</h2>
      <CloseButton onClick={onClose} />
    </div>
  )
}

export default DialogTitle
